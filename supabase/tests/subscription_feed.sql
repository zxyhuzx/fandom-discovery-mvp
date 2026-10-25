begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000501','subscription-fixture@example.invalid'),
 ('00000000-0000-4000-8000-000000000502','subscription-other@example.invalid');
-- Historical publications exist before the user subscribes: visible in feed, no retroactive alerts.
insert into public.goods_posts(id,title,source_url,work_name,character_names,sale_status,is_published,is_test,created_at) values
 ('00000000-0000-4000-8000-000000000511','historical 1','https://example.invalid/sub/1','ハイキュー!!',array['日向翔陽'],'open',true,false,'2026-10-25'),
 ('00000000-0000-4000-8000-000000000512','historical 2','https://example.invalid/sub/2','하이큐!!',array['히나타 쇼요'],'closed',true,false,'2026-10-25'),
 ('00000000-0000-4000-8000-000000000513','unmatched character','https://example.invalid/sub/3','하이큐!!',array['카게야마 토비오'],'open',true,false,'2026-10-24'),
 ('00000000-0000-4000-8000-000000000514','draft','https://example.invalid/sub/4','하이큐!!',array['히나타 쇼요'],'open',false,false,now()),
 ('00000000-0000-4000-8000-000000000515','test','https://example.invalid/sub/5','하이큐!!',array['히나타 쇼요'],'open',true,true,now()),
 ('00000000-0000-4000-8000-000000000516','other work','https://example.invalid/sub/6','원신',array['종려'],'open',true,false,now());
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000501","role":"authenticated"}',true);
set local role authenticated;
select public.save_my_interests('[{"work_name":"haikyuu","character_name":"Shoyo Hinata"}]');
do $$ begin
 assert (select count(*)=2 from public.my_subscription_feed()),'own subscription matching or exclusions failed';
 assert (select count(*)=1 from public.my_subscription_feed(status_filter=>'open')),'status filter failed';
 assert (select count(*)=0 from public.my_subscription_feed(work_filter=>'원신')),'unsubscribed work leak';
 assert (select id='00000000-0000-4000-8000-000000000512' from public.my_subscription_feed() limit 1),'tie order unstable';
 assert (select count(*)=1 from public.my_subscription_feed(before_time=>'2026-10-25',before_id=>'00000000-0000-4000-8000-000000000512')),'keyset paging failed';
 assert (select count(*)=0 from public.notifications),'feed or subscribe generated retroactive alerts';
end $$;
reset role;
insert into public.goods_posts(id,title,source_url,work_name,character_names,sale_status,is_published) values
 ('00000000-0000-4000-8000-000000000517','new publication','https://example.invalid/sub/7','하이큐!!',array['히나타 쇼요'],'open',true);
update public.goods_posts set is_published=false where id='00000000-0000-4000-8000-000000000517';
update public.goods_posts set is_published=true where id='00000000-0000-4000-8000-000000000517';
set local role authenticated;
do $$ begin
 assert (select count(*)=3 from public.my_subscription_feed()),'new publication missing from feed';
 assert (select count(*)=1 from public.notifications),'duplicate publication notification';
end $$;
select public.save_my_interests('[{"work_name":"하이큐!!","character_name":""},{"work_name":"하이큐!!","character_name":"히나타 쇼요"}]');
do $$ begin assert (select count(*)=4 from public.my_subscription_feed()),'overlapping subscriptions duplicate goods';end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000502","role":"authenticated"}',true);
set local role authenticated;
do $$ begin assert (select count(*)=0 from public.my_subscription_feed()),'other user subscription leak';end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.my_subscription_feed();raise exception 'anonymous RPC accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: own subscription feed, aliases, publication/test exclusions, status, stable pagination, no retroactive or duplicate alerts; fixtures rolled back' as result;
