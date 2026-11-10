import {WORKS,CHARACTERS,workIndex,canonicalWork,normalizeWork,normalizeKeyword,characterAliases,canonicalCharacter,canonicalPost,workGenre} from './catalog-data.js';
export {WORKS,CHARACTERS,workIndex,canonicalWork,normalizeWork,normalizeKeyword,characterAliases,canonicalCharacter,canonicalPost,workGenre};
export function matchesInterest(interest, post) {
 return normalizeWork(interest.work_name) === normalizeWork(post.work_name) &&
 (!normalizeKeyword(interest.character_name) || post.character_names.some(c => normalizeKeyword(canonicalCharacter(post.work_name,c)) === normalizeKeyword(canonicalCharacter(interest.work_name,interest.character_name))));
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

export const goodsGenre=p=>p.genre_name||workGenre(p.work_name);
export function filterGoods(posts,{query='',work='',character='',status='',scope='all',genre='',platform='',saleType=''}={}){
 const terms=String(query).trim().split(/\s+/).map(normalizeKeyword).filter(Boolean),ch=normalizeKeyword(character);
 return posts.filter(p=>{
  if(!p.is_published||saleType&&p.sale_type!==saleType||work&&normalizeWork(p.work_name)!==normalizeWork(work)||status&&p.sale_status!==status||ch&&!p.character_names.some(c=>normalizeKeyword(c).includes(ch))||genre&&goodsGenre(p)!==genre||platform&&p.platform_name!==platform)return false;
  const aliases=workIndex.get(normalizeKeyword(p.work_name))||[p.work_name];
  const fields={work:[p.work_name,...aliases],character:p.character_names.flatMap(c=>characterAliases(p.work_name,c)),creator:[p.seller_name||'']};
  const haystack=normalizeKeyword((scope==='all'?[p.title,...fields.work,...fields.character,...fields.creator,p.platform_name||'',...(p.product_types||[]),...(p.search_keywords||[]),p.sale_type||'',goodsGenre(p),...(goodsGenre(p)==='버튜버'?['vtuber','ブイチューバー']:[])]:fields[scope]||[]).join(' '));
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
 posts.filter(p=>p.is_published).map(canonicalPost).forEach(p=>{if(!catalog.has(p.work_name))catalog.set(p.work_name,new Set());p.character_names.forEach(c=>catalog.get(p.work_name).add(c))});
 const choices=[];
 for(const [work,chars] of catalog){
  const aliases=workIndex.get(normalizeKeyword(work))||[work];const workMatches=aliases.some(a=>normalizeKeyword(a).includes(term))||(workGenre(work)==='버튜버'&&['버튜버','vtuber','ブイチューバー'].includes(term));
  if(workMatches)choices.push({label:work,query:work,kind:workGenre(work)==='버튜버'?'버튜버 그룹':'작품',work_name:work,character_name:''});
  for(const character of chars)if(workMatches||terms.every(t=>normalizeKeyword([...aliases,...characterAliases(work,character)].join(' ')).includes(t)))choices.push({label:work+' · '+character,query:work+' '+character,kind:workGenre(work)==='버튜버'?'버튜버':'캐릭터',work_name:work,character_name:character});
 }
 posts.filter(p=>p.is_published&&p.seller_name&&normalizeKeyword(p.seller_name).includes(term)).forEach(p=>choices.push({label:p.seller_name,query:p.seller_name,kind:'창작자·판매자'}));
 return [...new Map(choices.map(c=>[c.label,c])).values()].slice(0,12);
}
