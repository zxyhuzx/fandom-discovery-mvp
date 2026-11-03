begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000a01','owner-a@example.invalid'),
 ('00000000-0000-4000-8000-000000000a02','owner-b@example.invalid');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000a01","role":"authenticated"}',true);
set local role authenticated;
insert into public.user_profiles(nickname) values('작가 시험');
insert into public.goods_posts(title,source_url,work_name,character_names,sale_status,is_published)
 values('등록 시험','https://example.invalid/owned-test','고유한 시험 작품',array['시험 인물'],'planned',false);
do $$ begin
 assert (select count(*) from public.goods_posts where source_url='https://example.invalid/owned-test' and created_by=auth.uid())=1,'owner not stored';
 assert (select count(*) from public.goods_posts g join public.user_profiles p on p.user_id=g.created_by where g.source_url='https://example.invalid/owned-test')=1,'profile relation unavailable';
 begin
 insert into public.goods_posts(created_by,title,source_url,work_name,sale_status) values('00000000-0000-4000-8000-000000000a02','spoof','https://example.invalid/spoof-owned','시험','planned');
 raise exception 'spoofed creator accepted';exception when insufficient_privilege then null;end;
end $$;
update public.goods_posts set title='수정 시험',sale_status='open' where source_url='https://example.invalid/owned-test';
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000a02","role":"authenticated"}',true);
set local role authenticated;
do $$ begin assert (select count(*) from public.goods_posts where source_url='https://example.invalid/owned-test')=0,'another user can read draft';end $$;
update public.goods_posts set title='도용' where source_url='https://example.invalid/owned-test';
do $$ begin
 begin perform public.delete_my_goods((select id from public.goods_posts where source_url='https://example.invalid/owned-test'));raise exception 'another owner delete accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000a01","role":"authenticated"}',true);
set local role authenticated;
update public.goods_posts set is_published=true where source_url='https://example.invalid/owned-test';
do $$ begin
 assert (select title from public.goods_posts where source_url='https://example.invalid/owned-test')='수정 시험','owner edit failed or another user overwrote it';
 begin update public.goods_posts set created_by='00000000-0000-4000-8000-000000000a02' where source_url='https://example.invalid/owned-test';raise exception 'owner reassignment accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000a02","role":"authenticated"}',true);
set local role authenticated;
do $$ declare target uuid;begin
 select id into target from public.goods_posts where source_url='https://example.invalid/owned-test';
 assert target is not null,'published goods not readable';
 begin perform public.delete_my_goods(target);raise exception 'non-owner public delete accepted';exception when insufficient_privilege then null;end;
 update public.goods_posts set title='도용' where id=target;
 begin update public.goods_posts set created_by=auth.uid() where id=target;raise exception 'claiming published goods accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000a01","role":"authenticated"}',true);
set local role authenticated;
do $$ begin assert (select title from public.goods_posts where source_url='https://example.invalid/owned-test')='수정 시험','non-owner updated published goods';end $$;
select public.delete_my_goods((select id from public.goods_posts where source_url='https://example.invalid/owned-test'));
do $$ begin assert (select count(*) from public.goods_posts where source_url='https://example.invalid/owned-test')=0,'deleted post remains in own list';end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin assert (select count(*) from public.goods_posts where source_url='https://example.invalid/owned-test')=0,'deleted post public';end $$;
reset role;
do $$ begin assert (select count(*) from public.goods_posts where source_url='https://example.invalid/owned-test' and deleted_at is not null and not is_published)=1,'soft delete not recorded';end $$;
select 'PASS: non-admin own registration, profile relation, editing, owner-only deletion, spoof/reassignment blocking, draft/deleted visibility; rolled back' as result;
rollback;
