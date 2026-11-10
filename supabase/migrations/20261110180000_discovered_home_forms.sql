begin;
alter table public.goods_posts
 add column source_kind text not null default 'creator' check(source_kind in ('creator','x_discovery')),
 add column source_checked_at timestamptz;
grant select(source_kind,source_checked_at) on public.goods_posts to anon,authenticated;
alter table public.goods_posts drop constraint goods_posts_sale_status_check;
alter table public.goods_posts add constraint goods_posts_sale_status_check check(sale_status in ('planned','open','survey_planned','survey_open','closed','unverified'));
-- Discovery cards never impersonate a creator and do not enqueue publication notifications.
alter table public.goods_posts add constraint discovered_goods_no_owner check(source_kind<>'x_discovery' or (created_by is null and not is_test));
drop trigger match_on_publication on public.goods_posts;
create trigger match_on_publication after insert or update of is_published on public.goods_posts
 for each row when(new.source_kind='creator') execute function private.match_new_goods();
create function public.home_goods_feed(page_size integer default 10)
returns table(post jsonb,view_count bigint)
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'id',g.id,'title',g.title,'source_url',g.source_url,'work_name',g.work_name,
 'character_names',g.character_names,'sale_status',g.sale_status,'sale_info',g.sale_info,
 'sale_start',g.sale_start,'sale_end',g.sale_end,'thumbnail_url',g.thumbnail_url,
 'is_published',g.is_published,'created_at',g.created_at,'seller_name',g.seller_name,
 'platform_name',g.platform_name,'is_test',g.is_test,'genre_name',g.genre_name,
 'source_kind',g.source_kind,'source_checked_at',g.source_checked_at),count(v.visitor_id)
 from public.goods_posts g left join private.goods_daily_views v on v.goods_post_id=g.id
 where g.is_published and not g.is_test and g.deleted_at is null
 group by g.id
 order by count(v.visitor_id) desc,g.created_at desc,g.id desc
 limit greatest(1,least(coalesce(page_size,10),30));
$$;
revoke all on function public.home_goods_feed(integer) from public;
grant execute on function public.home_goods_feed(integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
