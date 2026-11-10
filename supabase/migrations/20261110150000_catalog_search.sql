begin;
create extension if not exists pg_trgm with schema extensions;
create function public.catalog_term(value text) returns text language sql immutable parallel safe set search_path='' as $$
 select lower(regexp_replace(normalize(coalesce(value,''),NFKC),'[[:space:]!！:：·・]+','','g'));
$$;
create function public.catalog_pattern(value text) returns text language sql immutable parallel safe set search_path='' as $$
 select '%'||replace(replace(replace(value,chr(92),chr(92)||chr(92)),'%',chr(92)||'%'),'_',chr(92)||'_')||'%';
$$;
create function public.catalog_alias_text(name text,aliases text[],genre text) returns text language sql immutable parallel safe set search_path='' as $$
 select public.catalog_term(name||' '||array_to_string(aliases,' ')||' '||genre||case when genre='버튜버' then ' vtuber ブイチューバー' else '' end);
$$;
create table public.catalog_works (
 work_key text primary key,name text not null unique,aliases text[] not null default '{}',genre text not null,
 active boolean not null default true,sort_rank integer not null default 1000,
 search_text text generated always as(public.catalog_alias_text(name,aliases,genre)) stored
);
create table public.catalog_characters (
 id bigint generated always as identity primary key,work_key text not null references public.catalog_works(work_key),
 name text not null,aliases text[] not null default '{}',active boolean not null default true,sort_rank integer not null default 1000,
 work_search text not null default '',
 search_text text generated always as(public.catalog_alias_text(name,aliases,'')||' '||work_search) stored,
 unique(work_key,name)
);
create function public.catalog_character_parent() returns trigger language plpgsql set search_path='' as $$begin
 select search_text into new.work_search from public.catalog_works where work_key=new.work_key;return new;
end $$;
create trigger catalog_character_parent before insert or update on public.catalog_characters for each row execute function public.catalog_character_parent();
create function public.catalog_refresh_children() returns trigger language plpgsql set search_path='' as $$begin
 update public.catalog_characters set work_search=new.search_text where work_key=new.work_key;return new;
end $$;
create trigger catalog_refresh_children after update on public.catalog_works for each row execute function public.catalog_refresh_children();
create index catalog_works_search on public.catalog_works using gin(search_text extensions.gin_trgm_ops);
create index catalog_characters_search on public.catalog_characters using gin(search_text extensions.gin_trgm_ops);
create index catalog_works_browse on public.catalog_works(genre,active,sort_rank,name);
create index catalog_character_browse on public.catalog_characters(work_key,active,sort_rank,id);
alter table public.catalog_works enable row level security;alter table public.catalog_characters enable row level security;
revoke all on public.catalog_works,public.catalog_characters from public,anon,authenticated;
grant select on public.catalog_works,public.catalog_characters to anon,authenticated;
grant all on public.catalog_works,public.catalog_characters to service_role;
grant usage,select on sequence public.catalog_characters_id_seq to service_role;
create policy catalog_works_public on public.catalog_works for select to anon,authenticated using(true);
create policy catalog_characters_public on public.catalog_characters for select to anon,authenticated using(true);
create function public.catalog_work_json(w public.catalog_works) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('key',w.work_key,'name',w.name,'aliases',w.aliases,'genre',w.genre,'active',w.active,'rank',w.sort_rank);
$$;
create function public.catalog_search(p_query text default '',p_kind text default 'all',p_genre text default '',p_works text[] default null,p_limit integer default 20,p_offset integer default 0)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare terms text[];pattern text;result jsonb;begin
 if p_query is null or char_length(p_query)>120 or p_kind is null or p_kind not in ('all','work','character') or p_limit is null or p_limit not between 1 and 40 or p_offset is null or p_offset not between 0 and 10000 or coalesce(cardinality(p_works),0)>100 then raise exception 'Invalid catalog query' using errcode='22023';end if;
 select array_agg(public.catalog_term(t)) filter(where public.catalog_term(t)<>'') into terms from regexp_split_to_table(btrim(p_query),'[[:space:]]+') t;
 if coalesce(cardinality(terms),0)>10 then raise exception 'Too many terms' using errcode='22023';end if;
 pattern=public.catalog_pattern(terms[1]);
 with hits as (
  select public.catalog_work_json(w) work,null::jsonb person,0 kind,w.sort_rank work_rank,0 char_rank,w.name label
  from public.catalog_works w where w.active and p_kind in ('all','work') and (p_genre='' or w.genre=p_genre) and (p_works is null or w.name=any(p_works))
  and (terms is null or (w.search_text like pattern and not exists(select 1 from unnest(terms) t where w.search_text not like public.catalog_pattern(t))))
  union all
  select public.catalog_work_json(w),jsonb_build_object('name',c.name,'aliases',c.aliases),1,w.sort_rank,c.sort_rank,w.name||' · '||c.name
  from public.catalog_characters c join public.catalog_works w using(work_key)
  where c.active and w.active and p_kind in ('all','character') and (p_genre='' or w.genre=p_genre) and (p_works is null or w.name=any(p_works))
  and (terms is null or (c.search_text like pattern and not exists(select 1 from unnest(terms) t where c.search_text not like public.catalog_pattern(t))))
 ),page as (select * from hits order by kind,work_rank,work->>'key',char_rank,label limit p_limit+1 offset p_offset),numbered as (select *,row_number() over() n from page)
 select jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object('work',work,'character',person) order by n) filter(where n<=p_limit),'[]'::jsonb),'has_more',count(*)>p_limit) into result from numbered;
 return result;
end $$;
-- Resolve only existing saved choices / currently visible goods, including retired aliases.
create function public.catalog_resolve(p_items jsonb) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;begin
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>200 then raise exception 'Invalid catalog items' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where char_length(x->>'work_name')>120 or char_length(x->>'character_name')>120) then raise exception 'Invalid name length' using errcode='22023';end if;
 select coalesce(jsonb_agg(jsonb_build_object('work',public.catalog_work_json(w),'character',case when c.name is null then null else jsonb_build_object('name',c.name,'aliases',c.aliases) end)),'[]'::jsonb) into result
 from jsonb_to_recordset(p_items) as i(work_name text,character_name text)
 join lateral(select w.* from public.catalog_works w where public.catalog_term(i.work_name)=public.catalog_term(w.name) or exists(select 1 from unnest(w.aliases) a where public.catalog_term(a)=public.catalog_term(i.work_name)) order by w.active desc,w.work_key limit 1) w on true
 left join lateral(select c.* from public.catalog_characters c where c.work_key=w.work_key and (public.catalog_term(i.character_name)=public.catalog_term(c.name) or exists(select 1 from unnest(c.aliases) a where public.catalog_term(a)=public.catalog_term(i.character_name))) order by c.active desc,c.id limit 1) c on true;
 return result;
end $$;
revoke all on function public.catalog_term(text),public.catalog_alias_text(text,text[],text),public.catalog_pattern(text),public.catalog_work_json(public.catalog_works),public.catalog_search(text,text,text,text[],integer,integer),public.catalog_resolve(jsonb),public.catalog_character_parent(),public.catalog_refresh_children() from public;
grant execute on function public.catalog_term(text),public.catalog_alias_text(text,text[],text),public.catalog_pattern(text),public.catalog_work_json(public.catalog_works),public.catalog_search(text,text,text,text[],integer,integer),public.catalog_resolve(jsonb) to anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
