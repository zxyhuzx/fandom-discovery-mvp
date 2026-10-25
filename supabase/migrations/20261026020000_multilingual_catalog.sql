begin;
create or replace function public.normalize_work(value text) returns text language sql immutable parallel safe set search_path='' as $$ select case public.normalize_keyword(value)
when '나루토' then 'naruto'
when 'naruto' then 'naruto'
when 'ナルト' then 'naruto'
when '하이큐' then 'haikyu'
when 'haikyu' then 'haikyu'
when 'haikyuu' then 'haikyu'
when 'ハイキュー' then 'haikyu'
when '주술회전' then 'jujutsu'
when 'jujutsu' then 'jujutsu'
when 'jjk' then 'jujutsu'
when '주술' then 'jujutsu'
when '呪術廻戦' then 'jujutsu'
when 'jujutsukaisen' then 'jujutsu'
when '귀멸의칼날' then 'demonslayer'
when 'demonslayer' then 'demonslayer'
when '귀칼' then 'demonslayer'
when '귀멸' then 'demonslayer'
when '鬼滅の刃' then 'demonslayer'
when 'kimetsunoyaiba' then 'demonslayer'
when '원신' then 'genshin'
when 'genshin' then 'genshin'
when 'genshinimpact' then 'genshin'
when '原神' then 'genshin'
when '전지적독자시점' then 'orv'
when 'orv' then 'orv'
when '전독시' then 'orv'
when '全知的な読者の視点から' then 'orv'
when 'omniscientreader' then 'orv'
when '블루록' then 'bluelock'
when 'bluelock' then 'bluelock'
when 'ブルーロック' then 'bluelock'
when '쿠로코의농구' then 'kuroko'
when 'kuroko' then 'kuroko'
when '쿠농' then 'kuroko'
when '黒子のバスケ' then 'kuroko'
when 'kurokonobasket' then 'kuroko'
when '체인소맨' then 'chainsaw'
when 'chainsaw' then 'chainsaw'
when 'chainsawman' then 'chainsaw'
when 'チェンソーマン' then 'chainsaw'
when '붕괴스타레일' then 'starrail'
when 'starrail' then 'starrail'
when 'hsr' then 'starrail'
when '스타레일' then 'starrail'
when '붕스' then 'starrail'
when '崩壊スターレイル' then 'starrail'
when 'honkaistarrail' then 'starrail'
when '젠레스존제로' then 'zzz'
when 'zzz' then 'zzz'
when '젠레스' then 'zzz'
when '젠존제' then 'zzz'
when 'ゼンレスゾーンゼロ' then 'zzz'
when 'zenlesszonezero' then 'zzz'
when '나혼자만레벨업' then 'sololeveling'
when 'sololeveling' then 'sololeveling'
when '나혼렙' then 'sololeveling'
when '俺だけレベルアップな件' then 'sololeveling'
when '내가키운s급들' then 'sclass'
when 'sclass' then 'sclass'
when '내스급' then 'sclass'
when 'thes-classesthatiraised' then 'sclass'
when '홀로라이브' then 'hololive'
when 'hololive' then 'hololive'
when 'hololiveproduction' then 'hololive'
when 'ホロライブ' then 'hololive'
when 'ホロライブプロダクション' then 'hololive'
when '니지산지' then 'nijisanji'
when 'nijisanji' then 'nijisanji'
when 'にじさんじ' then 'nijisanji'
when '스텔라이브' then 'stellive'
when 'stellive' then 'stellive'
when 'ステルライブ' then 'stellive'
else public.normalize_keyword(value) end $$;
create function public.normalize_character(work text,value text) returns text language sql immutable parallel safe set search_path='' as $$ select case
when public.normalize_work(work)=public.normalize_work('나루토') and public.normalize_keyword(value) in ('우즈마키나루토','narutouzumaki','uzumakinaruto','うずまきナルト') then '우즈마키나루토'
when public.normalize_work(work)=public.normalize_work('나루토') and public.normalize_keyword(value) in ('휴우가히나타','hinatahyuga','hyugahinata','hinata','히나타','日向ヒナタ','ヒナタ') then '휴우가히나타'
when public.normalize_work(work)=public.normalize_work('나루토') and public.normalize_keyword(value) in ('우치하사스케','sasukeuchiha','うちはサスケ') then '우치하사스케'
when public.normalize_work(work)=public.normalize_work('하이큐!!') and public.normalize_keyword(value) in ('히나타쇼요','hinatashoyo','shoyohinata','hinata','히나타','日向翔陽','日向','翔陽') then '히나타쇼요'
when public.normalize_work(work)=public.normalize_work('하이큐!!') and public.normalize_keyword(value) in ('카게야마토비오','kageyamatobio','tobiokageyama','影山飛雄','影山') then '카게야마토비오'
when public.normalize_work(work)=public.normalize_work('하이큐!!') and public.normalize_keyword(value) in ('코즈메켄마','kozumekenma','kenma','孤爪研磨','研磨') then '코즈메켄마'
when public.normalize_work(work)=public.normalize_work('하이큐!!') and public.normalize_keyword(value) in ('쿠로오테츠로','kurootetsuro','黒尾鉄朗') then '쿠로오테츠로'
when public.normalize_work(work)=public.normalize_work('하이큐!!') and public.normalize_keyword(value) in ('츠키시마케이','tsukishimakei','月島蛍') then '츠키시마케이'
when public.normalize_work(work)=public.normalize_work('하이큐!!') and public.normalize_keyword(value) in ('오이카와토오루','oikawatoru','及川徹') then '오이카와토오루'
when public.normalize_work(work)=public.normalize_work('주술회전') and public.normalize_keyword(value) in ('고죠사토루','gojosatoru','satorugojo','五条悟','五条') then '고죠사토루'
when public.normalize_work(work)=public.normalize_work('주술회전') and public.normalize_keyword(value) in ('게토스구루','getosuguru','夏油傑') then '게토스구루'
when public.normalize_work(work)=public.normalize_work('주술회전') and public.normalize_keyword(value) in ('이타도리유지','itadoriyuji','虎杖悠仁') then '이타도리유지'
when public.normalize_work(work)=public.normalize_work('주술회전') and public.normalize_keyword(value) in ('후시구로메구미','fushiguromegumi','伏黒恵') then '후시구로메구미'
when public.normalize_work(work)=public.normalize_work('귀멸의 칼날') and public.normalize_keyword(value) in ('카마도탄지로','kamadotanjiro','tanjiro','竈門炭治郎') then '카마도탄지로'
when public.normalize_work(work)=public.normalize_work('귀멸의 칼날') and public.normalize_keyword(value) in ('카마도네즈코','kamadonezuko','nezuko','竈門禰豆子') then '카마도네즈코'
when public.normalize_work(work)=public.normalize_work('원신') and public.normalize_keyword(value) in ('종려','zhongli','鍾離') then '종려'
when public.normalize_work(work)=public.normalize_work('원신') and public.normalize_keyword(value) in ('벤티','venti','ウェンティ') then '벤티'
when public.normalize_work(work)=public.normalize_work('원신') and public.normalize_keyword(value) in ('타르탈리아','tartaglia','childe','タルタリヤ') then '타르탈리아'
when public.normalize_work(work)=public.normalize_work('원신') and public.normalize_keyword(value) in ('알하이탐','alhaitham','アルハイゼン') then '알하이탐'
when public.normalize_work(work)=public.normalize_work('원신') and public.normalize_keyword(value) in ('느비예트','neuvillette','ヌヴィレット') then '느비예트'
when public.normalize_work(work)=public.normalize_work('붕괴: 스타레일') and public.normalize_keyword(value) in ('단항','danheng','丹恒') then '단항'
when public.normalize_work(work)=public.normalize_work('붕괴: 스타레일') and public.normalize_keyword(value) in ('카프카','kafka','カフカ') then '카프카'
when public.normalize_work(work)=public.normalize_work('붕괴: 스타레일') and public.normalize_keyword(value) in ('경원','jingyuan','景元') then '경원'
when public.normalize_work(work)=public.normalize_work('블루 록') and public.normalize_keyword(value) in ('이사기요이치','isagiyoichi','yoichiisagi','潔世一') then '이사기요이치'
when public.normalize_work(work)=public.normalize_work('블루 록') and public.normalize_keyword(value) in ('나기세이시로','nagiseishiro','凪誠士郎') then '나기세이시로'
when public.normalize_work(work)=public.normalize_work('체인소 맨') and public.normalize_keyword(value) in ('덴지','denji','デンジ') then '덴지'
when public.normalize_work(work)=public.normalize_work('체인소 맨') and public.normalize_keyword(value) in ('파워','power','パワー') then '파워'
when public.normalize_work(work)=public.normalize_work('체인소 맨') and public.normalize_keyword(value) in ('하야카와아키','hayakawaaki','早川アキ') then '하야카와아키'
when public.normalize_work(work)=public.normalize_work('홀로라이브') and public.normalize_keyword(value) in ('호시마치스이세이','hoshimachisuisei','suisei','星街すいせい','すいせい') then '호시마치스이세이'
when public.normalize_work(work)=public.normalize_work('홀로라이브') and public.normalize_keyword(value) in ('우사다페코라','usadapekora','pekora','兎田ぺこら','ぺこら') then '우사다페코라'
when public.normalize_work(work)=public.normalize_work('홀로라이브') and public.normalize_keyword(value) in ('시라카미후부키','shirakamifubuki','fubuki','白上フブキ','フブキ') then '시라카미후부키'
when public.normalize_work(work)=public.normalize_work('니지산지') and public.normalize_keyword(value) in ('쿠즈하','kuzuha','葛葉','くずは') then '쿠즈하'
when public.normalize_work(work)=public.normalize_work('니지산지') and public.normalize_keyword(value) in ('카나에','kanae','叶','かなえ') then '카나에'
when public.normalize_work(work)=public.normalize_work('니지산지') and public.normalize_keyword(value) in ('츠키노미토','tsukinomito','mitotsukino','月ノ美兎') then '츠키노미토'
when public.normalize_work(work)=public.normalize_work('스텔라이브') and public.normalize_keyword(value) in ('아야츠노유니','ayatsunoyuni','yuni','純角ユニ','ユニ') then '아야츠노유니'
when public.normalize_work(work)=public.normalize_work('스텔라이브') and public.normalize_keyword(value) in ('아라하시타비','arahashitabi','tabi','荒波子タビ','タビ') then '아라하시타비'
else public.normalize_keyword(value) end $$;
revoke all on function public.normalize_character(text,text) from public;
grant execute on function public.normalize_character(text,text) to authenticated,service_role;
create or replace function private.match_new_goods() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.is_published or new.sale_status='closed' or new.is_test then return new; end if;
 if TG_OP='UPDATE' then if old.is_published then return new; end if; end if;
 insert into public.notifications(user_id,goods_post_id,title,body,source_url)
 select distinct i.user_id,new.id,new.title,new.work_name||' · '||coalesce(nullif(new.sale_info,''),'새 굿즈 정보가 등록됐어요.'),new.source_url
 from public.user_interests i left join public.user_preferences p on p.user_id=i.user_id
 where coalesce(p.web_notifications,true) and public.normalize_work(i.work_name)=public.normalize_work(new.work_name)
 and (i.character_name='' or exists(select 1 from unnest(new.character_names) c where public.normalize_character(new.work_name,c)=public.normalize_character(i.work_name,i.character_name)))
 on conflict(user_id,goods_post_id) do nothing;
 insert into public.delivery_queue(notification_id) select n.id from public.notifications n where n.goods_post_id=new.id on conflict(notification_id,channel) do nothing;
 return new;
end $$;
create or replace function public.process_mock_queue(batch_size integer default 20) returns integer
language plpgsql security definer set search_path = '' as $$
declare job record; processed integer := 0;
begin
 if not public.is_app_admin() and coalesce(auth.role(),'') <> 'service_role' then
   raise exception 'Administrator access required' using errcode='42501';
 end if;
 if batch_size is null or batch_size not between 1 and 100 then raise exception 'Invalid batch size'; end if;
 for job in select q.id, q.notification_id from public.delivery_queue q
   where q.status='pending' order by q.created_at limit batch_size for update skip locked
 loop
   -- Suppress mock delivery if the user unsubscribed or the post was withdrawn.
   if not exists (
     select 1 from public.notifications n join public.goods_posts g on g.id=n.goods_post_id
     join public.user_interests i on i.user_id=n.user_id and public.normalize_work(i.work_name)=public.normalize_work(g.work_name)
     where n.id=job.notification_id and g.is_published and g.sale_status<>'closed'
       and (i.character_name='' or exists(select 1 from unnest(g.character_names) c where public.normalize_character(g.work_name,c)=public.normalize_character(i.work_name,i.character_name)))
   ) then
     update public.delivery_queue set status='cancelled',processed_at=now() where id=job.id;
   else
     update public.delivery_queue set status='mocked',attempts=1,processed_at=now(),
       provider_message_id='mock:'||job.id::text where id=job.id;
     insert into public.delivery_attempts(queue_id,mode,result) values(job.id,'mock','mocked') on conflict do nothing;
   end if;
   processed:=processed+1;
 end loop;
 return processed;
end;
$$;
notify pgrst,'reload schema';
commit;
