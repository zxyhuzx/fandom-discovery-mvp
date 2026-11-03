begin;
create table public.research_campaigns (
 id text primary key check(id ~ '^[a-z0-9-]{1,60}$'),
 enabled boolean not null default false,
 consent_version text not null,
 purpose text not null,
 retention_days integer not null check(retention_days between 1 and 3650),
 withdrawal_contact text not null check(withdrawal_contact ~ '^(mailto:|https://)'),
 created_at timestamptz not null default now()
);
insert into public.research_campaigns(id,enabled,consent_version,purpose,retention_days,withdrawal_contact)
values('taste-survey-2026-11',true,'2026-11-03-v1','선택하신 작품·캐릭터의 관심 인원과 함께 선택한 조합을 분석하여 취향의 유사성을 연구합니다.',60,'mailto:qhdms114@naver.com');
create table public.research_catalog (
 work_name text not null,character_name text not null default '',primary key(work_name,character_name)
);
create table public.research_participants (
 id uuid primary key default gen_random_uuid(),
 campaign_id text not null references public.research_campaigns(id),
 token_hash text not null check(token_hash ~ '^[0-9a-f]{64}$'),
 consent_version text not null,consented_at timestamptz not null default now(),
 submitted_at timestamptz,expires_at timestamptz not null,
 unique(campaign_id,token_hash)
);
create table public.research_choices (
 participant_id uuid not null references public.research_participants(id) on delete cascade,
 work_name text not null,character_name text not null default '',
 primary key(participant_id,work_name,character_name),
 foreign key(work_name,character_name) references public.research_catalog(work_name,character_name)
);
create table public.research_requests (
 id uuid primary key default gen_random_uuid(),
 participant_id uuid not null references public.research_participants(id) on delete cascade,
 kind text not null check(kind in ('work','character')),
 work_name text not null check(char_length(work_name) between 1 and 120),
 character_name text not null default '' check(char_length(character_name)<=120),
 created_at timestamptz not null default now(),
 unique(participant_id,kind,work_name,character_name),
 check((kind='work' and character_name='') or (kind='character' and character_name<>''))
);
-- Temporary, salted network hashes only; no raw address, account ID, nickname or contact.
create table public.research_rate_limits (
 bucket text primary key,hits integer not null default 1,expires_at timestamptz not null
);
do $$declare t text;begin
 foreach t in array array['research_campaigns','research_catalog','research_participants','research_choices','research_requests','research_rate_limits'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create index research_expiry on public.research_participants(expires_at);
create function public.research_cleanup() returns void language sql security definer set search_path='' as $$
 delete from public.research_participants where expires_at<=now();
 delete from public.research_rate_limits where expires_at<=now();
$$;
create function public.research_rate_limit(bucket_key text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;begin
 if bucket_key !~ '^[0-9a-f]{64}$' then return false;end if;
 insert into public.research_rate_limits(bucket,hits,expires_at) values(bucket_key,1,now()+interval '1 hour')
 on conflict(bucket) do update set hits=case when research_rate_limits.expires_at<=now() then 1 else research_rate_limits.hits+1 end,
 expires_at=case when research_rate_limits.expires_at<=now() then now()+interval '1 hour' else research_rate_limits.expires_at end
 returning hits into n;
 return n<=120;
end $$;
-- Only the Edge Function service role can call this transaction. Never grant it to anon.
create function public.research_write(p_campaign text,p_token_hash text,p_version text,p_action text,p_items jsonb default null,p_request jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.research_campaigns; p public.research_participants; item jsonb; n integer; w text; ch text; k text;
begin
 if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_TOKEN';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_campaign||p_token_hash,0));
 if p_action='withdraw' then
  delete from public.research_participants where campaign_id=p_campaign and token_hash=p_token_hash;
  return jsonb_build_object('withdrawn',true);
 end if;
 select * into c from public.research_campaigns where id=p_campaign;
 if not found or not c.enabled or c.retention_days is null or c.withdrawal_contact='' then raise exception 'COLLECTION_DISABLED';end if;
 if p_version is distinct from c.consent_version then raise exception 'CONSENT_CHANGED';end if;
 if p_action not in ('submit','request') then raise exception 'INVALID_ACTION';end if;
 if p_action='submit' then
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'INVALID_ITEMS';end if;
  for item in select * from jsonb_array_elements(p_items) loop
   if jsonb_typeof(item->'work_name') is distinct from 'string' or jsonb_typeof(item->'character_name') is distinct from 'string' then raise exception 'INVALID_ITEMS';end if;
   if not exists(select 1 from public.research_catalog where work_name=item->>'work_name' and character_name=item->>'character_name') then raise exception 'INVALID_RELATION';end if;
  end loop;
 else
  k=p_request->>'kind'; w=btrim(p_request->>'work_name');ch=btrim(coalesce(p_request->>'character_name',''));
  if k is null or k not in ('work','character') or w is null or char_length(w) not between 1 and 120 or char_length(ch)>120 or (w||ch) ~ '[[:cntrl:]]' or (k='character' and ch='') or (k='work' and ch<>'') then raise exception 'INVALID_REQUEST';end if;
 end if;
 -- Expired submissions are never revived or extended by resubmission.
 select * into p from public.research_participants where campaign_id=p_campaign and token_hash=p_token_hash;
 if found and p.expires_at<=now() then raise exception 'RESPONSE_EXPIRED';end if;
 if found and p.consent_version<>c.consent_version then raise exception 'CONSENT_CHANGED';end if;
 if not found then
  insert into public.research_participants(campaign_id,token_hash,consent_version,expires_at)
  values(c.id,p_token_hash,c.consent_version,now()+make_interval(days=>c.retention_days)) returning * into p;
 end if;
 if p_action='submit' then
  if p.submitted_at is null then
   insert into public.research_choices(participant_id,work_name,character_name)
   select distinct p.id,x->>'work_name',x->>'character_name' from jsonb_array_elements(p_items) x;
   update public.research_participants set submitted_at=now(),expires_at=least(expires_at,now()+make_interval(days=>c.retention_days)) where id=p.id returning * into p;
  end if;
 else
  select count(*) into n from public.research_requests where participant_id=p.id;
  if n>=10 then raise exception 'REQUEST_LIMIT';end if;
  insert into public.research_requests(participant_id,kind,work_name,character_name) values(p.id,k,w,ch) on conflict do nothing;
 end if;
 return jsonb_build_object('participant_id',p.id,'submitted_at',p.submitted_at,'expires_at',p.expires_at);
end $$;
-- Operator-only data set for all three CSVs. Excludes expired, unsubmitted or unconsented data.
create function public.research_export(p_campaign text) returns table(participant_id uuid,campaign_id text,consent_version text,submitted_at timestamptz,work_name text,character_name text)
language sql security definer set search_path='' as $$
 select p.id,p.campaign_id,p.consent_version,p.submitted_at,i.work_name,i.character_name
 from public.research_participants p join public.research_choices i on i.participant_id=p.id
 where p.campaign_id=p_campaign and p.submitted_at is not null and p.consented_at is not null and p.expires_at>now()
 order by p.id,i.work_name,i.character_name;
$$;
revoke all on function public.research_cleanup(),public.research_rate_limit(text),public.research_write(text,text,text,text,jsonb,jsonb),public.research_export(text) from public,anon,authenticated;
grant execute on function public.research_cleanup(),public.research_rate_limit(text),public.research_write(text,text,text,text,jsonb,jsonb),public.research_export(text) to service_role;
-- Hourly physical deletion. No extension to the selected 60-day retention period.
create extension if not exists pg_cron;
select cron.schedule('byeoljup-research-expiry','0 * * * *','select public.research_cleanup()');
commit;
