// Pure helpers shared by the server function and offline tests. No credentials here.
export const SEARCH_LIMIT=10;
export function searchQuery(term){
 const value=String(term??'').normalize('NFKC').trim().replace(/\s+/gu,' ');
 if(value.length<2||value.length>60||!/^[\p{L}\p{N} ·×:!ー-]+$/u.test(value))throw Error('작품명이나 캐릭터명을 2~60자로 입력해 주세요. 검색 연산자는 사용할 수 없어요.');
 return '"'+value+'" (통판 OR 수요조사 OR 선입금) -is:retweet';
}
export function searchUrl(query){
 const url=new URL('https://api.x.com/2/tweets/search/recent');
 url.searchParams.set('query',query);url.searchParams.set('max_results',String(SEARCH_LIMIT));
 url.searchParams.set('tweet.fields','created_at,entities');url.searchParams.set('sort_order','recency');
 return url;
}
export function postPreviews(payload){
 return (payload?.data||[]).filter(p=>/^\d{1,25}$/.test(p.id)&&typeof p.text==='string').slice(0,SEARCH_LIMIT).map(p=>({
  id:p.id,text:p.text,created_at:p.created_at||null,url:'https://x.com/i/status/'+p.id,
  links:(p.entities?.urls||[]).map(u=>u.expanded_url).filter(url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}})
 }));
}
