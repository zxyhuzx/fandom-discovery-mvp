begin;
do $$
begin
 assert (select count(*)=9 from public.goods_posts where source_kind='x_discovery'),'Discovery seed count';
 assert not exists(select 1 from public.goods_posts where source_kind='x_discovery' and (created_by is not null or is_test or not is_published)),'Discovery ownership or sample contamination';
 assert not exists(select 1 from public.notifications n join public.goods_posts g on g.id=n.goods_post_id where g.source_kind='x_discovery'),'Discovery import must not enqueue notifications';
 assert not has_column_privilege('authenticated','public.goods_posts','source_kind','INSERT'),'User can forge discovery origin';
 assert not has_column_privilege('authenticated','public.goods_posts','source_kind','UPDATE'),'User can overwrite discovery origin';
 assert not exists(select 1 from public.home_goods_feed(30) where post ?| array['created_by','visitor_id','user_id','work_key','deleted_at']),'Private metadata in public feed';
end $$;
set local role anon;
select count(*) as public_real_forms from public.home_goods_feed(10);
select id,title,source_kind from public.goods_posts where source_kind='x_discovery';
rollback;
