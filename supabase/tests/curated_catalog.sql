begin;
do $$ begin
 assert public.normalize_work('大穢')='ooe','Ooe alias failed';
 assert public.normalize_work('콜옵')='callofduty','COD alias failed';
 assert public.normalize_work('뱅드림')='bangdream','Bandori alias failed';
 assert public.normalize_work('프세카')='projectsekai','Sekai alias failed';
 assert public.normalize_character('콜옵','Ghost')=public.normalize_keyword('사이먼 고스트 라일리'),'COD character failed';
 assert public.normalize_work('명방')='arknights','retired game key changed';
 assert public.normalize_work('어바등')=public.normalize_work('어두운 바다의 등불이 되어'),'novel abbreviation failed';
 assert public.normalize_work('마차살')=public.normalize_work('마법명가 차남으로 살아남는 법'),'second novel abbreviation failed';
 assert public.normalize_work('나히아')=public.normalize_work('나의 히어로 아카데미아'),'anime abbreviation failed';
 assert public.normalize_work('블아')=public.normalize_work('블루 아카이브'),'game abbreviation failed';
 assert public.normalize_work('변호됨')=public.normalize_work('너희들은 변호됐다'),'law novel abbreviation failed';
 assert public.normalize_work('이착헌')=public.normalize_work('이세계 착각 헌터'),'hunter novel abbreviation failed';
 assert public.normalize_work('은용꿈')=public.normalize_work('은행원도 용꿈을 꾸나요'),'bank novel abbreviation failed';
 assert public.normalize_work('우호정')=public.normalize_work('우리 호텔 정상 영업합니다'),'hotel novel abbreviation failed';
 assert public.normalize_work('헤즈빈')=public.normalize_work('해즈빈 호텔'),'alternate anime spelling failed';
 assert public.normalize_work('회사설')='regressorinstructionmanual','legacy novel key changed';
 assert public.normalize_work('Samurai 7')='mal-166','existing subscriptions lost legacy key';
end $$;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000801','curated-fixture@example.invalid');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000801","role":"authenticated"}',true);
set local role authenticated;
select public.save_my_interests('[{"work_name":"어바등","character_name":"신해량"},{"work_name":"Samurai 7","character_name":""},{"work_name":"닌타마","character_name":"키리마루"}]');
reset role;
insert into public.goods_posts(id,title,source_url,work_name,character_names,sale_status,is_published) values
 ('00000000-0000-4000-8000-000000000811','novel alias fixture','https://example.invalid/curated/1','어두운 바다의 등불이 되어',array['신해량'],'open',true),
 ('00000000-0000-4000-8000-000000000812','legacy fixture','https://example.invalid/curated/2','사무라이 7',array[]::text[],'open',true),
 ('00000000-0000-4000-8000-000000000813','new anime fixture','https://example.invalid/curated/3','忍たま乱太郎',array['きり丸'],'open',true);
set local role authenticated;
do $$ begin
 assert (select count(*)=3 from public.my_subscription_feed()),'new and legacy feed matching failed';
 assert (select count(*)=3 from public.notifications),'new and legacy notification matching failed';
end $$;
reset role;
rollback;
select 'PASS: shorthand/new names and existing hidden-catalog subscriptions match feeds and notifications; fixtures rolled back' as result;
