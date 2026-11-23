// Bounded public-post reads. Secrets stay in the Edge Function.
export const SEARCH_LIMIT=10;
export const READ_RESERVATION=70; // 10 posts + 10 authors (2 units each) + up to 40 attached media.
export function searchQuery(term){
 const value=String(term??'').normalize('NFKC').trim().replace(/\s+/gu,' ');
 if(value.length<2||value.length>60||!/^[\p{L}\p{N} ·×:!ー-]+$/u.test(value))throw Error('작품명이나 캐릭터명을 2~60자로 입력해 주세요. 검색 연산자는 사용할 수 없어요.');
 return '"'+value+'" (통판 OR 수요조사 OR 선입금) -is:retweet';
}
function fields(url){
 url.searchParams.set('tweet.fields','created_at,entities,attachments,author_id');
 url.searchParams.set('expansions','author_id,attachments.media_keys');
 url.searchParams.set('user.fields','name,username');
 url.searchParams.set('media.fields','url,preview_image_url,type');return url;
}
export function searchUrl(query,cursor=''){
 const url=fields(new URL('https://api.x.com/2/tweets/search/recent'));
 url.searchParams.set('query',query);url.searchParams.set('max_results',String(SEARCH_LIMIT));url.searchParams.set('sort_order','recency');
 if(cursor){if(!/^[A-Za-z0-9_-]{1,2048}$/.test(cursor))throw Error('잘못된 다음 페이지 값이에요.');url.searchParams.set('next_token',cursor)}
 return url;
}
export function lookupUrl(ids){
 if(!Array.isArray(ids)||!ids.length||ids.length>10||ids.some(id=>!/^\d{1,25}$/.test(id)))throw Error('게시물 ID를 확인해 주세요.');
 const url=fields(new URL('https://api.x.com/2/tweets'));url.searchParams.set('ids',[...new Set(ids)].join(','));return url;
}
const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}};
export function postPreviews(payload){
 const authors=new Map((payload?.includes?.users||[]).map(u=>[u.id,u]));
 const media=new Map((payload?.includes?.media||[]).map(m=>[m.media_key,m]));
 return(payload?.data||[]).filter(p=>/^\d{1,25}$/.test(p.id)&&typeof p.text==='string').slice(0,SEARCH_LIMIT).map(p=>{
 const author=authors.get(p.author_id),images=(p.attachments?.media_keys||[]).slice(0,4).map(k=>media.get(k)).filter(Boolean).map(m=>safeUrl(m.type==='photo'?m.url:m.preview_image_url)).filter(Boolean);
 return {id:p.id,text:p.text,created_at:p.created_at||null,url:'https://x.com/i/status/'+p.id,
 author:author&&/^[A-Za-z0-9_]{1,15}$/.test(author.username)?{name:String(author.name||author.username).slice(0,100),username:author.username}:null,
 images,links:(p.entities?.urls||[]).map(u=>safeUrl(u.expanded_url)).filter(Boolean)};
 });
}

// Fixed category queries for the operator's approved discovery run; no arbitrary operators.
export const DISCOVERY_CATEGORIES={
 anime:{label:'애니·만화',aliases:['ハイキュー','呪術廻戦','NARUTO','HUNTER×HUNTER','銀魂','하이큐','헌헌','나루토']},
 idol:{label:'아이돌',aliases:['세븐틴','방탄소년단','스트레이 키즈','아이브','에스파','SEVENTEEN','BTS','IVE','aespa','Stray Kids']},
 idol_women:{label:'여자 아이돌',aliases:['에스파','아이브','르세라핌','트와이스','aespa','IVE','TWICE','LE SSERAFIM']},
 game:{label:'게임',aliases:['原神','崩壊スターレイル','원신','스타레일','블루 아카이브']},
 novel:{label:'웹소설·웹툰',aliases:['어바등','어두운 바다의 등불이 되어','화산귀환','전독시','내스급','이착헌']},
 vtuber:{label:'버튜버',aliases:['にじさんじ','ホロライブ','니지산지','홀로라이브','스텔라이브']}
};
export function categoryQuery(key){
 const group=DISCOVERY_CATEGORIES[key];if(!group)throw Error('수집 분류를 선택해 주세요.');
 return '('+group.aliases.map(a=>'"'+a+'"').join(' OR ')+') (통판 OR 수요조사 OR 선입금 OR 通販 OR 受注 OR 予約受付 OR pre-order) -is:retweet -구함 -양도 -대리 -代行 -交換 -譲渡 -買取 -from:kiyune_store';
}
