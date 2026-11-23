begin;
create or replace function public.home_goods_feed(page_size integer,hide_completed boolean)
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
 and (not hide_completed or (g.sale_status<>'closed' and coalesce(g.sale_end,(g.sale_end_date+1)::timestamp at time zone 'Asia/Seoul','infinity'::timestamptz)>now()))
 group by g.id
 order by count(v.visitor_id) desc,g.created_at desc,g.id desc
 limit greatest(1,least(coalesce(page_size,10),30));
$$;
revoke all on function public.home_goods_feed(integer,boolean) from public;
grant execute on function public.home_goods_feed(integer,boolean) to anon,authenticated;
notify pgrst,'reload schema';
commit;
