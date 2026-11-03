begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000901','form-watch-a@example.invalid'),
 ('00000000-0000-4000-8000-000000000902','form-watch-b@example.invalid');
insert into public.goods_posts(id,title,source_url,work_name,sale_status,is_published,is_test) values
 ('00000000-0000-4000-8000-000000000911','watch fixture','https://example.invalid/watch/public','원신','open',true,false),
 ('00000000-0000-4000-8000-000000000912','private watch fixture','https://example.invalid/watch/private','원신','open',false,false),
 ('00000000-0000-4000-8000-000000000913','test watch fixture','https://example.invalid/watch/test','원신','open',true,true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000901","role":"authenticated"}',true);
set local role authenticated;
insert into public.goods_form_watches(goods_post_id) values('00000000-0000-4000-8000-000000000911');
do $$ begin
 assert (select count(*) from public.goods_form_watches)=1,'own read failed';
 begin
 insert into public.goods_form_watches(goods_post_id) values('00000000-0000-4000-8000-000000000911');
 raise exception 'duplicate accepted';exception when unique_violation then null;end;
 begin
 insert into public.goods_form_watches(user_id,goods_post_id) values('00000000-0000-4000-8000-000000000902','00000000-0000-4000-8000-000000000911');
 raise exception 'spoofed owner accepted';exception when insufficient_privilege then null;end;
 begin
 insert into public.goods_form_watches(goods_post_id) values('00000000-0000-4000-8000-000000000912');
 raise exception 'private post accepted';exception when insufficient_privilege then null;end;
 begin
 insert into public.goods_form_watches(goods_post_id) values('00000000-0000-4000-8000-000000000913');
 raise exception 'test post accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000902","role":"authenticated"}',true);
set local role authenticated;
do $$ begin assert (select count(*) from public.goods_form_watches)=0,'other account can read';end $$;
delete from public.goods_form_watches where user_id='00000000-0000-4000-8000-000000000901';
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000901","role":"authenticated"}',true);
set local role authenticated;
do $$ begin assert (select count(*) from public.goods_form_watches)=1,'other account could delete';end $$;
delete from public.goods_form_watches;
do $$ begin assert (select count(*) from public.goods_form_watches)=0,'own delete failed';end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.goods_form_watches;raise exception 'anon read allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: own insert/read/delete, deduplication, account isolation, unpublished/test and anonymous restrictions; fixtures rolled back' as result;
rollback;
