create table public.favorite_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  food_name text not null
    check (char_length(food_name) between 1 and 200),
  weight_g numeric(8, 2) not null
    check (weight_g between 0 and 100000),
  calories numeric(8, 2) not null
    check (calories between 0 and 1000000),
  protein numeric(8, 2) not null default 0
    check (protein between 0 and 100000),
  carbs numeric(8, 2) not null default 0
    check (carbs between 0 and 100000),
  fat numeric(8, 2) not null default 0
    check (fat between 0 and 100000),
  created_at timestamptz not null default now(),
  constraint favorite_foods_user_snapshot_unique unique (
    user_id,
    food_name,
    weight_g,
    calories,
    protein,
    carbs,
    fat
  )
);

create index favorite_foods_user_created_at_idx
  on public.favorite_foods (user_id, created_at desc);

alter table public.favorite_foods enable row level security;

create policy "Favorite foods are readable by their owner"
  on public.favorite_foods for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Favorite foods are insertable by their owner"
  on public.favorite_foods for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Favorite foods are deletable by their owner"
  on public.favorite_foods for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.favorite_foods to authenticated;
