begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function public.normalize_keyword(value text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lower(regexp_replace(normalize(coalesce(value, ''), NFKC), '[[:space:]!！:：·・]+', '', 'g'));
$$;
create function public.normalize_work(value text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select case public.normalize_keyword(value)
    when '하이큐' then 'haikyu' when 'haikyuu' then 'haikyu'
    when '주술' then 'jujutsu' when '주술회전' then 'jujutsu' when 'jjk' then 'jujutsu'
    when '귀칼' then 'demonslayer' when '귀멸' then 'demonslayer' when '귀멸의칼날' then 'demonslayer'
    when '원신' then 'genshin' when 'genshinimpact' then 'genshin'
    when '전독시' then 'orv' when '전지적독자시점' then 'orv'
    when '블루록' then 'bluelock'
    when '쿠농' then 'kuroko' when '쿠로코의농구' then 'kuroko'
    when '체인소맨' then 'chainsaw' when 'chainsawman' then 'chainsaw'
    when '붕괴스타레일' then 'starrail' when '스타레일' then 'starrail' when '붕스' then 'starrail' when 'hsr' then 'starrail'
    when '젠레스존제로' then 'zzz' when '젠레스' then 'zzz' when '젠존제' then 'zzz'
    when '나혼자만레벨업' then 'sololeveling' when '나혼렙' then 'sololeveling'
    when '내가키운s급들' then 'sclass' when '내스급' then 'sclass'
    else public.normalize_keyword(value) end;
$$;
create function private.valid_character_names(names text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(cardinality(names) <= 30 and not exists (
    select 1 from unnest(names) item where item is null or char_length(btrim(item)) not between 1 and 80
  ), false);
$$;

-- Admin membership can only be changed through trusted SQL / service credentials.
create table private.app_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table private.app_admins enable row level security;
revoke all on private.app_admins from public,anon,authenticated;
create function public.is_app_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (select 1 from private.app_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated, service_role;

create table public.user_interests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 work_name text not null check(char_length(btrim(work_name)) between 1 and 120),
 character_name text not null default '' check(char_length(character_name) <= 80),
 work_key text generated always as (public.normalize_work(work_name)) stored,
 character_key text generated always as (public.normalize_keyword(character_name)) stored,
 created_at timestamptz not null default now(),
 check(public.normalize_work(work_name)<>''),
 check(character_name='' or public.normalize_keyword(character_name)<>''),
 constraint user_interests_unique unique(user_id, work_key, character_key)
);
create table public.goods_posts (
 id uuid primary key default gen_random_uuid(),
 title text not null check(char_length(btrim(title)) between 1 and 200),
 source_url text not null check (source_url ~ '^https://[^[:space:]/?#@]+[^[:space:]]*$'),
 source_key text generated always as (regexp_replace(split_part(btrim(source_url),'#',1), '/+$', '')) stored unique,
 work_name text not null check(char_length(btrim(work_name)) between 1 and 120),
 work_key text generated always as (public.normalize_work(work_name)) stored,
 character_names text[] not null default '{}' check(private.valid_character_names(character_names)),
 sale_status text not null check(sale_status in ('planned','open','survey_planned','survey_open','closed')),
 sale_info text not null default '' check(char_length(sale_info) <= 2000),
 sale_start timestamptz,
 sale_end timestamptz,
 thumbnail_url text check(thumbnail_url is null or thumbnail_url ~ '^https://[^[:space:]/?#@]+[^[:space:]]*$'),
 is_published boolean not null default false,
 created_by uuid default auth.uid() references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 check(sale_end is null or sale_start is null or sale_end >= sale_start)
);
create index goods_posts_work on public.goods_posts(work_key,created_at desc);
create index user_interests_matching on public.user_interests(work_key,character_key);

create table public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 goods_post_id uuid not null references public.goods_posts(id) on delete cascade,
 title text not null,
 body text not null,
 source_url text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(user_id, goods_post_id)
);
create index notifications_inbox on public.notifications(user_id,created_at desc);
create table public.delivery_queue (
 id uuid primary key default gen_random_uuid(),
 notification_id uuid not null references public.notifications(id) on delete cascade,
 channel text not null default 'kakao_mock' check(channel = 'kakao_mock'),
 status text not null default 'pending' check(status in ('pending','mocked','cancelled')),
 attempts integer not null default 0 check(attempts between 0 and 1),
 created_at timestamptz not null default now(),
 processed_at timestamptz,
 provider_message_id text,
 unique(notification_id, channel)
);
create index delivery_queue_pending on public.delivery_queue(created_at) where status='pending';
create table public.delivery_attempts (
 id uuid primary key default gen_random_uuid(),
 queue_id uuid not null references public.delivery_queue(id) on delete cascade,
 mode text not null check(mode='mock'),
 result text not null check(result='mocked'),
 created_at timestamptz not null default now(),
 unique(queue_id)
);

-- Trigger runs atomically with publication: multiple interests still produce only one alert.
create function private.match_new_goods() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if not new.is_published or new.sale_status='closed' then return new; end if;
 if TG_OP='UPDATE' then
   if old.is_published then return new; end if;
 end if;
 insert into public.notifications(user_id, goods_post_id, title, body, source_url)
 select distinct i.user_id, new.id, new.title,
   new.work_name || ' · ' || coalesce(nullif(new.sale_info,''),'새 굿즈 정보가 등록됐어요.'), new.source_url
 from public.user_interests i
 where i.work_key = new.work_key and (
   i.character_key='' or exists (
     select 1 from unnest(new.character_names) c where public.normalize_keyword(c)=i.character_key
   )
 ) on conflict(user_id, goods_post_id) do nothing;
 insert into public.delivery_queue(notification_id)
 select n.id from public.notifications n where n.goods_post_id=new.id
 on conflict(notification_id,channel) do nothing;
 return new;
end;
$$;
create trigger match_on_publication after insert or update of is_published on public.goods_posts
 for each row execute function private.match_new_goods();

-- Only mock processing exists. Lock rows to make simultaneous workers idempotent.
create function public.process_mock_queue(batch_size integer default 20) returns integer
language plpgsql security definer set search_path = '' as $$
declare job record; processed integer := 0;
begin
 if not public.is_app_admin() and coalesce(auth.role(),'') <> 'service_role' then
   raise exception 'Administrator access required' using errcode='42501';
 end if;
 if batch_size is null or batch_size not between 1 and 100 then raise exception 'Invalid batch size'; end if;
 for job in select q.id, q.notification_id from public.delivery_queue q
   where q.status='pending' order by q.created_at limit batch_size for update skip locked
 loop
   -- Suppress mock delivery if the user unsubscribed or the post was withdrawn.
   if not exists (
     select 1 from public.notifications n join public.goods_posts g on g.id=n.goods_post_id
     join public.user_interests i on i.user_id=n.user_id and i.work_key=g.work_key
     where n.id=job.notification_id and g.is_published and g.sale_status<>'closed'
       and (i.character_key='' or exists(select 1 from unnest(g.character_names) c where public.normalize_keyword(c)=i.character_key))
   ) then
     update public.delivery_queue set status='cancelled',processed_at=now() where id=job.id;
   else
     update public.delivery_queue set status='mocked',attempts=1,processed_at=now(),
       provider_message_id='mock:'||job.id::text where id=job.id;
     insert into public.delivery_attempts(queue_id,mode,result) values(job.id,'mock','mocked') on conflict do nothing;
   end if;
   processed:=processed+1;
 end loop;
 return processed;
end;
$$;
revoke all on function public.process_mock_queue(integer) from public,anon;
grant execute on function public.process_mock_queue(integer) to authenticated,service_role;

-- No insert/update privilege for notifications or delivery records from browsers.
alter table public.user_interests enable row level security;
alter table public.goods_posts enable row level security;
alter table public.notifications enable row level security;
alter table public.delivery_queue enable row level security;
alter table public.delivery_attempts enable row level security;
revoke all on public.user_interests,public.goods_posts,public.notifications,public.delivery_queue,public.delivery_attempts from public,anon,authenticated;
grant select,delete on public.user_interests to authenticated;
grant insert(work_name,character_name) on public.user_interests to authenticated;
create policy interests_select on public.user_interests for select to authenticated using(user_id=(select auth.uid()));
create policy interests_insert on public.user_interests for insert to authenticated with check(user_id=(select auth.uid()));
create policy interests_delete on public.user_interests for delete to authenticated using(user_id=(select auth.uid()));
grant select on public.goods_posts to authenticated;
grant insert(title,source_url,work_name,character_names,sale_status,sale_info,sale_start,sale_end,thumbnail_url,is_published) on public.goods_posts to authenticated;
grant update(is_published) on public.goods_posts to authenticated;
create policy goods_read on public.goods_posts for select to authenticated using(is_published or public.is_app_admin());
create policy goods_insert on public.goods_posts for insert to authenticated with check(public.is_app_admin() and created_by=(select auth.uid()));
create policy goods_publish on public.goods_posts for update to authenticated using(public.is_app_admin()) with check(public.is_app_admin());
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
create policy notifications_select on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy notifications_read on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select on public.delivery_queue,public.delivery_attempts to authenticated;
create policy queue_select on public.delivery_queue for select to authenticated using(public.is_app_admin() or exists(select 1 from public.notifications n where n.id=notification_id and n.user_id=(select auth.uid())));
create policy attempts_select on public.delivery_attempts for select to authenticated using(public.is_app_admin());

-- Explicit server privileges, independent of project default grants.
grant all on public.user_interests,public.goods_posts,public.notifications,public.delivery_queue,public.delivery_attempts to service_role;
revoke all on function private.match_new_goods(),private.valid_character_names(text[]) from public;
-- CHECK validation is needed for administrators inserting from authenticated role.
grant usage on schema private to authenticated,service_role;
grant execute on function private.valid_character_names(text[]) to authenticated,service_role;
revoke all on function public.normalize_keyword(text),public.normalize_work(text) from public;
grant execute on function public.normalize_keyword(text),public.normalize_work(text) to authenticated,service_role;
notify pgrst,'reload schema';
commit;
