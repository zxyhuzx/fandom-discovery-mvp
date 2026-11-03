begin;
create table public.user_profiles (
 user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 nickname text not null check(char_length(nickname) between 2 and 24 and nickname=btrim(nickname) and nickname !~ '[[:cntrl:]<>]'),
 x_handle text not null default '' check(x_handle='' or x_handle ~ '^[A-Za-z0-9_]{1,15}$'),
 instagram_handle text not null default '' check(instagram_handle='' or (char_length(instagram_handle)<=30 and instagram_handle ~ '^[A-Za-z0-9_]([A-Za-z0-9_.]*[A-Za-z0-9_])?$' and instagram_handle not like '%..%')),
 avatar_path text,
 banner_path text,
 updated_at timestamptz not null default now(),
 constraint avatar_owned_path check(avatar_path is null or avatar_path ~ ('^'||user_id::text||'/avatar/[a-f0-9-]{36}\.(jpg|png|webp)$')),
 constraint banner_owned_path check(banner_path is null or banner_path ~ ('^'||user_id::text||'/banner/[a-f0-9-]{36}\.(jpg|png|webp)$'))
);
alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from anon,authenticated;
grant select,insert,update on public.user_profiles to authenticated;
create policy profiles_own_read on public.user_profiles for select to authenticated using(user_id=(select auth.uid()));
create policy profiles_own_insert on public.user_profiles for insert to authenticated with check(user_id=(select auth.uid()));
create policy profiles_own_update on public.user_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function public.touch_profile_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now();return new;end $$;
create trigger profile_updated before update on public.user_profiles for each row execute function public.touch_profile_updated_at();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('profile-media','profile-media',false,8388608,array['image/jpeg','image/png','image/webp']);
create policy profile_media_own_read on storage.objects for select to authenticated using(bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_media_own_insert on storage.objects for insert to authenticated with check(bucket_id='profile-media' and name ~ ('^'||(select auth.uid())::text||'/(avatar|banner)/[a-f0-9-]{36}\.(jpg|png|webp)$'));
create policy profile_media_own_delete on storage.objects for delete to authenticated using(bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
notify pgrst,'reload schema';
commit;
