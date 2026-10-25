import {createClient} from '@supabase/supabase-js';
import {config} from './config.js';
import {dispatchMockBatch} from '../lib/messaging/mock-dispatch.mjs';
import {WORKS,canonicalWork,canonicalSource,matchesInterest,normalizeKeyword,SALE_LABELS,QUEUE_LABELS} from './domain.js';

const $=id=>document.getElementById(id);
const db=createClient(config.supabaseUrl,config.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
let user=null,admin=false,epoch=0,loading=false;
let interests=[],posts=[],notifications=[],queue=[],attempts=[];
function notice(text='',error=false){$('notice').textContent=text;$('notice').dataset.error=String(error)}
function friendly(error){
 if(error?.code==='23505')return '이미 등록된 관심사 또는 게시물 주소예요.';
 if(error?.code==='42501')return '이 작업을 할 권한이 없어요. 로그인과 관리자 권한을 확인해 주세요.';
 if(error?.code==='23514'||error?.code==='22007')return '입력 길이, 주소 또는 날짜를 확인해 주세요.';
 if(error?.message==='Failed to fetch')return '인터넷 연결을 확인하고 다시 시도해 주세요.';
 return '처리하지 못했어요. 잠시 후 다시 시도해 주세요. 설정이 필요하면 운영 가이드를 확인해 주세요.';
}
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node}
function empty(target,text){target.replaceChildren(el('p',text,'empty-state'))}
function time(value){return new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value))}
function link(url,text){try{const href=canonicalSource(url);const a=el('a',text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a}catch{return el('span','원문 주소를 확인할 수 없어요.','muted')}}
function button(text,action){const b=el('button',text,'secondary');b.type='button';b.addEventListener('click',()=>run(b,action));return b}
async function run(control,action){if(control.disabled)return;control.disabled=true;notice();try{await action()}catch(error){notice(friendly(error),true)}finally{control.disabled=false}}
function result(response){if(response.error)throw response.error;return response.data}
function tab(name){if(name==='admin'&&!admin)return;for(const n of ['feed','interests','notifications','admin'])$('panel-'+n).hidden=n!==name;document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);b.setAttribute('aria-pressed',String(b.dataset.tab===name))})}
function render(){
 $('account-name').textContent=user?(user.user_metadata?.name||user.user_metadata?.nickname||user.user_metadata?.user_name||'내 계정'):'';
 $('auth-gate').hidden=!!user;$('service').hidden=!user;$('logout').hidden=!user;$('admin-tab').hidden=!admin;
 $('unread-count').textContent=String(notifications.filter(n=>!n.read_at).length);
 renderInterests();renderFeed();renderNotifications();renderQueue();if(admin)renderAdmin();
}
function renderInterests(){
 $('interest-list').replaceChildren();if(!interests.length){empty($('interest-list'),'관심 작품을 등록하면 그다음 새 게시물부터 알림을 받아요.');return}
 interests.forEach(i=>{const row=el('li',undefined,'list-row');const text=el('div');text.append(el('h4',i.work_name),el('p',i.character_name||'작품 전체'));row.append(text,button('관심 해제',async()=>{result(await db.from('user_interests').delete().eq('id',i.id));await refresh();notice('관심을 해제했어요. 이미 받은 웹 알림은 남아 있어요.')}));$('interest-list').append(row)})
}
function renderFeed(){
 const term=normalizeKeyword($('feed-search').value);const only=$('only-matches').checked;
 const items=posts.filter(p=>p.is_published&&(!term||normalizeKeyword([p.title,p.work_name,...p.character_names].join(' ')).includes(term))&&(!only||interests.some(i=>matchesInterest(i,p))));
 $('goods-feed').replaceChildren();if(!items.length){empty($('goods-feed'),'해당하는 소식이 아직 없어요. 관심 작품을 등록하고 다음 소식을 기다려 주세요.');return}
 items.forEach(p=>{const card=el('article',undefined,'card');if(p.thumbnail_url){const image=el('img');try{image.src=canonicalSource(p.thumbnail_url);image.alt=p.title+' 썸네일';image.className='goods-art';image.loading='lazy';image.referrerPolicy='no-referrer';image.addEventListener('error',()=>image.remove(),{once:true});card.append(image)}catch{}}
 card.append(el('span',SALE_LABELS[p.sale_status],'sale-tag'),el('h3',p.title),el('p',p.work_name+(p.character_names.length?' · '+p.character_names.join(', '):'')),el('p',p.sale_info||'자세한 내용은 원문을 확인해 주세요.'));
 if(p.sale_start)card.append(el('p','시작 '+time(p.sale_start),'note'));if(p.sale_end)card.append(el('p','마감 '+time(p.sale_end),'note'));card.append(link(p.source_url,'원문·판매처 열기 ↗'));$('goods-feed').append(card)})
}
function renderNotifications(){
 $('notifications').replaceChildren();if(!notifications.length){empty($('notifications'),'새로 도착한 알림이 없어요. 관심사에 맞는 새 게시물이 등록되면 여기에 표시돼요.');return}
 notifications.forEach(n=>{const row=el('article',undefined,'list-row'+(!n.read_at?' unread':''));const content=el('div');content.append(el('h4',n.title),el('p',n.body),el('time',time(n.created_at)));const actions=el('div',undefined,'list-actions');actions.append(link(n.source_url,'원문 보기 ↗'));if(!n.read_at)actions.append(button('읽음',async()=>{result(await db.from('notifications').update({read_at:new Date().toISOString()}).eq('id',n.id));await refresh()}));row.append(content,actions);$('notifications').append(row)})
}
function queueRow(q){const row=el('div',undefined,'list-row');const n=notifications.find(n=>n.id===q.notification_id);row.append(el('span',n?.title||'알림 '+q.notification_id.slice(0,8)),el('span',QUEUE_LABELS[q.status]||q.status));return row}
function renderQueue(){const ownIds=new Set(notifications.map(n=>n.id));const own=queue.filter(q=>ownIds.has(q.notification_id));$('my-queue').replaceChildren();if(!own.length)empty($('my-queue'),'대기 중인 항목이 없어요.');else own.forEach(q=>$('my-queue').append(queueRow(q)))}
function renderAdmin(){
 $('admin-posts').replaceChildren();if(!posts.length)empty($('admin-posts'),'아직 등록한 게시물이 없어요.');
 posts.forEach(p=>{const row=el('article',undefined,'list-row');const info=el('div');info.append(el('h4',p.title),el('p',p.work_name+' · '+(p.is_published?'공개':'비공개')));row.append(info,button(p.is_published?'공개 취소':'공개하기',async()=>{result(await db.from('goods_posts').update({is_published:!p.is_published}).eq('id',p.id));await refresh();notice('공개 상태를 바꿨어요. 같은 게시물의 알림은 중복 생성되지 않아요.')}));$('admin-posts').append(row)});
 $('admin-queue').replaceChildren();if(!queue.length)empty($('admin-queue'),'대기열이 비어 있어요.');else queue.forEach(q=>$('admin-queue').append(queueRow(q)));
 $('admin-attempts').replaceChildren();if(!attempts.length)empty($('admin-attempts'),'모의 발송 기록이 없어요.');else attempts.forEach(a=>{const row=el('div',undefined,'list-row');row.append(el('span','모의 발송 완료 · '+a.queue_id.slice(0,8)),el('time',time(a.created_at)));$('admin-attempts').append(row)})
}
async function refresh(){
 if(!user)return;const requestEpoch=++epoch;const currentUser=user.id;loading=true;$('refresh').disabled=true;
 try{
 const role=result(await db.rpc('is_app_admin'));
 const responses=await Promise.all([
 db.from('user_interests').select('id,work_name,character_name').order('created_at'),
 db.from('goods_posts').select('id,title,source_url,work_name,character_names,sale_status,sale_info,sale_start,sale_end,thumbnail_url,is_published,created_at').order('created_at',{ascending:false}).limit(100),
 db.from('notifications').select('id,title,body,source_url,created_at,read_at,goods_post_id').order('created_at',{ascending:false}).limit(50),
 db.from('delivery_queue').select('id,notification_id,status,attempts,created_at,processed_at').order('created_at',{ascending:false}).limit(50),
 role?db.from('delivery_attempts').select('id,queue_id,created_at').order('created_at',{ascending:false}).limit(50):Promise.resolve({data:[]})
 ]);
 const data=responses.map(result);if(epoch!==requestEpoch||user?.id!==currentUser)return;
 admin=role;[interests,posts,notifications,queue,attempts]=data;render();
 }finally{if(requestEpoch===epoch){loading=false;$('refresh').disabled=false}}
}
async function setSession(session){
 epoch++;user=session?.user??null;admin=false;interests=[];posts=[];notifications=[];queue=[];attempts=[];loading=false;$('refresh').disabled=false;render();tab('feed');
 if(user){try{await refresh()}catch(error){notice('로그인은 됐지만 데이터를 불러오지 못했어요. DB 설정을 확인하거나 새로고침해 주세요.',true)}}
}
$('kakao-login').onclick=()=>run($('kakao-login'),async()=>{
 const response=await fetch(config.supabaseUrl+'/auth/v1/settings',{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Auth configuration unavailable');
 const settings=await response.json();if(!settings.external?.kakao){notice('카카오 로그인 연결을 준비 중이에요. 운영자가 카카오 앱과 Supabase 인증 설정을 완료해야 해요.',true);return}
 const {error}=await db.auth.signInWithOAuth({provider:'kakao',options:{redirectTo:location.origin+'/app.html',scopes:'profile_nickname profile_image'}});if(error)throw error;
});
$('logout').onclick=()=>run($('logout'),async()=>{const {error}=await db.auth.signOut();if(error)throw error;await setSession(null);notice('로그아웃했어요.')});
$('refresh').onclick=()=>run($('refresh'),refresh);
$('feed-search').oninput=renderFeed;$('only-matches').onchange=renderFeed;
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
$('interest-form').onsubmit=e=>{e.preventDefault();const b=e.currentTarget.querySelector('button');run(b,async()=>{const work_name=canonicalWork($('interest-work').value),character_name=$('interest-character').value.trim();if(!normalizeKeyword(work_name)||character_name&&!normalizeKeyword(character_name)){notice('작품명과 캐릭터명을 확인해 주세요.',true);return}result(await db.from('user_interests').insert({work_name,character_name}));$('interest-form').reset();await refresh();notice('관심에 추가했어요. 이후 공개되는 새 소식부터 알려 드릴게요.')})};
$('read-all').onclick=()=>run($('read-all'),async()=>{const ids=notifications.filter(n=>!n.read_at).map(n=>n.id);if(ids.length)result(await db.from('notifications').update({read_at:new Date().toISOString()}).in('id',ids));await refresh()});
$('goods-form').onsubmit=e=>{e.preventDefault();const b=e.currentTarget.querySelector('button');run(b,async()=>{
 if(!admin)throw {code:'42501'};
 const source_url=canonicalSource($('goods-url').value);const rawThumbnail=$('goods-thumbnail').value.trim();const thumbnail_url=rawThumbnail?canonicalSource(rawThumbnail):null;
 const sale_start=$('goods-start').value?new Date($('goods-start').value).toISOString():null;const sale_end=$('goods-end').value?new Date($('goods-end').value).toISOString():null;
 if(sale_start&&sale_end&&sale_end<sale_start){notice('마감 시각은 시작 시각보다 뒤여야 해요.',true);return}
 const character_names=[...new Set($('goods-characters').value.split(/[,\n]/).map(c=>c.trim()).filter(Boolean))];
 if(character_names.length>30||character_names.some(c=>c.length>80||!normalizeKeyword(c))){notice('캐릭터는 각각 80자 이내, 최대 30명까지 적어 주세요.',true);return}
 result(await db.from('goods_posts').insert({title:$('goods-title').value.trim(),source_url,work_name:canonicalWork($('goods-work').value),character_names,sale_status:$('goods-status').value,sale_info:$('goods-info').value.trim(),sale_start,sale_end,thumbnail_url,is_published:$('goods-publish').checked}));
 $('goods-form').reset();await refresh();notice('등록했어요. 공개 게시물이라면 매칭된 사용자에게 웹 알림과 모의 발송 대기열이 생성됐어요.');
 })};
$('run-mock').onclick=()=>run($('run-mock'),async()=>{if(!admin)throw {code:'42501'};const {processed}=await dispatchMockBatch(db);await refresh();notice(processed+'건 처리했어요. 실제 카카오톡 메시지는 발송하지 않았어요.')});
WORKS.forEach(([name])=>{const option=el('option');option.value=name;$('work-options').append(option)});
// PKCE code exchange is performed only once; no provider tokens are used for messaging.
async function init(){
 const params=new URLSearchParams(location.search);
 if(params.has('error')){history.replaceState({},'',location.pathname);notice('카카오 로그인이 취소됐거나 연결 설정을 확인해야 해요.',true)}
 if(params.has('code')){const {error}=await db.auth.exchangeCodeForSession(params.get('code'));history.replaceState({},'',location.pathname);if(error)notice('로그인 연결 시간이 만료됐어요. 같은 브라우저에서 다시 로그인해 주세요.',true)}
 const {data,error}=await db.auth.getSession();if(error)notice('로그인 상태를 확인하지 못했어요.',true);await setSession(data?.session);
 db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||session?.user?.id!==user?.id)queueMicrotask(()=>setSession(session))});
}
init().catch(()=>notice('서비스를 시작하지 못했어요. 네트워크와 서비스 설정을 확인해 주세요.',true));
setInterval(()=>{if(user&&!loading&&document.visibilityState==='visible')refresh().catch(()=>{})},30000);
