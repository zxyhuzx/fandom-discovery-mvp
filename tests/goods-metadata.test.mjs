import test from 'node:test';
import assert from 'node:assert/strict';
import {CP_NAMES,cpCharacters,effectiveSaleStatus,enrichGoods} from '../assets/goods-metadata.js';
import {filterGoods,canonicalPost} from '../assets/domain.js';
const work='괴담에 떨어져도 출근을 해야 하는구나';
test('CP references expand within the correct work and preserve both characters',()=>{
 assert.deepEqual(cpCharacters(work,'최솔 통판'),['최요원','김솔음']);
 assert.deepEqual(cpCharacters(work,'브라운솔음 회지'),['브라운','김솔음']);
 assert.deepEqual(cpCharacters('하이큐!!','최솔 통판'),[]);
 const p=canonicalPost({id:1,work_name:'괴담출근',title:'최솔 통판',character_names:[],is_published:true,sale_status:'open'});
 for(const name of ['최요원','김솔음'])assert.equal(filterGoods([p],{query:name}).length,1);
 assert.equal(filterGoods([p],{query:'백사헌'}).length,0);
 for(const row of CP_NAMES){assert.ok(row.basis);assert.equal(row.characters.length,2);assert.ok(row.sources.length)}
});
test('deadline boundaries override stale stored status without inventing missing dates',()=>{
 const now=Date.parse('2026-11-23T12:00:00+09:00');
 assert.equal(effectiveSaleStatus({sale_status:'open',sale_end:'2026-11-23T12:00:00+09:00'},now),'closed');
 assert.equal(effectiveSaleStatus({sale_status:'unverified',title:'수요조사',sale_start:'2026-11-22',sale_end:'2026-12-01'},now),'survey_open');
 assert.equal(effectiveSaleStatus({sale_status:'unverified',title:'통판',sale_start:'2026-11-24'},now),'planned');
 assert.equal(effectiveSaleStatus({sale_status:'unverified',title:'통판'},now),'unverified');
 assert.equal(effectiveSaleStatus({sale_status:'closed',sale_end:'2026-12-01'},now),'closed');
 assert.deepEqual(enrichGoods({work_name:work,title:'최솔',character_names:['김솔음']}).character_names,['김솔음','최요원']);
});

test('short CP names do not match inside unrelated words; multilingual names remain case insensitive',()=>{
 assert.deepEqual(cpCharacters('전지적 독자 시점','중독성 있는 디자인'),[]);
 assert.deepEqual(cpCharacters('콜 오브 듀티','#ghostsoap'),['사이먼 고스트 라일리','조니 소프 맥타비시']);
 assert.equal(filterGoods([{id:1,work_name:'콜 오브 듀티',title:'GhostSoap 굿즈',character_names:['사이먼 고스트 라일리','조니 소프 맥타비시'],is_published:true}],{query:'GhostSoap'}).length,1);
});
test('date-only cutoffs change state after the Korean calendar day, never invent an exact closing time',()=>{
 const p={sale_status:'survey_open',sale_end_date:'2026-11-23'};
 assert.equal(effectiveSaleStatus(p,Date.parse('2026-11-23T23:00:00+09:00')),'survey_open');
 assert.equal(effectiveSaleStatus(p,Date.parse('2026-11-24T00:00:00+09:00')),'closed');
});

test('CP searches do not infer the reversed pairing from a shared set of characters',()=>{
 const rows=[{id:1,work_name:work,title:'최솔 회지',character_names:['최요원','김솔음'],is_published:true},{id:2,work_name:work,title:'솔최 회지',character_names:['김솔음','최요원'],is_published:true}];
 assert.deepEqual(filterGoods(rows,{query:'최솔'}).map(p=>p.id),[1]);
 assert.deepEqual(filterGoods(rows,{query:'솔최'}).map(p=>p.id),[2]);
 assert.equal(filterGoods([{...rows[0],title:'브라운솔음 회지',character_names:['브라운','김솔음']}],{query:'블솔'}).length,1);
});

test('direct form buttons use reviewed HTTPS form hosts and never accept lookalike domains',async()=>{
 const {saleFormUrl}=await import('../assets/goods-metadata.js');
 assert.equal(saleFormUrl({source_kind:'x_discovery',sale_info:'판매 폼: https://witchform.com/deposit_form.php?idx=123'}),'https://witchform.com/deposit_form.php?idx=123');
 for(const url of ['https://witchform.com.evil.example/form','https://user:pass@witchform.com/form','javascript:alert(1)'])assert.equal(saleFormUrl({source_kind:'x_discovery',sale_info:url}),null);
});

test('completed forms can be hidden independently of the three active sale filters',()=>{
 const rows=[{id:1,work_name:work,title:'신규',character_names:[],sale_status:'open',is_published:true},{id:2,work_name:work,title:'종료',character_names:[],sale_status:'closed',is_published:true},{id:3,work_name:work,title:'수요조사 예정',character_names:[],sale_status:'survey_planned',is_published:true}];
 assert.deepEqual(new Set(filterGoods(rows,{hideCompleted:true}).map(p=>p.id)),new Set([1,3]));
 assert.equal(filterGoods(rows,{hideCompleted:false}).length,3);
 assert.deepEqual(filterGoods(rows,{status:'planned'}).map(p=>p.id),[3]);
});

test('official ChroNoiR unit is classified separately from CP names',()=>{assert.deepEqual(new Set(cpCharacters('니지산지','ChroNoiR 굿즈')),new Set(['카나에','쿠즈하']));assert.ok(CP_NAMES.find(x=>x.name==='ChroNoiR'&&x.kind==='combination'))});
