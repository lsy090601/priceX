-- Fresh fruit / vegetable retail prices from the aT "recent retail price" open API
-- (https://apis.data.go.kr/B552845/recent/price). Only retail rows of 과일류 / 채소류 are stored.
-- One row per product/variety/grade/unit per survey date.
create table public.produce_prices (
 id bigint generated always as identity primary key,
 inspected_at date not null,
 category text not null check (category in ('과일류', '채소류')),
 item_code text not null,
 item_name text not null,
 variety_code text not null,
 variety_name text not null,
 grade_code text not null,
 grade_name text not null,
 unit text not null,
 unit_size numeric not null,
 -- Price on the survey date and on the dates the API reports back (null when not surveyed).
 price integer check (price >= 0),
 price_1d_ago integer check (price_1d_ago >= 0),
 price_1w_ago integer check (price_1w_ago >= 0),
 price_1m_ago integer check (price_1m_ago >= 0),
 price_1y_ago integer check (price_1y_ago >= 0),
 -- The API's converted price (환산가격) for the same dates.
 converted_price integer check (converted_price >= 0),
 updated_at timestamptz not null default now(),
 unique (inspected_at, item_code, variety_code, grade_code, unit, unit_size)
);
create index produce_prices_item_date on public.produce_prices (item_name, inspected_at desc);
alter table public.produce_prices enable row level security;
-- Server-only writes. The app reads through the RPC below.
grant select, insert, update on public.produce_prices to service_role;
grant usage, select on sequence public.produce_prices_id_seq to service_role;

-- One representative row per product on its latest survey date.
-- Preference: kg unit (comparable with packaged goods), then the lowest variety code, then the highest grade code.
create or replace function public.search_produce_prices(
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
  change_pct_1w numeric
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
      p.inspected_at, p.price, p.price_1w_ago, p.price_1m_ago
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
    end as change_pct_1w
  from picked
  order by picked.item_name
  limit least(greatest(result_limit, 1), 50);
$$;

revoke all on function public.search_produce_prices(text, integer) from public;
grant execute on function public.search_produce_prices(text, integer) to anon, authenticated;
