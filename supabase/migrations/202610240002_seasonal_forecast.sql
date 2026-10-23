create or replace function public.generate_seasonal_price_forecasts()
returns bigint
language sql
security definer
set search_path = public
as $$
  with latest_month as (
    select date_trunc('month', max(inspected_at))::date as month
    from public.price_observations
  ),
  current_prices as (
    select
      observation.product_name,
      latest.month,
      round(avg(observation.price))::integer as average_price
    from public.price_observations as observation
    cross join latest_month as latest
    where date_trunc('month', observation.inspected_at)::date = latest.month
      and observation.price > 0
      and coalesce(observation.is_discounted, false) = false
      and coalesce(observation.is_one_plus_one, false) = false
    group by observation.product_name, latest.month
  ),
  historical_monthly as (
    select
      history.product_name,
      date_trunc('month', history.inspected_at)::date as month,
      round(avg(history.average_price))::integer as average_price
    from public.product_price_history as history
    group by history.product_name, date_trunc('month', history.inspected_at)::date
  ),
  seasonal_changes as (
    select
      previous.product_name,
      previous.month as previous_month,
      following.month as following_month,
      (following.average_price - previous.average_price)::numeric
        / previous.average_price as change_rate
    from historical_monthly as previous
    join historical_monthly as following
      on following.product_name = previous.product_name
     and following.month = (previous.month + interval '1 month')::date
    cross join latest_month as latest
    where extract(month from previous.month) = extract(month from latest.month)
      and previous.average_price > 0
  ),
  seasonal_summary as (
    select
      changes.product_name,
      percentile_cont(0.5) within group (order by changes.change_rate) as median_change,
      count(*)::integer as transition_count,
      min(changes.previous_month) as training_start,
      max(changes.following_month) as training_end
    from seasonal_changes as changes
    group by changes.product_name
    having count(*) >= 3
  ),
  inserted as (
    insert into public.price_forecasts (
      product_name,
      predicted_for,
      predicted_price,
      direction,
      confidence,
      method,
      observation_count,
      training_start,
      training_end,
      generated_at
    )
    select
      current.product_name,
      (current.month + interval '1 month')::date,
      round(current.average_price * (1 + least(greatest(summary.median_change, -0.20), 0.20)))::integer,
      case
        when summary.median_change > 0.02 then 'up'
        when summary.median_change < -0.02 then 'down'
        else 'stable'
      end,
      case when summary.transition_count >= 4 then 'medium' else 'low' end,
      'seasonal_median',
      summary.transition_count,
      summary.training_start,
      summary.training_end,
      now()
    from current_prices as current
    join seasonal_summary as summary on summary.product_name = current.product_name
    on conflict (product_name, predicted_for, method) do update set
      predicted_price = excluded.predicted_price,
      direction = excluded.direction,
      confidence = excluded.confidence,
      observation_count = excluded.observation_count,
      training_start = excluded.training_start,
      training_end = excluded.training_end,
      generated_at = excluded.generated_at
    returning 1
  )
  select count(*) from inserted;
$$;

revoke all on function public.generate_seasonal_price_forecasts() from public;
grant execute on function public.generate_seasonal_price_forecasts() to service_role;
