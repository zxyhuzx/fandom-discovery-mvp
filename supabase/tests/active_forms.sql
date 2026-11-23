begin;
do $$begin
 assert (select count(distinct genre_name)=5 from public.goods_posts where id in (select id from public.goods_posts where source_kind='x_discovery' and genre_name<>'괴담출근')),'category coverage';
 assert not has_function_privilege('anon','public.my_subscription_feed(text,text,timestamptz,uuid,integer,boolean)','EXECUTE'),'Anonymous personalized feed access';
 assert has_function_privilege('authenticated','public.my_subscription_feed(text,text,timestamptz,uuid,integer,boolean)','EXECUTE'),'Authenticated feed unavailable';
end$$;
set local role anon;
do $$begin
 assert not exists(select 1 from public.home_goods_feed(30,true) f where f.post->>'sale_status'='closed' or coalesce((f.post->>'sale_end')::timestamptz,((f.post->>'sale_end_date')::date+1)::timestamp at time zone 'Asia/Seoul','infinity'::timestamptz)<=now()),'Expired item in default public feed';
 assert (select count(*)>0 from public.home_goods_feed(30,false)),'Unhidden feed empty';
end$$;
rollback;
