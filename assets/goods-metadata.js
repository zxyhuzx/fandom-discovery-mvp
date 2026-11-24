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
 return {...p,character_names:[...new Set([...(p.character_names||[]),...chars])],sale_status:effectiveSaleStatus(p,now),sale_type:p.sale_method==='preorder'?'예약 판매':p.sale_type};
}

export function saleFormUrl(post){
 if(post.source_kind!=='x_discovery')return null;
 const hosts=new Set(['witchform.com','tmm.kr','form.naver.com','forms.gle','docs.google.com','kpop-planet-jp.com','lightupk.com','www.stellaworth.co.jp','stellaworth.co.jp','jumpcs.shueisha.co.jp','www.animate-onlineshop.jp','animate-onlineshop.jp','shop.lashinbang.com']);
 for(const value of String(post.sale_info||'').match(/https:\/\/[^\s<>"']+/gu)||[]){try{const u=new URL(value);if((hosts.has(u.hostname.replace(/^www\./,''))||/^[a-z0-9-]+\.booth\.pm$/.test(u.hostname))&&!u.username&&!u.password)return u.href}catch{}}
 return null;
}

// Order acceptance and fulfilment are independent: a release date is not a shipping date.
export function saleStatusLabel(post,now=Date.now()){
 const status=effectiveSaleStatus(post,now);
 if(status==='open'&&post.sale_method==='preorder')return '예약 판매 중';
 return {planned:'판매 예정',open:'판매 중',survey_planned:'판매 예정',survey_open:'수요조사 중',closed:'기간 완료',unverified:'일정 미정'}[status]||'일정 미정';
}
export function shippingEstimate(post){return String(post.shipping_estimate||'').trim()||'확인된 일정이 없어요';}
