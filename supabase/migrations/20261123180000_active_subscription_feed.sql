begin;
create or replace function public.my_subscription_feed(work_filter text,status_filter text,before_time timestamptz,before_id uuid,page_size integer,hide_completed boolean)
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
 and (status_filter='' or ((case when coalesce(g.sale_end,(g.sale_end_date+1)::timestamp at time zone 'Asia/Seoul')<=now() then 'closed' when g.sale_start>now() then case when g.sale_status like 'survey_%' then 'survey_planned' else 'planned' end else g.sale_status end)=status_filter or (status_filter='planned' and (case when coalesce(g.sale_end,(g.sale_end_date+1)::timestamp at time zone 'Asia/Seoul')<=now() then 'closed' when g.sale_start>now() then case when g.sale_status like 'survey_%' then 'survey_planned' else 'planned' end else g.sale_status end)='survey_planned')))
 and (not coalesce(hide_completed,true) or (case when coalesce(g.sale_end,(g.sale_end_date+1)::timestamp at time zone 'Asia/Seoul')<=now() then 'closed' when g.sale_start>now() then case when g.sale_status like 'survey_%' then 'survey_planned' else 'planned' end else g.sale_status end)<>'closed')
 and (before_time is null or (g.created_at,g.id)<(before_time,before_id))
 and exists(select 1 from preferences i where i.work_key=g.work_key
  and (i.character_key='' or exists(select 1 from unnest(g.character_names) c
    where public.feed_character_key(g.work_key,c)=i.character_key)))
 order by g.created_at desc,g.id desc limit greatest(1,least(coalesce(page_size,30),50))+1;
end $$;
revoke all on function public.my_subscription_feed(text,text,timestamptz,uuid,integer,boolean) from public,anon;
grant execute on function public.my_subscription_feed(text,text,timestamptz,uuid,integer,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
