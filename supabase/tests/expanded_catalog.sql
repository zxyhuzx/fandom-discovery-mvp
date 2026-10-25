begin;
do $$ begin
 assert public.normalize_work('ONE PIECE')=public.normalize_work('원피스'),'new work alias mismatch';
 assert public.normalize_work('ワンピース')=public.normalize_work('원피스'),'Japanese work alias mismatch';
 assert public.normalize_character('원피스','モンキー・D・ルフィ')=public.normalize_character('One Piece','몽키 D. 루피'),'new character alias mismatch';
 assert public.normalize_character('원피스','Luffy Monkey D.')=public.normalize_character('원피스','몽키 D. 루피'),'English source alias mismatch';
 assert public.normalize_character('다른 작품','Rem')<>public.normalize_character('리제로','Rem'),'character scope was lost';
end $$;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000601','catalog-fixture@example.invalid');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000601","role":"authenticated"}',true);
set local role authenticated;
select public.save_my_interests('[{"work_name":"One Piece","character_name":"몽키 D. 루피"}]');
reset role;
insert into public.goods_posts(id,title,source_url,work_name,character_names,sale_status,is_published) values
 ('00000000-0000-4000-8000-000000000611','catalog fixture','https://example.invalid/catalog/1','ワンピース',array['モンキー・D・ルフィ'],'open',true);
set local role authenticated;
do $$ begin
 assert (select count(*)=1 from public.my_subscription_feed()),'expanded alias not in subscription feed';
 assert (select count(*)=1 from public.notifications),'expanded alias notification missing';
end $$;
reset role;
rollback;
select 'PASS: expanded aliases work in subscriptions and notifications; fixtures rolled back' as result;
