import {config} from './config.js';
import {cacheCatalog,hasCatalogItem} from './catalog-store.js';
const requests=new Map();const MAX_CACHE=80;
async function rpc(name,body){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const r=await fetch(config.supabaseUrl+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});if(!r.ok)throw Error('작품·캐릭터 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');return await r.json()}finally{clearTimeout(timer)}}
export async function catalogSearch({query='',kind='all',genre='',works=null,limit=20,offset=0}={}){
 if(query.length>120)return {items:[],has_more:false};
 const args={p_query:query,p_kind:kind,p_genre:genre,p_works:works,p_limit:limit,p_offset:offset},key=JSON.stringify(args);
 if(!requests.has(key)){if(requests.size>=MAX_CACHE)requests.delete(requests.keys().next().value);requests.set(key,rpc('catalog_search',args).then(data=>{cacheCatalog(data.items);return data}).catch(e=>{requests.delete(key);throw e}))}
 return requests.get(key);
}
export async function resolveCatalog(items){
 const pairs=[...new Map(items.map(i=>[i.work_name+'\0'+(i.character_name||''),{work_name:i.work_name,character_name:i.character_name||''}])).values()];
 const missing=pairs.filter(i=>!hasCatalogItem(i.work_name,i.character_name));
 for(let offset=0;offset<missing.length;offset+=200){const records=await rpc('catalog_resolve',{p_items:missing.slice(offset,offset+200)});cacheCatalog(records)}
}
export const catalogChoice=({work:w,character:c})=>({label:w.name+(c?' · '+c.name:''),query:w.name+(c?' '+c.name:''),kind:c?(w.genre==='버튜버'?'버튜버':w.genre==='아이돌'?'멤버':'캐릭터'):(w.genre==='버튜버'?'버튜버 그룹':w.genre==='아이돌'?'아이돌 그룹':'작품'),work_name:w.name,character_name:c?.name||''});
