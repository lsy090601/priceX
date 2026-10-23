-- Prices that users type in at the store ("현장 가격 입력하기").
-- For now each user can only see their own entries.
create table public.field_prices (
 id bigint generated always as identity primary key,
 user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
 product_name text not null check (length(trim(product_name)) > 0),
 price integer not null check (price > 0 and price <= 10000000),
 amount numeric not null check (amount > 0 and amount <= 100000),
 unit text not null check (length(trim(unit)) > 0),
 created_at timestamptz not null default now()
);
create index field_prices_user on public.field_prices (user_id, created_at desc);
alter table public.field_prices enable row level security;

create policy "field_prices_select_own" on public.field_prices
  for select to authenticated using (user_id = auth.uid());
create policy "field_prices_insert_own" on public.field_prices
  for insert to authenticated with check (user_id = auth.uid());
create policy "field_prices_delete_own" on public.field_prices
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, delete on public.field_prices to authenticated;
grant usage, select on sequence public.field_prices_id_seq to authenticated;
