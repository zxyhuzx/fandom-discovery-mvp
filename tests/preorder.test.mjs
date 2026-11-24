import test from 'node:test';
import assert from 'node:assert/strict';
import {saleStatusLabel,shippingEstimate} from '../assets/goods-metadata.js';
import {filterGoods} from '../assets/domain.js';
const now=Date.parse('2026-11-24T10:00:00+09:00');
const p={id:'preorder',title:'예약 굿즈',work_name:'원신',character_names:[],is_published:true,sale_status:'open',sale_method:'preorder',shipping_estimate:'2027년 2월 이후 출고 예정'};
test('accepting preorders are labelled separately, without changing order-state filters',()=>{
 assert.equal(saleStatusLabel(p,now),'예약 판매 중');
 assert.equal(saleStatusLabel({...p,sale_method:'standard'},now),'판매 중');
 assert.equal(filterGoods([p],{status:'open'}).length,1);
 assert.equal(filterGoods([p],{saleType:'예약 판매'}).length,1);
 // Merely mentioning a reservation does not make a stock sale a preorder.
 assert.equal(saleStatusLabel({...p,sale_method:'standard',title:'예약 불가 재고폼'},now),'판매 중');
});
test('closed/future/survey states take priority over preorder fulfilment',()=>{
 assert.equal(saleStatusLabel({...p,sale_end:'2026-11-23T10:00:00+09:00'},now),'기간 완료');
 assert.equal(saleStatusLabel({...p,sale_start:'2026-11-25T10:00:00+09:00'},now),'판매 예정');
 assert.equal(saleStatusLabel({...p,sale_status:'survey_open'},now),'수요조사 중');
 assert.equal(saleStatusLabel({...p,sale_status:'unverified'},now),'일정 미정');
 assert.equal(filterGoods([{...p,sale_end:'2026-11-23T10:00:00+09:00'}],{hideCompleted:true}).length,0);
});
test('shipping estimates never become deadlines or derive from a release/event date',()=>{
 assert.equal(shippingEstimate(p),'2027년 2월 이후 출고 예정');
 assert.equal(shippingEstimate({...p,shipping_estimate:null,sale_info:'2027년 3월 12일 발매 예정'}),'확인된 일정이 없어요');
 assert.equal(saleStatusLabel(p,Date.parse('2027-03-01')),'예약 판매 중');
});
test('legacy-encoded Japanese store URLs remain intact in source buttons',async()=>{
 const {canonicalSource}=await import('../assets/domain.js');
 const url='https://www.stellaworth.co.jp/shop/search_result.php?name=%95%F6%89%F3&item=1';
 assert.equal(canonicalSource(url),url);
 assert.throws(()=>canonicalSource('https://user:pass@www.stellaworth.co.jp/?name=%95%F6'));
});
