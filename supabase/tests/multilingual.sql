begin;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000401','multilingual@example.invalid');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000401","role":"authenticated"}',true);
set local role authenticated;
select public.save_my_interests('[{"work_name":"hololive","character_name":"Hoshimachi Suisei"}]');
do $$ begin
 assert public.normalize_work('ホロライブ')=public.normalize_work('홀로라이브'),'work aliases differ';
 assert public.normalize_character('ホロライブ','星街すいせい')=public.normalize_character('hololive','Hoshimachi Suisei'),'member aliases differ';
end $$;
reset role;
insert into public.goods_posts(id,title,source_url,work_name,character_names,sale_status,is_published) values('00000000-0000-4000-8000-000000000411','translation fixture','https://example.invalid/multilingual','ホロライブ',array['星街すいせい'],'open',true);
do $$ begin assert (select count(*)=1 from public.notifications where user_id='00000000-0000-4000-8000-000000000401'),'multilingual notification missing';end $$;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select public.process_mock_queue(100);
do $$ begin assert exists(select 1 from public.delivery_queue q join public.notifications n on q.notification_id=n.id where n.user_id='00000000-0000-4000-8000-000000000401' and q.status='mocked'),'multilingual queue incorrectly cancelled';end $$;
rollback;
select 'PASS: English interests match Japanese posts and mock queue; fixtures rolled back' as result;
