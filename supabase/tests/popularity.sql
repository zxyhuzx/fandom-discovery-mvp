begin;
insert into public.goods_posts(id,title,source_url,work_name,sale_status,is_published) values('00000000-0000-4000-8000-000000000301','view fixture','https://example.invalid/views/public','하이큐','open',true),('00000000-0000-4000-8000-000000000302','view draft','https://example.invalid/views/draft','하이큐','open',false);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select public.record_goods_view('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000311');
select public.record_goods_view('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000311');
select public.record_goods_view('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000311');
do $$ begin
 assert (select view_count=1 from public.goods_popularity(array['00000000-0000-4000-8000-000000000301'::uuid])),'daily duplicate view counted';
 assert not exists(select * from public.goods_popularity(array['00000000-0000-4000-8000-000000000302'::uuid])),'draft metrics exposed';
 begin perform * from private.goods_daily_views;raise exception 'visitor ids exposed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: published-only popularity, daily deduplication, visitor privacy; fixtures rolled back' as result;
