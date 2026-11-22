export function createXSearchController({db,isAdmin}){
 const form=document.getElementById('x-search-form'),message=document.getElementById('x-search-message'),list=document.getElementById('x-search-results');
 const more=document.getElementById('x-search-more'),enrich=document.getElementById('x-enrich-existing');
 let generation=0,cursor=null,term='';
 const clear=()=>{generation++;cursor=null;more.hidden=true;list.replaceChildren();message.textContent='수동으로 요청한 페이지만 확인해요. 검색 결과는 자동 등록하지 않아요.'};
 const request=async(body,append=false)=>{
 if(!isAdmin())return;const buttons=[...form.querySelectorAll('button'),more,enrich];if(buttons.some(b=>b.disabled))return;
 buttons.forEach(b=>b.disabled=true);const current=++generation;if(!append)list.replaceChildren();message.textContent='X 본문·작성자·첨부 이미지를 확인하고 있어요…';
 try{
 const {data,error}=await db.functions.invoke('x-search',{body});if(current!==generation||!isAdmin())return;
 if(error){let detail;try{detail=await error.context?.json()}catch{}throw Error(detail?.error||'X 연결을 완료하지 못했어요.')}
 if(data?.error)throw Error(data.error);cursor=data.next_cursor||null;more.hidden=!cursor;
 message.textContent=data.warning+' '+data.posts.length+'개 확인 · 이번 달 예산 예약 단위: '+data.budget.reserved_resources+'/'+data.budget.monthly_limit;
 for(const post of data.posts){
 const row=document.createElement('article');row.className='form-card x-preview';row.dataset.xPostId=post.id;
 // Only public API response fields, for the operator to review before publication.
 row.dataset.preview=JSON.stringify(post);
 const heading=document.createElement('h4');heading.textContent=post.author?post.author.name+' (@'+post.author.username+')':'작성자 정보 없음';
 const text=document.createElement('p');text.textContent=post.text;row.append(heading,text);
 for(const src of post.images){const img=document.createElement('img');img.src=src;img.alt='X 게시물 첨부 이미지';img.loading='lazy';img.referrerPolicy='no-referrer';img.style.cssText='max-width:180px;max-height:180px;object-fit:contain';row.append(img)}
 const link=document.createElement('a');link.textContent='X 원문 확인하기 ↗';link.className='secondary';link.href=post.url;link.target='_blank';link.rel='noopener noreferrer';row.append(link);list.append(row);
 }
 }catch(error){if(current===generation)message.textContent=error.message}
 finally{buttons.forEach(b=>b.disabled=false)}
 };
 form.onsubmit=event=>{event.preventDefault();term=document.getElementById('x-search-term').value.trim();cursor=null;request({term})};
 more.onclick=()=>{if(cursor)request({term,cursor},true)};
 enrich.onclick=async()=>{try{const {data,error}=await db.from('goods_posts').select('source_url').eq('source_kind','x_discovery').limit(10);if(error)throw error;const ids=data.map(p=>p.source_url.match(/status\/(\d+)/)?.[1]).filter(Boolean);if(ids.length)await request({ids})}catch{message.textContent='기존 X 공지를 불러오지 못했어요.'}};
 return{clear};
}
