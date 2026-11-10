import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterGoods,matchesInterest,canonicalWork} from '../assets/domain.js';
const forms=JSON.parse(readFileSync(new URL('../data/x-discovered-forms.json',import.meta.url)));
test('published discovery summaries have unique real API source references and explicit uncertainty',()=>{
 assert.equal(forms.length,9);assert.equal(new Set(forms.map(p=>p.post_id)).size,9);
 assert.equal(forms.filter(p=>p.title.includes('스물스물')).length,1);
 for(const p of forms){assert.match(p.post_id,/^\d{19}$/);assert.ok(p.title.length<=200);assert.ok(p.info.includes('원문'));if(p.end)assert.ok(Number.isFinite(Date.parse(p.end)));}
});
test('real discovery cards reuse work/character filtering without inventing unknown characters',()=>{
 const rows=forms.map(p=>({...p,id:p.post_id,work_name:canonicalWork('괴담출근'),character_names:p.characters,sale_status:'unverified',source_kind:'x_discovery',is_published:true,created_at:'2026-11-10T00:00:00Z'}));
 assert.equal(filterGoods(rows,{query:'괴담출근'}).length,9);
 const soul=filterGoods(rows,{query:'김솔음'});assert.equal(soul.length,3);assert.ok(soul.every(p=>p.characters.includes('김솔음')));
 assert.equal(filterGoods(rows,{status:'open'}).length,0);
 assert.equal(rows.filter(p=>matchesInterest({work_name:'괴출',character_name:'백사헌'},p)).length,1);
});
