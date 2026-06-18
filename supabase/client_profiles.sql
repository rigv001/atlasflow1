create table if not exists public.client_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default 'Customer',
  customer_no text not null default 'Pending',
  site text not null default 'Not specified',
  job_title text not null default 'Sustainability Lead',
  team_name text not null default 'Operations',
  focus_area text not null default 'Supplier decarbonisation',
  timezone text not null default 'AEST (UTC+10)',
  avatar_emoji text not null default '🌿',
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_client_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_profiles_set_updated_at on public.client_profiles;
create trigger client_profiles_set_updated_at
before update on public.client_profiles
for each row
execute function public.set_client_profiles_updated_at();

alter table public.client_profiles enable row level security;

create policy "client_profiles_select_own"
on public.client_profiles
for select
using (auth.uid() = user_id);

create policy "client_profiles_insert_own"
on public.client_profiles
for insert
with check (auth.uid() = user_id);

create policy "client_profiles_update_own"
on public.client_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "client_profiles_admin_read_all"
on public.client_profiles
for select
using (
  exists (
    select 1
    from public.client_profiles admin_profile
    where admin_profile.user_id = auth.uid()
      and admin_profile.role = 'admin'
  )
);

insert into public.client_profiles (
  user_id,
  email,
  full_name,
  customer_no,
  site,
  job_title,
  team_name,
  focus_area,
  timezone,
  avatar_emoji,
  role
)
select
  u.id,
  u.email,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(u.email, 'Customer'), '@', 1)),
  upper(left(u.id::text, 8)),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'site'), ''), 'Not specified'),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'job_title'), ''), 'Sustainability Lead'),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'team_name'), ''), 'Operations'),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'focus_area'), ''), 'Supplier decarbonisation'),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'timezone'), ''), 'AEST (UTC+10)'),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'avatar_emoji'), ''), '🌿'),
  case when lower(coalesce(u.email, '')) = 'admin1@atlasflow.edu.au' then 'admin' else 'client' end
from auth.users u
on conflict (user_id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  customer_no = excluded.customer_no,
  site = excluded.site,
  job_title = excluded.job_title,
  team_name = excluded.team_name,
  focus_area = excluded.focus_area,
  timezone = excluded.timezone,
  avatar_emoji = excluded.avatar_emoji,
  role = excluded.role;

create or replace function public.handle_new_client_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.client_profiles (
    user_id,
    email,
    full_name,
    customer_no,
    site,
    job_title,
    team_name,
    focus_area,
    timezone,
    avatar_emoji,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, 'Customer'), '@', 1)),
    upper(left(new.id::text, 8)),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'site'), ''), 'Not specified'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'job_title'), ''), 'Sustainability Lead'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'team_name'), ''), 'Operations'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'focus_area'), ''), 'Supplier decarbonisation'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'timezone'), ''), 'AEST (UTC+10)'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'avatar_emoji'), ''), '🌿'),
    case when lower(coalesce(new.email, '')) = 'admin1@atlasflow.edu.au' then 'admin' else 'client' end
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    customer_no = excluded.customer_no,
    site = excluded.site,
    job_title = excluded.job_title,
    team_name = excluded.team_name,
    focus_area = excluded.focus_area,
    timezone = excluded.timezone,
    avatar_emoji = excluded.avatar_emoji,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_client_profile on auth.users;
create trigger on_auth_user_created_client_profile
after insert on auth.users
for each row
execute function public.handle_new_client_profile();
