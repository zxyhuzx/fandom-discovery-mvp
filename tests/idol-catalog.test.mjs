import test from 'node:test';import assert from 'node:assert/strict';
import {IDOL_CATALOG} from '../assets/catalog-idols.js';
import {canonicalWork,canonicalCharacter,workGenre,searchSuggestions} from '../assets/domain.js';
test('expanded idol catalog includes 25 groups, 14 girl groups and 153 unique scoped members',()=>{
 assert.equal(IDOL_CATALOG.length,25);assert.equal(IDOL_CATALOG.filter(g=>g.gender==='girl').length,14);assert.equal(IDOL_CATALOG.reduce((n,g)=>n+g.members.length,0),153);
 assert.equal(new Set(IDOL_CATALOG.map(g=>g.work[1])).size,25);
 for(const g of IDOL_CATALOG){assert.ok(g.source.startsWith('https://'));assert.equal(workGenre(g.work[0]),'아이돌');assert.equal(new Set(g.members.map(r=>r[0])).size,g.members.length);for(const row of g.members)for(const alias of row)assert.equal(canonicalCharacter(g.work[0],alias),row[0]);for(const alias of g.work)assert.equal(canonicalWork(alias),g.work[0])}
});
test('girl group nicknames and multilingual member aliases retain Korean display and group scope',()=>{
 assert.equal(canonicalWork('블핑'),'블랙핑크');assert.equal(canonicalWork('키오프'),'키스오브라이프');assert.equal(canonicalWork('투바투'),'투모로우바이투게더');
 assert.equal(canonicalCharacter('aespa','カリナ'),'카리나');assert.equal(canonicalCharacter('IVE','WONYOUNG'),'장원영');
 assert.equal(canonicalCharacter('ITZY','YUNA'),'유나');assert.equal(canonicalCharacter('ILLIT','YUNAH'),'윤아');
 for(const work of ['투어스','트레저'])assert.ok(searchSuggestions('JIHOON').some(c=>c.work_name===work&&c.character_name==='지훈'));
 assert.equal(IDOL_CATALOG.find(g=>g.work[1]==='enhypen').members.length,6);
});
