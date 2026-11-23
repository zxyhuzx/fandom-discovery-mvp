import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalPost,filterGoods} from '../assets/domain.js';
import {effectiveSaleStatus,saleFormUrl} from '../assets/goods-metadata.js';
const rows=JSON.parse(await readFile('data/x-multigenre-20261123.json','utf8'));
test('reviewed multigenre import has 22 unique notices, all categories and no expired deadline at review',()=>{
 assert.equal(rows.length,22);assert.equal(new Set(rows.map(p=>p.source_url)).size,22);
 assert.equal(new Set(rows.map(p=>p.genre_name)).size,5);
 assert.equal(rows.filter(p=>['애니·만화','아이돌'].includes(p.genre_name)).length,13);
 for(const p of rows){assert.ok(p.author?.username);assert.ok(p.availability_basis);assert.ok(p.references.length);assert.ok(p.created_at);assert.ok(p.info);assert.notEqual(effectiveSaleStatus({sale_status:p.status,sale_start:p.start,sale_end:p.end,sale_end_date:p.end_date,title:p.title},Date.parse('2026-11-23T18:00:00+09:00')),'closed');}
});
test('new real notices reuse exact interest searches and distinguish deadlines from shipping/event dates',()=>{
 const goods=rows.map(p=>canonicalPost({...p,character_names:p.characters,sale_status:p.status,sale_start:p.start,sale_end:p.end,sale_end_date:p.end_date,is_published:true}));
 assert.deepEqual(filterGoods(goods,{query:'민규'}).map(p=>p.id),goods.filter(p=>p.character_names.includes('민규')).map(p=>p.id));
 assert.equal(filterGoods(goods,{query:'백사헌'}).length,0);
 for(const id of ['2124770697390223414','2124700131748610277','2124110583926861836','2124705515104305563']){const p=rows.find(p=>p.post_id===id);assert.equal(p.end,null);assert.equal(p.end_date,null);}
 const p=rows.find(p=>p.post_id==='2124036599126372687');assert.equal(p.start,null);assert.equal(p.end,'2026-11-28T23:59:00+09:00');
});
test('reviewed store links are safe and lookalikes or arbitrary hosts stay blocked',()=>{
 for(const url of ['https://tsukishigure.booth.pm/items/9195767','https://kpop-planet-jp.com/products/example','https://jumpcs.shueisha.co.jp/shop/'])assert.equal(saleFormUrl({source_kind:'x_discovery',sale_info:url}),url);
 for(const url of ['https://booth.pm.evil.example/items/1','https://shop.lashinbang.com.evil.example','https://example.org/form'])assert.equal(saleFormUrl({source_kind:'x_discovery',sale_info:url}),null);
});
