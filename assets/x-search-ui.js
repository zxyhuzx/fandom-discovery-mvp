export function createXSearchController({db,isAdmin}){
 const form=document.getElementById('x-search-form');
 const message=document.getElementById('x-search-message');
 const list=document.getElementById('x-search-results');
 let generation=0;
 const clear=()=>{generation++;list.replaceChildren();message.textContent='수동 검색만 실행해요. 검색 결과를 자동으로 굿즈에 등록하지 않아요.'};
 form.onsubmit=async event=>{
  event.preventDefault();if(!isAdmin())return;
  const button=form.querySelector('button');if(button.disabled)return;
  button.disabled=true;const current=++generation;list.replaceChildren();message.textContent='X에서 확인하고 있어요…';
  try{
   const {data,error}=await db.functions.invoke('x-search',{body:{term:document.getElementById('x-search-term').value.trim()}});
   if(current!==generation||!isAdmin())return;
   if(error){let detail;try{detail=await error.context?.json()}catch{}throw Error(detail?.error||'X 연결을 완료하지 못했어요. 운영자 설정을 확인해 주세요.')}
   if(data?.error)throw Error(data.error);
   message.textContent=data.warning+(data.posts.length?'':' 검색 결과가 없어요.')+' 이번 달 검색 예약량: '+data.budget.reserved_resources+'/'+data.budget.monthly_limit+'건 (실제 청구액은 X 콘솔에서 확인해 주세요).';
   for(const post of data.posts){
    const row=document.createElement('article');row.className='form-card';
    const body=document.createElement('p');body.textContent=post.text;
    const link=document.createElement('a');link.textContent='X 원문 확인하기 ↗';link.href=post.url;link.target='_blank';link.rel='noopener noreferrer';
    row.append(body,link);list.append(row);
   }
  }catch(error){if(current===generation)message.textContent=error.message}
  finally{button.disabled=false}
 };
 return {clear};
}
