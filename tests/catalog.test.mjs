import test from 'node:test';
import assert from 'node:assert/strict';
import {WORKS,CHARACTERS,canonicalWork,canonicalCharacter,searchSuggestions,workGenre,normalizeWork,filterGoods} from '../assets/domain.js';
import {GENRE_OVERRIDES} from '../assets/curated-catalog.js';
import {EXPANDED_CATALOG} from '../assets/name-catalog.js';
test('discovery catalog keeps anime compact and work keys unique',()=>{
 assert.equal(WORKS.filter(w=>workGenre(w[0])==='애니·만화').length,30);
 assert.ok(Object.values(CHARACTERS).flat().length>=100);
 assert.equal(new Set(WORKS.map(w=>w[0])).size,WORKS.length);
 assert.equal(new Set(WORKS.map(w=>w[1])).size,WORKS.length);
 assert.ok(!WORKS.some(w=>/idol|아이돌/i.test(w[0])));
});
test('expanded examples have source relations, multilingual names and no fictional sales',()=>{
 for(const group of EXPANDED_CATALOG){
  assert.match(group.source,/^https:\/\/myanimelist.net\/anime\/\d+$/);
  assert.equal(canonicalWork(group.work[2]),group.work[0]);
  assert.equal(workGenre(group.work[0]),GENRE_OVERRIDES[group.work[0]]||'애니·만화');
  for(const member of group.members){
   assert.match(member.source,/^https:\/\/myanimelist.net\/character\//);
   assert.equal(canonicalCharacter(group.work[0],member.names[1]||member.names[0]),member.names[0]);
   assert.ok(!('sale_status' in member));
  }
 }
 assert.ok(searchSuggestions('Luffy Monkey D.').some(c=>c.work_name==='원피스'));
 assert.ok(searchSuggestions('몽키 D. 루피').some(c=>c.work_name==='원피스'));
 assert.equal(canonicalCharacter('카우보이 비밥','Spike Spiegel'),'스파이크 스피겔');
});
test('requested catalog edits and common abbreviations share canonical names in both pickers and goods search',()=>{
 for(const [alias,name] of [['닌타마','닌타마 란타로'],['나히아','나의 히어로 아카데미아'],['어바등','어두운 바다의 등불이 되어'],['마차살','마법명가 차남으로 살아남는 법'],['변호됨','너희들은 변호됐다'],['이착헌','이세계 착각 헌터'],['블아','블루 아카이브'],['띵조','명조: 워더링 웨이브'],['림버스','림버스 컴퍼니']]){
  assert.equal(canonicalWork(alias),name);assert.ok(searchSuggestions(alias).some(c=>c.work_name===name));
  assert.equal(filterGoods([{id:'real',is_published:true,title:'소식',work_name:name,character_names:[],sale_status:'open',created_at:'2026-11-03'}],{query:alias}).length,1);
 }
 for(const name of ['데스노트','은혼','괴수 8호','나의 히어로 아카데미아'])assert.equal(WORKS.filter(w=>w[0]===name).length,1);
 for(const name of ['사무라이 7','허니와 클로버','일곱 개의 대죄']){assert.ok(!WORKS.some(w=>w[0]===name));assert.equal(searchSuggestions(name).length,0)}
 assert.equal(normalizeWork('Samurai 7'),'mal-166');
 assert.ok(WORKS.filter(w=>workGenre(w[0])==='게임').length>=20);
 assert.ok(WORKS.filter(w=>workGenre(w[0])==='웹소설·웹툰').length>=14);
 assert.equal(workGenre('변호됨'),'웹소설·웹툰');assert.equal(workGenre('이착헌'),'웹소설·웹툰');
 for(const [alias,name] of [['은용꿈','은행원도 용꿈을 꾸나요'],['우호정','우리 호텔 정상 영업합니다'],['헤즈빈','해즈빈 호텔']]){assert.equal(canonicalWork(alias),name);assert.ok(searchSuggestions(alias).some(c=>c.work_name===name))}
 for(const name of ['일타강사 백사부','광마회귀','마법학교 마법사로 살아가는 법','회귀자 사용설명서','SSS급 죽어야 사는 헌터']){assert.ok(!WORKS.some(w=>w[0]===name));assert.equal(searchSuggestions(name).length,0)}
 assert.ok(WORKS.some(w=>w[0]==='화산귀환'));assert.equal(normalizeWork('회사설'),'regressorinstructionmanual');
});
