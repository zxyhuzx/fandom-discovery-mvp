import {createProfileController} from './profile-ui.js';
import {FORM_WATCH_KEY,formKey,readFormWatches,watchedForms,deadlineText} from './form-watch.js';
import {SURVEY_GOODS,SURVEY_LABEL,SALE_TYPES,surveyFeed,surveyLink} from './survey-data.js';
import {createClient} from '@supabase/supabase-js';
import {config} from './config.js';
import {WELCOME_DRAFT_KEY,WELCOME_CONNECT_KEY,WELCOME_BROWSE_KEY,parseWelcomeDraft,mergeWelcomeInterests} from './welcome-state.js';
import {dispatchMockBatch} from '../lib/messaging/mock-dispatch.mjs';
import {WORKS,CHARACTERS,canonicalWork,canonicalCharacter,canonicalPost,canonicalSource,matchesInterest,normalizeKeyword,filterGoods,needsOnboarding,workGenre,goodsGenre,sortGoods,searchSuggestions,SALE_LABELS,QUEUE_LABELS} from './domain.js';
const $=id=>document.getElementById(id);
const db=createClient(config.supabaseUrl,config.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
let surveyMode=config.surveyDemoEnabled===true;try{const mode=localStorage.getItem('byeoljup-survey-mode');if(config.surveyDemoEnabled===true&&mode!==null)surveyMode=mode==='1'}catch{}
let viewMode='grid';try{viewMode=localStorage.getItem('byeoljup-view')==='list'?'list':'grid'}catch{}
let user=null,admin=false,interests=[],draft=[],posts=[],notifications=[],queue=[],attempts=[],preferences=null,dirty=false,loading=false,epoch=0,showDemo=surveyMode,searchScope='all',searchComposing=false;
let subscriptionPosts=[],subscriptionWork='',subscriptionMore=false,subscriptionBusy=false,subscriptionEpoch=0,exploreEpoch=0;
let homeTab='popular',popularPosts=[],popularBusy=false,popularError=false,popularEpoch=0;
const homeTabs=['popular','recommended','alerts'];
const homeTitles={popular:'최고 인기 폼',recommended:'맞춤 추천 폼',alerts:'알림 설정한 폼'};
const columns='id,title,source_url,work_name,character_names,sale_status,sale_info,sale_start,sale_end,thumbnail_url,is_published,created_at,seller_name,platform_name,is_test,genre_name';
const demos=config.surveyDemoEnabled===true?SURVEY_GOODS:[];
let sampleWatches=[];try{sampleWatches=readFormWatches(localStorage.getItem(FORM_WATCH_KEY),demos)}catch{}
let realWatchIds=[],watchedPosts=[],watchBusy=new Set(),watchError=false;
const profileController=createProfileController({db,getUser:()=>user,onChange:name=>{$('menu-account-name').textContent=user?name+'님':'로그인하고 구독과 내 알림을 관리해 보세요.'}});
function guestInterests(){try{return parseWelcomeDraft(localStorage.getItem(WELCOME_DRAFT_KEY))?.items||[]}catch{return []}}

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
function onboarding(){let welcomeVisit=false;try{welcomeVisit=sessionStorage.getItem(WELCOME_CONNECT_KEY)==='1'||sessionStorage.getItem(WELCOME_BROWSE_KEY)==='1'}catch{}return !welcomeVisit&&needsOnboarding(user,interests,preferences)}
function renderRoute(){
 let name=route();if(name==='home'&&onboarding())name='onboarding';
 const protectedPage=['mypage','interests','notifications','profile','onboarding','admin'].includes(name);
 if(protectedPage&&!user&&!(showDemo&&name==='interests')){sessionStorage.setItem('byeoljup-next',name);name='login'}
 if(name==='admin'&&!admin)name='home';
 const panel=name.startsWith('goods/')?'detail':name==='onboarding'?'interests':name;
 const valid=['home','explore','mypage','support','qa','interests','notifications','profile','detail','login','admin'];
 document.querySelectorAll('main>section').forEach(n=>n.hidden=n.id!=='panel-'+(valid.includes(panel)?panel:'home'));
 document.querySelectorAll('[data-route]').forEach(n=>{const selected=n.dataset.route===panel;n.classList.toggle('active',selected);if(selected)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current')});
 $('onboarding-label').hidden=name!=='onboarding';$('skip-interests').hidden=name!=='onboarding';$('interests-title').textContent=name==='onboarding'?'좋아하는 세계를 알려주세요':'내 구독 관리';
 $('home-tabs').hidden=panel!=='home';
 $('mypage-navigation').hidden=!['profile','interests','admin'].includes(name);
 if(panel==='detail')renderDetail(name.slice(6));
}
window.addEventListener('hashchange',()=>{renderRoute();if(['explore','admin'].includes(route()))loadExplore().catch(e=>notice(friendly(e),true));if(route()==='home'&&homeTab==='popular')loadPopular()});
function imageFor(p){
 const placeholder=()=>{const box=el('div',undefined,'goods-art goods-placeholder');box.append(el('span','✦'),el('small',p.is_test?'예시 이미지 영역':'이미지 준비 중'));return box};
 if(!p.thumbnail_url)return placeholder();
 const image=el('img');image.alt=p.title+' 이미지';image.className='goods-art';image.loading='lazy';image.referrerPolicy='no-referrer';try{image.src=p.is_survey_example&&/^\/assets\/survey\/[a-z]+\.svg$/.test(p.thumbnail_url)?p.thumbnail_url:canonicalSource(p.thumbnail_url)}catch{return placeholder()}image.onerror=()=>image.replaceWith(placeholder());return image;
}
function watchButton(p){
 const selected=(p.is_survey_example?sampleWatches:realWatchIds).includes(formKey(p));
 const b=el('button',selected?'✓ 폼 알림 설정됨':'폼 알림 설정','secondary form-watch');b.type='button';b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-label',p.title+' 폼 알림 '+(selected?'해제':'설정'));b.disabled=watchBusy.has(formKey(p));b.onclick=()=>run(b,()=>toggleFormWatch(p));return b;
}
async function toggleFormWatch(p){
 const key=formKey(p);if(watchBusy.has(key))return;
 if(!p.is_survey_example&&!user){needLogin(route());return}
 watchBusy.add(key);try{
 if(p.is_survey_example){const next=sampleWatches.includes(key)?sampleWatches.filter(id=>id!==key):[...sampleWatches,key];localStorage.setItem(FORM_WATCH_KEY,JSON.stringify(next));sampleWatches=next;}
 else if(realWatchIds.includes(key)){result(await db.from('goods_form_watches').delete().eq('user_id',user.id).eq('goods_post_id',p.id));await loadFormWatches();}
 else{const r=await db.from('goods_form_watches').insert({user_id:user.id,goods_post_id:p.id});if(r.error&&r.error.code!=='23505')throw r.error;await loadFormWatches();}
 }finally{watchBusy.delete(key)}
 renderHome();renderFeed();if(route().startsWith('goods/'))renderDetail(route().slice(6));
 notice('폼 알림 목록을 업데이트했어요. 카카오톡·푸시 메시지는 아직 발송하지 않아요.');
}
async function loadFormWatches(){
 const account=user?.id;watchError=false;if(!account){realWatchIds=[];watchedPosts=[];return}
 try{const rows=result(await db.from('goods_form_watches').select('goods_post_id,goods_posts('+columns+')').order('created_at',{ascending:false}));if(account!==user?.id)return;realWatchIds=rows.map(r=>r.goods_post_id);watchedPosts=rows.map(r=>r.goods_posts).filter(p=>p?.is_published).map(canonicalPost);}
 catch{if(account===user?.id)watchError=true}
}
function updateCountdowns(){document.querySelectorAll('[data-form-deadline]').forEach(n=>{n.textContent=deadlineText(n.dataset.formDeadline,n.dataset.saleStatus)})}
function renderWatchedForms(){
 const items=watchedForms(showDemo?demos:watchedPosts,showDemo?sampleWatches:realWatchIds);
 $('watched-count').textContent=items.length+'개 폼';$('watched-forms').dataset.view=viewMode;
 fillCards('watched-forms',items,watchError&&!showDemo?'알림 설정한 폼을 불러오지 못했어요':'아직 알림 설정한 폼이 없어요',watchError&&!showDemo?'새로고침해서 다시 시도해 주세요.':'관심 있는 폼에서 ‘폼 알림 설정’을 눌러주세요.');
 document.querySelectorAll('#watched-forms .card').forEach((node,index)=>{const p=items[index],countdown=el('p',undefined,'form-countdown');countdown.dataset.formDeadline=p.sale_end||'';countdown.dataset.saleStatus=p.sale_status;countdown.setAttribute('aria-live','off');node.append(countdown);});updateCountdowns();
}
function card(p){const n=el('article',undefined,'card');n.append(imageFor(p));if(p.is_test)n.append(el('span',p.is_survey_example?SURVEY_LABEL:'테스트·예시 데이터','badge'));n.append(el('span',SALE_LABELS[p.sale_status],'sale-tag'),el('h3',p.title),el('p',(p.form_items?p.form_items.map(item=>item.work_name+' · '+(item.character_names.join(', ')||'작품 전체')).join(' / '):p.work_name+' · '+(p.character_names.join(', ')||'작품 전체'))),el('p',(p.seller_name||'창작자 미등록')+' · '+(p.platform_name||platform(p.source_url))),el('p',p.sale_end?(p.is_survey_example?'예시 마감 ':'마감 ')+time(p.sale_end):p.sale_start?'시작 '+time(p.sale_start):'일정은 원문을 확인해 주세요.','note'));const a=el('a','상세 보기 →','text-link');a.href='#goods/'+p.id;n.append(a);if(!p.is_test)n.append(link(p.source_url,'원본 판매처 ↗'));if(!p.is_test||p.is_survey_example)n.append(watchButton(p));return n}
function platform(url){try{return new URL(url).hostname.replace(/^www\./,'')}catch{return '판매 플랫폼 미등록'}}
function fillCards(id,items,message,description){const target=$(id);target.replaceChildren();if(!items.length)empty(target,message,description);else items.forEach(p=>target.append(card(p)))}
function renderFeed(){
 const source=showDemo?demos:posts;
 const options={query:$('global-search').value,scope:searchScope,genre:$('filter-genre').value,status:$('filter-status').value,platform:$('filter-platform').value,saleType:$('filter-sale-type').value};
 const items=sortGoods(filterGoods(source,options),$('sort-order').value,interests);$('result-count').textContent=items.length+'개 소식';$('demo-note').hidden=!showDemo;$('toggle-demo').textContent=showDemo?'실제 게시물 보기':'예시 데이터 보기';
 $('filter-count').textContent=[options.genre,options.status,options.platform,options.saleType].filter(Boolean).length?'('+[options.genre,options.status,options.platform,options.saleType].filter(Boolean).length+')':'';
 $('goods-feed').dataset.view=viewMode;$('view-grid').setAttribute('aria-pressed',String(viewMode==='grid'));$('view-list').setAttribute('aria-pressed',String(viewMode==='list'));
 $('sort-note').textContent=showDemo?'체험용 예시 콘텐츠예요. 실제 인기·조회 기록이 없어 인기순은 예시 게시일순으로 표시해요.':$('sort-order').value==='popular'?'상세 조회 수 기준이에요. 같은 브라우저는 게시물마다 하루 한 번 집계해요.':$('sort-order').value==='recommended'?(interests.length?'관심 캐릭터·작품 일치도를 먼저 보고 조회 수와 최신순으로 정렬해요.':'구독이 없어 조회 수와 최신순으로 보여 드려요.'):'최근 등록된 소식부터 보여 드려요.';
 $('search-summary').textContent=options.query.trim()?'“'+options.query.trim()+'” 검색 중':'작품·캐릭터·굿즈·창작자를 한 번에 검색해 보세요.';
 fillCards('goods-feed',items,!showDemo&&!posts.some(p=>p.is_published)?'아직 등록된 굿즈가 없어요':'찾으시는 굿즈가 보이지 않아요',!showDemo&&!posts.some(p=>p.is_published)?'현재 실제 게시물이 없어 검색 결과가 없어요. 예시 데이터로 검색과 필터를 먼저 체험해 보세요.':'검색어를 바꾸거나 필터를 조정해 보세요.');
 document.querySelectorAll('[data-search-scope]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.searchScope===searchScope)));
}
function genreButtons(target,choose){target.replaceChildren();['','애니·만화','웹소설·웹툰','게임','버튜버',...[...new Set((showDemo?demos:posts).map(goodsGenre))].filter(g=>!['애니·만화','웹소설·웹툰','게임','버튜버'].includes(g))].forEach(name=>{const b=el('button',name||'전체','genre-chip');b.type='button';b.setAttribute('aria-pressed',String($('filter-genre').value===name));b.onclick=()=>choose(name);target.append(b)})}
function populatePlatforms(){genreButtons($('genre-chips'),name=>{$('filter-genre').value=name;populatePlatforms();renderFeed()});const selected=$('filter-platform').value;$('filter-platform').replaceChildren(el('option','모든 플랫폼'));$('filter-platform').firstChild.value='';[...new Set((showDemo?demos:posts).map(p=>p.platform_name).filter(Boolean))].sort().forEach(name=>{const o=el('option',name);o.value=name;$('filter-platform').append(o)});$('filter-platform').value=[...$('filter-platform').options].some(o=>o.value===selected)?selected:''}
function hideSearchSuggestions(){$('search-suggestions').hidden=true;$('global-search').setAttribute('aria-expanded','false')}
function suggestSearch(){
 const query=$('global-search').value;const target=$('search-suggestions');target.replaceChildren();
 if(!query.trim()){
  target.append(el('p','장르로 둘러보기','suggestion-heading'));const genres=el('div',undefined,'genre-chips');genreButtons(genres,name=>{$('filter-genre').value=name;populatePlatforms();renderFeed();suggestSearch()});target.append(genres);
  const items=sortGoods((showDemo?demos:posts).filter(p=>p.is_published&&!(!showDemo&&p.is_test)&&(!$('filter-genre').value||goodsGenre(p)===$('filter-genre').value)),'popular').slice(0,4);
  target.append(el('p',showDemo?'체험용 예시 굿즈 미리보기':'인기 굿즈','suggestion-heading'));
  if(!items.length){target.append(el('p','아직 등록된 굿즈가 없어요. 예시 데이터로 먼저 둘러보세요.','suggestion-empty'));const b=el('button','예시 굿즈 둘러보기');b.type='button';b.onclick=()=>{setDemoMode(true);suggestSearch()};target.append(b)}
  items.forEach(p=>{const b=el('button');b.type='button';b.append(el('strong',p.title),el('span',p.work_name+(p.is_test?' · 예시':'')));b.onclick=()=>{go('goods/'+p.id);hideSearchSuggestions()};target.append(b)});
 }else{
  const choices=searchSuggestions(query,showDemo?demos:posts);
  choices.forEach(c=>{const b=el('button');b.type='button';b.append(el('strong',c.label),el('span',c.kind));b.onclick=()=>{$('global-search').value=c.query;go('explore');renderFeed();hideSearchSuggestions()};target.append(b)});
  if(!choices.length)target.append(el('p','입력하신 검색어로 굿즈 목록을 찾아보고 있어요.','suggestion-empty'));
 }
 target.hidden=false;$('global-search').setAttribute('aria-expanded','true');
}
function selectHomeTab(tab){
 homeTab=tab;renderHome();if(tab==='popular')loadPopular();
}
async function loadPopular(){
 if(showDemo){popularBusy=false;popularError=false;popularPosts=[...demos].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));renderHome();return}
 const current=++popularEpoch;popularBusy=true;popularError=false;renderHome();
 try{const rows=result(await db.rpc('popular_goods_feed',{page_size:30}));if(current!==popularEpoch||showDemo)return;popularPosts=rows.map(row=>({...canonicalPost(row.post),popularity_count:Number(row.view_count)}));}
 catch{if(current===popularEpoch){popularError=true;popularPosts=[]}}
 finally{if(current===popularEpoch){popularBusy=false;renderHome()}}
}
function syncViewSwitches(){document.querySelectorAll('[data-view-mode]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.viewMode===viewMode)))}
function changeViewMode(mode){viewMode=mode;try{localStorage.setItem('byeoljup-view',mode)}catch{}renderHome();renderFeed()}
function renderHome(){
 syncViewSwitches();renderWatchedForms();$('home-notifications').dataset.view=viewMode;$('popular-count').textContent=popularBusy?'불러오는 중':popularError?'':popularPosts.length+'개 소식';
 $('home-title').textContent=homeTitles[homeTab];
 for(const tab of homeTabs){const selected=homeTab===tab;$('home-tab-'+tab).setAttribute('aria-selected',String(selected));$('home-tab-'+tab).tabIndex=selected?0:-1;$('home-panel-'+tab).hidden=!selected;}
 $('popular-feed').dataset.view=viewMode;$('popular-feed').setAttribute('aria-busy',String(popularBusy));
 fillCards('popular-feed',popularBusy||popularError?[]:popularPosts,popularBusy?'인기 폼을 불러오는 중이에요…':popularError?'인기 폼을 불러오지 못했어요':'아직 인기 순위를 보여 드릴 데이터가 없어요',popularError?'잠시 후 다시 불러와 주세요.':!popularBusy?'실제 조회 기록이 있는 공개 폼이 등록되면 보여 드릴게요.':undefined);
 if(!showDemo&&!popularBusy&&!popularError)document.querySelectorAll('#popular-feed .card').forEach((node,index)=>node.append(el('p','별줍 상세 조회 '+popularPosts[index].popularity_count+'회','note')));
 $('popular-basis').textContent=showDemo?'체험용 예시 콘텐츠 80개를 예시 게시일순으로 보여 드려요. 실제 판매 정보나 인기 순위가 아니에요.':'별줍 내 실제 상세 조회 수가 높은 폼부터 최대 30개를 보여 드려요. 외부 링크 클릭은 아직 집계하지 않아요.';
 $('popular-retry').hidden=!popularError;

 $('home-description').textContent=homeTab==='popular'?'별줍에서 많이 살펴본 굿즈 소식을 확인해 보세요.':homeTab==='recommended'?'좋아하는 작품과 캐릭터의 소식을 모았어요.':'내 알림 설정과 새로운 소식을 확인하세요.';
 $('interest-prompt').hidden=!!interests.length;
 const filters=$('subscription-works');filters.replaceChildren();
 ['',...new Set(interests.map(i=>i.work_name))].forEach(work=>{const b=button(work||'모든 구독',async()=>{subscriptionWork=work;await loadSubscriptions()});b.classList.add('genre-chip');b.setAttribute('aria-pressed',String(subscriptionWork===work));filters.append(b)});
 $('subscription-feed').dataset.view=viewMode;['grid','list'].forEach(mode=>$('subscription-'+mode).setAttribute('aria-pressed',String(viewMode===mode)));
 fillCards('subscription-feed',subscriptionPosts,!user&&!showDemo?'로그인하고 맞춤 폼을 확인하세요':subscriptionBusy?'구독 소식을 불러오는 중이에요…':interests.length?'아직 발견된 굿즈가 없어요':'구독할 작품을 골라 보세요',interests.length?'선택한 구독과 판매 상태에 맞는 소식이 아직 없어요.':'구독 관리에서 좋아하는 작품과 캐릭터를 등록해 주세요.');
 $('subscription-count').textContent=subscriptionPosts.length+'개 소식'+(subscriptionMore?' 이상':'');
 $('subscription-more').hidden=!subscriptionMore;$('subscription-more').disabled=subscriptionBusy;
 const unread=notifications.filter(n=>!n.read_at),target=$('home-notifications');target.replaceChildren();
 if(!unread.length)empty(target,'아직 새로운 소식이 없어요');
 unread.slice(0,3).forEach(n=>{const a=el('a',undefined,'list-row unread');a.href='#goods/'+n.goods_post_id;a.append(el('strong',n.title),el('time',time(n.created_at)));a.onclick=()=>markRead(n);target.append(a)});
 $('home-unread').textContent=unread.length;
}
async function markRead(n){if(n.read_at)return;const read_at=new Date().toISOString();const r=await db.from('notifications').update({read_at}).eq('id',n.id);if(r.error){notice(friendly(r.error),true);return}n.read_at=read_at;renderNotifications();renderHome();updateCount()}
async function loadSubscriptions(append=false){
 const current=++subscriptionEpoch,account=user?.id;subscriptionBusy=true;
 if(!append)subscriptionPosts=[];renderHome();
 try{
  if(subscriptionWork&&!interests.some(i=>i.work_name===subscriptionWork))subscriptionWork='';
  if(showDemo){subscriptionMore=false;subscriptionPosts=surveyFeed(interests,{work:subscriptionWork,status:$('subscription-status').value});return}
  if(!user||!interests.length){subscriptionMore=false;return}
  if(subscriptionWork&&!interests.some(i=>i.work_name===subscriptionWork))subscriptionWork='';
  const last=append?subscriptionPosts.at(-1):null;
  const rows=result(await db.rpc('my_subscription_feed',{work_filter:subscriptionWork,status_filter:$('subscription-status').value,before_time:last?.created_at||null,before_id:last?.id||null,page_size:30}));
  if(current!==subscriptionEpoch||account!==user?.id)return;
  subscriptionMore=rows.length>30;subscriptionPosts=[...(append?subscriptionPosts:[]),...rows.slice(0,30).map(canonicalPost)];
 }finally{if(current===subscriptionEpoch){subscriptionBusy=false;renderHome()}}
}
async function loadExplore(){if(showDemo&&route()!=='admin'){populatePlatforms();renderFeed();return}const current=++exploreEpoch,account=user?.id;const data=result(await db.from('goods_posts').select(columns).order('created_at',{ascending:false}).limit(100));const metrics=await db.rpc('goods_popularity',{post_ids:data.map(p=>p.id)});if(current!==exploreEpoch||account!==user?.id)return;if(!metrics.error)data.forEach(p=>p.popularity_count=metrics.data.find(m=>m.goods_post_id===p.id)?.view_count||0);posts=data.map(canonicalPost);populatePlatforms();renderFeed();if(admin)renderAdmin()}
async function renderDetail(id){let p=[...popularPosts,...subscriptionPosts,...posts,...watchedPosts,...demos].find(p=>p.id===id&&p.is_published);const target=$('goods-detail');target.replaceChildren();if(!p&&/^[a-f0-9-]{36}$/i.test(id)){empty(target,'상세 소식을 불러오는 중이에요…');try{p=result(await db.from('goods_posts').select(columns).eq('id',id).eq('is_published',true).maybeSingle());if(p){p=canonicalPost(p);posts.push(p)}}catch(e){notice(friendly(e),true)}if(route()!=='goods/'+id)return}if(!p){empty(target,'게시물이 없거나 공개가 종료됐어요.');return}target.replaceChildren();const box=el('article',undefined,'detail-card');box.append(imageFor(p));const info=el('div');if(p.is_test)info.append(el('p',p.is_survey_example?SURVEY_LABEL+' · 실제 판매 정보가 아니에요':'테스트·예시 데이터 · 실제 판매 정보가 아니에요','badge'));info.append(el('span',SALE_LABELS[p.sale_status],'sale-tag'),el('h1',p.title),el('p',p.work_name+' · '+(p.character_names.join(', ')||'작품 전체')),el('p','창작자·판매자: '+(p.seller_name||'미등록')),el('p','판매 플랫폼: '+(p.platform_name||platform(p.source_url))),el('p',p.sale_info||'판매 안내는 원문을 확인해 주세요.'));if(p.sale_start)info.append(el('p','시작: '+time(p.sale_start)));if(p.sale_end)info.append(el('p','마감: '+time(p.sale_end)));if(!p.is_test)info.append(link(p.source_url,'원본 판매 페이지로 이동 ↗'));else info.append(el('p','예시 데이터에는 실제 판매 링크를 제공하지 않아요.','note'));const actions=el('div',undefined,'detail-actions');actions.setAttribute('role','group');actions.setAttribute('aria-label','폼 알림과 작품 구독');
 const saved=interests.some(i=>canonicalWork(i.work_name)===canonicalWork(p.work_name)&&!i.character_name),pending=draft.some(i=>canonicalWork(i.work_name)===canonicalWork(p.work_name)&&!i.character_name);
 const subscribe=button(saved?'✓ 작품 구독 중':pending?'✓ 구독에 담음':'작품 구독하기',async()=>{if(!user&&!showDemo){needLogin('goods/'+id);return}addDraft(p.work_name,'');go('interests')});subscribe.setAttribute('aria-pressed',String(saved||pending));
 if(!p.is_test||p.is_survey_example)actions.append(watchButton(p));actions.append(subscribe);info.append(actions);
 if(p.is_survey_example)info.append(el('p','굿즈 종류: '+p.product_types.join(', ')),el('p','판매 유형: '+p.sale_type),el('p','예시 게시일: '+time(p.created_at)));
 if(p.is_survey_example){const related=demos.filter(item=>formKey(item)===formKey(p));const list=el('div',undefined,'form-card');list.append(el('h2','이 폼의 상품'));related.forEach(item=>{const row=el('p');row.append(el('strong',item.work_name+' · '+item.character_names.join(', ')),el('br'),el('span',item.item_name));list.append(row)});info.append(list)}
 box.append(info);target.append(box);if(!p.is_test)recordView(p.id)}
function addDraft(work,character){if(draft.length>=100){notice('구독은 최대 100개까지 담을 수 있어요.',true);return}work=canonicalWork(work);character=canonicalCharacter(work,character);if(!normalizeKeyword(work))return;const item={work_name:work,character_name:character};if(draft.some(i=>canonicalWork(i.work_name)===work&&normalizeKeyword(i.character_name)===normalizeKeyword(character)))return;draft.push(item);dirty=true;renderInterests()}
function renderInterests(){$('interest-list').replaceChildren();$('interest-count').textContent=draft.length;$('unsaved-label').textContent=dirty?'아직 저장하지 않은 변경사항이 있어요.':'저장된 구독이에요.';if(!draft.length)empty($('interest-list'),'좋아하는 작품부터 골라 보세요','관심 있는 작품과 캐릭터를 하나씩 담아 주세요.');draft.forEach((i,index)=>{const row=el('li',undefined,'list-row');const text=el('div');text.append(el('h4',i.work_name),el('p',i.character_name||(workGenre(i.work_name)==='버튜버'?'그룹 전체':'작품 전체')));row.append(text,button('목록에서 삭제',async()=>{draft.splice(index,1);dirty=true;renderInterests();choices()}));$('interest-list').append(row)})}
function choices(){
 const query=$('interest-search').value.trim();const target=$('interest-suggestions');target.replaceChildren();
 if(!query){target.append(el('p','작품이나 캐릭터 이름을 검색해 보세요.','note'));return}
 const candidates=searchSuggestions(query,showDemo?demos:posts).filter(c=>c.work_name);
 if(!candidates.length){target.append(el('p','찾으시는 구독이 없나요? 아래에서 작품과 캐릭터를 직접 입력할 수 있어요.','note'));return}
 candidates.forEach(c=>{const selected=draft.some(i=>canonicalWork(i.work_name)===canonicalWork(c.work_name)&&normalizeKeyword(i.character_name)===normalizeKeyword(c.character_name));const b=el('button',undefined,'interest-choice');b.type='button';b.disabled=selected;b.append(el('strong',c.character_name?c.label:c.work_name+(workGenre(c.work_name)==='버튜버'?' · 그룹 전체':' · 작품 전체')),el('span',selected?'담음':'+ 담기'));b.onclick=()=>{addDraft(c.work_name,c.character_name);choices()};target.append(b)});
}
function renderNotifications(){$('notifications').replaceChildren();if(!notifications.length)empty($('notifications'),'아직 새로운 소식이 없어요','구독과 관련된 굿즈 소식이 생기면 이곳에서 확인할 수 있어요.');notifications.forEach(n=>{const row=el('article',undefined,'list-row'+(!n.read_at?' unread':''));const a=el('a',undefined,'notification-link');a.href='#goods/'+n.goods_post_id;a.append(el('h4',n.title),el('p',n.body),el('time',time(n.created_at)));a.onclick=()=>markRead(n);row.append(a);if(!n.read_at)row.append(button('읽음',async()=>{result(await db.from('notifications').update({read_at:new Date().toISOString()}).eq('id',n.id));await refresh()}));$('notifications').append(row)})}
function updateCount(){$('unread-count').textContent=notifications.filter(n=>!n.read_at).length}
function render(){$('survey-banner').hidden=!showDemo;$('survey-mode').hidden=config.surveyDemoEnabled!==true;$('toggle-demo').hidden=config.surveyDemoEnabled!==true;document.querySelector('.custom-interest').hidden=!user&&showDemo;$('filter-sale-type').parentElement.hidden=!showDemo;$('survey-mode').textContent=showDemo?'실제 게시물 보기':'체험용 예시 보기';$('header-login').hidden=!!user;const accountName=profileController.nickname();profileController.render();$('account-name').textContent=accountName;$('menu-account-name').textContent=user?accountName+'님':'로그인하고 구독과 내 알림을 관리해 보세요.';$('admin-tab').hidden=!admin;$('upload-nav').hidden=!admin;$('web-notifications').checked=preferences?.web_notifications!==false;updateCount();populatePlatforms();renderFeed();renderHome();renderInterests();choices();renderNotifications();if(admin)renderAdmin();renderRoute()}
async function refresh(){const current=++epoch;loading=true;$('loading').hidden=false;try{
 let role=false,personal=[[],[],[],[],null];if(user){role=result(await db.rpc('is_app_admin'));const r=await Promise.all([db.from('user_interests').select('id,work_name,character_name').order('created_at'),db.from('notifications').select('id,title,body,source_url,created_at,read_at,goods_post_id').order('created_at',{ascending:false}).limit(50),role?db.from('delivery_queue').select('id,notification_id,status').order('created_at',{ascending:false}).limit(50):Promise.resolve({data:[]}),role?db.from('delivery_attempts').select('id,queue_id,created_at').order('created_at',{ascending:false}).limit(50):Promise.resolve({data:[]}),db.from('user_preferences').select('onboarding_completed,web_notifications').maybeSingle()]);personal=r.map(result)}
 if(current!==epoch)return;admin=role;[interests,notifications,queue,attempts,preferences]=personal;if(!user&&showDemo)interests=guestInterests();interests=interests.map(i=>({...i,work_name:canonicalWork(i.work_name),character_name:canonicalCharacter(i.work_name,i.character_name)}));if(!dirty)draft=interests.map(i=>({...i}));
 await profileController.load();if(current!==epoch)return;await loadFormWatches();if(current!==epoch)return;await loadSubscriptions();if(current!==epoch)return;if(['explore','admin'].includes(route()))await loadExplore();if(current===epoch){render();if(route()==='home'&&homeTab==='popular')await loadPopular()}
 }finally{if(current===epoch){loading=false;$('loading').hidden=true}}}
async function setSession(session){epoch++;subscriptionEpoch++;exploreEpoch++;subscriptionPosts=[];posts=[];subscriptionWork='';popularEpoch++;popularPosts=[];user=session?.user??null;profileController.clear();realWatchIds=[];watchedPosts=[];admin=false;dirty=false;interests=[];draft=[];notifications=[];queue=[];attempts=[];preferences=null;await refresh()}
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
 const character_names=[...new Set($('goods-characters').value.split(/[,\n]/).map(c=>canonicalCharacter($('goods-work').value,c)).filter(Boolean))];
 if(character_names.length>30||character_names.some(c=>c.length>80||!normalizeKeyword(c))){notice('캐릭터는 각각 80자 이내, 최대 30명까지 적어 주세요.',true);return}
 result(await db.from('goods_posts').insert({title:$('goods-title').value.trim(),source_url,work_name:canonicalWork($('goods-work').value),character_names,sale_status:$('goods-status').value,sale_info:$('goods-info').value.trim(),sale_start,sale_end,thumbnail_url,seller_name:$('goods-seller').value.trim(),platform_name:$('goods-platform').value.trim(),is_test:$('goods-test').checked,genre_name:$('goods-genre').value.trim(),is_published:$('goods-publish').checked}));
 $('goods-form').reset();await refresh();notice('등록했어요. 테스트가 아닌 공개 소식은 구독과 알림 설정에 따라 웹 알림을 만들어요.');
 })};
$('run-mock').onclick=()=>run($('run-mock'),async()=>{if(!admin)throw {code:'42501'};const {processed}=await dispatchMockBatch(db);await refresh();notice(processed+'건 처리했어요. 실제 카카오톡 메시지는 발송하지 않았어요.')});
$('header-login').onclick=()=>needLogin(route());$('profile-link').onclick=()=>{$('account-menu').showModal();$('profile-link').setAttribute('aria-expanded','true')};
$('menu-close').onclick=()=>$('account-menu').close();
$('account-menu').addEventListener('close',()=>{$('profile-link').setAttribute('aria-expanded','false');$('profile-link').focus()});
$('account-menu').addEventListener('click',e=>{const r=$('account-menu').getBoundingClientRect();if(e.target===$('account-menu')&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))$('account-menu').close()});
$('account-menu').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>$('account-menu').close()));
$('kakao-login').onclick=()=>run($('kakao-login'),async()=>{const {error}=await db.auth.signInWithOAuth({provider:'kakao',options:{redirectTo:location.origin+'/app.html',scopes:'profile_nickname profile_image'}});if(error)throw error});
$('logout').onclick=()=>run($('logout'),async()=>{const {error}=await db.auth.signOut({scope:'local'});if(error)throw error;await setSession(null);go('explore');notice('로그아웃했어요.')});
document.querySelectorAll('[data-view-mode]').forEach(node=>node.onclick=()=>changeViewMode(node.dataset.viewMode));
homeTabs.forEach((tab,index)=>{const node=$('home-tab-'+tab);node.onclick=()=>selectHomeTab(tab);node.onkeydown=e=>{let next;if(e.key==='ArrowRight')next=(index+1)%3;else if(e.key==='ArrowLeft')next=(index+2)%3;else if(e.key==='Home')next=0;else if(e.key==='End')next=2;else return;e.preventDefault();selectHomeTab(homeTabs[next]);$('home-tab-'+homeTabs[next]).focus()}});
$('popular-retry').onclick=()=>loadPopular();
$('subscription-status').onchange=()=>loadSubscriptions().catch(e=>notice(friendly(e),true));
$('subscription-more').onclick=()=>run($('subscription-more'),()=>loadSubscriptions(true));
$('refresh').onclick=()=>run($('refresh'),refresh);
function searchNow(){go('explore');renderFeed()}
$('nav-search').onsubmit=e=>{e.preventDefault();if(searchComposing)return;searchNow();hideSearchSuggestions()};
$('global-search').onfocus=()=>{searchNow();suggestSearch()};
$('global-search').oninput=()=>{if(!searchComposing){searchNow();suggestSearch()}};
$('global-search').addEventListener('compositionstart',()=>searchComposing=true);
$('global-search').addEventListener('compositionend',()=>{searchComposing=false;searchNow();suggestSearch()});
$('global-search').onkeydown=e=>{if(e.key==='Escape')hideSearchSuggestions();if(e.key==='ArrowDown'&&!$('search-suggestions').hidden){e.preventDefault();$('search-suggestions').querySelector('button')?.focus()}};
$('nav-search').addEventListener('focusout',e=>{if(!$('nav-search').contains(e.relatedTarget))hideSearchSuggestions()});
['filter-genre','filter-status','filter-platform','filter-sale-type'].forEach(id=>$(id).onchange=renderFeed);
$('sort-order').onchange=renderFeed;

$('reset-search').onclick=()=>{searchScope='all';$('global-search').value='';['filter-genre','filter-status','filter-platform','filter-sale-type'].forEach(id=>$(id).value='');hideSearchSuggestions();populatePlatforms();renderFeed()};
function setDemoMode(enabled){if(config.surveyDemoEnabled!==true)return;showDemo=enabled;try{localStorage.setItem('byeoljup-survey-mode',enabled?'1':'0')}catch{}$('filter-sale-type').value='';popularEpoch++;popularPosts=[];if(!user){interests=enabled?guestInterests():[];draft=interests.map(i=>({...i}));dirty=false}render();loadSubscriptions().catch(e=>notice(friendly(e),true));loadPopular();if(['explore','admin'].includes(route()))loadExplore().catch(e=>notice(friendly(e),true));}
$('toggle-demo').onclick=()=>setDemoMode(!showDemo);$('survey-mode').onclick=()=>setDemoMode(!showDemo);
let interestComposing=false;
$('interest-search').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing&&!interestComposing){e.preventDefault();$('interest-form').requestSubmit()}};
$('interest-search').oninput=()=>{if(!interestComposing)choices()};
$('interest-search').addEventListener('compositionstart',()=>interestComposing=true);
$('interest-search').addEventListener('compositionend',()=>{interestComposing=false;choices()});
$('interest-form').onsubmit=e=>{e.preventDefault();if(interestComposing)return;if(!user&&!showDemo){needLogin('interests');return}const candidates=searchSuggestions($('interest-search').value,showDemo?demos:posts).filter(c=>c.work_name);const exactWork=candidates.find(c=>!c.character_name&&normalizeKeyword(c.work_name)===normalizeKeyword(canonicalWork($('interest-search').value)));const selected=exactWork||(candidates.length===1?candidates[0]:null);if(selected){addDraft(selected.work_name,selected.character_name);choices()}else notice('아래 검색 결과에서 작품과 캐릭터를 선택해 주세요.')};
$('add-custom-interest').onclick=()=>{if(!user&&!showDemo){needLogin('interests');return}if(!normalizeKeyword($('custom-interest-work').value)){notice('작품명을 입력해 주세요.',true);return}addDraft($('custom-interest-work').value,$('custom-interest-character').value);$('custom-interest-work').value='';$('custom-interest-character').value='';choices()};
$('save-interests').onclick=()=>run($('save-interests'),async()=>{if(!user&&!showDemo){needLogin('interests');return}if(!user&&showDemo){if(draft.length&&!parseWelcomeDraft(JSON.stringify({version:1,items:draft}))){notice('체험 관심사는 검색 결과에서 작품과 캐릭터를 선택해 주세요.',true);return}if(draft.length)localStorage.setItem(WELCOME_DRAFT_KEY,JSON.stringify({version:1,items:draft.map(({work_name,character_name})=>({work_name,character_name}))}));else localStorage.removeItem(WELCOME_DRAFT_KEY);dirty=false;await refresh();homeTab='recommended';go('home');renderHome();notice('체험용 관심사를 이 브라우저에 저장했어요. 계정 저장과 알림 발송은 하지 않아요.');return}const first=onboarding();result(await db.rpc('save_my_interests',{items:draft.map(({work_name,character_name})=>({work_name,character_name}))}));dirty=false;await refresh();go('home');notice(first&&interests.length?'이제 나만의 별을 찾아볼까요? 등록하신 구독과 관련된 굿즈를 둘러보세요.':'구독을 저장했어요. 변경하신 구독에 맞춰 굿즈 목록을 갱신했어요.')});
$('skip-interests').onclick=()=>run($('skip-interests'),async()=>{result(await db.rpc('save_my_interests',{items:[]}));dirty=false;await refresh();go('home');notice('전체 굿즈 소식을 먼저 둘러보세요. 구독은 언제든 등록할 수 있어요.')});
$('read-all').onclick=()=>run($('read-all'),async()=>{const ids=notifications.filter(n=>!n.read_at).map(n=>n.id);if(ids.length)result(await db.from('notifications').update({read_at:new Date().toISOString()}).in('id',ids));await refresh()});
$('save-preferences').onclick=()=>run($('save-preferences'),async()=>{const value={web_notifications:$('web-notifications').checked};result(await(preferences?db.from('user_preferences').update(value).eq('user_id',user.id):db.from('user_preferences').insert(value)));await refresh();notice('알림 설정을 저장했어요.')});
SALE_TYPES.forEach(value=>{const option=el('option',value);option.value=value;$('filter-sale-type').append(option)});
const surveyUrl=surveyLink(config.surveyUrl);if(surveyUrl){$('survey-cta').href=surveyUrl;$('survey-cta').hidden=false}
WORKS.forEach(([name])=>{const n=el('option');n.value=name;$('work-options').append(n);});Object.entries(SALE_LABELS).forEach(([value,label])=>{const n=el('option',label);n.value=value;$('filter-status').append(n);$('subscription-status').append(n.cloneNode(true))});choices();
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
async function init(){const params=new URLSearchParams(location.search);let authError=false;
 if(params.has('error')){authError=true;history.replaceState({},'',location.pathname+location.hash)}
 if(params.has('code')){const {error}=await db.auth.exchangeCodeForSession(params.get('code'));history.replaceState({},'',location.pathname+location.hash);authError=!!error}
 const {data,error}=await db.auth.getSession();if(error)throw error;await setSession(data?.session);
 // Import only after an explicit Connect action, preserving existing subscriptions.
 if(sessionStorage.getItem(WELCOME_CONNECT_KEY)==='1'){
  if(authError||!user){location.replace('/?step=connect&error=auth');return}
  const pending=parseWelcomeDraft(localStorage.getItem(WELCOME_DRAFT_KEY));
  if(!pending){sessionStorage.removeItem(WELCOME_CONNECT_KEY);location.replace('/');return}
  try{
   result(await db.rpc('save_my_interests',{items:mergeWelcomeInterests(interests,pending.items)}));
  }catch{location.replace('/?step=connect&error=save');return}
  localStorage.removeItem(WELCOME_DRAFT_KEY);sessionStorage.removeItem(WELCOME_CONNECT_KEY);
  await refresh();go('home');
 }
 if(user){const next=sessionStorage.getItem('byeoljup-next');sessionStorage.removeItem('byeoljup-next');if(onboarding())go('onboarding');else if(next||route()==='login')go('home')}
 if(authError)notice('로그인 연결 시간이 만료됐어요. 다시 카카오로 시작해 주세요.',true);
 db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||session?.user?.id!==user?.id)queueMicrotask(()=>setSession(session).catch(e=>notice(friendly(e),true)))});
}
init().catch(e=>{notice(friendly(e),true);renderRoute()});setInterval(()=>{if(!loading&&!dirty&&document.visibilityState==='visible')refresh().catch(()=>{})},30000);

function recordView(id){let visitor;try{visitor=localStorage.getItem('byeoljup-visitor');if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('byeoljup-visitor',visitor)}}catch{return}db.rpc('record_goods_view',{post_id:id,visitor}).then(r=>{if(!r.error){const p=posts.find(p=>p.id===id);if(p)p.popularity_count=Number(p.popularity_count||0)}})}

setInterval(updateCountdowns,1000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')updateCountdowns()});
