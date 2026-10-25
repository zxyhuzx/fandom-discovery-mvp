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
