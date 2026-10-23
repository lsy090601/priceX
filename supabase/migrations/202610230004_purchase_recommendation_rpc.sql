-- Calculate the cheapest purchase plan for exact product names selected in the app.
create or replace function public.recommend_purchase_plan(purchase_items jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  recommendation jsonb;
begin
  if jsonb_typeof(purchase_items) <> 'array'
     or jsonb_array_length(purchase_items) = 0 then
    raise exception 'purchase_items must be a non-empty JSON array';
  end if;

  if jsonb_array_length(purchase_items) > 50 then
    raise exception 'purchase_items cannot contain more than 50 entries';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(purchase_items) as entry
    where jsonb_typeof(entry) <> 'object'
       or length(trim(entry->>'product_name')) = 0
       or jsonb_typeof(entry->'quantity') <> 'number'
       or (entry->>'quantity')::numeric <= 0
       or (entry->>'quantity')::numeric > 999
  ) then
    raise exception 'each item needs a product_name and quantity between 0 and 999';
  end if;

  with normalized_items as (
    select
      trim(entry->>'product_name') as product_name,
      sum((entry->>'quantity')::numeric) as quantity
    from jsonb_array_elements(purchase_items) as entry
    group by trim(entry->>'product_name')
  ),
  latest_dates as (
    select
      item.product_name,
      item.quantity,
      max(observation.inspected_at) as inspected_at
    from normalized_items as item
    left join public.price_observations as observation
      on observation.product_name = item.product_name
    group by item.product_name, item.quantity
  ),
  offers as (
    select
      latest.product_name,
      latest.quantity,
      latest.inspected_at,
      observation.store_name,
      observation.price,
      observation.is_discounted,
      observation.is_one_plus_one
    from latest_dates as latest
    join public.price_observations as observation
      on observation.product_name = latest.product_name
     and observation.inspected_at = latest.inspected_at
  ),
  ranked_offers as (
    select
      offers.*,
      row_number() over (
        partition by offers.product_name
        order by offers.price, offers.store_name
      ) as price_rank
    from offers
  ),
  cheapest_items as (
    select * from ranked_offers where price_rank = 1
  ),
  single_store_totals as (
    select
      offer.store_name,
      sum(offer.price * offer.quantity) as total,
      count(*) as available_item_count
    from offers as offer
    group by offer.store_name
    having count(*) = (select count(*) from normalized_items)
  ),
  best_single_store as (
    select store_name, total
    from single_store_totals
    order by total, store_name
    limit 1
  ),
  totals as (
    select coalesce(sum(price * quantity), 0) as multi_store_total
    from cheapest_items
  )
  select jsonb_build_object(
    'is_complete', not exists (
      select 1
      from latest_dates
      where inspected_at is null
    ),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'product_name', item.product_name,
          'quantity', item.quantity,
          'inspected_at', item.inspected_at,
          'store_name', item.store_name,
          'unit_price', item.price,
          'subtotal', item.price * item.quantity,
          'is_discounted', item.is_discounted,
          'is_one_plus_one', item.is_one_plus_one
        ) order by item.product_name
      )
      from cheapest_items as item
    ), '[]'::jsonb),
    'multi_store_total', totals.multi_store_total,
    'single_store', (
      select jsonb_build_object(
        'store_name', store_name,
        'total', total
      )
      from best_single_store
    ),
    'savings', coalesce((
      select greatest(total - totals.multi_store_total, 0)
      from best_single_store
    ), 0),
    'missing_products', coalesce((
      select jsonb_agg(product_name order by product_name)
      from latest_dates
      where inspected_at is null
    ), '[]'::jsonb)
  )
  into recommendation
  from totals;

  return recommendation;
end;
$$;

revoke all on function public.recommend_purchase_plan(jsonb) from public;
grant execute on function public.recommend_purchase_plan(jsonb) to anon, authenticated, service_role;

