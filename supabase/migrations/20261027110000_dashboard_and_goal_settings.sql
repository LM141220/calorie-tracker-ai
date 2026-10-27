alter table public.user_goals
  add column timezone text not null default 'UTC';

create function public.validate_user_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = new.timezone
  ) then
    raise exception 'Invalid IANA timezone: %', new.timezone;
  end if;

  return new;
end;
$$;

create trigger user_goals_validate_timezone
  before insert or update of timezone on public.user_goals
  for each row execute function public.validate_user_timezone();

create function public.refresh_daily_stats_for_date(
  p_user_id uuid,
  p_date date,
  p_excluded_meal_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_meal_count integer;
begin
  select coalesce(user_goals.timezone, 'UTC')
  into v_timezone
  from public.user_goals
  where user_goals.user_id = p_user_id;

  v_timezone := coalesce(v_timezone, 'UTC');

  select count(distinct meals.id)::integer
  into v_meal_count
  from public.meals
  join public.meal_items on meal_items.meal_id = meals.id
  where meals.user_id = p_user_id
    and meals.id is distinct from p_excluded_meal_id
    and (meals.created_at at time zone v_timezone)::date = p_date;

  if v_meal_count = 0 then
    delete from public.daily_stats
    where user_id = p_user_id and date = p_date;
    return;
  end if;

  insert into public.daily_stats (
    user_id,
    date,
    total_calories,
    total_protein,
    total_carbs,
    total_fat
  )
  select
    p_user_id,
    p_date,
    coalesce(sum(meal_items.calories), 0),
    coalesce(sum(meal_items.protein), 0),
    coalesce(sum(meal_items.carbs), 0),
    coalesce(sum(meal_items.fat), 0)
  from public.meals
  join public.meal_items on meal_items.meal_id = meals.id
  where meals.user_id = p_user_id
    and meals.id is distinct from p_excluded_meal_id
    and (meals.created_at at time zone v_timezone)::date = p_date
  on conflict (user_id, date) do update
  set total_calories = excluded.total_calories,
      total_protein = excluded.total_protein,
      total_carbs = excluded.total_carbs,
      total_fat = excluded.total_fat;
end;
$$;

create function public.refresh_stats_for_meal(p_meal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_created_at timestamptz;
  v_timezone text;
begin
  select meals.user_id, meals.created_at
  into v_user_id, v_created_at
  from public.meals
  where meals.id = p_meal_id;

  if v_user_id is null then
    return;
  end if;

  select coalesce(user_goals.timezone, 'UTC')
  into v_timezone
  from public.user_goals
  where user_goals.user_id = v_user_id;

  perform public.refresh_daily_stats_for_date(
    v_user_id,
    (v_created_at at time zone coalesce(v_timezone, 'UTC'))::date
  );
end;
$$;

create function public.refresh_stats_after_meal_item_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_stats_for_meal(old.meal_id);
    return old;
  end if;

  if tg_op = 'UPDATE' then
    perform public.refresh_stats_for_meal(old.meal_id);
    if old.meal_id is distinct from new.meal_id then
      perform public.refresh_stats_for_meal(new.meal_id);
    end if;
    return new;
  end if;

  perform public.refresh_stats_for_meal(new.meal_id);
  return new;
end;
$$;

create trigger meal_items_refresh_daily_stats
  after insert or update or delete on public.meal_items
  for each row execute function public.refresh_stats_after_meal_item_change();

create function public.refresh_stats_before_meal_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
begin
  select coalesce(user_goals.timezone, 'UTC')
  into v_timezone
  from public.user_goals
  where user_goals.user_id = old.user_id;

  perform public.refresh_daily_stats_for_date(
    old.user_id,
    (old.created_at at time zone coalesce(v_timezone, 'UTC'))::date,
    old.id
  );

  return old;
end;
$$;

create trigger meals_refresh_daily_stats_before_delete
  before delete on public.meals
  for each row execute function public.refresh_stats_before_meal_delete();

create function public.refresh_stats_after_meal_date_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
begin
  select coalesce(user_goals.timezone, 'UTC')
  into v_timezone
  from public.user_goals
  where user_goals.user_id = new.user_id;

  perform public.refresh_daily_stats_for_date(
    new.user_id,
    (old.created_at at time zone coalesce(v_timezone, 'UTC'))::date
  );
  perform public.refresh_daily_stats_for_date(
    new.user_id,
    (new.created_at at time zone coalesce(v_timezone, 'UTC'))::date
  );

  return new;
end;
$$;

create trigger meals_refresh_daily_stats_after_date_change
  after update of created_at on public.meals
  for each row
  when (old.created_at is distinct from new.created_at)
  execute function public.refresh_stats_after_meal_date_change();

create function public.refresh_stats_after_timezone_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date date;
begin
  if tg_op = 'UPDATE' then
    if old.timezone is not distinct from new.timezone then
      return new;
    end if;
  end if;

  delete from public.daily_stats
  where user_id = new.user_id;

  for v_date in
    select distinct (meals.created_at at time zone new.timezone)::date
    from public.meals
    join public.meal_items on meal_items.meal_id = meals.id
    where meals.user_id = new.user_id
  loop
    perform public.refresh_daily_stats_for_date(new.user_id, v_date);
  end loop;

  return new;
end;
$$;

create trigger user_goals_refresh_stats_after_insert
  after insert on public.user_goals
  for each row
  execute function public.refresh_stats_after_timezone_change();

create trigger user_goals_refresh_stats_after_timezone_change
  after update of timezone on public.user_goals
  for each row
  when (old.timezone is distinct from new.timezone)
  execute function public.refresh_stats_after_timezone_change();

do $$
declare
  daily_total record;
begin
  for daily_total in
    select distinct
      meals.user_id,
      (meals.created_at at time zone coalesce(user_goals.timezone, 'UTC'))::date
        as local_date
    from public.meals
    join public.meal_items on meal_items.meal_id = meals.id
    left join public.user_goals on user_goals.user_id = meals.user_id
  loop
    perform public.refresh_daily_stats_for_date(
      daily_total.user_id,
      daily_total.local_date
    );
  end loop;
end;
$$;

create function public.get_dashboard_summary()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with settings as (
    select coalesce(
      (
        select user_goals.timezone
        from public.user_goals
        where user_goals.user_id = (select auth.uid())
      ),
      'UTC'
    ) as timezone
  ),
  today as (
    select (now() at time zone settings.timezone)::date as local_date
    from settings
  ),
  meal_totals as (
    select
      (meals.created_at at time zone settings.timezone)::date as local_date,
      count(distinct meals.id)::integer as meal_count,
      coalesce(sum(meal_items.calories), 0)::numeric as calories,
      coalesce(sum(meal_items.protein), 0)::numeric as protein,
      coalesce(sum(meal_items.carbs), 0)::numeric as carbs,
      coalesce(sum(meal_items.fat), 0)::numeric as fat
    from public.meals
    join public.meal_items on meal_items.meal_id = meals.id
    cross join settings
    where meals.user_id = (select auth.uid())
      and (meals.created_at at time zone settings.timezone)::date
        between (select local_date from today) - 30 and (select local_date from today)
    group by (meals.created_at at time zone settings.timezone)::date
  ),
  days as (
    select (select local_date from today) - offsets.day_offset as local_date
    from pg_catalog.generate_series(0, 6) as offsets(day_offset)
  ),
  weekly as (
    select
      days.local_date,
      coalesce(meal_totals.calories, 0)::numeric as calories
    from days
    left join meal_totals on meal_totals.local_date = days.local_date
  ),
  current_month as (
    select
      date_trunc('month', (select local_date from today)::timestamp)::date
        as first_day,
      (select local_date from today) as last_day
  )
  select pg_catalog.jsonb_build_object(
    'timezone', settings.timezone,
    'today', pg_catalog.jsonb_build_object(
      'date', today.local_date,
      'meal_count', coalesce(meal_totals.meal_count, 0),
      'calories', coalesce(meal_totals.calories, 0),
      'protein', coalesce(meal_totals.protein, 0),
      'carbs', coalesce(meal_totals.carbs, 0),
      'fat', coalesce(meal_totals.fat, 0)
    ),
    'weekly_average',
      (select coalesce(avg(weekly.calories), 0) from weekly),
    'monthly_average',
      (
        select coalesce(
          sum(meal_totals.calories)
            / greatest((current_month.last_day - current_month.first_day + 1), 1),
          0
        )
        from current_month
        left join meal_totals
          on meal_totals.local_date between current_month.first_day and current_month.last_day
        group by current_month.first_day, current_month.last_day
      ),
    'week',
      (
        select coalesce(
          pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'date', weekly.local_date,
              'calories', weekly.calories
            )
            order by weekly.local_date
          ),
          '[]'::jsonb
        )
        from weekly
      )
  )
  from settings
  cross join today
  left join meal_totals on meal_totals.local_date = today.local_date;
$$;

revoke all on function public.get_dashboard_summary() from public;
revoke all on function public.get_dashboard_summary() from anon;
grant execute on function public.get_dashboard_summary() to authenticated;

grant select, insert, update on public.user_goals to authenticated;
revoke insert, update, delete on public.daily_stats from authenticated;

revoke all on function public.validate_user_timezone() from public, anon, authenticated;
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
