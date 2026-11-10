// Browser cache: only a tiny sample-data vocabulary plus records actually requested from Supabase.
import bootstrap from './catalog-bootstrap.json' with {type:'json'};
export const WORKS=[],CHARACTERS=Object.create(null),workIndex=new Map();
const genres=new Map(),characterNames=new Map();
export const normalizeKeyword=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/[\s!！:：·・]+/gu,'');
export function cacheCatalog(items){
 for(const {work:w,character:c} of items){if(!w?.name||!w.key)continue;
  let row=WORKS.find(r=>r[0]===w.name);if(!row){row=[w.name,w.key,...w.aliases];WORKS.push(row)}else row.splice(0,row.length,w.name,w.key,...w.aliases);
  for(const a of [w.name,w.key,...w.aliases])workIndex.set(normalizeKeyword(a),row);
  genres.set(w.name,w.genre);CHARACTERS[w.name]??=[];
  if(c?.name){if(!CHARACTERS[w.name].includes(c.name))CHARACTERS[w.name].push(c.name);const aliases=[...new Set([c.name,...(c.aliases||[])])];for(const a of aliases)characterNames.set(w.name+'\0'+normalizeKeyword(a),aliases)}
 }
}
cacheCatalog(bootstrap.works.map(work=>({work})));cacheCatalog(bootstrap.characters.map(character=>({work:bootstrap.works.find(w=>w.key===character.work_key),character})));
export function canonicalWork(value){return workIndex.get(normalizeKeyword(value))?.[0]??String(value??'').trim()}
export function normalizeWork(value){return workIndex.get(normalizeKeyword(value))?.[1]??normalizeKeyword(value)}
export function workGenre(value){return genres.get(canonicalWork(value))||'기타'}
export function characterAliases(work,value){return characterNames.get(canonicalWork(work)+'\0'+normalizeKeyword(value))||[value]}
export function canonicalCharacter(work,value){return characterAliases(work,String(value??'').trim())[0]}
export function canonicalPost(p){const work=canonicalWork(p.work_name);return {...p,work_name:work,character_names:p.character_names.map(c=>canonicalCharacter(work,c))}}

export function hasCatalogItem(work,character=''){return workIndex.has(normalizeKeyword(work))&&(!character||characterNames.has(canonicalWork(work)+'\0'+normalizeKeyword(character)))}
