-- Runs against the real schema and roles, but all fixtures are rolled back.
begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000101','mvp-a@example.invalid'),
 ('00000000-0000-4000-8000-000000000102','mvp-b@example.invalid'),
 ('00000000-0000-4000-8000-000000000103','mvp-admin@example.invalid');
insert into private.app_admins(user_id) values('00000000-0000-4000-8000-000000000103');

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
set local role authenticated;
insert into public.user_interests(work_name,character_name) values('하이큐!!',''),('haikyu','히나타');
do $$ begin
 assert (select count(*)=2 from public.user_interests), 'owner can read interests';
 begin perform * from private.app_admins; raise exception 'admin membership readable'; exception when insufficient_privilege then null; end;
 begin
  insert into public.user_interests(work_name) values(' 하이큐 ');
  raise exception 'duplicate interest allowed';
 exception when unique_violation then null; end;
 begin
  insert into public.user_interests(user_id,work_name) values('00000000-0000-4000-8000-000000000102','원신');
  raise exception 'spoofed user id allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.goods_posts(title,source_url,work_name,sale_status,is_published) values('unauthorized','https://example.invalid/unauthorized','하이큐','open',true);
  raise exception 'non-admin publication allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.process_mock_queue(20); raise exception 'non-admin dispatch allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}',true);
set local role authenticated;
do $$ begin assert (select count(*)=0 from public.user_interests),'cross-user interests leak'; end $$;
insert into public.user_interests(work_name,character_name) values('하이큐','카게야마'),('원신','');
reset role;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}',true);
set local role authenticated;
insert into public.goods_posts(title,source_url,work_name,character_names,sale_status,is_published)
 values('integration haikyu','https://example.invalid/integration/one','하이큐!!',array['히나타'],'open',false);
reset role;
do $$ begin
 assert (select count(*)=0 from public.delivery_queue q join public.notifications n on n.id=q.notification_id where n.user_id in ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000102')),'draft generated notification';
end $$;
set local role authenticated;
update public.goods_posts set is_published=true where source_url='https://example.invalid/integration/one';
update public.goods_posts set is_published=false where source_url='https://example.invalid/integration/one';
update public.goods_posts set is_published=true where source_url='https://example.invalid/integration/one';
insert into public.goods_posts(title,source_url,work_name,sale_status,is_published)
 values('integration genshin','https://example.invalid/integration/two','原神','open',true);
-- Unknown spelling must NOT accidentally match 원신. No fuzzy matching.
insert into public.goods_posts(title,source_url,work_name,sale_status,is_published)
 values('integration genshin matching','https://example.invalid/integration/three','genshin','open',true);
insert into public.goods_posts(title,source_url,work_name,sale_status,is_published)
 values('integration closed','https://example.invalid/integration/closed','하이큐','closed',true);
do $$ begin
 begin
  insert into public.goods_posts(title,source_url,work_name,sale_status) values('duplicate','https://example.invalid/integration/one#again','하이큐','open');
  raise exception 'duplicate source allowed';
 exception when unique_violation then null; end;
end $$;
reset role;
do $$ begin
 assert (select count(*)=1 from public.notifications where user_id='00000000-0000-4000-8000-000000000101'),'overlapping interests/republish created duplicates';
 assert (select count(*)=1 from public.notifications where user_id='00000000-0000-4000-8000-000000000102'),'wrong work/character matching';
 assert (select count(*)=2 from public.delivery_queue q join public.notifications n on n.id=q.notification_id where n.user_id in ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000102')),'queue duplication';
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 assert (select count(*)=1 from public.notifications),'foreign notification visible';
 assert (select count(*)=1 from public.delivery_queue),'foreign queue visible';
 begin
  update public.notifications set title='tampered';raise exception 'notification title changed';
 exception when insufficient_privilege then null;end;
 begin
  update public.delivery_queue set status='mocked';raise exception 'queue changed by user';
 exception when insufficient_privilege then null;end;
end $$;
update public.notifications set read_at=now();
-- A late interest does not notify about old goods.
insert into public.user_interests(work_name) values('원신');
delete from public.user_interests where work_key='haikyu';
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}',true);
set local role authenticated;
select public.process_mock_queue(100);
select public.process_mock_queue(100);
reset role;
do $$ begin
 assert (select count(*)=1 from public.delivery_queue q join public.notifications n on n.id=q.notification_id where n.user_id='00000000-0000-4000-8000-000000000101' and q.status='cancelled'),'unsubscribed queue not cancelled';
 assert (select count(*)=1 from public.delivery_queue q join public.notifications n on n.id=q.notification_id where n.user_id='00000000-0000-4000-8000-000000000102' and q.status='mocked' and q.attempts=1),'mock send missing';
 assert (select count(*)=1 from public.delivery_attempts a join public.delivery_queue q on q.id=a.queue_id join public.notifications n on n.id=q.notification_id where n.user_id='00000000-0000-4000-8000-000000000102'),'duplicate delivery attempt';
 assert (select count(*)=2 from public.notifications where user_id in ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000102')),'late interest backfilled unexpectedly';
end $$;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 begin perform * from public.user_interests;raise exception 'anonymous interests read allowed';exception when insufficient_privilege then null;end;
 begin perform * from public.notifications;raise exception 'anonymous notifications read allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: roles, matching, duplicate prevention, publication, queue, mock dispatch; fixtures rolled back' as result;
