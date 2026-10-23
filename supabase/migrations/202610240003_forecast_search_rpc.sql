create or replace function public.search_price_forecasts(search_query text, result_limit integer default 20)
returns table (
  product_name text,
  predicted_for date,
  predicted_price integer,
  direction text,
  confidence text,
  method text,
  observation_count integer,
  training_start date,
  training_end date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    forecast.product_name,
    forecast.predicted_for,
    forecast.predicted_price,
    forecast.direction,
    forecast.confidence,
    forecast.method,
    forecast.observation_count,
    forecast.training_start,
    forecast.training_end
  from public.price_forecasts as forecast
  where length(trim(search_query)) >= 1
    and forecast.product_name ilike '%' || trim(search_query) || '%'
    and forecast.predicted_for = (
      select max(latest.predicted_for)
      from public.price_forecasts as latest
      where latest.product_name = forecast.product_name
    )
  order by forecast.product_name
  limit least(greatest(result_limit, 1), 50);
$$;

revoke all on function public.search_price_forecasts(text, integer) from public;
grant execute on function public.search_price_forecasts(text, integer) to anon, authenticated, service_role;
