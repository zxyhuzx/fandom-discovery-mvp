import {IDOL_CATALOG} from './catalog-idols.js';
// Full source catalog for seeding and offline tests; excluded from browser bundles.
import {SURVEY_NAMES} from './survey-names.js';
import {VTUBERS,WORK_NAME_ALIASES,CHARACTER_NAME_ALIASES,EXPANDED_CATALOG,RETIRED_CATALOG,CURATED_CATALOG} from './name-catalog.js';
import {EXTRA_WORK_ALIASES,GENRE_OVERRIDES,RETIRED_CURATED_CATALOG} from './curated-catalog.js';
export const WORKS = [
 ['나루토','naruto'], ['하이큐!!','haikyu','haikyuu','하이큐'], ['주술회전','jujutsu','jjk','주술'],
 ['귀멸의 칼날','demonslayer','귀칼','귀멸'], ['원신','genshin','genshinimpact'],
 ['전지적 독자 시점','orv','전독시'], ['블루 록','bluelock','블루록'],
 ['쿠로코의 농구','kuroko','쿠농'], ['체인소 맨','chainsaw','chainsawman'],
 ['붕괴: 스타레일','starrail','hsr','스타레일','붕스'], ['젠레스 존 제로','zzz','젠레스','젠존제'],
 ['나 혼자만 레벨업','sololeveling','나혼렙'], ['내가 키운 S급들','sclass','내스급']
];
for(const row of WORKS)row.push(...(WORK_NAME_ALIASES[row[0]]||[]));
WORKS.push(...IDOL_CATALOG.map(g=>g.work));
WORKS.push(...VTUBERS.map(g=>g.work));
WORKS.push(...EXPANDED_CATALOG.map(g=>g.work));
WORKS.push(...CURATED_CATALOG.map(g=>g.work));
for(const row of WORKS)row.push(...(EXTRA_WORK_ALIASES[row[0]]||[]));
export const normalizeKeyword = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[\s!！:：·・]+/gu, '');
export const workIndex=new Map();for(const row of [...WORKS,...RETIRED_CATALOG.map(g=>g.work),...RETIRED_CURATED_CATALOG.map(g=>g.work)])for(const alias of row)if(!workIndex.has(normalizeKeyword(alias)))workIndex.set(normalizeKeyword(alias),row);
export function canonicalWork(value) {
 const term = normalizeKeyword(value);
 return workIndex.get(term)?.[0] ?? value.trim();
}
export function normalizeWork(value) {
 const term=normalizeKeyword(value);
 return workIndex.get(term)?.[1] ?? term;
}
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
for(const group of IDOL_CATALOG){CHARACTERS[group.work[0]]=group.members.map(r=>r[0]);CHARACTER_NAME_ALIASES[group.work[0]]=group.members}
for(const group of VTUBERS)CHARACTERS[group.work[0]]=group.members.map(row=>row[0]);
for(const group of EXPANDED_CATALOG)CHARACTERS[group.work[0]]=group.members.map(member=>member.names[0]);
for(const group of CURATED_CATALOG)CHARACTERS[group.work[0]]=group.members.map(member=>member[0]);
for(const [work,rows] of Object.entries(SURVEY_NAMES))for(const names of rows){const list=CHARACTERS[work]??=[];if(!list.includes(names[0]))list.push(names[0]);}
export function characterAliases(work,value){const rows=CHARACTER_NAME_ALIASES[canonicalWork(work)]||[];return rows.find(row=>row.some(a=>normalizeKeyword(a)===normalizeKeyword(value)))||[value]}
export function canonicalCharacter(work,value){return characterAliases(work,String(value).trim())[0]}
export function canonicalPost(p){const work=canonicalWork(p.work_name);return {...p,work_name:work,character_names:p.character_names.map(c=>canonicalCharacter(work,c))}}
export function workGenre(work){
 const key=normalizeWork(work);
 const name=canonicalWork(work);
 if(IDOL_CATALOG.some(g=>g.work[0]===name))return '아이돌';
 if(GENRE_OVERRIDES[name])return GENRE_OVERRIDES[name];
 const curated=[...CURATED_CATALOG,...RETIRED_CURATED_CATALOG].find(g=>g.work[1]===key);if(curated)return curated.genre;
 if(VTUBERS.some(g=>g.work[1]===key))return '버튜버';
 if([...EXPANDED_CATALOG,...RETIRED_CATALOG].some(g=>g.work[1]===key))return '애니·만화';
 if(['naruto','haikyu','jujutsu','demonslayer','bluelock','kuroko','chainsaw'].includes(key))return '애니·만화';
 if(['orv','sololeveling','sclass'].includes(key))return '웹소설·웹툰';
 if(['genshin','starrail','zzz'].includes(key))return '게임';
 return '기타';
}
