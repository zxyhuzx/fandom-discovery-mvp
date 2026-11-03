begin;
-- Restore the pre-research experience. Preserve existing responses and expiry/withdrawal support.
update public.research_campaigns set enabled=false where id='taste-survey-2026-11';
commit;
