// Reviewed, work-scoped CP names. Order is retained; reverse names are separate entries.
import reviewedCPs from './cp-names.json' with {type:'json'};
export const CP_NAMES=reviewedCPs;
export function cpAliasesForPost(post){
 const found=cpEntries(post.work_name,post.title+' '+(post.sale_info||''));
 return CP_NAMES.filter(cp=>found.some(hit=>key(cp.work)===key(hit.work)&&cp.characters.every((name,i)=>key(name)===key(hit.characters[i])))).map(cp=>cp.name);
}
const key=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\s!！:：·・]+/gu,'');
export function cpEntries(work,text){
 const value=String(text||'').normalize('NFKC');
 return CP_NAMES.filter(cp=>key(cp.work)===key(work)&&new RegExp('(?:^|[^\\p{L}\\p{N}_])'+cp.name+'(?=$|[^\\p{L}\\p{N}_])','iu').test(value));
}
export function cpCharacters(work,text){return [...new Set(cpEntries(work,text).flatMap(cp=>cp.characters))]}
export function effectiveSaleStatus(p,now=Date.now()){
 const end=Date.parse(p.sale_end||(p.sale_end_date?p.sale_end_date+'T23:59:59.999+09:00':'')),start=Date.parse(p.sale_start);
 if(p.sale_status==='closed'||Number.isFinite(end)&&end<=now)return 'closed';
 const survey=/수요조사/.test(p.title+' '+(p.sale_info||''))||['survey_open','survey_planned'].includes(p.sale_status);
 if(Number.isFinite(start)&&start>now)return survey?'survey_planned':'planned';
 if(['survey_open','survey_planned','open','planned'].includes(p.sale_status))return Number.isFinite(start)?survey?'survey_open':'open':p.sale_status;
 if(Number.isFinite(start)||Number.isFinite(end))return survey?'survey_open':'open';
 // No fabricated deadline or assumption that an undated announcement is still accepting orders.
 return 'unverified';
}
export function enrichGoods(p,now=Date.now()){
 const chars=cpCharacters(p.work_name,p.title+' '+(p.sale_info||''));
 return {...p,character_names:[...new Set([...(p.character_names||[]),...chars])],sale_status:effectiveSaleStatus(p,now)};
}

export function saleFormUrl(post){
 if(post.source_kind!=='x_discovery')return null;
 const hosts=new Set(['witchform.com','tmm.kr','form.naver.com','forms.gle','docs.google.com']);
 for(const value of String(post.sale_info||'').match(/https:\/\/[^\s<>"']+/gu)||[]){try{const u=new URL(value);if(hosts.has(u.hostname.replace(/^www\./,''))&&!u.username&&!u.password)return u.href}catch{}}
 return null;
}
