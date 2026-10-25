export const WORKS = [
 ['하이큐!!','haikyu','haikyuu','하이큐'], ['주술회전','jujutsu','jjk','주술'],
 ['귀멸의 칼날','demonslayer','귀칼','귀멸'], ['원신','genshin','genshinimpact'],
 ['전지적 독자 시점','orv','전독시'], ['블루 록','bluelock','블루록'],
 ['쿠로코의 농구','kuroko','쿠농'], ['체인소 맨','chainsaw','chainsawman'],
 ['붕괴: 스타레일','starrail','hsr','스타레일','붕스'], ['젠레스 존 제로','zzz','젠레스','젠존제'],
 ['나 혼자만 레벨업','sololeveling','나혼렙'], ['내가 키운 S급들','sclass','내스급']
];
export const normalizeKeyword = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[\s!！:：·・]+/gu, '');
export function canonicalWork(value) {
 const term = normalizeKeyword(value);
 return WORKS.find(aliases => aliases.some(a => normalizeKeyword(a) === term))?.[0] ?? value.trim();
}
export function normalizeWork(value) {
 const term=normalizeKeyword(value);
 return WORKS.find(aliases=>aliases.some(a=>normalizeKeyword(a)===term))?.[1] ?? term;
}
export function matchesInterest(interest, post) {
 return normalizeWork(interest.work_name) === normalizeWork(post.work_name) &&
 (!normalizeKeyword(interest.character_name) || post.character_names.some(c => normalizeKeyword(c) === normalizeKeyword(interest.character_name)));
}
export function canonicalSource(value) {
 const url=new URL(value.trim());
 if(url.protocol!=='https:' || url.username || url.password) throw new Error('HTTPS 공개 게시물 주소를 입력해 주세요.');
 url.hash='';
 for(const key of [...url.searchParams.keys()]) if(/^utm_/i.test(key)||['fbclid','gclid'].includes(key)) url.searchParams.delete(key);
 url.searchParams.sort();
 return url.toString().replace(/\/$/,'');
}
export const SALE_LABELS={planned:'판매 예정',open:'판매 중',survey_planned:'수요조사 예정',survey_open:'수요조사 중',closed:'마감'};
export const QUEUE_LABELS={pending:'모의 발송 대기',mocked:'모의 발송 완료 · 실제 발송 없음',cancelled:'구독 해제 또는 게시 취소로 취소'};
