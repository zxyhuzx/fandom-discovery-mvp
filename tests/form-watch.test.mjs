import test from 'node:test';
import assert from 'node:assert/strict';
import {SURVEY_GOODS} from '../assets/survey-data.js';
import {formKey,readFormWatches,watchedForms,deadlineText} from '../assets/form-watch.js';
test('80 products belong to 40 explicit forms, with shared titles and multiple works',()=>{
 const groups=watchedForms(SURVEY_GOODS,[...new Set(SURVEY_GOODS.map(formKey))]);
 assert.equal(groups.length,40);assert.ok(groups.some(p=>new Set(p.form_items.map(i=>i.work_name)).size>1));
 assert.equal(new Set(groups.map(p=>p.sale_end)).size,40);
 for(const p of groups){assert.equal(p.form_items.length,2);for(const i of p.form_items){assert.equal(i.title,p.title);assert.equal(i.seller_name,p.seller_name);assert.equal(i.sale_end,p.sale_end);assert.equal(i.sale_status,p.sale_status);assert.equal(i.sale_type,p.sale_type);assert.ok(Date.parse(i.sale_start)<Date.parse(i.sale_end));}}
 const [a,b]=SURVEY_GOODS.filter(p=>formKey(p)===formKey(SURVEY_GOODS[0]));
 assert.equal(watchedForms([a,b],[formKey(a),formKey(b)]).length,1);
 assert.equal(watchedForms([a,b],[]).length,0);
 // Same title alone never collapses two different forms.
 assert.equal(watchedForms([{...a,id:'a',form_id:'a'},{...a,id:'b',form_id:'b'}],['a','b']).length,2);
});
test('saved form IDs survive reload, reject foreign or corrupt values and deduplicate',()=>{
 const id=formKey(SURVEY_GOODS[0]);assert.deepEqual(readFormWatches(JSON.stringify([id,id,'unknown',null,{}]),SURVEY_GOODS),[id]);
 assert.deepEqual(readFormWatches('{bad',SURVEY_GOODS),[]);assert.deepEqual(readFormWatches('{}',SURVEY_GOODS),[]);
 assert.deepEqual(readFormWatches(JSON.stringify(Array(201).fill(id)),SURVEY_GOODS),[]);
});
test('countdown handles second rollover, end, closed and missing schedule',()=>{
 const now=Date.parse('2026-11-03T00:00:00Z'),end='2026-11-04T02:03:04Z';
 assert.equal(deadlineText(end,'open',now),'마감까지 1일 2시간 3분 4초');
 assert.equal(deadlineText(end,'open',now+1000),'마감까지 1일 2시간 3분 3초');
 assert.equal(deadlineText(end,'closed',now),'마감되었어요');
 assert.equal(deadlineText(end,'open',Date.parse(end)),'마감되었어요');
 assert.equal(deadlineText(null,'open',now),'마감 일정이 아직 없어요');
 assert.equal(deadlineText('bad','open',now),'마감 일정이 아직 없어요');
});
