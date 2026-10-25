import {createClient} from '@supabase/supabase-js';
import {config} from './config.js';
import {dispatchMockBatch} from '../lib/messaging/mock-dispatch.mjs';
import {WORKS,CHARACTERS,canonicalWork,canonicalSource,matchesInterest,normalizeKeyword,filterGoods,needsOnboarding,workGenre,goodsGenre,sortGoods,searchSuggestions,SALE_LABELS,QUEUE_LABELS} from './domain.js';
const $=id=>document.getElementById(id);
const db=createClient(config.supabaseUrl,config.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
let viewMode='grid';try{viewMode=localStorage.getItem('byeoljup-view')==='list'?'list':'grid'}catch{}
let user=null,admin=false,interests=[],draft=[],posts=[],notifications=[],queue=[],attempts=[],preferences=null,dirty=false,loading=false,epoch=0,showDemo=false,searchScope='all',searchComposing=false;
const columns='id,title,source_url,work_name,character_names,sale_status,sale_info,sale_start,sale_end,thumbnail_url,is_published,created_at,seller_name,platform_name,is_test,genre_name';
const demos=[['하이큐!!','히나타 쇼요','통판 굿즈 예시','open'],['주술회전','고죠 사토루','수요조사 예시','survey_open'],['원신','종려','판매 예정 예시','planned']].map(([work,character,title,status],i)=>({id:'demo-'+i,title,work_name:work,character_names:[character],sale_status:status,sale_info:'화면 체험용 정보입니다. 실제로 판매하거나 모집하는 게시물이 아닙니다.',seller_name:'예시 창작자',platform_name:'예시 플랫폼',thumbnail_url:'/assets/byeoljup-icon.png',is_published:true,is_test:true,popularity_count:[18,42,9][i],created_at:new Date(2026,9,25-i).toISOString()}));
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n}
function notice(text='',error=false){$('notice').textContent=text;$('notice').dataset.error=String(error)}
function empty(target,text,description){const message=el('p',undefined,'empty-state');if(description)message.append(el('strong',text),el('br'),el('span',description));else message.textContent=text;target.replaceChildren(message)}
function time(v){return new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}
function result(r){if(r.error)throw r.error;return r.data}
function friendly(e){if(e?.code==='23505')return '이미 등록된 항목이에요.';if(e?.code==='42501')return '로그인 또는 관리자 권한을 확인해 주세요.';if(['23514','22007','22023'].includes(e?.code))return '입력한 이름, 주소 또는 날짜를 확인해 주세요.';return '불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.'}
async function run(b,fn){if(b.disabled)return;b.disabled=true;notice();try{await fn()}catch(e){notice(friendly(e),true)}finally{b.disabled=false}}
function button(text,fn){const b=el('button',text,'secondary');b.type='button';b.onclick=()=>run(b,fn);return b}
function link(url,text){try{const a=el('a',text);a.href=canonicalSource(url);a.target='_blank';a.rel='noopener noreferrer';return a}catch{return el('span','원문 주소를 확인해 주세요.')}}
function route(){return location.hash.slice(1)||'home'}
function go(name){if(route()===name)renderRoute();else location.hash=name}
function needLogin(target){sessionStorage.setItem('byeoljup-next',target);go('login')}
function onboarding(){return needsOnboarding(user,interests,preferences)}
function renderRoute(){
 let name=route();if(name==='home'&&onboarding())name='onboarding';
 const protectedPage=['interests','notifications','profile','onboarding','admin'].includes(name);
 if(protectedPage&&!user){sessionStorage.setItem('byeoljup-next',name);name='login'}
 if(name==='admin'&&!admin)name='home';
 const panel=name.startsWith('goods/')?'detail':name==='onboarding'?'interests':name;
 const valid=['home','explore','interests','notifications','profile','detail','login','admin'];
 document.querySelectorAll('main>section').forEach(n=>n.hidden=n.id!=='panel-'+(valid.includes(panel)?panel:'home'));
 document.querySelectorAll('[data-route]').forEach(n=>{const selected=n.dataset.route===panel;n.classList.toggle('active',selected);if(selected)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current')});
 $('onboarding-label').hidden=name!=='onboarding';$('skip-interests').hidden=name!=='onboarding';$('interests-title').textContent=name==='onboarding'?'좋아하는 세계를 알려주세요':'내 관심사 관리';
 if(panel==='detail')renderDetail(name.slice(6));
}
window.addEventListener('hashchange',renderRoute);
function imageFor(p){
 const placeholder=()=>{const box=el('div',undefined,'goods-art goods-placeholder');box.append(el('span','✦'),el('small',p.is_test?'예시 이미지 영역':'이미지 준비 중'));return box};
 if(!p.thumbnail_url||p.id.startsWith('demo-'))return placeholder();
 const image=el('img');image.alt=p.title+' 이미지';image.className='goods-art';image.loading='lazy';image.referrerPolicy='no-referrer';try{image.src=canonicalSource(p.thumbnail_url)}catch{return placeholder()}image.onerror=()=>image.replaceWith(placeholder());return image;
}
function card(p){const n=el('article',undefined,'card');n.append(imageFor(p));if(p.is_test)n.append(el('span','테스트·예시 데이터','badge'));n.append(el('span',SALE_LABELS[p.sale_status],'sale-tag'),el('h3',p.title),el('p',p.work_name+' · '+(p.character_names.join(', ')||'작품 전체')),el('p',(p.seller_name||'창작자 미등록')+' · '+(p.platform_name||platform(p.source_url))),el('p',p.sale_end?'마감 '+time(p.sale_end):p.sale_start?'시작 '+time(p.sale_start):'일정은 원문을 확인해 주세요.','note'));const a=el('a','상세 보기 →','text-link');a.href='#goods/'+p.id;n.append(a);if(!p.is_test)n.append(link(p.source_url,'원본 판매처 ↗'));return n}
function platform(url){try{return new URL(url).hostname.replace(/^www\./,'')}catch{return '판매 플랫폼 미등록'}}
function fillCards(id,items,message,description){const target=$(id);target.replaceChildren();if(!items.length)empty(target,message,description);else items.forEach(p=>target.append(card(p)))}
function renderFeed(){
 const source=showDemo?demos:posts;
 const options={query:$('global-search').value,scope:searchScope,genre:$('filter-genre').value,status:$('filter-status').value,platform:$('filter-platform').value};
 const items=sortGoods(filterGoods(source,options),$('sort-order').value,interests);$('result-count').textContent=items.length+'개 소식';$('demo-note').hidden=!showDemo;$('toggle-demo').textContent=showDemo?'실제 게시물 보기':'예시 데이터 보기';
 $('filter-count').textContent=[options.genre,options.status,options.platform].filter(Boolean).length?'('+[options.genre,options.status,options.platform].filter(Boolean).length+')':'';
 $('goods-feed').dataset.view=viewMode;$('view-grid').setAttribute('aria-pressed',String(viewMode==='grid'));$('view-list').setAttribute('aria-pressed',String(viewMode==='list'));
 $('sort-note').textContent=$('sort-order').value==='popular'?'상세 조회 수 기준이에요. 같은 브라우저는 게시물마다 하루 한 번 집계해요.':$('sort-order').value==='recommended'?(interests.length?'관심 캐릭터·작품 일치도를 먼저 보고 조회 수와 최신순으로 정렬해요.':'관심사가 없어 조회 수와 최신순으로 보여 드려요.'):'최근 등록된 소식부터 보여 드려요.';
 $('search-summary').textContent=options.query.trim()?'“'+options.query.trim()+'” 검색 중':'작품·캐릭터·굿즈·창작자를 한 번에 검색해 보세요.';
 fillCards('goods-feed',items,!showDemo&&!posts.some(p=>p.is_published)?'아직 등록된 굿즈가 없어요':'찾으시는 굿즈가 보이지 않아요',!showDemo&&!posts.some(p=>p.is_published)?'현재 실제 게시물이 없어 검색 결과가 없어요. 예시 데이터로 검색과 필터를 먼저 체험해 보세요.':'검색어를 바꾸거나 필터를 조정해 보세요.');
 document.querySelectorAll('[data-search-scope]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.searchScope===searchScope)));
}
function genreButtons(target,choose){target.replaceChildren();['','애니·만화','웹소설·웹툰','게임',...[...new Set((showDemo?demos:posts).map(goodsGenre))].filter(g=>!['애니·만화','웹소설·웹툰','게임'].includes(g))].forEach(name=>{const b=el('button',name||'전체','genre-chip');b.type='button';b.setAttribute('aria-pressed',String($('filter-genre').value===name));b.onclick=()=>choose(name);target.append(b)})}
function populatePlatforms(){genreButtons($('genre-chips'),name=>{$('filter-genre').value=name;populatePlatforms();renderFeed()});const selected=$('filter-platform').value;$('filter-platform').replaceChildren(el('option','모든 플랫폼'));$('filter-platform').firstChild.value='';[...new Set((showDemo?demos:posts).map(p=>p.platform_name).filter(Boolean))].sort().forEach(name=>{const o=el('option',name);o.value=name;$('filter-platform').append(o)});$('filter-platform').value=[...$('filter-platform').options].some(o=>o.value===selected)?selected:''}
function hideSearchSuggestions(){$('search-suggestions').hidden=true;$('global-search').setAttribute('aria-expanded','false')}
function suggestSearch(){
 const query=$('global-search').value;const target=$('search-suggestions');target.replaceChildren();
 if(!query.trim()){
  target.append(el('p','장르로 둘러보기','suggestion-heading'));const genres=el('div',undefined,'genre-chips');genreButtons(genres,name=>{$('filter-genre').value=name;populatePlatforms();renderFeed();suggestSearch()});target.append(genres);
  const items=sortGoods((showDemo?demos:posts).filter(p=>p.is_published&&!(!showDemo&&p.is_test)&&(!$('filter-genre').value||goodsGenre(p)===$('filter-genre').value)),'popular').slice(0,4);
  target.append(el('p',showDemo?'인기 굿즈 미리보기 · 예시 데이터':'인기 굿즈','suggestion-heading'));
  if(!items.length){target.append(el('p','아직 등록된 굿즈가 없어요. 예시 데이터로 먼저 둘러보세요.','suggestion-empty'));const b=el('button','예시 굿즈 둘러보기');b.type='button';b.onclick=()=>{showDemo=true;populatePlatforms();renderFeed();suggestSearch()};target.append(b)}
  items.forEach(p=>{const b=el('button');b.type='button';b.append(el('strong',p.title),el('span',p.work_name+(p.is_test?' · 예시':'')));b.onclick=()=>{go('goods/'+p.id);hideSearchSuggestions()};target.append(b)});
 }else{
  const choices=searchSuggestions(query,showDemo?demos:posts);
  choices.forEach(c=>{const b=el('button');b.type='button';b.append(el('strong',c.label),el('span',c.kind));b.onclick=()=>{$('global-search').value=c.query;go('explore');renderFeed();hideSearchSuggestions()};target.append(b)});
  if(!choices.length)target.append(el('p','입력하신 검색어로 굿즈 목록을 찾아보고 있어요.','suggestion-empty'));
 }
 target.hidden=false;$('global-search').setAttribute('aria-expanded','true');
}
function renderHome(){const real=posts.filter(p=>p.is_published&&!p.is_test);const matched=real.filter(p=>interests.some(i=>matchesInterest(i,p)));$('home-title').textContent='오늘 발견한 굿즈';$('home-description').textContent=user?'좋아하는 작품과 캐릭터의 새로운 소식을 살펴보세요.':'로그인 없이 둘러보세요. 관심 작품 저장과 내 알림은 카카오 로그인 후 이용할 수 있어요.';$('interest-prompt').hidden=!!interests.length;$('personal-title').textContent=interests.length?'내 관심사에 맞는 굿즈':'좋아하는 취향을 담아 보세요';fillCards('personal-feed',matched.slice(0,6),interests.length?'아직 발견된 굿즈가 없어요':'관심 있는 작품이 있으신가요?',interests.length?'다른 작품을 탐색하거나 관심사를 추가해 보세요.':'관심 작품과 캐릭터를 등록하면 관련 굿즈를 모아 볼 수 있어요.');fillCards('recent-feed',real.filter(p=>p.sale_status!=='closed').slice(0,6),'아직 등록된 굿즈 소식이 없어요','새로운 소식이 등록되면 여기에 모아 보여 드려요. 탐색에서 예시 화면을 먼저 둘러보세요.')}
async function renderDetail(id){let p=[...posts,...demos].find(p=>p.id===id&&p.is_published);const target=$('goods-detail');target.replaceChildren();if(!p&&/^[a-f0-9-]{36}$/i.test(id)){empty(target,'상세 소식을 불러오는 중이에요…');try{p=result(await db.from('goods_posts').select(columns).eq('id',id).eq('is_published',true).maybeSingle());if(p)posts.push(p)}catch(e){notice(friendly(e),true)}if(route()!=='goods/'+id)return}if(!p){empty(target,'게시물이 없거나 공개가 종료됐어요.');return}target.replaceChildren();const box=el('article',undefined,'detail-card');box.append(imageFor(p));const info=el('div');if(p.is_test)info.append(el('p','테스트·예시 데이터 · 실제 판매 정보 아님','badge'));info.append(el('span',SALE_LABELS[p.sale_status],'sale-tag'),el('h1',p.title),el('p',p.work_name+' · '+(p.character_names.join(', ')||'작품 전체')),el('p','창작자·판매자: '+(p.seller_name||'미등록')),el('p','판매 플랫폼: '+(p.platform_name||platform(p.source_url))),el('p',p.sale_info||'판매 안내는 원문을 확인해 주세요.'));if(p.sale_start)info.append(el('p','시작: '+time(p.sale_start)));if(p.sale_end)info.append(el('p','마감: '+time(p.sale_end)));if(!p.is_test)info.append(link(p.source_url,'원본 판매 페이지로 이동 ↗'));else info.append(el('p','예시 데이터에는 실제 판매 링크를 제공하지 않아요.','note'));info.append(button('이 작품 관심사에 담기',async()=>{if(!user){needLogin('goods/'+id);return}addDraft(p.work_name,'');go('interests')}));box.append(info);target.append(box);if(!p.is_test)recordView(p.id)}
function addDraft(work,character){if(draft.length>=100){notice('관심사는 최대 100개까지 담을 수 있어요.',true);return}work=canonicalWork(work);character=character.trim();if(!normalizeKeyword(work))return;const item={work_name:work,character_name:character};if(draft.some(i=>canonicalWork(i.work_name)===work&&normalizeKeyword(i.character_name)===normalizeKeyword(character)))return;draft.push(item);dirty=true;renderInterests()}
function renderInterests(){$('interest-list').replaceChildren();$('interest-count').textContent=draft.length;$('unsaved-label').textContent=dirty?'아직 저장하지 않은 변경사항이 있어요.':'저장된 관심사예요.';if(!draft.length)empty($('interest-list'),'좋아하는 작품부터 골라 보세요','관심 있는 작품과 캐릭터를 하나씩 담아 주세요.');draft.forEach((i,index)=>{const row=el('li',undefined,'list-row');const text=el('div');text.append(el('h4',i.work_name),el('p',i.character_name||'작품 전체'));row.append(text,button('목록에서 삭제',async()=>{draft.splice(index,1);dirty=true;renderInterests();choices()}));$('interest-list').append(row)})}
function choices(){
 const query=$('interest-search').value.trim();const target=$('interest-suggestions');target.replaceChildren();
 if(!query){target.append(el('p','작품이나 캐릭터 이름을 검색해 보세요.','note'));return}
 const candidates=searchSuggestions(query,posts).filter(c=>c.work_name);
 if(!candidates.length){target.append(el('p','찾으시는 관심사가 없나요? 아래에서 작품과 캐릭터를 직접 입력할 수 있어요.','note'));return}
 candidates.forEach(c=>{const selected=draft.some(i=>canonicalWork(i.work_name)===canonicalWork(c.work_name)&&normalizeKeyword(i.character_name)===normalizeKeyword(c.character_name));const b=el('button',undefined,'interest-choice');b.type='button';b.disabled=selected;b.append(el('strong',c.character_name?c.label:c.work_name+' · 작품 전체'),el('span',selected?'담음':'+ 담기'));b.onclick=()=>{addDraft(c.work_name,c.character_name);choices()};target.append(b)});
}
function renderNotifications(){$('notifications').replaceChildren();if(!notifications.length)empty($('notifications'),'아직 새로운 소식이 없어요','관심사와 관련된 굿즈 소식이 생기면 이곳에서 확인할 수 있어요.');notifications.forEach(n=>{const row=el('article',undefined,'list-row'+(!n.read_at?' unread':''));const a=el('a',undefined,'notification-link');a.href='#goods/'+n.goods_post_id;a.append(el('h4',n.title),el('p',n.body),el('time',time(n.created_at)));a.onclick=()=>{if(!n.read_at)db.from('notifications').update({read_at:new Date().toISOString()}).eq('id',n.id).then(r=>{if(r.error)notice(friendly(r.error),true);else{n.read_at=new Date().toISOString();renderNotifications();updateCount()}})};row.append(a);if(!n.read_at)row.append(button('읽음',async()=>{result(await db.from('notifications').update({read_at:new Date().toISOString()}).eq('id',n.id));await refresh()}));$('notifications').append(row)})}
function updateCount(){$('unread-count').textContent=notifications.filter(n=>!n.read_at).length}
function render(){$('header-login').hidden=!!user;const accountName=user?.user_metadata?.name||user?.user_metadata?.nickname||'내 계정';$('account-name').textContent=accountName;$('menu-account-name').textContent=user?accountName+'님':'로그인하고 관심사와 내 알림을 관리해 보세요.';$('admin-tab').hidden=!admin;$('web-notifications').checked=preferences?.web_notifications!==false;updateCount();populatePlatforms();renderFeed();renderHome();renderInterests();choices();renderNotifications();if(admin)renderAdmin();renderRoute()}
async function refresh(){const current=++epoch;loading=true;$('loading').hidden=false;try{const data=result(await db.from('goods_posts').select(columns).order('created_at',{ascending:false}).limit(100));const metrics=await db.rpc('goods_popularity',{post_ids:data.map(p=>p.id)});if(!metrics.error)data.forEach(p=>p.popularity_count=metrics.data.find(m=>m.goods_post_id===p.id)?.view_count||0);let role=false,personal=[[],[],[],[],null];if(user){role=result(await db.rpc('is_app_admin'));const r=await Promise.all([db.from('user_interests').select('id,work_name,character_name').order('created_at'),db.from('notifications').select('id,title,body,source_url,created_at,read_at,goods_post_id').order('created_at',{ascending:false}).limit(50),role?db.from('delivery_queue').select('id,notification_id,status').order('created_at',{ascending:false}).limit(50):Promise.resolve({data:[]}),role?db.from('delivery_attempts').select('id,queue_id,created_at').order('created_at',{ascending:false}).limit(50):Promise.resolve({data:[]}),db.from('user_preferences').select('onboarding_completed,web_notifications').maybeSingle()]);personal=r.map(result)}if(current!==epoch)return;posts=data;admin=role;[interests,notifications,queue,attempts,preferences]=personal;if(!dirty)draft=interests.map(i=>({...i}));render()}finally{if(current===epoch){loading=false;$('loading').hidden=true}}}
async function setSession(session){epoch++;user=session?.user??null;admin=false;dirty=false;interests=[];draft=[];notifications=[];queue=[];attempts=[];preferences=null;await refresh()}
function queueRow(q){const row=el('div',undefined,'list-row');const n=notifications.find(n=>n.id===q.notification_id);row.append(el('span',n?.title||'알림 '+q.notification_id.slice(0,8)),el('span',QUEUE_LABELS[q.status]||q.status));return row}
function renderAdmin(){
 $('admin-posts').replaceChildren();if(!posts.length)empty($('admin-posts'),'아직 등록한 게시물이 없어요.');
 posts.forEach(p=>{const row=el('article',undefined,'list-row');const info=el('div');info.append(el('h4',p.title),el('p',p.work_name+' · '+(p.is_published?'공개':'비공개')));row.append(info,button(p.is_published?'공개 취소':'공개하기',async()=>{result(await db.from('goods_posts').update({is_published:!p.is_published}).eq('id',p.id));await refresh();notice('공개 상태를 바꿨어요. 같은 게시물의 알림은 중복 생성되지 않아요.')}));$('admin-posts').append(row)});
 $('admin-queue').replaceChildren();if(!queue.length)empty($('admin-queue'),'대기열이 비어 있어요.');else queue.forEach(q=>$('admin-queue').append(queueRow(q)));
 $('admin-attempts').replaceChildren();if(!attempts.length)empty($('admin-attempts'),'모의 발송 기록이 없어요.');else attempts.forEach(a=>{const row=el('div',undefined,'list-row');row.append(el('span','모의 발송 완료 · '+a.queue_id.slice(0,8)),el('time',time(a.created_at)));$('admin-attempts').append(row)})
}
$('goods-form').onsubmit=e=>{e.preventDefault();const b=e.currentTarget.querySelector('button');run(b,async()=>{
 if(!admin)throw {code:'42501'};
 const source_url=canonicalSource($('goods-url').value);const rawThumbnail=$('goods-thumbnail').value.trim();const thumbnail_url=rawThumbnail?canonicalSource(rawThumbnail):null;
 const sale_start=$('goods-start').value?new Date($('goods-start').value).toISOString():null;const sale_end=$('goods-end').value?new Date($('goods-end').value).toISOString():null;
 if(sale_start&&sale_end&&sale_end<sale_start){notice('마감 시각은 시작 시각보다 뒤여야 해요.',true);return}
 const character_names=[...new Set($('goods-characters').value.split(/[,\n]/).map(c=>c.trim()).filter(Boolean))];
 if(character_names.length>30||character_names.some(c=>c.length>80||!normalizeKeyword(c))){notice('캐릭터는 각각 80자 이내, 최대 30명까지 적어 주세요.',true);return}
 result(await db.from('goods_posts').insert({title:$('goods-title').value.trim(),source_url,work_name:canonicalWork($('goods-work').value),character_names,sale_status:$('goods-status').value,sale_info:$('goods-info').value.trim(),sale_start,sale_end,thumbnail_url,seller_name:$('goods-seller').value.trim(),platform_name:$('goods-platform').value.trim(),is_test:$('goods-test').checked,genre_name:$('goods-genre').value.trim(),is_published:$('goods-publish').checked}));
 $('goods-form').reset();await refresh();notice('등록했어요. 테스트가 아닌 공개 소식은 관심사와 알림 설정에 따라 웹 알림을 만들어요.');
 })};
$('run-mock').onclick=()=>run($('run-mock'),async()=>{if(!admin)throw {code:'42501'};const {processed}=await dispatchMockBatch(db);await refresh();notice(processed+'건 처리했어요. 실제 카카오톡 메시지는 발송하지 않았어요.')});
$('header-login').onclick=()=>needLogin(route());$('profile-link').onclick=()=>{$('account-menu').showModal();$('profile-link').setAttribute('aria-expanded','true')};
$('menu-close').onclick=()=>$('account-menu').close();
$('account-menu').addEventListener('close',()=>{$('profile-link').setAttribute('aria-expanded','false');$('profile-link').focus()});
$('account-menu').addEventListener('click',e=>{const r=$('account-menu').getBoundingClientRect();if(e.target===$('account-menu')&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))$('account-menu').close()});
$('account-menu').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>$('account-menu').close()));
$('kakao-login').onclick=()=>run($('kakao-login'),async()=>{const {error}=await db.auth.signInWithOAuth({provider:'kakao',options:{redirectTo:location.origin+'/app.html',scopes:'profile_nickname profile_image'}});if(error)throw error});
$('logout').onclick=()=>run($('logout'),async()=>{const {error}=await db.auth.signOut({scope:'local'});if(error)throw error;await setSession(null);go('explore');notice('로그아웃했어요.')});
$('refresh').onclick=()=>run($('refresh'),refresh);
function searchNow(){go('explore');renderFeed()}
$('nav-search').onsubmit=e=>{e.preventDefault();if(searchComposing)return;searchNow();hideSearchSuggestions()};
$('global-search').onfocus=()=>{searchNow();suggestSearch()};
$('global-search').oninput=()=>{if(!searchComposing){searchNow();suggestSearch()}};
$('global-search').addEventListener('compositionstart',()=>searchComposing=true);
$('global-search').addEventListener('compositionend',()=>{searchComposing=false;searchNow();suggestSearch()});
$('global-search').onkeydown=e=>{if(e.key==='Escape')hideSearchSuggestions();if(e.key==='ArrowDown'&&!$('search-suggestions').hidden){e.preventDefault();$('search-suggestions').querySelector('button')?.focus()}};
$('nav-search').addEventListener('focusout',e=>{if(!$('nav-search').contains(e.relatedTarget))hideSearchSuggestions()});
['filter-genre','filter-status','filter-platform'].forEach(id=>$(id).onchange=renderFeed);
$('sort-order').onchange=renderFeed;
['grid','list'].forEach(mode=>$('view-'+mode).onclick=()=>{viewMode=mode;try{localStorage.setItem('byeoljup-view',mode)}catch{}renderFeed()});
$('reset-search').onclick=()=>{searchScope='all';$('global-search').value='';['filter-genre','filter-status','filter-platform'].forEach(id=>$(id).value='');hideSearchSuggestions();populatePlatforms();renderFeed()};
$('toggle-demo').onclick=()=>{showDemo=!showDemo;populatePlatforms();renderFeed()};
let interestComposing=false;
$('interest-search').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing&&!interestComposing){e.preventDefault();$('interest-form').requestSubmit()}};
$('interest-search').oninput=()=>{if(!interestComposing)choices()};
$('interest-search').addEventListener('compositionstart',()=>interestComposing=true);
$('interest-search').addEventListener('compositionend',()=>{interestComposing=false;choices()});
$('interest-form').onsubmit=e=>{e.preventDefault();if(interestComposing)return;if(!user){needLogin('interests');return}const candidates=searchSuggestions($('interest-search').value,posts).filter(c=>c.work_name);const exactWork=candidates.find(c=>!c.character_name&&normalizeKeyword(c.work_name)===normalizeKeyword(canonicalWork($('interest-search').value)));const selected=exactWork||(candidates.length===1?candidates[0]:null);if(selected){addDraft(selected.work_name,selected.character_name);choices()}else notice('아래 검색 결과에서 작품과 캐릭터를 선택해 주세요.')};
$('add-custom-interest').onclick=()=>{if(!user){needLogin('interests');return}if(!normalizeKeyword($('custom-interest-work').value)){notice('작품명을 입력해 주세요.',true);return}addDraft($('custom-interest-work').value,$('custom-interest-character').value);$('custom-interest-work').value='';$('custom-interest-character').value='';choices()};
$('save-interests').onclick=()=>run($('save-interests'),async()=>{if(!user){needLogin('interests');return}const first=onboarding();result(await db.rpc('save_my_interests',{items:draft.map(({work_name,character_name})=>({work_name,character_name}))}));dirty=false;await refresh();go('home');notice(first&&interests.length?'이제 나만의 별을 찾아볼까요? 등록하신 관심사와 관련된 굿즈를 둘러보세요.':'관심사를 저장했어요. 변경하신 관심사에 맞춰 굿즈 목록을 갱신했어요.')});
$('skip-interests').onclick=()=>run($('skip-interests'),async()=>{result(await db.rpc('save_my_interests',{items:[]}));dirty=false;await refresh();go('home');notice('전체 굿즈 소식을 먼저 둘러보세요. 관심사는 언제든 등록할 수 있어요.')});
$('read-all').onclick=()=>run($('read-all'),async()=>{const ids=notifications.filter(n=>!n.read_at).map(n=>n.id);if(ids.length)result(await db.from('notifications').update({read_at:new Date().toISOString()}).in('id',ids));await refresh()});
$('save-preferences').onclick=()=>run($('save-preferences'),async()=>{const value={web_notifications:$('web-notifications').checked};result(await(preferences?db.from('user_preferences').update(value).eq('user_id',user.id):db.from('user_preferences').insert(value)));await refresh();notice('알림 설정을 저장했어요.')});
WORKS.forEach(([name])=>{const n=el('option');n.value=name;$('work-options').append(n);});Object.entries(SALE_LABELS).forEach(([value,label])=>{const n=el('option',label);n.value=value;$('filter-status').append(n)});choices();
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
async function init(){const params=new URLSearchParams(location.search);let authError=false;
 if(params.has('error')){authError=true;history.replaceState({},'',location.pathname+location.hash)}
 if(params.has('code')){const {error}=await db.auth.exchangeCodeForSession(params.get('code'));history.replaceState({},'',location.pathname+location.hash);authError=!!error}
 const {data,error}=await db.auth.getSession();if(error)throw error;await setSession(data?.session);
 if(user){const next=sessionStorage.getItem('byeoljup-next');sessionStorage.removeItem('byeoljup-next');if(onboarding())go('onboarding');else if(next&&next!=='login')go(next);else if(route()==='login')go('home')}
 if(authError)notice('로그인 연결 시간이 만료됐어요. 다시 카카오로 시작해 주세요.',true);
 db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||session?.user?.id!==user?.id)queueMicrotask(()=>setSession(session).catch(e=>notice(friendly(e),true)))});
}
init().catch(e=>{notice(friendly(e),true);renderRoute()});setInterval(()=>{if(!loading&&!dirty&&document.visibilityState==='visible')refresh().catch(()=>{})},30000);

function recordView(id){let visitor;try{visitor=localStorage.getItem('byeoljup-visitor');if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('byeoljup-visitor',visitor)}}catch{return}db.rpc('record_goods_view',{post_id:id,visitor}).then(r=>{if(!r.error){const p=posts.find(p=>p.id===id);if(p)p.popularity_count=Number(p.popularity_count||0)}})}
