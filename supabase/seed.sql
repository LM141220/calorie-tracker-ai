-- Local-only demo account. Never use these credentials in a deployed project.
create extension if not exists pgcrypto with schema extensions;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'demo@calorie-tracker.local',
  extensions.crypt('LocalOnly-1234!', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Compte de démonstration"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.user_goals (
  user_id,
  daily_calories,
  daily_protein,
  daily_carbs,
  daily_fat,
  current_weight_kg,
  height_cm,
  age_years,
  sex,
  activity_level,
  goal_type
)
values (
  '00000000-0000-4000-8000-000000000001',
  2200,
  150,
  250,
  70,
  72.5,
  175,
  30,
  'prefer_not_to_say',
  'moderately_active',
  'maintain_weight'
)
on conflict (user_id) do nothing;

insert into public.meals (id, user_id, meal_name, notes, created_at)
values (
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001',
  'Déjeuner équilibré',
  'Données de démonstration locales.',
  now()
)
on conflict (id) do nothing;

insert into public.meal_items (
  id,
  meal_id,
  food_name,
  weight_g,
  calories,
  protein,
  carbs,
  fat
)
values
  (
    '00000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000011',
    'Riz cuit',
    150,
    195,
    4.1,
    42.3,
    0.4
  ),
  (
    '00000000-0000-4000-8000-000000000022',
    '00000000-0000-4000-8000-000000000011',
    'Poulet grillé',
    200,
    330,
    62,
    0,
    7.2
  ),
  (
    '00000000-0000-4000-8000-000000000023',
    '00000000-0000-4000-8000-000000000011',
    'Pomme',
    150,
    78,
    0.4,
    20.7,
    0.3
  )
on conflict (id) do nothing;

insert into public.daily_stats (
  user_id,
  date,
  total_calories,
  total_protein,
  total_carbs,
  total_fat
)
values (
  '00000000-0000-4000-8000-000000000001',
  current_date,
  603,
  66.5,
  63,
  7.9
)
on conflict (user_id, date) do nothing;
