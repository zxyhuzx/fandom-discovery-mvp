begin;
create function public.my_subscription_feed(work_filter text default '',status_filter text default '',before_time timestamptz default null,before_id uuid default null,page_size integer default 30)
returns setof public.goods_posts language sql stable security invoker set search_path='' as $$
 select g.* from public.goods_posts g
 where auth.uid() is not null and g.is_published and not g.is_test
 and (work_filter='' or public.normalize_work(g.work_name)=public.normalize_work(work_filter))
 and (status_filter='' or g.sale_status=status_filter)
 and (before_time is null or (g.created_at,g.id)<(before_time,before_id))
 and exists(select 1 from public.user_interests i where i.user_id=auth.uid()
   and public.normalize_work(i.work_name)=public.normalize_work(g.work_name)
   and (i.character_name='' or public.normalize_character(i.work_name,i.character_name) in (select public.normalize_character(g.work_name,c) from unnest(g.character_names) c)))
 order by g.created_at desc,g.id desc limit greatest(1,least(coalesce(page_size,30),50))+1;
$$;
revoke all on function public.my_subscription_feed(text,text,timestamptz,uuid,integer) from public,anon;
grant execute on function public.my_subscription_feed(text,text,timestamptz,uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;
