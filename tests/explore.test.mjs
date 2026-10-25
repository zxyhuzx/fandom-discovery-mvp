import test from 'node:test';
import assert from 'node:assert/strict';
import {filterGoods,CHARACTERS,needsOnboarding} from '../assets/domain.js';
const base={is_published:true,work_name:'하이큐!!',character_names:['히나타 쇼요'],title:'새 굿즈',sale_status:'open',seller_name:'작업실',created_at:'2026-10-25'};
test('exploration combines work aliases, character, text and sale status; excludes drafts',()=>{
 const data=[{...base,id:1},{...base,id:2,is_published:false},{...base,id:3,character_names:['카게야마 토비오']},{...base,id:4,sale_status:'closed'}];
 assert.deepEqual(filterGoods(data,{query:'작업실',work:'haikyu',character:'히나타',status:'open'}).map(p=>p.id),[1]);
 assert.equal(filterGoods(data,{query:'없는 작품'}).length,0);
});
test('latest first and character catalogs remain linked to works',()=>{
 assert.deepEqual(filterGoods([{...base,id:1,created_at:'2026-10-23'},{...base,id:2}]).map(p=>p.id),[2,1]);
 assert.ok(CHARACTERS['하이큐!!'].includes('히나타 쇼요'));
 assert.ok(!CHARACTERS['원신'].includes('히나타 쇼요'));
});

test('onboarding appears once: new account only, saved interests and skip both bypass it',()=>{
 assert.equal(needsOnboarding(null,[],null),false);
 assert.equal(needsOnboarding({id:'new'},[],null),true);
 assert.equal(needsOnboarding({id:'existing'},[{work_name:'하이큐!!'}],null),false);
 assert.equal(needsOnboarding({id:'skipped'},[],{onboarding_completed:true}),false);
});

test('unified search accepts work aliases and combines work plus character words',()=>{
 const data=[base,{...base,work_name:'원신',character_names:['종려']}];
 assert.equal(filterGoods(data,{query:'haikyuu'}).length,1);
 assert.equal(filterGoods(data,{query:'하이큐 히나타'}).length,1);
 assert.equal(filterGoods(data,{query:'종려',scope:'character'}).length,1);
 assert.equal(filterGoods(data,{query:'히나타',scope:'work'}).length,0);
 assert.equal(filterGoods(data,{query:'작업실',scope:'creator'}).length,2);
});
test('genre, sale status and platform combine and explicit genre overrides catalog',()=>{
 const data=[{...base,platform_name:'윗치폼'},{...base,work_name:'원신',platform_name:'윗치폼'},{...base,genre_name:'게임',sale_status:'planned',platform_name:'포스타입'}];
 assert.equal(filterGoods(data,{genre:'애니·만화',status:'open',platform:'윗치폼'}).length,1);
 assert.equal(filterGoods(data,{genre:'게임',status:'planned',platform:'포스타입'}).length,1);
});

test('sort order uses actual popularity, interest relevance and recency',async()=>{
 const {sortGoods}=await import('../assets/domain.js');const data=[{...base,id:1,popularity_count:3},{...base,id:2,popularity_count:20,work_name:'원신',character_names:['종려'],created_at:'2026-10-24'}];
 assert.equal(sortGoods(data,'latest')[0].id,1);assert.equal(sortGoods(data,'popular')[0].id,2);
 assert.equal(sortGoods(data,'recommended',[{work_name:'하이큐',character_name:''}])[0].id,1);
 assert.equal(sortGoods(data,'recommended',[])[0].id,2);
});
test('autocomplete relates works to characters and disambiguates same character names',async()=>{
 const {searchSuggestions}=await import('../assets/domain.js');
 const byWork=searchSuggestions('하이큐');assert.ok(byWork.some(c=>c.label.includes('하이큐')&&c.label.includes('히나타')));
 const combined=searchSuggestions('하이큐 히나타');assert.ok(combined.some(c=>c.work_name==='하이큐!!'&&c.character_name==='히나타 쇼요'));
 const byName=searchSuggestions('히나타');assert.ok(byName.some(c=>c.label.includes('하이큐')));assert.ok(byName.some(c=>c.label.includes('나루토')));
 assert.ok(searchSuggestions('작업실',[base]).some(c=>c.kind==='창작자·판매자'));
});
