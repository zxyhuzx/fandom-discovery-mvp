import {SURVEY_GOODS,SURVEY_PEOPLE} from './survey-data.js';
import {canonicalWork,canonicalCharacter,matchesInterest,filterGoods} from './domain.js';
import {formKey} from './form-watch.js';
// Editorial showcase, never a claim about measured traffic. Four of ten primary rows are ghost-story goods.
export function prototypePopularForms(){
 const selected=[],used=new Set();
 const take=(work,count)=>{for(const p of SURVEY_GOODS){if(canonicalWork(p.work_name)!==canonicalWork(work)||used.has(formKey(p))||p.sale_status==='closed')continue;selected.push({...p,form_items:SURVEY_GOODS.filter(i=>formKey(i)===formKey(p))});used.add(formKey(p));if(!--count)break}};
 take('괴담출근',4);for(const work of ['어바등','원신','스타레일','헌헌','나루토','니지산지'])take(work,1);
 return selected;
}
// A small edited appearance vocabulary, not image recognition or a complete character attribute database.
const appearance=new Map([[16,['밝은 머리색']],[18,['밝은 머리색']],[10,['밝은 머리색']],[17,['금발']],[12,['금발']],[15,['금발']]]);
// Entirely synthetic co-preference groups. These do not represent real users or collected browsing history.
const syntheticGroups=[[0,4,16],[1,10,18],[2,5,19],[3,6,20],[7,11,21],[8,9,12],[13,11,18],[14,17,12],[15,16,10],[4,2,21],[5,6,17],[19,20,18]];
const isPerson=(interest,p)=>canonicalWork(interest.work_name)===p.work_name&&(!interest.character_name||canonicalCharacter(p.work_name,interest.character_name)===p.character_name);
export function prototypeCharacterRecommendations(interests,limit=6){
 const sources=SURVEY_PEOPLE.map((p,index)=>({p,index})).filter(({p})=>interests.some(i=>isPerson(i,p)));
 const candidates=new Map();
 function add(index,kind,source,tag,weight){const person=SURVEY_PEOPLE[index];if(!person||interests.some(i=>isPerson(i,person)))return;const record=candidates.get(index)||{...person,kinds:[],reasons:[],score:0};record.score+=weight;if(!record.kinds.includes(kind))record.kinds.push(kind);const reason=kind==='외형 예시'?'기준: '+source.display_name+' · '+tag+' (편집 태그)':'기준: '+source.display_name+' · 가상 선호 조합';if(!record.reasons.includes(reason))record.reasons.push(reason);candidates.set(index,record)}
 for(const {p:source,index} of sources){
  for(const [target,tags] of appearance){const common=tags.find(tag=>(appearance.get(index)||[]).includes(tag));if(common&&target!==index)add(target,'외형 예시',source,common,3)}
  for(const group of syntheticGroups)if(group.includes(index))for(const target of group)if(target!==index)add(target,'취향 예시',source,'',1);
 }
 return [...candidates.values()].sort((a,b)=>b.score-a.score||a.character_name.localeCompare(b.character_name,'ko')).slice(0,limit);
}
export function prototypeRecommendedForms(interests,{status='',limit=12}={}){
 const candidates=prototypeCharacterRecommendations(interests),items=filterGoods(SURVEY_GOODS,{status}).filter(p=>candidates.some(c=>matchesInterest(c,p)));
 const used=new Set();return items.filter(p=>{if(used.has(formKey(p)))return false;used.add(formKey(p));return true}).slice(0,limit).map(p=>({...p,recommendationReasons:candidates.filter(c=>matchesInterest(c,p)).map(c=>c.character_name+' · '+c.kinds.join(' / '))}));
}
