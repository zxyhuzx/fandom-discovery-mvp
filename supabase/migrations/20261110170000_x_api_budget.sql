begin;
-- Backend-only conservative reservation ledger; no post text or account research.
create table private.x_api_budget (
 month date primary key,
 reserved_resources integer not null default 0 check(reserved_resources>=0),
 day date not null,
 daily_resources integer not null default 0 check(daily_resources>=0)
);
revoke all on private.x_api_budget from public,anon,authenticated;
create function public.reserve_x_search(p_monthly_limit integer,p_daily_limit integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare today date := (clock_timestamp() at time zone 'UTC')::date;
 period date := date_trunc('month',today)::date;
 r private.x_api_budget;
begin
 if p_monthly_limit not between 10 and 4000 or p_daily_limit not between 10 and 100 then
  raise exception 'INVALID_X_BUDGET';
 end if;
 insert into private.x_api_budget(month,day) values(period,today) on conflict do nothing;
 select * into r from private.x_api_budget where month=period for update;
 if r.day<>today then r.daily_resources:=0; end if;
 if r.reserved_resources+10>p_monthly_limit or r.daily_resources+10>p_daily_limit then
  raise exception 'X_BUDGET_EXHAUSTED';
 end if;
 update private.x_api_budget set reserved_resources=r.reserved_resources+10,day=today,daily_resources=r.daily_resources+10 where month=period;
 return jsonb_build_object('reserved_resources',r.reserved_resources+10,'monthly_limit',p_monthly_limit,'daily_reserved',r.daily_resources+10);
end $$;
revoke all on function public.reserve_x_search(integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_x_search(integer,integer) to service_role;
commit;
