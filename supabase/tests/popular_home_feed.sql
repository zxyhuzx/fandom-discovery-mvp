begin;
insert into public.goods_posts(id,title,source_url,work_name,character_names,sale_status,is_published,is_test) values
 ('00000000-0000-4000-8000-000000000701','popular fixture 1','https://example.invalid/tabs/1','하이큐!!',array['히나타 쇼요'],'open',true,false),
 ('00000000-0000-4000-8000-000000000702','popular fixture 2','https://example.invalid/tabs/2','하이큐!!',array['히나타 쇼요'],'open',true,false),
 ('00000000-0000-4000-8000-000000000703','zero views','https://example.invalid/tabs/3','하이큐!!',array['히나타 쇼요'],'open',true,false),
 ('00000000-0000-4000-8000-000000000704','draft','https://example.invalid/tabs/4','하이큐!!',array['히나타 쇼요'],'open',false,false),
 ('00000000-0000-4000-8000-000000000705','test','https://example.invalid/tabs/5','하이큐!!',array['히나타 쇼요'],'open',true,true);
select public.record_goods_view('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000711');
select public.record_goods_view('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000712');
select public.record_goods_view('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000712');
select public.record_goods_view('00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000711');
-- Even malformed internal metrics may not make drafts/test posts public.
insert into private.goods_daily_views(goods_post_id,visitor_id) values
 ('00000000-0000-4000-8000-000000000704','00000000-0000-4000-8000-000000000711'),
 ('00000000-0000-4000-8000-000000000705','00000000-0000-4000-8000-000000000711');
set local role anon;
do $$ declare ordered text[];begin
 select array_agg(post->>'id') into ordered from public.popular_goods_feed(50) where post->>'id' in ('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000702');
 assert ordered=array['00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000702'],'actual popularity order failed';
 assert (select view_count=2 from public.popular_goods_feed(50) where post->>'id'='00000000-0000-4000-8000-000000000701'),'daily dedup count failed';
 assert not exists(select 1 from public.popular_goods_feed(50) where post->>'id' in ('00000000-0000-4000-8000-000000000703','00000000-0000-4000-8000-000000000704','00000000-0000-4000-8000-000000000705')),'zero-view, unpublished or test ranking leaked';
 assert not exists(select 1 from public.popular_goods_feed(50) where post ?| array['created_by','visitor_id','user_id','work_key']),'private metadata leaked';
 begin perform * from private.goods_daily_views;raise exception 'visitor data readable';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: real positive counts, correct popularity order, duplicate views, zero/draft/test exclusion, private identifiers; fixtures rolled back' as result;
