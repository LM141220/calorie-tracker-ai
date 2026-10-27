create type public.profile_sex as enum (
  'male',
  'female',
  'other',
  'prefer_not_to_say'
);

create type public.activity_level as enum (
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'extra_active'
);

create type public.nutrition_goal as enum (
  'lose_weight',
  'maintain_weight',
  'gain_muscle'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  created_at timestamptz not null default now()
);

create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  daily_calories integer not null default 2000
    check (daily_calories between 500 and 10000),
  daily_protein numeric(7, 2) not null default 150
    check (daily_protein between 0 and 1000),
  daily_carbs numeric(7, 2) not null default 250
    check (daily_carbs between 0 and 1500),
  daily_fat numeric(7, 2) not null default 70
    check (daily_fat between 0 and 1000),
  current_weight_kg numeric(6, 2)
    check (current_weight_kg between 20 and 500),
  height_cm numeric(5, 2)
    check (height_cm between 50 and 300),
  age_years smallint
    check (age_years between 13 and 120),
  sex public.profile_sex,
  activity_level public.activity_level,
  goal_type public.nutrition_goal,
  daily_calories_is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  image_url text,
  meal_name text not null default 'Repas'
    check (char_length(meal_name) between 1 and 200),
  notes text
    check (notes is null or char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meals_user_created_at_idx
  on public.meals (user_id, created_at desc);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
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
  created_at timestamptz not null default now()
);

create index meal_items_meal_id_idx on public.meal_items (meal_id);

create table public.daily_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  total_calories numeric(10, 2) not null default 0
    check (total_calories >= 0),
  total_protein numeric(10, 2) not null default 0
    check (total_protein >= 0),
  total_carbs numeric(10, 2) not null default 0
    check (total_carbs >= 0),
  total_fat numeric(10, 2) not null default 0
    check (total_fat >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index daily_stats_user_date_idx
  on public.daily_stats (user_id, date desc);

create function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_created();

create function public.handle_auth_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = coalesce(new.email, '')
    where id = new.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_auth_user_email_updated();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_goals_set_updated_at
  before update on public.user_goals
  for each row execute function public.set_updated_at();

create trigger meals_set_updated_at
  before update on public.meals
  for each row execute function public.set_updated_at();

create trigger daily_stats_set_updated_at
  before update on public.daily_stats
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_goals enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.daily_stats enable row level security;

create policy "Profiles are readable by their owner"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Goals are manageable by their owner"
  on public.user_goals for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Meals are manageable by their owner"
  on public.meals for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Meal items are readable by their meal owner"
  on public.meal_items for select to authenticated
  using (
    exists (
      select 1
      from public.meals
      where meals.id = meal_items.meal_id
        and meals.user_id = (select auth.uid())
    )
  );

create policy "Meal items are insertable by their meal owner"
  on public.meal_items for insert to authenticated
  with check (
    exists (
      select 1
      from public.meals
      where meals.id = meal_items.meal_id
        and meals.user_id = (select auth.uid())
    )
  );

create policy "Meal items are updatable by their meal owner"
  on public.meal_items for update to authenticated
  using (
    exists (
      select 1
      from public.meals
      where meals.id = meal_items.meal_id
        and meals.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.meals
      where meals.id = meal_items.meal_id
        and meals.user_id = (select auth.uid())
    )
  );

create policy "Meal items are deletable by their meal owner"
  on public.meal_items for delete to authenticated
  using (
    exists (
      select 1
      from public.meals
      where meals.id = meal_items.meal_id
        and meals.user_id = (select auth.uid())
    )
  );

create policy "Daily stats are manageable by their owner"
  on public.daily_stats for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.user_goals to authenticated;
grant select, insert, update, delete on public.meals to authenticated;
grant select, insert, update, delete on public.meal_items to authenticated;
grant select, insert, update, delete on public.daily_stats to authenticated;

revoke all on function public.handle_auth_user_created() from public;
revoke all on function public.handle_auth_user_email_updated() from public;
