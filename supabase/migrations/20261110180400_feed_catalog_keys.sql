begin;
create or replace function public.feed_character_key(work text,value text) returns text
language plpgsql stable strict set search_path='' as $$
declare resolved text;
begin
 if value='' then return '';end if;
 select public.normalize_keyword(c.name) into resolved from public.catalog_characters c
 where c.work_key=work and (
  public.catalog_term(c.name)=public.catalog_term(value)
  or exists(select 1 from unnest(c.aliases) a where public.catalog_term(a)=public.catalog_term(value)))
 order by c.active desc,c.id limit 1;
 return coalesce(resolved,public.normalize_keyword(value));
end $$;
create or replace function public.my_subscription_feed(work_filter text default '',status_filter text default '',before_time timestamptz default null,before_id uuid default null,page_size integer default 30)
returns setof public.goods_posts language plpgsql stable security invoker set search_path='' as $$
declare filter_key text;
begin
 if auth.uid() is null then return;end if;
 filter_key:=case when work_filter='' then '' else public.normalize_work(work_filter) end;
 return query
 with preferences as materialized (
  select i.work_key,public.feed_character_key(i.work_key,i.character_name) as character_key
  from public.user_interests i where i.user_id=(select auth.uid())
 )
 select g.* from public.goods_posts g
 where g.is_published and not g.is_test and g.deleted_at is null
 and (filter_key='' or g.work_key=filter_key)
 and (status_filter='' or g.sale_status=status_filter)
 and (before_time is null or (g.created_at,g.id)<(before_time,before_id))
 and exists(select 1 from preferences i where i.work_key=g.work_key
  and (i.character_key='' or exists(select 1 from unnest(g.character_names) c
    where public.feed_character_key(g.work_key,c)=i.character_key)))
 order by g.created_at desc,g.id desc limit greatest(1,least(coalesce(page_size,30),50))+1;
end $$;
notify pgrst,'reload schema';
commit;
