begin;
alter table public.goods_posts add column sale_end_date date;
grant select(sale_end_date) on public.goods_posts to anon,authenticated;
create or replace function public.home_goods_feed(page_size integer default 10)
returns table(post jsonb,view_count bigint)
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'id',g.id,'title',g.title,'source_url',g.source_url,'work_name',g.work_name,
 'character_names',g.character_names,'sale_status',g.sale_status,'sale_info',g.sale_info,
 'sale_start',g.sale_start,'sale_end',g.sale_end,'sale_end_date',g.sale_end_date,'thumbnail_url',g.thumbnail_url,
 'is_published',g.is_published,'created_at',g.created_at,'seller_name',g.seller_name,
 'platform_name',g.platform_name,'is_test',g.is_test,'genre_name',g.genre_name,
 'source_kind',g.source_kind,'source_checked_at',g.source_checked_at),count(v.visitor_id)
 from public.goods_posts g left join private.goods_daily_views v on v.goods_post_id=g.id
 where g.is_published and not g.is_test and g.deleted_at is null
 group by g.id
 order by count(v.visitor_id) desc,g.created_at desc,g.id desc
 limit greatest(1,least(coalesce(page_size,10),30));
$$;
create or replace function public.my_subscription_feed(work_filter text default '',status_filter text default '',before_time timestamptz default null,before_id uuid default null,page_size integer default 30)
returns setof public.goods_posts language plpgsql stable security invoker set search_path='' as $$
declare filter_key text;
begin
 if auth.uid() is null then return;end if;
 filter_key:=case when work_filter='' then '' else public.normalize_work(work_filter) end;
 return query
 with preferences as materialized (
  select i.work_key,public.feed_character_key(i.work_key,i.character_name) as character_key
  from public.user_interests i where i.user_id=(select auth.uid())
 )
 select g.* from public.goods_posts g
 where g.is_published and not g.is_test and g.deleted_at is null
 and (filter_key='' or g.work_key=filter_key)
 and (status_filter='' or (case when coalesce(g.sale_end,(g.sale_end_date+1)::timestamp at time zone 'Asia/Seoul')<=now() then 'closed' when g.sale_start>now() then case when g.sale_status like 'survey_%' then 'survey_planned' else 'planned' end else g.sale_status end)=status_filter)
 and (before_time is null or (g.created_at,g.id)<(before_time,before_id))
 and exists(select 1 from preferences i where i.work_key=g.work_key
  and (i.character_key='' or exists(select 1 from unnest(g.character_names) c
    where public.feed_character_key(g.work_key,c)=i.character_key)))
 order by g.created_at desc,g.id desc limit greatest(1,least(coalesce(page_size,30),50))+1;
end $$;
update public.goods_posts set sale_end_date='2026-11-25' where source_url='https://x.com/i/status/2124123719086051802' and source_kind='x_discovery';
update public.goods_posts set sale_end_date='2026-11-23' where source_url='https://x.com/i/status/2124068525686096214' and source_kind='x_discovery';
update public.goods_posts set sale_end_date='2026-11-25' where source_url='https://x.com/i/status/2123730260709757231' and source_kind='x_discovery';
update public.goods_posts set sale_end_date='2026-11-25' where source_url='https://x.com/i/status/2123646561020490177' and source_kind='x_discovery';
update public.goods_posts set sale_end_date='2026-11-30' where source_url='https://x.com/i/status/2123039847866835051' and source_kind='x_discovery';
update public.goods_posts set sale_end_date='2026-11-16' where source_url='https://x.com/i/status/2119779218817208588' and source_kind='x_discovery';
notify pgrst,'reload schema';
commit;
