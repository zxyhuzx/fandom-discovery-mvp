begin;
create table private.goods_daily_views (
 goods_post_id uuid not null references public.goods_posts(id) on delete cascade,
 visitor_id uuid not null,
 viewed_on date not null default current_date,
 primary key(goods_post_id,visitor_id,viewed_on)
);
alter table private.goods_daily_views enable row level security;
revoke all on private.goods_daily_views from public,anon,authenticated;
create function public.record_goods_view(post_id uuid,visitor uuid) returns void language sql security definer set search_path='' as $$
 insert into private.goods_daily_views(goods_post_id,visitor_id)
 select g.id,visitor from public.goods_posts g where g.id=post_id and g.is_published and not g.is_test and visitor is not null
 on conflict do nothing;
$$;
create function public.goods_popularity(post_ids uuid[]) returns table(goods_post_id uuid,view_count bigint) language sql stable security definer set search_path='' as $$
 select g.id,count(v.visitor_id) from public.goods_posts g left join private.goods_daily_views v on v.goods_post_id=g.id
 where g.id=any(post_ids[1:100]) and g.is_published and not g.is_test group by g.id;
$$;
revoke all on function public.record_goods_view(uuid,uuid),public.goods_popularity(uuid[]) from public;
grant execute on function public.record_goods_view(uuid,uuid),public.goods_popularity(uuid[]) to anon,authenticated;
notify pgrst,'reload schema';
commit;
