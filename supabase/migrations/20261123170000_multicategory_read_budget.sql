begin;
-- User approved up to $10 for this run; 1,400 weighted daily units remain below that ceiling.
-- Reserve weighted read units: one unit = $0.005 ceiling; authors count twice.
-- Only public-post authors and up to four attached media are requested.
create or replace function public.reserve_x_enriched_read(p_units integer,p_monthly_limit integer,p_daily_limit integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare today date := (clock_timestamp() at time zone 'UTC')::date;
 period date := date_trunc('month',today)::date; r private.x_api_budget;
begin
 if p_units<>70 or p_monthly_limit not between 70 and 2000 or p_daily_limit not between 70 and 1400 then raise exception 'INVALID_X_BUDGET'; end if;
 insert into private.x_api_budget(month,day) values(period,today) on conflict do nothing;
 select * into r from private.x_api_budget where month=period for update;
 if r.day<>today then r.daily_resources:=0; end if;
 if r.reserved_resources+p_units>p_monthly_limit or r.daily_resources+p_units>p_daily_limit then raise exception 'X_BUDGET_EXHAUSTED'; end if;
 update private.x_api_budget set reserved_resources=r.reserved_resources+p_units,day=today,daily_resources=r.daily_resources+p_units where month=period;
 return jsonb_build_object('reserved_resources',r.reserved_resources+p_units,'monthly_limit',p_monthly_limit,'daily_reserved',r.daily_resources+p_units);
end $$;
revoke all on function public.reserve_x_enriched_read(integer,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_x_enriched_read(integer,integer,integer) to service_role;
commit;
