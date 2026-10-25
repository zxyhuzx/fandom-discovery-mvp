begin;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000201','home-test@example.invalid'),('00000000-0000-4000-8000-000000000202','other-test@example.invalid');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000201","role":"authenticated"}',true);
set local role authenticated;
select public.save_my_interests('[{"work_name":"하이큐!!","character_name":"히나타 쇼요"},{"work_name":"원신","character_name":""}]');
do $$ begin
 assert (select count(*)=2 from public.user_interests),'batch save failed';
 assert (select onboarding_completed from public.user_preferences),'onboarding not saved';
 begin perform public.save_my_interests('[{"work_name":"","character_name":""}]');raise exception 'invalid list accepted';exception when check_violation then null;end;
 assert (select count(*)=2 from public.user_interests),'failed save lost interests';
end $$;
update public.user_preferences set web_notifications=false;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000202","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 assert (select count(*)=0 from public.user_preferences),'preferences leak';
 assert (select count(*)=0 from public.user_interests),'interests leak';
end $$;
select public.save_my_interests('[]');
do $$ begin assert (select onboarding_completed from public.user_preferences),'skip not persisted';end $$;
reset role;
insert into public.goods_posts(id,title,source_url,work_name,character_names,sale_status,is_published,seller_name,platform_name) values
 ('00000000-0000-4000-8000-000000000211','home test public','https://example.invalid/home/public','하이큐!!',array['히나타 쇼요'],'open',true,'fixture seller','fixture platform'),
 ('00000000-0000-4000-8000-000000000212','home test draft','https://example.invalid/home/draft','하이큐!!',array['히나타 쇼요'],'open',false,'fixture seller','fixture platform');
do $$ begin assert not exists(select 1 from public.notifications where user_id='00000000-0000-4000-8000-000000000201'),'disabled alerts still created';end $$;
update public.user_preferences set web_notifications=true where user_id='00000000-0000-4000-8000-000000000201';
update public.goods_posts set is_published=true where id='00000000-0000-4000-8000-000000000212';
do $$ begin assert (select count(*)=1 from public.notifications where user_id='00000000-0000-4000-8000-000000000201'),'enabled alerts not matched';end $$;
update public.goods_posts set is_published=false where id='00000000-0000-4000-8000-000000000212';
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 assert (select count(*)=1 from public.goods_posts where id in ('00000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000212')),'public goods RLS failed';
 begin perform created_by from public.goods_posts;raise exception 'creator user id exposed';exception when insufficient_privilege then null;end;
 begin perform * from public.user_preferences;raise exception 'anonymous preferences exposed';exception when insufficient_privilege then null;end;
 begin perform public.save_my_interests('[]');raise exception 'anonymous RPC allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: public goods, private preferences, atomic interests, onboarding skip, notification settings; fixtures rolled back' as result;
