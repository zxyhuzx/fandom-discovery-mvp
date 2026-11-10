begin;
set local role anon;
do $$declare page jsonb;first_page jsonb;second_page jsonb;r jsonb;begin
 page=public.catalog_search('히나타','all','',null,40,0);
 if not exists(select 1 from jsonb_array_elements(page->'items') x where x->'work'->>'name'='하이큐!!' and x->'character'->>'name'='히나타 쇼요') or not exists(select 1 from jsonb_array_elements(page->'items') x where x->'work'->>'name'='나루토' and x->'character'->>'name'='휴우가 히나타') then raise exception 'ambiguous name search failed';end if;
 page=public.catalog_search('ハイキュー','work');if page->'items'->0->'work'->>'name'<>'하이큐!!' then raise exception 'Japanese work alias failed';end if;
 page=public.catalog_search('Kuzuha','character');if page->'items'->0->'character'->>'name'<>'쿠즈하' then raise exception 'VTuber alias failed';end if;
 page=public.catalog_search('어바등','work');if page->'items'->0->'work'->>'name'<>'어두운 바다의 등불이 되어' then raise exception 'abbreviation failed';end if;
 if public.normalize_work('BTS')<>public.normalize_work('방탄소년단') or public.normalize_character('BTS','RM')<>public.normalize_character('방탄소년단','알엠') then raise exception 'account matching aliases failed';end if;
 page=public.catalog_search('스키즈','work','아이돌');if page->'items'->0->'work'->>'name'<>'스트레이 키즈' then raise exception 'idol alias failed';end if;
 page=public.catalog_search('Felix','character','아이돌');if page->'items'->0->'character'->>'name'<>'필릭스' then raise exception 'idol member alias failed';end if;
 page=public.catalog_search('','character','',array['세븐틴'],40);if jsonb_array_length(page->'items')<>13 then raise exception 'scoped members failed';end if;
 page=public.catalog_search('히나타','character','',array['원신']);if jsonb_array_length(page->'items')<>0 then raise exception 'unrelated characters leaked';end if;
 first_page=public.catalog_search('','work','애니·만화',null,20,0);second_page=public.catalog_search('','work','애니·만화',null,20,20);
 if jsonb_array_length(first_page->'items')<>20 or not (first_page->>'has_more')::boolean or exists(select 1 from jsonb_array_elements(first_page->'items') a join jsonb_array_elements(second_page->'items') b on a->'work'->>'key'=b->'work'->>'key') then raise exception 'paging failed';end if;
 page=public.catalog_search('%','all');if jsonb_array_length(page->'items')<>0 then raise exception 'wildcard not escaped';end if;
 r=public.catalog_resolve('[{"work_name":"haikyu","character_name":"Hinata"}]');if r->0->'work'->>'name'<>'하이큐!!' or r->0->'character'->>'name'<>'히나타 쇼요' then raise exception 'saved alias resolve failed';end if;
 begin perform public.catalog_search('', 'all','',null,10000);raise exception 'UNBOUNDED_QUERY';exception when invalid_parameter_value then null;end;
 begin update public.catalog_works set name='bad';raise exception 'PUBLIC_WRITE';exception when insufficient_privilege then null;end;
end $$;
set local role authenticated;
do $$begin
 begin delete from public.catalog_characters;raise exception 'USER_DELETE';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: paged read-only catalog, aliases, scoped characters and idols' result;
rollback;
