begin;
do $$begin
 assert (select count(*)>=70 from public.catalog_cp_aliases),'CP catalog missing';
 assert not has_table_privilege('anon','public.catalog_cp_aliases','INSERT'),'Anonymous CP edits';
 assert not has_table_privilege('authenticated','public.catalog_cp_aliases','UPDATE'),'User CP edits';
 assert (select character_names @> array['최요원','김솔음'] from public.goods_posts where source_url='https://x.com/i/status/2119106208238117232'),'최솔 mapping';
 assert (select character_names @> array['브라운','김솔음'] from public.goods_posts where source_url='https://x.com/i/status/2119042573981684172'),'브라운솔음 mapping';
 assert (select character_names @> array['류재관','최요원'] from public.goods_posts where source_url='https://x.com/i/status/2124472239957623198'),'류최 mapping';
 assert (select count(*)=29 from public.goods_posts where source_kind='x_discovery'),'Expected 20 new forms + 9 old';
 assert (select count(*)=27 from public.goods_posts where source_kind='x_discovery' and thumbnail_url is not null),'Image metadata';
 assert not exists(select 1 from public.notifications n join public.goods_posts g on g.id=n.goods_post_id where g.source_kind='x_discovery'),'Discovery unexpectedly notified users';
end$$;
do $$declare matched text[];unrelated text[];begin
 insert into public.goods_posts(title,source_url,work_name,character_names,sale_status,is_published,is_test,source_kind)
 values('최솔 회지','https://example.invalid/cp-test-related','괴담에 떨어져도 출근을 해야 하는구나','{}','open',false,false,'x_discovery') returning character_names into matched;
 assert matched @> array['최요원','김솔음'],'Import trigger did not expand CP';
 insert into public.goods_posts(title,source_url,work_name,character_names,sale_status,is_published,is_test,source_kind)
 values('최솔 회지','https://example.invalid/cp-test-other-work','하이큐!!','{}','open',false,false,'x_discovery') returning character_names into unrelated;
 assert cardinality(unrelated)=0,'CP leaked into another work';
end$$;
set local role anon;
select count(*) as readable_cp_names from public.catalog_cp_aliases;
rollback;
