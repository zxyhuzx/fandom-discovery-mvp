begin;

create table public.launch_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  contact text not null check (
    char_length(contact) between 3 and 254
    and contact ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  message text not null default '' check (char_length(message) <= 1000)
);

alter table public.launch_signups enable row level security;
alter table public.launch_signups force row level security;

revoke all on table public.launch_signups from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant insert (name, contact, message) on public.launch_signups to anon, authenticated;

create policy "Visitors may submit new applications"
  on public.launch_signups for insert to anon, authenticated
  with check (
    char_length(btrim(name)) between 1 and 60
    and char_length(contact) between 3 and 254
    and char_length(message) <= 1000
  );

comment on table public.launch_signups is '덕후의 발견 정식 버전 안내 신청. 브라우저는 추가만 가능하며 조회·수정·삭제는 금지.';
notify pgrst, 'reload schema';
commit;
