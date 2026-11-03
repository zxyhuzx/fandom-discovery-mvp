begin;
insert into public.research_campaigns values('research-test',true,'test-v1','Test only',60,'mailto:test@example.com',now());
do $$
declare r jsonb; pid uuid; n integer; h text=repeat('a',64);begin
 r=public.research_write('research-test',h,'test-v1','submit','[{"work_name":"원신","character_name":"종려"},{"work_name":"나루토","character_name":""}]');
 pid=(r->>'participant_id')::uuid;
 if (select count(*) from public.research_choices where participant_id=pid)<>2 then raise exception 'choices missing';end if;
 perform public.research_write('research-test',h,'test-v1','submit','[{"work_name":"원신","character_name":""}]');
 if (select count(*) from public.research_choices where participant_id=pid)<>2 then raise exception 'snapshot replaced on retry';end if;
 perform public.research_write('research-test',h,'test-v1','request',null,'{"kind":"character","work_name":"새 작품","character_name":"새 캐릭터"}');
 if (select count(*) from public.research_export('research-test'))<>2 then raise exception 'export invalid';end if;
 begin perform public.research_write('research-test',repeat('b',64),'test-v1','submit','[{"work_name":"원신","character_name":"히나타 쇼요"}]');raise exception 'BAD_RELATION_ACCEPTED';exception when others then if sqlerrm<>'INVALID_RELATION' then raise;end if;end;
 begin perform public.research_write('research-test',repeat('b',64),'stale','submit','[]');raise exception 'STALE_CONSENT_ACCEPTED';exception when others then if sqlerrm<>'CONSENT_CHANGED' then raise;end if;end;
 update public.research_campaigns set enabled=false where id='research-test';
 begin perform public.research_write('research-test',repeat('b',64),'test-v1','submit','[]');raise exception 'DISABLED_ACCEPTED';exception when others then if sqlerrm<>'COLLECTION_DISABLED' then raise;end if;end;
 -- Withdrawal works even after collection is disabled; wrong secrets cannot delete another response.
 perform public.research_write('research-test',repeat('b',64),'','withdraw');
 if not exists(select 1 from public.research_participants where id=pid) then raise exception 'wrong token deleted response';end if;
 perform public.research_write('research-test',h,'','withdraw');
 if exists(select 1 from public.research_participants where id=pid) or exists(select 1 from public.research_choices where participant_id=pid) or exists(select 1 from public.research_requests where participant_id=pid) or exists(select 1 from public.research_export('research-test')) then raise exception 'withdrawal did not cascade';end if;
 update public.research_campaigns set enabled=true where id='research-test';
 r=public.research_write('research-test',h,'test-v1','submit','[{"work_name":"원신","character_name":""}]');pid=(r->>'participant_id')::uuid;
 update public.research_participants set expires_at=now()-interval '1 second' where id=pid;
 if exists(select 1 from public.research_export('research-test')) then raise exception 'expired export';end if;
 perform public.research_cleanup();
 if exists(select 1 from public.research_participants where id=pid) then raise exception 'expiry cleanup failed';end if;
 for n in 1..120 loop if not public.research_rate_limit(repeat('e',64)) then raise exception 'premature limit';end if;end loop;
 if public.research_rate_limit(repeat('e',64)) then raise exception 'rate limit not enforced';end if;
end $$;
set local role anon;
do $$begin
 begin perform * from public.research_participants;raise exception 'ANON_READ';exception when insufficient_privilege then null;end;
 begin perform public.research_write('research-test',repeat('c',64),'test-v1','submit','[]');raise exception 'ANON_WRITE';exception when insufficient_privilege then null;end;
 begin perform * from public.research_export('research-test');raise exception 'ANON_EXPORT';exception when insufficient_privilege then null;end;
end $$;
set local role authenticated;
do $$begin
 begin perform * from public.research_choices;raise exception 'USER_READ';exception when insufficient_privilege then null;end;
 begin delete from public.research_participants;raise exception 'USER_DELETE';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'research integration checks passed; transaction rolled back' result;
rollback;
