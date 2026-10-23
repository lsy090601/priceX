-- Read-only RPCs used by the client app. The source table stays protected by RLS.
create or replace function public.search_price_products(
  search_query text,
  result_limit integer default 20
)
returns table (
  product_name text,
  inspected_at date,
  store_count bigint,
  min_price integer,
  max_price integer,
  average_price integer
)
language sql
stable
security definer
set search_path = public
as $$
  with matching_products as (
    select
      observation.product_name,
      max(observation.inspected_at) as inspected_at
    from public.price_observations as observation
    where length(trim(search_query)) >= 1
      and observation.product_name ilike '%' || trim(search_query) || '%'
    group by observation.product_name
    order by observation.product_name
    limit least(greatest(result_limit, 1), 50)
  )
  select
    observation.product_name,
    matching.inspected_at,
    count(*) as store_count,
    min(observation.price) as min_price,
    max(observation.price) as max_price,
    round(avg(observation.price))::integer as average_price
  from matching_products as matching
  join public.price_observations as observation
    on observation.product_name = matching.product_name
   and observation.inspected_at = matching.inspected_at
  group by observation.product_name, matching.inspected_at
  order by min_price, observation.product_name;
$$;

create or replace function public.compare_product_prices(target_product text)
returns table (
  product_name text,
  inspected_at date,
  store_name text,
  price integer,
  manufacturer text,
  is_discounted boolean,
  is_one_plus_one boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    observation.product_name,
    observation.inspected_at,
    observation.store_name,
    observation.price,
    observation.manufacturer,
    observation.is_discounted,
    observation.is_one_plus_one
  from public.price_observations as observation
  where observation.product_name = target_product
    and observation.inspected_at = (
      select max(latest.inspected_at)
      from public.price_observations as latest
      where latest.product_name = target_product
    )
  order by observation.price, observation.store_name;
$$;

revoke all on function public.search_price_products(text, integer) from public;
revoke all on function public.compare_product_prices(text) from public;
grant execute on function public.search_price_products(text, integer) to anon, authenticated;
grant execute on function public.compare_product_prices(text) to anon, authenticated;
grant execute on function public.search_price_products(text, integer) to service_role;
grant execute on function public.compare_product_prices(text) to service_role;

