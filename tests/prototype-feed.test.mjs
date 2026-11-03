import test from 'node:test';
import assert from 'node:assert/strict';
import {prototypePopularForms,prototypeCharacterRecommendations,prototypeRecommendedForms} from '../assets/prototype-feed.js';
import {SURVEY_PEOPLE} from '../assets/survey-data.js';
import {formKey} from '../assets/form-watch.js';
import {canonicalWork,matchesInterest} from '../assets/domain.js';
test('editorial popular showcase contains exactly ten distinct forms, four led by ghost-story work',()=>{
 const items=prototypePopularForms();assert.equal(items.length,10);assert.equal(new Set(items.map(formKey)).size,10);
 assert.equal(items.filter(p=>canonicalWork(p.work_name)===canonicalWork('괴담출근')).length,4);
 assert.equal(new Set(items.map(p=>p.work_name)).size,7);
 assert.ok(items.every(p=>p.is_survey_example&&!p.popularity_count&&p.form_items.length===2));
});
test('prototype recommendation separates edited appearance from synthetic taste and excludes existing interests',()=>{
 const interests=[{work_name:'나루토',character_name:'카카시'}],candidates=prototypeCharacterRecommendations(interests);
 assert.ok(candidates.some(c=>c.character_name==='쿠즈하'&&c.kinds.includes('외형 예시')));
 assert.ok(candidates.some(c=>c.kinds.includes('취향 예시')));
 assert.ok(candidates.every(c=>!interests.some(i=>matchesInterest(i,{...c,character_names:[c.character_name]}))));
 assert.deepEqual(prototypeCharacterRecommendations([]),[]);
 assert.deepEqual(prototypeCharacterRecommendations([{work_name:'존재하지 않는 작품',character_name:''}]),[]);
 const whole=prototypeCharacterRecommendations([{work_name:'나루토',character_name:''}]);assert.ok(whole.every(c=>c.work_name!=='나루토'));
});
test('all 22 example favorites have a prototype taste path; recommended forms match the displayed candidates',()=>{
 for(const person of SURVEY_PEOPLE){const interests=[person],candidates=prototypeCharacterRecommendations(interests),forms=prototypeRecommendedForms(interests);
 assert.ok(candidates.length>0);assert.ok(forms.length>0);assert.equal(new Set(forms.map(formKey)).size,forms.length);
 assert.ok(forms.every(p=>candidates.some(c=>matchesInterest(c,p))&&p.recommendationReasons.length));
 for(const status of ['open','planned','closed','survey_open','survey_planned'])assert.ok(prototypeRecommendedForms(interests,{status}).every(p=>p.sale_status===status));
 }
});
