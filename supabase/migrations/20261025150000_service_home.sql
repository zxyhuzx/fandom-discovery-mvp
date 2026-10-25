begin;
-- Public visitors can read published goods, never drafts or private account data.
grant select(id,title,source_url,work_name,character_names,sale_status,sale_info,sale_start,sale_end,thumbnail_url,is_published,created_at) on public.goods_posts to anon;
create policy goods_public_read on public.goods_posts for select to anon using(is_published);
alter table public.goods_posts add column seller_name text not null default '' check(char_length(seller_name)<=120), add column platform_name text not null default '' check(char_length(platform_name)<=80), add column is_test boolean not null default false;
grant select(seller_name,platform_name,is_test) on public.goods_posts to anon;
grant insert(seller_name,platform_name,is_test) on public.goods_posts to authenticated;
create table public.user_preferences (
 user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 onboarding_completed boolean not null default false,
 web_notifications boolean not null default true
);
alter table public.user_preferences enable row level security;
revoke all on public.user_preferences from public,anon,authenticated;
grant select on public.user_preferences to authenticated;
grant insert(onboarding_completed,web_notifications),update(onboarding_completed,web_notifications) on public.user_preferences to authenticated;
create policy preferences_read on public.user_preferences for select to authenticated using(user_id=(select auth.uid()));
create policy preferences_insert on public.user_preferences for insert to authenticated with check(user_id=(select auth.uid()));
create policy preferences_update on public.user_preferences for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant all on public.user_preferences to service_role;
-- Replacing an interest list is a single transaction; no partial saves.
create function public.save_my_interests(items jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
 if items is null or jsonb_typeof(items)<>'array' or jsonb_array_length(items)>100 then raise exception 'Invalid interest list' using errcode='22023'; end if;
 delete from public.user_interests where user_id=auth.uid();
 insert into public.user_interests(user_id,work_name,character_name)
 select auth.uid(),btrim(x.work_name),coalesce(btrim(x.character_name),'') from jsonb_to_recordset(items) as x(work_name text,character_name text)
 on conflict(user_id,work_key,character_key) do nothing;
 insert into public.user_preferences(user_id,onboarding_completed) values(auth.uid(),true)
 on conflict(user_id) do update set onboarding_completed=true;
end $$;
revoke all on function public.save_my_interests(jsonb) from public,anon;
grant execute on function public.save_my_interests(jsonb) to authenticated;
-- Notification settings apply to future goods; previous notifications remain readable.
create or replace function private.match_new_goods() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.is_published or new.sale_status='closed' or new.is_test then return new; end if;
 if TG_OP='UPDATE' then if old.is_published then return new; end if; end if;
 insert into public.notifications(user_id,goods_post_id,title,body,source_url)
 select distinct i.user_id,new.id,new.title,new.work_name||' · '||coalesce(nullif(new.sale_info,''),'새 굿즈 정보가 등록됐어요.'),new.source_url
 from public.user_interests i left join public.user_preferences p on p.user_id=i.user_id
 where coalesce(p.web_notifications,true) and i.work_key=new.work_key
 and (i.character_key='' or exists(select 1 from unnest(new.character_names) c where public.normalize_keyword(c)=i.character_key))
 on conflict(user_id,goods_post_id) do nothing;
 insert into public.delivery_queue(notification_id) select n.id from public.notifications n where n.goods_post_id=new.id on conflict(notification_id,channel) do nothing;
 return new;
end $$;
notify pgrst,'reload schema';
commit;
