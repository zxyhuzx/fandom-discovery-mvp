begin;
do $$
declare r jsonb;
begin
 if has_function_privilege('anon','public.reserve_x_search(integer,integer)','EXECUTE')
 or has_function_privilege('authenticated','public.reserve_x_search(integer,integer)','EXECUTE') then
  raise exception 'Public callers must not reserve paid API budget';
 end if;
 delete from private.x_api_budget where month=date_trunc('month',clock_timestamp() at time zone 'UTC')::date;
 r:=public.reserve_x_search(50,20);
 if (r->>'reserved_resources')::int<>10 then raise exception 'First reservation failed';end if;
 perform public.reserve_x_search(50,20);
 begin
  perform public.reserve_x_search(50,20);
  raise exception 'Daily cap bypassed';
 exception when others then if sqlerrm<>'X_BUDGET_EXHAUSTED' then raise;end if;end;
 delete from private.x_api_budget where month=date_trunc('month',clock_timestamp() at time zone 'UTC')::date;
 perform public.reserve_x_search(10,20);
 begin
  perform public.reserve_x_search(10,20);
  raise exception 'Monthly cap bypassed';
 exception when others then if sqlerrm<>'X_BUDGET_EXHAUSTED' then raise;end if;end;
end $$;
rollback;
