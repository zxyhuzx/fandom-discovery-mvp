begin;
set local role anon;
do $$declare r jsonb;begin
 if (select count(*) from public.catalog_works where genre='아이돌' and active)<>25 then raise exception 'idol group count';end if;
 if (select count(*) from public.catalog_characters c join public.catalog_works w using(work_key) where w.genre='아이돌' and w.active and c.active)<>153 then raise exception 'idol member count';end if;
 r=public.catalog_search('블핑','work','아이돌');if r->'items'->0->'work'->>'name'<>'블랙핑크' then raise exception 'group nickname';end if;
 r=public.catalog_search('カリナ','character','아이돌');if r->'items'->0->'character'->>'name'<>'카리나' then raise exception 'Japanese member alias';end if;
 r=public.catalog_search('WONYOUNG','character','아이돌');if r->'items'->0->'work'->>'name'<>'아이브' or r->'items'->0->'character'->>'name'<>'장원영' then raise exception 'English member alias';end if;
 r=public.catalog_search('','character','아이돌',array['트와이스'],40);if jsonb_array_length(r->'items')<>9 then raise exception 'scoped girl group members';end if;
 r=public.catalog_search('','work','아이돌',null,20,20);if jsonb_array_length(r->'items')<>5 or (r->>'has_more')::boolean then raise exception 'idol second page';end if;
 r=public.catalog_search('JIHOON','character','아이돌');
 if not exists(select 1 from jsonb_array_elements(r->'items') x where x->'work'->>'name'='투어스' and x->'character'->>'name'='지훈') or not exists(select 1 from jsonb_array_elements(r->'items') x where x->'work'->>'name'='트레저' and x->'character'->>'name'='지훈') then raise exception 'same name across groups';end if;
 if public.normalize_work('IVE')<>public.normalize_work('아이브') or public.normalize_character('IVE','WONYOUNG')<>public.normalize_character('아이브','장원영') then raise exception 'account aliases';end if;
end $$;
reset role;
select 'PASS: 25 idol groups, 153 members, scoped aliases, 20+5 paging' result;
rollback;
