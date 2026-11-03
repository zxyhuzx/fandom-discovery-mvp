import test from 'node:test';
import assert from 'node:assert/strict';
import {choiceItems,parseWelcomeDraft,mergeWelcomeInterests} from '../assets/welcome-state.js';
test('welcome supports several works, scoped characters and whole-work selection',()=>{
 const items=choiceItems(['하이큐!!','원신'],{'하이큐!!':['히나타 쇼요','코즈메 켄마']});
 assert.equal(items.length,3);assert.deepEqual(items[2],{work_name:'원신',character_name:''});
 assert.equal(parseWelcomeDraft(JSON.stringify({version:1,items})).items.length,3);
});
test('browser drafts reject corruption, wrong work/character relations, and over-limit input',()=>{
 const read=items=>parseWelcomeDraft(JSON.stringify({version:1,items}));
 assert.equal(parseWelcomeDraft('{broken'),null);assert.equal(read([]),null);
 assert.equal(read([{work_name:'하이큐!!',character_name:'종려'}]),null);
 assert.equal(read(Array(101).fill({work_name:'하이큐!!',character_name:''})),null);
 assert.equal(read([{work_name:'원신',character_name:'Zhongli'}]).items[0].character_name,'종려');
});
test('post-login import merges existing account interests without losing them or duplicating aliases',()=>{
 const current=[{id:'old',work_name:'원신',character_name:'종려'}];
 const items=mergeWelcomeInterests(current,[{work_name:'Genshin Impact',character_name:'Zhongli'},{work_name:'하이큐!!',character_name:''}]);
 assert.equal(items.length,2);assert.deepEqual(items[0],{work_name:'원신',character_name:'종려'});
});
