begin;
do $$ begin
 assert public.normalize_work('헌헌')=public.normalize_work('헌터×헌터');
 assert public.normalize_work('괴담출근')=public.normalize_work('괴담에 떨어져도 출근을 해야 하는구나');
 assert public.normalize_character('헌헌','히소카')=public.normalize_character('헌터×헌터','히소카 모로');
 assert public.normalize_character('나루토','카카시')=public.normalize_character('나루토','하타케 카카시');
 assert public.normalize_character('니지산지','로렌 이로하스')=public.normalize_character('니지산지','로렌 이로아스');
 assert public.normalize_character('원신','플린스')=public.normalize_keyword('플린스');
 assert public.normalize_character('괴담출근','최요원')=public.normalize_keyword('최요원');
end $$;
select 'PASS: survey aliases reuse canonical work and character keys; no goods inserted' as result;
rollback;
