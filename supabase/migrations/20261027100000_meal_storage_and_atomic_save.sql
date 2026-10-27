insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'meal-images',
  'meal-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload their own meal images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can view their own meal images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own meal images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create function public.save_meal(
  p_meal_id uuid,
  p_meal_name text,
  p_notes text,
  p_image_path text,
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

  if p_items is null
    or pg_catalog.jsonb_typeof(p_items) is distinct from 'array'
  then
    raise exception 'Meal items must be provided as a JSON array';
  end if;

  if pg_catalog.jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'A meal must contain between 1 and 50 items';
  end if;

  if v_meal_id is null then
    insert into public.meals (user_id, meal_name, notes, image_url)
    values (
      v_user_id,
      pg_catalog.btrim(p_meal_name),
      nullif(pg_catalog.btrim(p_notes), ''),
      p_image_path
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

revoke all on function public.save_meal(uuid, text, text, text, jsonb) from public;
revoke all on function public.save_meal(uuid, text, text, text, jsonb) from anon;
grant execute on function public.save_meal(uuid, text, text, text, jsonb) to authenticated;
