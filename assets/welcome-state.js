import {WORKS,CHARACTERS,canonicalWork,canonicalCharacter,normalizeWork,normalizeKeyword} from './domain.js';
export const WELCOME_DRAFT_KEY='byeoljup-welcome-draft-v1';
export const WELCOME_CONNECT_KEY='byeoljup-welcome-connect';
export const WELCOME_BROWSE_KEY='byeoljup-welcome-browse';
export function choiceItems(works,characters={}){
 return works.flatMap(work=>(characters[work]?.length?characters[work]:['']).map(character=>({work_name:work,character_name:character})));
}
export function parseWelcomeDraft(raw){
 try{const value=JSON.parse(raw);if(value?.version!==1||!Array.isArray(value.items)||!value.items.length||value.items.length>100)return null;
 const items=value.items.map(i=>{if(typeof i?.work_name!=='string'||typeof i?.character_name!=='string')throw Error();const work_name=canonicalWork(i.work_name),character_name=canonicalCharacter(work_name,i.character_name);if(!WORKS.some(w=>w[0]===work_name)||character_name&&!(CHARACTERS[work_name]||[]).includes(character_name))throw Error();return {work_name,character_name}});
 return {...value,items};}catch{return null}
}
export function mergeWelcomeInterests(existing,items){
 const merged=[...new Map([...existing,...items].map(({work_name,character_name})=>{const item={work_name:canonicalWork(work_name),character_name:canonicalCharacter(work_name,character_name||'')};return [normalizeWork(item.work_name)+'\0'+normalizeKeyword(item.character_name),item]})).values()];
 if(merged.length>100)throw {code:'22023'};
 return merged;
}
