-- Per-user shopping cart. Each signed-in user can only see and change their own rows.
create table public.cart_items (
 id bigint generated always as identity primary key,
 user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
 -- produce = 신선 과일·채소 (produce_prices), packaged = 참가격 가공식품 (price_observations)
 kind text not null check (kind in ('produce', 'packaged')),
 product_name text not null check (length(trim(product_name)) > 0),
 quantity integer not null default 1 check (quantity between 1 and 99),
 checked boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, kind, product_name)
);
create index cart_items_user on public.cart_items (user_id, created_at);
alter table public.cart_items enable row level security;

create policy "cart_items_select_own" on public.cart_items
  for select to authenticated using (user_id = auth.uid());
create policy "cart_items_insert_own" on public.cart_items
  for insert to authenticated with check (user_id = auth.uid());
create policy "cart_items_update_own" on public.cart_items
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart_items_delete_own" on public.cart_items
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.cart_items to authenticated;
grant usage, select on sequence public.cart_items_id_seq to authenticated;
