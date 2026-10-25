import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeKeyword,normalizeWork,canonicalWork,canonicalSource,matchesInterest} from '../assets/domain.js';
import {createKakaoProvider,ExternalApprovalRequiredError} from '../lib/messaging/kakao-provider.mjs';

test('aliases and Unicode punctuation resolve the same work',()=>{
 for(const alias of [' 하이큐!! ','haikyuu','haikyu'])assert.equal(normalizeWork(alias),'haikyu');
 assert.equal(canonicalWork('전독시'),'전지적 독자 시점');
 assert.equal(normalizeWork('붕괴： 스타레일'),'starrail');
 assert.equal(normalizeKeyword('김 독자'),'김독자');
});
test('matching requires the work AND optional exact character',()=>{
 const post={work_name:'하이큐!!',character_names:['히나타']};
 assert.ok(matchesInterest({work_name:'haikyu',character_name:''},post));
 assert.ok(matchesInterest({work_name:'하이큐',character_name:'히 나 타'},post));
 assert.ok(!matchesInterest({work_name:'원신',character_name:'히나타'},post));
 assert.ok(!matchesInterest({work_name:'하이큐',character_name:'카게야마'},post));
});
test('canonical URL drops tracking, fragments and refuses dangerous protocols',()=>{
 assert.equal(canonicalSource('https://example.com/post/?b=2&utm_source=x&a=1#preview'),'https://example.com/post/?a=1&b=2');
 for(const url of ['javascript:alert(1)','http://example.com','https://user:password@example.com'])assert.throws(()=>canonicalSource(url));
});
test('mock is deterministic and never invokes network',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw new Error('Mock must not call network')};
 try{const provider=createKakaoProvider();const deliveryId='00000000-0000-4000-8000-000000000001';const result=await provider.send({deliveryId});assert.deepEqual(result,await provider.send({deliveryId}));assert.equal(result.realMessageSent,false);assert.equal(result.providerMessageId,'mock:'+deliveryId)}finally{globalThis.fetch=original}
});
test('real Kakao mode is fail closed regardless of environment',()=>{
 process.env.KAKAO_REAL_SEND_ENABLED='true';assert.throws(()=>createKakaoProvider({mode:'live'}),ExternalApprovalRequiredError);delete process.env.KAKAO_REAL_SEND_ENABLED;
});

test('dispatch boundary blocks live mode before RPC; mock delegates to atomic simulator',async()=>{
 const {dispatchMockBatch}=await import('../lib/messaging/mock-dispatch.mjs');let calls=0;
 const client={rpc:async(name,body)=>{calls++;assert.equal(name,'process_mock_queue');assert.deepEqual(body,{batch_size:20});return {data:2,error:null}}};
 await assert.rejects(()=>dispatchMockBatch(client,{mode:'live'}),ExternalApprovalRequiredError);assert.equal(calls,0);
 assert.deepEqual(await dispatchMockBatch(client),{processed:2,mode:'mock',realMessageSent:false});assert.equal(calls,1);
});
