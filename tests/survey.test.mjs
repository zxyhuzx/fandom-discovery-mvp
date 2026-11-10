import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {SURVEY_GOODS as goods,SURVEY_PEOPLE,SALE_TYPES,surveyFeed,surveyLink} from '../assets/survey-data.js';
import {filterGoods,canonicalCharacter,canonicalWork,matchesInterest,searchSuggestions,CHARACTERS,SALE_LABELS} from '../assets/domain.js';
import {parseWelcomeDraft} from '../assets/welcome-state.js';
test('survey has exactly 66 singles for 22 participants and 14 related shared goods',async()=>{
 assert.equal(goods.length,80);assert.equal(SURVEY_PEOPLE.length,22);assert.equal(new Set(goods.map(p=>p.id)).size,80);
 assert.equal(goods.filter(p=>p.character_names.length===1).length,66);assert.equal(goods.filter(p=>p.character_names.length>1).length,14);
 for(const person of SURVEY_PEOPLE){assert.equal(goods.filter(p=>p.work_name===person.work_name&&p.character_names.length===1&&p.character_names[0]===person.character_name).length,3);assert.ok(CHARACTERS[person.work_name].includes(person.character_name));}
 for(const p of goods){assert.equal(p.source_url,null);assert.equal(p.popularity_count,undefined);assert.equal(p.is_test,true);assert.equal(p.is_survey_example,true);assert.ok(SALE_LABELS[p.sale_status]);assert.ok(SALE_TYPES.includes(p.sale_type));assert.ok(p.search_keywords.length);assert.ok(p.seller_name);await access('.'+p.thumbnail_url);}
 assert.ok(new Set(goods.map(p=>p.seller_name)).size>=8);assert.equal(new Set(goods.map(p=>p.product_types[0])).size,8);
});
test('every person and work returns only related records including combinations and alias spellings',()=>{
 for(const person of SURVEY_PEOPLE){
  // Naruto is both the work title and a short character name; the work search intentionally returns all Naruto goods.
  const found=filterGoods(goods,{query:person.character_name});
  assert.deepEqual(new Set(found.map(p=>p.id)),new Set(goods.filter(p=>p.work_name===person.work_name&&p.character_names.includes(person.character_name)).map(p=>p.id)));
  assert.ok(searchSuggestions(person.display_name,goods).some(c=>c.work_name===person.work_name&&c.character_name===person.character_name));
  assert.ok(parseWelcomeDraft(JSON.stringify({version:1,items:[{work_name:person.work_name,character_name:person.display_name}]})));
 }
 for(const [alias,work] of [['괴담출근','괴담에 떨어져도 출근을 해야 하는구나'],['어바등','어두운 바다의 등불이 되어'],['원신','원신'],['헌헌','헌터×헌터'],['스타레일','붕괴: 스타레일'],['나루토','나루토'],['니지산지','니지산지']])assert.deepEqual(new Set(filterGoods(goods,{query:alias}).map(p=>p.id)),new Set(goods.filter(p=>p.work_name===work).map(p=>p.id)));
 for(const p of goods.filter(p=>p.character_names.length>1))for(const c of p.character_names)assert.ok(filterGoods(goods,{query:c}).some(item=>item.id===p.id));
 assert.equal(canonicalCharacter('니지산지','로렌 이로하스'),'로렌 이로아스');
 assert.equal(filterGoods(goods,{query:'원신 신해량'}).length,0);
 assert.equal(filterGoods(goods,{query:'없는 작가'}).length,0);
});
test('creator, product, sale filters and interest matching use the existing domain',()=>{
 for(const seller of new Set(goods.map(p=>p.seller_name)))assert.deepEqual(new Set(filterGoods(goods,{query:seller}).map(p=>p.id)),new Set(goods.filter(p=>p.seller_name===seller).map(p=>p.id)));
 for(const product of new Set(goods.map(p=>p.product_types[0])))assert.deepEqual(new Set(filterGoods(goods,{query:product}).map(p=>p.id)),new Set(goods.filter(p=>p.product_types.includes(product)).map(p=>p.id)));
 for(const type of SALE_TYPES)assert.ok(filterGoods(goods,{saleType:type}).every(p=>p.sale_type===type));
 for(const status of Object.keys(SALE_LABELS)){const result=filterGoods(goods,{status});if(status==='unverified')assert.equal(result.length,0);else assert.ok(result.length);assert.ok(result.every(p=>p.sale_status===status));}
 const selected=[{work_name:'어바등',character_name:'신해량'},{work_name:'스타레일',character_name:'마이데이'}];
 const feed=surveyFeed(selected);assert.ok(feed.length>=8);assert.ok(feed.every(p=>selected.some(i=>matchesInterest(i,p))));
 assert.equal(surveyFeed([]).length,0);assert.equal(surveyFeed([{work_name:'하이큐',character_name:''}]).length,0);
 assert.ok(surveyFeed(selected,{work:'어바등'}).every(p=>canonicalWork(p.work_name)===canonicalWork('어바등')));
});
test('survey CTA accepts a configured HTTPS URL only; samples have no external content',async()=>{
 for(const value of ['',undefined,'javascript:alert(1)','http://example.org','https://user:pass@example.org'])assert.equal(surveyLink(value),null);
 assert.equal(surveyLink('https://example.org/survey'),'https://example.org/survey');
 for(const name of ['keyring','doll','stickers','photocard','stand','badge','pouch','postcard']){const svg=await readFile('assets/survey/'+name+'.svg','utf8');assert.ok(!/<image|<script|href=/i.test(svg));}
});
