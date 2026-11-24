begin;
alter table public.goods_posts add column seller_type text not null default 'unknown' check(seller_type in ('shop','fan_creator','official','unknown'));
alter table public.goods_posts add column is_stock_notice boolean not null default false check(not is_stock_notice or seller_type='shop');
grant select(seller_type,is_stock_notice) on public.goods_posts to anon,authenticated;
-- Review-only classification: authenticated clients cannot assign or impersonate seller types.
update public.goods_posts set seller_type='official',is_stock_notice=false where id='a0251de3-6925-5a31-a17e-6d59eebe40c1' and source_kind='x_discovery';
update public.goods_posts set seller_type='official',is_stock_notice=false where id='53b5a58a-191a-5601-b4ea-e7e61ddffd3c' and source_kind='x_discovery';
update public.goods_posts set seller_type='shop',is_stock_notice=true where id='78b90aa7-7baa-58b0-a327-828fa9179b17' and source_kind='x_discovery';
update public.goods_posts set seller_type='shop',is_stock_notice=true where id='e4f79ba5-edbe-5120-bb61-31e80fa35801' and source_kind='x_discovery';
update public.goods_posts set seller_type='shop',is_stock_notice=false where id='f70edbcb-0b47-55ca-a535-5b8bb2cd2034' and source_kind='x_discovery';
update public.goods_posts set seller_type='shop',is_stock_notice=false where id='38564fd3-d1b6-5c09-bbac-d9e8ec11db9e' and source_kind='x_discovery';
update public.goods_posts set seller_type='fan_creator',is_stock_notice=false where id='82b064be-6165-581a-81c7-c121f37c15f5' and source_kind='x_discovery';
update public.goods_posts set seller_type='shop',is_stock_notice=false where id='795a3de9-e882-5b64-8282-03d75f82158c' and source_kind='x_discovery';
update public.goods_posts set seller_type='shop',is_stock_notice=false where id='c7c2b0e8-1057-5ba3-9bd9-9a40785c4829' and source_kind='x_discovery';
update public.goods_posts set seller_type='shop',is_stock_notice=false where id='e7d32aff-d226-5d84-82f2-4d0b49d9c14e' and source_kind='x_discovery';
update public.goods_posts set seller_type='fan_creator',is_stock_notice=false where id='f602109e-a215-51c7-bd77-c53f7525af4b' and source_kind='x_discovery';
update public.goods_posts set seller_type='fan_creator',is_stock_notice=false where id='ebe25d0a-848d-5331-9380-a6453edd9832' and source_kind='x_discovery';
update public.goods_posts set seller_type='shop',is_stock_notice=false where id='756937e2-e7c9-5501-b193-0ddab8679b75' and source_kind='x_discovery';
update public.goods_posts set seller_type='shop',is_stock_notice=false where id='e45f889d-04fb-5df6-b6e7-b50ca7fd3299' and source_kind='x_discovery';
update public.goods_posts set seller_type='shop',is_stock_notice=true where id='f53ee8fc-c076-5d35-82e9-938fdbd7c4b5' and source_kind='x_discovery';
create or replace function public.home_goods_feed(page_size integer,hide_completed boolean)
returns table(post jsonb,view_count bigint)
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'id',g.id,'title',g.title,'source_url',g.source_url,'work_name',g.work_name,
 'character_names',g.character_names,'sale_status',g.sale_status,'sale_info',g.sale_info,
 'seller_type',g.seller_type,'is_stock_notice',g.is_stock_notice,'sale_method',g.sale_method,'shipping_estimate',g.shipping_estimate,'sale_start',g.sale_start,'sale_end',g.sale_end,'sale_end_date',g.sale_end_date,'thumbnail_url',g.thumbnail_url,
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
