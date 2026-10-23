-- 장보기 리스트(체크리스트): AI 장보기 추천에서 "결정하기"를 누르면 추천 결과가 여기에 저장된다.
-- 각 사용자는 자기 리스트만 보고 바꿀 수 있다.
create table public.shopping_list_items (
 id bigint generated always as identity primary key,
 user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
 -- produce = 신선 과일·채소, packaged = 참가격 가공식품
 kind text not null check (kind in ('produce', 'packaged')),
 product_name text not null check (length(trim(product_name)) > 0),
 quantity integer not null default 1 check (quantity between 1 and 99),
 -- 추천받은 판매점. 신선식품은 판매점별 가격이 없어 null
 store_name text,
 -- 추천 시점의 개당 가격과 평균 가격
 unit_price integer check (unit_price >= 0),
 average_price integer check (average_price >= 0),
 -- 신선식품의 기준 단위 (예: 10개)
 unit_label text,
 checked boolean not null default false,
 created_at timestamptz not null default now()
);
create index shopping_list_items_user on public.shopping_list_items (user_id, created_at);
alter table public.shopping_list_items enable row level security;

create policy "shopping_list_select_own" on public.shopping_list_items
  for select to authenticated using (user_id = auth.uid());
create policy "shopping_list_insert_own" on public.shopping_list_items
  for insert to authenticated with check (user_id = auth.uid());
create policy "shopping_list_update_own" on public.shopping_list_items
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "shopping_list_delete_own" on public.shopping_list_items
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.shopping_list_items to authenticated;
grant usage, select on sequence public.shopping_list_items_id_seq to authenticated;
