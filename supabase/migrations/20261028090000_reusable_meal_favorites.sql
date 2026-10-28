create table public.favorite_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_meal_id uuid references public.meals (id) on delete set null,
  meal_name text not null
    check (char_length(meal_name) between 1 and 200),
  notes text
    check (notes is null or char_length(notes) <= 5000),
  image_url text,
  created_at timestamptz not null default now()
);

create unique index favorite_meals_user_source_idx
  on public.favorite_meals (user_id, source_meal_id)
  where source_meal_id is not null;
create index favorite_meals_user_created_at_idx
  on public.favorite_meals (user_id, created_at desc);
create index favorite_meals_source_meal_id_idx
  on public.favorite_meals (source_meal_id)
  where source_meal_id is not null;
create index favorite_meals_image_url_idx
  on public.favorite_meals (image_url)
  where image_url is not null;

create table public.favorite_meal_items (
  id uuid primary key default gen_random_uuid(),
  favorite_meal_id uuid not null
    references public.favorite_meals (id) on delete cascade,
  sort_order integer not null default 0 check (sort_order >= 0),
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
    check (fat between 0 and 100000)
);
create index favorite_meal_items_favorite_order_idx
  on public.favorite_meal_items (favorite_meal_id, sort_order);

alter table public.meals
  add column source_meal_id uuid references public.meals (id) on delete set null,
  add column source_favorite_id uuid
    references public.favorite_meals (id) on delete set null;

create index meals_source_meal_id_idx
  on public.meals (source_meal_id)
  where source_meal_id is not null;
create index meals_source_favorite_id_idx
  on public.meals (source_favorite_id)
  where source_favorite_id is not null;
create index meals_image_url_idx
  on public.meals (image_url)
  where image_url is not null;

alter table public.favorite_meals enable row level security;
alter table public.favorite_meal_items enable row level security;

create policy "Favorite meals are readable by their owner"
  on public.favorite_meals for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Favorite meal items are readable by their owner"
  on public.favorite_meal_items for select to authenticated
  using (
    exists (
      select 1
      from public.favorite_meals
      where favorite_meals.id = favorite_meal_items.favorite_meal_id
        and favorite_meals.user_id = (select auth.uid())
    )
  );

grant select on public.favorite_meals to authenticated;
grant select on public.favorite_meal_items to authenticated;

create function public.set_meal_favorite(
  p_meal_id uuid,
  p_is_favorite boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_favorite_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_is_favorite then
    insert into public.favorite_meals (
      user_id,
      source_meal_id,
      meal_name,
      notes,
      image_url
    )
    select
      v_user_id,
      meals.id,
      meals.meal_name,
      meals.notes,
      meals.image_url
    from public.meals
    where meals.id = p_meal_id
      and meals.user_id = v_user_id
    on conflict (user_id, source_meal_id)
      where source_meal_id is not null
    do nothing
    returning id into v_favorite_id;

    if v_favorite_id is null then
      select favorite_meals.id
      into v_favorite_id
      from public.favorite_meals
      where favorite_meals.user_id = v_user_id
        and favorite_meals.source_meal_id = p_meal_id;
    else
      insert into public.favorite_meal_items (
        favorite_meal_id,
        sort_order,
        food_name,
        weight_g,
        calories,
        protein,
        carbs,
        fat
      )
      select
        v_favorite_id,
        pg_catalog.row_number() over (order by meal_items.created_at, meal_items.id)::integer - 1,
        meal_items.food_name,
        meal_items.weight_g,
        meal_items.calories,
        meal_items.protein,
        meal_items.carbs,
        meal_items.fat
      from public.meal_items
      where meal_items.meal_id = p_meal_id;
    end if;

    if v_favorite_id is null then
      raise exception 'Meal not found or not owned by the authenticated user';
    end if;
    return v_favorite_id;
  end if;

  delete from public.favorite_meals
  where favorite_meals.user_id = v_user_id
    and favorite_meals.source_meal_id = p_meal_id
  returning id into v_favorite_id;

  if not found then
    raise exception 'Favorite meal not found';
  end if;
  return v_favorite_id;
end;
$$;

create function public.delete_favorite_meal(p_favorite_meal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.favorite_meals
  where favorite_meals.id = p_favorite_meal_id
    and favorite_meals.user_id = v_user_id;

  if not found then
    raise exception 'Favorite meal not found or not owned by the authenticated user';
  end if;
end;
$$;

revoke all on function public.set_meal_favorite(uuid, boolean) from public;
revoke all on function public.set_meal_favorite(uuid, boolean) from anon;
grant execute on function public.set_meal_favorite(uuid, boolean) to authenticated;
revoke all on function public.delete_favorite_meal(uuid) from public;
revoke all on function public.delete_favorite_meal(uuid) from anon;
grant execute on function public.delete_favorite_meal(uuid) to authenticated;

create or replace function public.save_meal(
  p_meal_id uuid,
  p_meal_name text,
  p_notes text,
  p_image_path text,
  p_source_meal_id uuid,
  p_source_favorite_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_meal_id uuid := p_meal_id;
  v_rows_updated integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_meal_name is null or char_length(pg_catalog.btrim(p_meal_name)) not between 1 and 200 then
    raise exception 'Meal name must contain between 1 and 200 characters';
  end if;

  if p_notes is not null and char_length(p_notes) > 5000 then
    raise exception 'Meal notes cannot exceed 5000 characters';
  end if;

  if p_image_path is not null
    and p_image_path not like v_user_id::text || '/%'
  then
    raise exception 'Image path does not belong to the authenticated user';
  end if;

  if (p_source_meal_id is not null and p_source_favorite_id is not null)
    or (p_meal_id is not null and (p_source_meal_id is not null or p_source_favorite_id is not null))
  then
    raise exception 'Meal source is invalid';
  end if;

  if p_source_meal_id is not null and not exists (
    select 1 from public.meals
    where meals.id = p_source_meal_id and meals.user_id = v_user_id
  ) then
    raise exception 'Source meal not found or not owned by the authenticated user';
  end if;

  if p_source_favorite_id is not null and not exists (
    select 1 from public.favorite_meals
    where favorite_meals.id = p_source_favorite_id
      and favorite_meals.user_id = v_user_id
  ) then
    raise exception 'Source favorite not found or not owned by the authenticated user';
  end if;

  if p_items is null
    or pg_catalog.jsonb_typeof(p_items) is distinct from 'array'
  then
    raise exception 'Meal items must be provided as a JSON array';
  end if;

  if pg_catalog.jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'A meal must contain between 1 and 50 items';
  end if;

  if v_meal_id is null then
    insert into public.meals (
      user_id, meal_name, notes, image_url, source_meal_id, source_favorite_id
    )
    values (
      v_user_id,
      pg_catalog.btrim(p_meal_name),
      nullif(pg_catalog.btrim(p_notes), ''),
      p_image_path,
      p_source_meal_id,
      p_source_favorite_id
    )
    returning id into v_meal_id;
  else
    update public.meals
    set meal_name = pg_catalog.btrim(p_meal_name),
        notes = nullif(pg_catalog.btrim(p_notes), ''),
        image_url = p_image_path
    where id = v_meal_id
      and user_id = v_user_id;

    get diagnostics v_rows_updated = row_count;
    if v_rows_updated <> 1 then
      raise exception 'Meal not found or not owned by the authenticated user';
    end if;

    delete from public.meal_items
    where meal_id = v_meal_id;
  end if;

  insert into public.meal_items (
    meal_id,
    food_name,
    weight_g,
    calories,
    protein,
    carbs,
    fat
  )
  select
    v_meal_id,
    item.food_name,
    item.weight_g,
    item.calories,
    item.protein,
    item.carbs,
    item.fat
  from pg_catalog.jsonb_to_recordset(p_items) as item(
    food_name text,
    weight_g numeric,
    calories numeric,
    protein numeric,
    carbs numeric,
    fat numeric
  );

  return v_meal_id;
end;
$$;

revoke all on function public.save_meal(uuid, text, text, text, uuid, uuid, jsonb) from public;
revoke all on function public.save_meal(uuid, text, text, text, uuid, uuid, jsonb) from anon;
grant execute on function public.save_meal(uuid, text, text, text, uuid, uuid, jsonb) to authenticated;
