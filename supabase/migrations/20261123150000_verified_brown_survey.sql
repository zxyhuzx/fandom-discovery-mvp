begin;
-- Manual browser verification of the public demand form on 2026-11-23.
-- The form shows an active survey input and no fixed period; no deadline is fabricated.
update public.goods_posts set sale_status='survey_open',source_checked_at=now(),
 sale_info='브라운·김솔음 종족반전 회지 괴물사냥·토끼사냥 수요조사입니다. 2026-11-23 원본 수요조사 폼의 참여 입력 화면과 기간설정없음 안내를 확인했습니다. 선입금 공지가 올라오기 전까지 진행하며, 이후 변경 사항은 원문에서 확인해 주세요.
수요조사 폼: https://witchform.com/demand_form.php?idx=130794'
where source_url='https://x.com/i/status/2119042573981684172' and source_kind='x_discovery';
commit;
