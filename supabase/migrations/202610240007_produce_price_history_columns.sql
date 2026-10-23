-- search_produce_prices 가 1일 전, 1년 전 가격도 돌려주도록 확장한다. (가격 추이 그래프용)
-- 반환 형태가 바뀌어서 함수를 지우고 다시 만든다.
drop function if exists public.search_produce_prices(text, integer);

create function public.search_produce_prices(
  search_query text,
  result_limit integer default 20
)
returns table (
  item_name text,
  variety_name text,
  grade_name text,
  unit text,
  unit_size numeric,
  inspected_at date,
  price integer,
  price_1w_ago integer,
  price_1m_ago integer,
  change_pct_1w numeric,
  price_1d_ago integer,
  price_1y_ago integer
)
language sql
stable
security definer
set search_path = public
as $$
  with latest as (
    select p.item_name, max(p.inspected_at) as inspected_at
    from public.produce_prices as p
    where length(trim(search_query)) >= 1
      and p.item_name ilike '%' || trim(search_query) || '%'
      and p.price is not null
    group by p.item_name
  ),
  picked as (
    select distinct on (p.item_name)
      p.item_name, p.variety_name, p.grade_name, p.unit, p.unit_size,
      p.inspected_at, p.price, p.price_1w_ago, p.price_1m_ago,
      p.price_1d_ago, p.price_1y_ago
    from public.produce_prices as p
    join latest on latest.item_name = p.item_name and latest.inspected_at = p.inspected_at
    where p.price is not null
    order by p.item_name, (p.unit = 'kg') desc, p.variety_code, p.grade_code desc, p.unit_size
  )
  select
    picked.item_name, picked.variety_name, picked.grade_name, picked.unit, picked.unit_size,
    picked.inspected_at, picked.price, picked.price_1w_ago, picked.price_1m_ago,
    case when picked.price_1w_ago > 0
      then round((picked.price - picked.price_1w_ago) * 100.0 / picked.price_1w_ago, 1)
    end as change_pct_1w,
    picked.price_1d_ago, picked.price_1y_ago
  from picked
  order by picked.item_name
  limit least(greatest(result_limit, 1), 50);
$$;

revoke all on function public.search_produce_prices(text, integer) from public;
grant execute on function public.search_produce_prices(text, integer) to anon, authenticated;
