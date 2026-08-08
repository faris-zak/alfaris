create table public.career_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_data jsonb not null default '{"fullName":"","email":"","phone":"","location":"","links":[],"privateEvidence":[]}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.career_profiles enable row level security;
alter table public.career_profiles force row level security;

revoke all on public.career_profiles from anon;
revoke all on public.career_profiles from authenticated;
grant select, update on public.career_profiles to authenticated;

create policy "owner_selects_own_career_profile"
on public.career_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "owner_updates_own_career_profile"
on public.career_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.touch_career_profile()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.version = old.version + 1;
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_career_profile_before_update
before update on public.career_profiles
for each row execute function public.touch_career_profile();
