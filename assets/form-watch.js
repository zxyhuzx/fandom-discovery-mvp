export const FORM_WATCH_KEY='byeoljup-survey-form-watches-v1';
export const formKey=p=>p.form_id||p.id;
export function readFormWatches(raw,posts){try{const value=JSON.parse(raw);if(!Array.isArray(value)||value.length>200)return [];const known=new Set(posts.map(formKey));return [...new Set(value.filter(id=>typeof id==='string'&&known.has(id)))];}catch{return []}}
export function watchedForms(posts,ids){const selected=new Set(ids),groups=new Map();for(const p of posts){if(!p.is_published||!selected.has(formKey(p)))continue;const key=formKey(p);if(!groups.has(key))groups.set(key,{...p,form_items:[]});groups.get(key).form_items.push(p)}return [...groups.values()].sort((a,b)=>(Date.parse(a.sale_end)||Infinity)-(Date.parse(b.sale_end)||Infinity));}
export function deadlineText(end,status,now=Date.now()){
 const deadline=Date.parse(end);if(!Number.isFinite(deadline))return '마감 일정이 아직 없어요';
 if(status==='closed'||deadline<=now)return '마감되었어요';
 let seconds=Math.ceil((deadline-now)/1000);const days=Math.floor(seconds/86400);seconds%=86400;const hours=Math.floor(seconds/3600);seconds%=3600;const minutes=Math.floor(seconds/60);seconds%=60;
 return `마감까지 ${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
}
