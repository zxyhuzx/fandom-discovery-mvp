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
