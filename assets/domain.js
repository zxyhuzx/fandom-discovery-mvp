export const WORKS = [
 ['나루토','naruto'], ['하이큐!!','haikyu','haikyuu','하이큐'], ['주술회전','jujutsu','jjk','주술'],
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

// Characters are scoped to a work. Unknown names can still be entered for niche fandoms.
export const CHARACTERS={
 '나루토':['우즈마키 나루토','휴우가 히나타','우치하 사스케','하루노 사쿠라'],
 '하이큐!!':['히나타 쇼요','카게야마 토비오','츠키시마 케이','코즈메 켄마','쿠로오 테츠로','오이카와 토오루'],
 '주술회전':['이타도리 유지','후시구로 메구미','고죠 사토루','게토 스구루'],
 '귀멸의 칼날':['카마도 탄지로','카마도 네즈코','아가츠마 젠이츠','토미오카 기유'],
 '원신':['벤티','종려','타르탈리아','알하이탐','느비예트'],
 '전지적 독자 시점':['김독자','유중혁','한수영'],
 '블루 록':['이사기 요이치','나기 세이시로','미카게 레오','이토시 린'],
 '쿠로코의 농구':['쿠로코 테츠야','키세 료타','아카시 세이주로'],
 '체인소 맨':['덴지','파워','하야카와 아키'],
 '붕괴: 스타레일':['단항','카프카','삼포','경원'],
 '젠레스 존 제로':['호시미 미야비','엘렌 조','아사바 하루마사'],
 '나 혼자만 레벨업':['성진우','차해인'], '내가 키운 S급들':['한유진','한유현','성현제']
};
export function workGenre(work){
 const key=normalizeWork(work);
 if(['naruto','haikyu','jujutsu','demonslayer','bluelock','kuroko','chainsaw'].includes(key))return '애니·만화';
 if(['orv','sololeveling','sclass'].includes(key))return '웹소설·웹툰';
 if(['genshin','starrail','zzz'].includes(key))return '게임';
 return '기타';
}
export const goodsGenre=p=>p.genre_name||workGenre(p.work_name);
export function filterGoods(posts,{query='',work='',character='',status='',scope='all',genre='',platform=''}={}){
 const terms=String(query).trim().split(/\s+/).map(normalizeKeyword).filter(Boolean),ch=normalizeKeyword(character);
 return posts.filter(p=>{
  if(!p.is_published||work&&normalizeWork(p.work_name)!==normalizeWork(work)||status&&p.sale_status!==status||ch&&!p.character_names.some(c=>normalizeKeyword(c).includes(ch))||genre&&goodsGenre(p)!==genre||platform&&p.platform_name!==platform)return false;
  const aliases=WORKS.find(a=>normalizeWork(a[0])===normalizeWork(p.work_name))||[p.work_name];
  const fields={work:[p.work_name,...aliases],character:p.character_names,creator:[p.seller_name||'']};
  const haystack=normalizeKeyword((scope==='all'?[p.title,...fields.work,...fields.character,...fields.creator,p.platform_name||'']:fields[scope]||[]).join(' '));
  return terms.every(term=>haystack.includes(term));
 }).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
}
export const needsOnboarding=(user,interests,preferences)=>!!user&&!interests.length&&!preferences?.onboarding_completed;

export function sortGoods(items,order='latest',interests=[]){
 const popularity=p=>Number(p.popularity_count||0);
 const relevance=p=>interests.reduce((score,i)=>matchesInterest(i,p)?Math.max(score,i.character_name?2:1):score,0);
 return [...items].sort((a,b)=>(order==='recommended'?relevance(b)-relevance(a):0)||(order!=='latest'?popularity(b)-popularity(a):0)||new Date(b.created_at)-new Date(a.created_at));
}
export function searchSuggestions(query,posts=[]){
 const term=normalizeKeyword(query);if(!term)return [];const terms=String(query).trim().split(/\s+/).map(normalizeKeyword).filter(Boolean);
 const catalog=new Map(Object.entries(CHARACTERS).map(([w,c])=>[w,new Set(c)]));
 posts.filter(p=>p.is_published).forEach(p=>{if(!catalog.has(p.work_name))catalog.set(p.work_name,new Set());p.character_names.forEach(c=>catalog.get(p.work_name).add(c))});
 const choices=[];
 for(const [work,chars] of catalog){
  const aliases=WORKS.find(a=>normalizeWork(a[0])===normalizeWork(work))||[work];const workMatches=aliases.some(a=>normalizeKeyword(a).includes(term));
  if(workMatches)choices.push({label:work,query:work,kind:'작품',work_name:work,character_name:''});
  for(const character of chars)if(workMatches||terms.every(t=>normalizeKeyword([...aliases,character].join(' ')).includes(t)))choices.push({label:work+' · '+character,query:work+' '+character,kind:'캐릭터',work_name:work,character_name:character});
 }
 posts.filter(p=>p.is_published&&p.seller_name&&normalizeKeyword(p.seller_name).includes(term)).forEach(p=>choices.push({label:p.seller_name,query:p.seller_name,kind:'창작자·판매자'}));
 return [...new Map(choices.map(c=>[c.label,c])).values()].slice(0,12);
}
