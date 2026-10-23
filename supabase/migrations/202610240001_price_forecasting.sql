create table public.product_price_history (
  id bigint generated always as identity primary key,
  product_name text not null,
  inspected_at date not null,
  average_price integer not null check (average_price > 0),
  source text not null default 'chamgage_product_statistics',
  updated_at timestamptz not null default now(),
  unique (product_name, inspected_at, source)
);

create index product_price_history_product_date
  on public.product_price_history (product_name, inspected_at desc);

alter table public.product_price_history enable row level security;

grant select, insert, update on public.product_price_history to service_role;
grant usage, select on sequence public.product_price_history_id_seq to service_role;

create table public.price_forecasts (
  id bigint generated always as identity primary key,
  product_name text not null,
  predicted_for date not null,
  predicted_price integer not null check (predicted_price > 0),
  direction text not null check (direction in ('up', 'stable', 'down')),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  method text not null default 'moving_average_trend',
  observation_count integer not null check (observation_count >= 3),
  training_start date not null,
  training_end date not null,
  generated_at timestamptz not null default now(),
  unique (product_name, predicted_for, method)
);

create index price_forecasts_product_period
  on public.price_forecasts (product_name, predicted_for desc);

alter table public.price_forecasts enable row level security;

grant select, insert, update on public.price_forecasts to service_role;
grant usage, select on sequence public.price_forecasts_id_seq to service_role;

create or replace function public.get_product_price_history(
  target_product text,
  result_limit integer default 36
)
returns table (
  product_name text,
  inspected_at date,
  average_price integer
)
language sql
stable
security definer
set search_path = public
as $$
  select history.product_name, history.inspected_at, history.average_price
  from public.product_price_history as history
  where history.product_name = target_product
  order by history.inspected_at desc
  limit least(greatest(result_limit, 1), 120);
$$;

create or replace function public.get_latest_price_forecast(target_product text)
returns table (
  product_name text,
  predicted_for date,
  predicted_price integer,
  direction text,
  confidence text,
  observation_count integer,
  training_start date,
  training_end date,
  generated_at timestamptz
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
    forecast.observation_count,
    forecast.training_start,
    forecast.training_end,
    forecast.generated_at
  from public.price_forecasts as forecast
  where forecast.product_name = target_product
  order by forecast.predicted_for desc, forecast.generated_at desc
  limit 1;
$$;

revoke all on function public.get_product_price_history(text, integer) from public;
revoke all on function public.get_latest_price_forecast(text) from public;
grant execute on function public.get_product_price_history(text, integer) to anon, authenticated, service_role;
grant execute on function public.get_latest_price_forecast(text) to anon, authenticated, service_role;
