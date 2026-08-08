begin;
select plan(9);

select has_table('public', 'career_profiles', 'career_profiles exists');
select policies_are('public', 'career_profiles', array['owner_selects_own_career_profile', 'owner_updates_own_career_profile']);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@test.local', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@test.local', '', now(), now(), now());
insert into public.career_profiles (user_id) values ('00000000-0000-4000-8000-000000000001');

set local role anon;
select throws_ok($$select * from public.career_profiles$$, '42501', null, 'anonymous cannot select');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.career_profiles), 0, 'unrelated user sees no rows');
select lives_ok($$update public.career_profiles set profile_data = '{}' where user_id = '00000000-0000-4000-8000-000000000001'$$, 'unrelated update changes nothing');
select throws_ok($$insert into public.career_profiles (user_id) values ('00000000-0000-4000-8000-000000000002')$$, '42501', null, 'authenticated insert denied');
select throws_ok($$delete from public.career_profiles where user_id = '00000000-0000-4000-8000-000000000001'$$, '42501', null, 'authenticated delete denied');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.career_profiles), 1, 'owner selects own row');
select lives_ok($$update public.career_profiles set profile_data = '{"fullName":"Owner"}' where user_id = '00000000-0000-4000-8000-000000000001'$$, 'owner updates own row');

select * from finish();
rollback;
