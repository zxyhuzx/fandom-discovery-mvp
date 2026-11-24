import test from 'node:test';
import assert from 'node:assert/strict';
import {detailFacts} from '../assets/goods-details.js';
import {saleStatusLabel,sellerTypeLabel} from '../assets/goods-metadata.js';
const info='스페셜 리믹스 주장편 오네무탄 6종 판매 공지입니다. 가격과 통판은 판매자 DM 문의 방식이며 마감일은 공지되지 않았습니다. 원문과 판매처에서 조기 품절·일정 변경 여부를 확인해 주세요.';
test('shop detail prose is split into compact facts without fabricated price or deadline',()=>{
 const facts=detailFacts({title:'하이큐',sale_info:info,source_kind:'x_discovery'});
 assert.equal(facts.product,'스페셜 리믹스 주장편 오네무탄 6종');
 assert.equal(facts.purchase,'판매자 DM 문의');assert.equal(facts.price,'판매자 DM 문의');
 assert.equal(facts.extra.length,0);
});
test('only source-priced amounts are prices; gifts and shipping fees are not',()=>{
 assert.equal(detailFacts({sale_info:'배송비 3,000원입니다. 추첨 경품은 20,000원 상품권입니다.'}).price,'원문에서 확인');
 assert.equal(detailFacts({sale_info:'예상 가격은 18,000원입니다.'}).price,'예상 가격은 18,000원입니다.');
 assert.equal(detailFacts({sale_info:'DM 문의 불가입니다.'}).purchase,'원본 페이지에서 확인');
 const facts=detailFacts({source_kind:'x_discovery',sale_status:'survey_open',sale_info:'샘플 수요조사입니다. 최소 수량 미달 시 취소됩니다. 판매 폼: https://forms.gle/abc'});
 assert.equal(facts.purchaseLabel,'참여 방법');assert.equal(facts.priceLabel,'예상 가격');assert.equal(facts.purchase,'수요조사 폼에서 확인');assert.equal(facts.important.length,1);
});
test('important conditions stay visible and supplementary notes remain accessible',()=>{
 const f=detailFacts({sale_info:'예약 굿즈입니다. 성인만 구매 가능합니다. 본품은 포함되지 않습니다. 세부 구성은 달라질 수 있습니다. https://example.org/'});
 assert.equal(f.important.length,2);assert.equal(f.extra.length,1);assert.ok(!JSON.stringify(f).includes('https://'));
});
test('reviewed stock arrivals differ from preorder shops and fan creators',()=>{
 const p={title:'입고 공지',sale_status:'open',seller_type:'shop',is_stock_notice:true};
 assert.equal(saleStatusLabel(p),'입고 완료');assert.equal(sellerTypeLabel(p),'굿즈샵');
 assert.equal(saleStatusLabel({...p,sale_method:'preorder'}),'판매 중');
 assert.equal(saleStatusLabel({...p,seller_type:'fan_creator'}),'판매 중');
 assert.equal(saleStatusLabel({...p,sale_status:'closed'}),'기간 완료');
 assert.equal(sellerTypeLabel({}),'미확인');
});

test('product origin is independent of seller type and never guessed from a shop alone',async()=>{const {goodsOriginLabel}=await import('../assets/goods-metadata.js');assert.equal(goodsOriginLabel({goods_origin:'official'}),'공굿');assert.equal(goodsOriginLabel({goods_origin:'fanmade',seller_type:'shop'}),'비공굿');assert.equal(goodsOriginLabel({seller_type:'shop'}),'구분 미확인');});
test('origin filter combines with query and status without mixing unknown merchandise',async()=>{
 const {filterGoods}=await import('../assets/domain.js');
 const base={work_name:'원신',title:'키링',character_names:[],sale_status:'open',is_published:true};
 const rows=[{...base,id:1,goods_origin:'official'},{...base,id:2,goods_origin:'fanmade'},{...base,id:3},{...base,id:4,goods_origin:'official',sale_status:'closed'}];
 assert.deepEqual(filterGoods(rows,{goodsOrigin:'official',query:'원신',status:'open'}).map(p=>p.id),[1]);
 assert.deepEqual(filterGoods(rows,{goodsOrigin:'fanmade'}).map(p=>p.id),[2]);
 assert.deepEqual(filterGoods(rows,{goodsOrigin:'unknown'}).map(p=>p.id),[3]);
 assert.equal(filterGoods(rows,{goodsOrigin:'official',query:'하이큐'}).length,0);
 assert.equal(filterGoods(rows,{goodsOrigin:''}).length,4);
});
