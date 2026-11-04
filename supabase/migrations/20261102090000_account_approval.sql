alter table public.profiles
  add column approval_status text not null default 'approved'
    check (approval_status in ('pending', 'approved', 'rejected')),
  add column requested_at timestamptz not null default now(),
  add column approved_at timestamptz,
  add column approved_by uuid references public.profiles (id) on delete set null,
  add column rejected_at timestamptz,
  add column is_admin boolean not null default false;

update public.profiles
set approved_at = coalesce(approved_at, created_at);

alter table public.profiles
  alter column approval_status set default 'pending';

create table public.account_approval_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type in ('requested', 'approved', 'rejected')),
  actor_id uuid references public.profiles (id) on delete set null,
  comment text,
  created_at timestamptz not null default now()
);

create index account_approval_events_profile_created_at_idx
  on public.account_approval_events (profile_id, created_at desc);

alter table public.account_approval_events enable row level security;
revoke all on public.account_approval_events from public, anon, authenticated;
grant select on public.account_approval_events to authenticated;
revoke all on public.profiles from public, anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;

create function public.is_current_user_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.approval_status = 'approved'
  );
$$;

create function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.is_admin
      and profiles.approval_status = 'approved'
  );
$$;

revoke all on function public.is_current_user_approved() from public, anon;
revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_approved() to authenticated;
grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists "Profiles are readable by their owner" on public.profiles;
create policy "Profiles are readable by their owner or an administrator"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select public.is_current_user_admin()));

drop policy if exists "Goals are manageable by their owner" on public.user_goals;
create policy "Approved users can manage their goals"
  on public.user_goals for all to authenticated
  using ((select auth.uid()) = user_id and (select public.is_current_user_approved()))
  with check ((select auth.uid()) = user_id and (select public.is_current_user_approved()));

drop policy if exists "Meals are manageable by their owner" on public.meals;
create policy "Approved users can manage their meals"
  on public.meals for all to authenticated
  using ((select auth.uid()) = user_id and (select public.is_current_user_approved()))
  with check ((select auth.uid()) = user_id and (select public.is_current_user_approved()));

drop policy if exists "Meal items are readable by their meal owner" on public.meal_items;
drop policy if exists "Meal items are insertable by their meal owner" on public.meal_items;
drop policy if exists "Meal items are updatable by their meal owner" on public.meal_items;
drop policy if exists "Meal items are deletable by their meal owner" on public.meal_items;
create policy "Approved users can read their meal items"
  on public.meal_items for select to authenticated
  using (
    (select public.is_current_user_approved())
    and exists (
      select 1 from public.meals
      where meals.id = meal_items.meal_id
        and meals.user_id = (select auth.uid())
    )
  );
create policy "Approved users can insert their meal items"
  on public.meal_items for insert to authenticated
  with check (
    (select public.is_current_user_approved())
    and exists (
      select 1 from public.meals
      where meals.id = meal_items.meal_id
        and meals.user_id = (select auth.uid())
    )
  );
create policy "Approved users can update their meal items"
  on public.meal_items for update to authenticated
  using (
    (select public.is_current_user_approved())
    and exists (
      select 1 from public.meals
      where meals.id = meal_items.meal_id
        and meals.user_id = (select auth.uid())
    )
  )
  with check (
    (select public.is_current_user_approved())
    and exists (
      select 1 from public.meals
      where meals.id = meal_items.meal_id
        and meals.user_id = (select auth.uid())
    )
  );
create policy "Approved users can delete their meal items"
  on public.meal_items for delete to authenticated
  using (
    (select public.is_current_user_approved())
    and exists (
      select 1 from public.meals
      where meals.id = meal_items.meal_id
        and meals.user_id = (select auth.uid())
    )
  );

drop policy if exists "Daily stats are manageable by their owner" on public.daily_stats;
create policy "Approved users can read their daily stats"
  on public.daily_stats for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_current_user_approved()));

drop policy if exists "Favorite meals are readable by their owner" on public.favorite_meals;
create policy "Approved users can read their favorite meals"
  on public.favorite_meals for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_current_user_approved()));

drop policy if exists "Favorite meal items are readable by their owner" on public.favorite_meal_items;
create policy "Approved users can read their favorite meal items"
  on public.favorite_meal_items for select to authenticated
  using (
    (select public.is_current_user_approved())
    and exists (
      select 1
      from public.favorite_meals
      where favorite_meals.id = favorite_meal_items.favorite_meal_id
        and favorite_meals.user_id = (select auth.uid())
    )
  );

drop policy if exists "Favorite foods are readable by their owner" on public.favorite_foods;
drop policy if exists "Favorite foods are insertable by their owner" on public.favorite_foods;
drop policy if exists "Favorite foods are deletable by their owner" on public.favorite_foods;
create policy "Approved users can read their favorite foods"
  on public.favorite_foods for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_current_user_approved()));
create policy "Approved users can insert their favorite foods"
  on public.favorite_foods for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_current_user_approved()));
create policy "Approved users can delete their favorite foods"
  on public.favorite_foods for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_current_user_approved()));

drop policy if exists "Users can upload their own meal images" on storage.objects;
drop policy if exists "Users can view their own meal images" on storage.objects;
drop policy if exists "Users can delete their own meal images" on storage.objects;
create policy "Approved users can upload their own meal images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_current_user_approved())
  );
create policy "Approved users can view their own meal images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_current_user_approved())
  );
create policy "Approved users can delete their own meal images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_current_user_approved())
  );

create policy "Administrators can read approval history"
  on public.account_approval_events for select to authenticated
  using ((select public.is_current_user_admin()));

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, approval_status, requested_at)
  values (new.id, coalesce(new.email, ''), 'pending', coalesce(new.created_at, now()))
  on conflict (id) do update
    set email = excluded.email;

  insert into public.account_approval_events (profile_id, event_type)
  values (new.id, 'requested');

  return new;
end;
$$;

create or replace function public.review_account_request(
  p_profile_id uuid,
  p_decision text,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_status text;
  v_comment text := nullif(pg_catalog.btrim(p_comment), '');
begin
  if v_actor_id is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required';
  end if;

  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;
  if pg_catalog.char_length(coalesce(p_comment, '')) > 1000 then
    raise exception 'Review comments cannot exceed 1000 characters';
  end if;

  if p_profile_id = v_actor_id then
    raise exception 'Administrators cannot review their own account';
  end if;

  select profiles.approval_status
    into v_status
  from public.profiles
  where profiles.id = p_profile_id
  for update;

  if not found then
    raise exception 'Account not found';
  end if;
  if v_status <> 'pending' then
    raise exception 'Only pending account requests can be reviewed';
  end if;

  update public.profiles
  set approval_status = p_decision,
      approved_at = case when p_decision = 'approved' then now() else null end,
      approved_by = case when p_decision = 'approved' then v_actor_id else null end,
      rejected_at = case when p_decision = 'rejected' then now() else null end
  where id = p_profile_id;

  insert into public.account_approval_events (profile_id, event_type, actor_id, comment)
  values (p_profile_id, p_decision, v_actor_id, v_comment);
end;
$$;

revoke all on function public.review_account_request(uuid, text, text) from public, anon;
grant execute on function public.review_account_request(uuid, text, text) to authenticated;

create or replace function public.set_meal_favorite(
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
  if v_user_id is null or not public.is_current_user_approved() then
    raise exception 'Approved account required';
  end if;

  if p_is_favorite then
    insert into public.favorite_meals (
      user_id, source_meal_id, meal_name, notes, image_url
    )
    select v_user_id, meals.id, meals.meal_name, meals.notes, meals.image_url
    from public.meals
    where meals.id = p_meal_id and meals.user_id = v_user_id
    on conflict (user_id, source_meal_id)
      where source_meal_id is not null
    do nothing
    returning id into v_favorite_id;

    if v_favorite_id is null then
      select favorite_meals.id into v_favorite_id
      from public.favorite_meals
      where favorite_meals.user_id = v_user_id
        and favorite_meals.source_meal_id = p_meal_id;
    else
      insert into public.favorite_meal_items (
        favorite_meal_id, sort_order, food_name, weight_g, calories, protein, carbs, fat
      )
      select
        v_favorite_id,
        pg_catalog.row_number() over (order by meal_items.created_at, meal_items.id)::integer - 1,
        meal_items.food_name, meal_items.weight_g, meal_items.calories,
        meal_items.protein, meal_items.carbs, meal_items.fat
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

create or replace function public.delete_favorite_meal(p_favorite_meal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null or not public.is_current_user_approved() then
    raise exception 'Approved account required';
  end if;

  delete from public.favorite_meals
  where favorite_meals.id = p_favorite_meal_id
    and favorite_meals.user_id = v_user_id;

  if not found then
    raise exception 'Favorite meal not found or not owned by the authenticated user';
  end if;
end;
$$;

revoke all on function public.set_meal_favorite(uuid, boolean) from public, anon;
grant execute on function public.set_meal_favorite(uuid, boolean) to authenticated;
revoke all on function public.delete_favorite_meal(uuid) from public, anon;
grant execute on function public.delete_favorite_meal(uuid) to authenticated;

revoke all on function public.refresh_daily_stats_for_date(uuid, date, uuid)
  from public, anon, authenticated;
revoke all on function public.refresh_stats_for_meal(uuid)
  from public, anon, authenticated;
revoke all on function public.refresh_stats_after_meal_item_change()
  from public, anon, authenticated;
revoke all on function public.refresh_stats_before_meal_delete()
  from public, anon, authenticated;
revoke all on function public.refresh_stats_after_meal_date_change()
  from public, anon, authenticated;
revoke all on function public.refresh_stats_after_timezone_change()
  from public, anon, authenticated;
