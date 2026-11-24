begin;
do $$begin
 assert (select count(*)=3 from public.goods_posts where source_kind='x_discovery' and is_stock_notice),'Expected three reviewed shop stock announcements';
 assert not exists(select 1 from public.goods_posts where is_stock_notice and seller_type<>'shop'),'Invalid shop-stock assignment';
 assert not has_column_privilege('authenticated','public.goods_posts','seller_type','UPDATE'),'Client can impersonate a reviewed seller';
 assert not has_column_privilege('authenticated','public.goods_posts','is_stock_notice','INSERT'),'Client can fabricate stock review';
end$$;
set local role anon;
do $$begin
 assert (select seller_type='shop' and is_stock_notice from public.goods_posts where source_url='https://x.com/i/status/2123672692167733673'),'Shop stock classification missing';
 assert (select bool_and(post ? 'seller_type' and post ? 'is_stock_notice') from public.home_goods_feed(10,true)),'Home omitted classification';
end$$;
rollback;
-- Product origin is reviewed independently of the shop identity.
begin;
do $$begin
 assert not has_column_privilege('authenticated','public.goods_posts','goods_origin','UPDATE'),'Client can self-certify official merchandise';
 assert (select goods_origin='official' from public.goods_posts where source_url='https://x.com/i/status/2123672692167733673'),'Official stock item missing origin';
 assert (select goods_origin='fanmade' from public.goods_posts where source_url='https://x.com/i/status/2119106208238117232'),'Fan publication missing origin';
end$$;
rollback;
