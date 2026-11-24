begin;
alter table public.goods_posts add column goods_origin text not null default 'unknown' check(goods_origin in ('official','fanmade','unknown'));
grant select(goods_origin) on public.goods_posts to anon,authenticated;
-- Only reviewed classifications are published. No client-side official-goods impersonation.
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2124762483026174192' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2124699817482096788' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2124699469841391784' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2124683424875401434' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2124680251045503151' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2123672692167733673' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2123204609472880973' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2124765190315249679' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2124765967058403665' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124036599126372687' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2124765756269449578' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2124760291489550649' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2124770697390223414' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124749908649615586' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124745112496537626' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2124700131748610277' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124017348042731580' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124110583926861836' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2124705515104305563' and source_kind='x_discovery';
update public.goods_posts set goods_origin='official' where source_url='https://x.com/i/status/2124744761944764567' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2119779218817208588' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2119461147795681709' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2119106208238117232' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2119042573981684172' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2118975530640998678' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2118691622338916480' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2118617801586012290' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2118313611873632386' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2118282776982286363' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124495673508999663' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124472239957623198' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124430182539030601' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124368873847922841' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124125088878325766' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124123719086051802' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124086224797524329' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124079746195800205' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2124068525686096214' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2123803463998210099' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2123777152613257609' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2123730260709757231' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2123672981796946132' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2123646561020490177' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2123411217004073083' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2123379109069996328' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2123346376314827088' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2123262694983971286' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2123039847866835051' and source_kind='x_discovery';
update public.goods_posts set goods_origin='fanmade' where source_url='https://x.com/i/status/2123017583465279871' and source_kind='x_discovery';
create or replace function public.home_goods_feed(page_size integer,hide_completed boolean)
returns table(post jsonb,view_count bigint)
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'id',g.id,'title',g.title,'source_url',g.source_url,'work_name',g.work_name,
 'character_names',g.character_names,'sale_status',g.sale_status,'sale_info',g.sale_info,
 'goods_origin',g.goods_origin,'seller_type',g.seller_type,'is_stock_notice',g.is_stock_notice,'sale_method',g.sale_method,'shipping_estimate',g.shipping_estimate,'sale_start',g.sale_start,'sale_end',g.sale_end,'sale_end_date',g.sale_end_date,'thumbnail_url',g.thumbnail_url,
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
