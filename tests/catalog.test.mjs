import test from 'node:test';
import assert from 'node:assert/strict';
import {WORKS,CHARACTERS,canonicalWork,canonicalCharacter,searchSuggestions,workGenre} from '../assets/domain.js';
import {EXPANDED_CATALOG} from '../assets/name-catalog.js';
test('catalog exceeds ten times the original works and characters, without duplicate work keys',()=>{
 assert.ok(WORKS.length>=160);
 assert.ok(Object.values(CHARACTERS).flat().length>=560);
 assert.equal(new Set(WORKS.map(w=>w[0])).size,WORKS.length);
 assert.equal(new Set(WORKS.map(w=>w[1])).size,WORKS.length);
 assert.ok(!WORKS.some(w=>/idol|아이돌/i.test(w[0])));
});
test('expanded examples have source relations, multilingual names and no fictional sales',()=>{
 for(const group of EXPANDED_CATALOG){
  assert.match(group.source,/^https:\/\/myanimelist.net\/anime\/\d+$/);
  assert.equal(canonicalWork(group.work[2]),group.work[0]);
  assert.equal(workGenre(group.work[0]),'애니·만화');
  for(const member of group.members){
   assert.match(member.source,/^https:\/\/myanimelist.net\/character\//);
   assert.equal(canonicalCharacter(group.work[0],member.names[1]||member.names[0]),member.names[0]);
   assert.ok(!('sale_status' in member));
  }
 }
 assert.ok(searchSuggestions('Spike Spiegel').some(c=>c.work_name==='카우보이 비밥'));
 assert.ok(searchSuggestions('스파이크 스피겔').some(c=>c.work_name==='카우보이 비밥'));
});
