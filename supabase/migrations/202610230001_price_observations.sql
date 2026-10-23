create table public.price_observations (
 id bigint generated always as identity primary key,
 product_name text not null,
 inspected_at date not null,
 price integer not null check (price >= 0),
 store_name text not null,
 manufacturer text,
 is_discounted boolean,
 is_one_plus_one boolean,
 updated_at timestamptz not null default now(),
 unique (product_name, inspected_at, store_name)
);
create index price_observations_product_date on public.price_observations (product_name, inspected_at desc);
alter table public.price_observations enable row level security;
-- Server-only writes. App read policies will be added with the app's authentication flow.
