import test from 'node:test';import assert from 'node:assert/strict';
import {WORKS,CHARACTERS,cacheCatalog,canonicalWork,canonicalCharacter,characterAliases} from '../assets/catalog-store.js';
import {catalogSearch,resolveCatalog,catalogChoice} from '../assets/catalog-client.js';
const work={key:'runtime-test',name:'런타임 테스트 작품',aliases:['Runtime Work','テスト作品'],genre:'아이돌',active:true,rank:0};
test('browser starts with a small vocabulary, then hydrates work-scoped aliases',()=>{
 assert.ok(WORKS.length<10);cacheCatalog([{work,character:{name:'테스트 인물',aliases:['Runtime Person','テスト人物']}}]);assert.equal(canonicalWork('テスト作品'),work.name);assert.equal(canonicalCharacter(work.name,'Runtime Person'),'테스트 인물');assert.equal(canonicalCharacter('다른 작품','Runtime Person'),'Runtime Person');assert.ok(CHARACTERS[work.name].includes('테스트 인물'));
});
test('catalog requests deduplicate, preserve paging, retry failures and cache resolved aliases',async()=>{
 const original=globalThis.fetch;let calls=0,fail=true;
 globalThis.fetch=async(url,request)=>{calls++;const args=JSON.parse(request.body);if(url.endsWith('/catalog_resolve'))return Response.json([{work,character:{name:'추가 인물',aliases:['Extra Person']}}]);if(args.p_query==='retry'&&fail){fail=false;return new Response('',{status:503})}assert.equal(args.p_limit,20);return Response.json({items:[{work,character:null}],has_more:true})};
 try{const [a,b]=await Promise.all([catalogSearch({query:'runtime-test',offset:20}),catalogSearch({query:'runtime-test',offset:20})]);assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(a.has_more,true);assert.equal(catalogChoice(a.items[0]).work_name,work.name);await assert.rejects(catalogSearch({query:'retry'}));await catalogSearch({query:'retry'});assert.equal(calls,3);await resolveCatalog([{work_name:'Runtime Work',character_name:'Extra Person'}]);assert.equal(canonicalCharacter(work.name,'Extra Person'),'추가 인물');assert.ok(characterAliases(work.name,'Extra Person').includes('Extra Person'))}finally{globalThis.fetch=original}
});
