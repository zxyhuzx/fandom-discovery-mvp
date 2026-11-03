import {createClient} from '@supabase/supabase-js';
import {config} from './config.js';
import {shouldShowTutorial,hasSeenTutorial,rememberTutorial} from './first-visit.js';
import {WORKS,CHARACTERS,workGenre,normalizeKeyword,characterAliases} from './domain.js';
import {compareWelcomeWorks} from './curated-catalog.js';
import {WELCOME_DRAFT_KEY,WELCOME_CONNECT_KEY,WELCOME_BROWSE_KEY,choiceItems,parseWelcomeDraft} from './welcome-state.js';
const $=id=>document.getElementById(id);
let selected=[],characters={},category='애니·만화',step='hello';
try{const previous=parseWelcomeDraft(localStorage.getItem(WELCOME_DRAFT_KEY));if(previous){selected=[...new Set(previous.items.map(i=>i.work_name))];for(const i of previous.items)if(i.character_name)(characters[i.work_name]??=[]).push(i.character_name)}}catch{}
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n}
function message(text=''){$('welcome-status').textContent=text}
function show(name){step=name;message();for(const id of ['hello','works','characters','connect'])$('welcome-'+id).hidden=id!==name;if(name==='works')renderWorks();if(name==='characters')renderCharacters();if(name==='connect')renderSummary();$('welcome-'+name).querySelector('h1').focus()}
function persist(){try{if(!selected.length){localStorage.removeItem(WELCOME_DRAFT_KEY);return true}localStorage.setItem(WELCOME_DRAFT_KEY,JSON.stringify({version:1,items:choiceItems(selected,characters)}));return true}catch{message('선택 내용을 잠시 저장할 수 없어요. 브라우저 저장 공간을 허용한 뒤 다시 시도해 주세요.');return false}}
function toggleButton(text,active,action,className='welcome-option'){const b=node('button',text,className);b.type='button';b.setAttribute('aria-pressed',String(active));b.onclick=action;return b}
function renderWorks(){
 const query=normalizeKeyword($('welcome-work-search').value),target=$('welcome-work-choices');target.replaceChildren();
 const found=WORKS.filter(row=>workGenre(row[0])===category&&(!query||row.some(alias=>normalizeKeyword(alias).includes(query)))).sort((a,b)=>compareWelcomeWorks(category,a,b));
 for(const [work] of found)target.append(toggleButton(work,selected.includes(work),()=>{if(selected.includes(work)){selected=selected.filter(w=>w!==work);delete characters[work]}else{if(choiceItems(selected,characters).length>=100){message('관심사는 최대 100개까지 선택할 수 있어요.');return}selected.push(work)}message();persist();renderWorks()}));
 if(!found.length)target.append(node('p','검색 결과가 없어요. 검색어나 분류를 바꿔보세요.','empty-state'));
 $('welcome-selected-count').textContent=selected.length+'개 작품·그룹 선택';$('welcome-next-characters').disabled=!selected.length;
 const chips=$('welcome-selected-works');chips.replaceChildren();selected.forEach(work=>{const b=toggleButton(work+' ×',true,()=>{selected=selected.filter(w=>w!==work);delete characters[work];persist();renderWorks()},'welcome-chip');b.setAttribute('aria-label',work+' 선택 취소');chips.append(b)});
 const filter=$('welcome-categories');filter.replaceChildren();['애니·만화','게임','웹소설·웹툰','버튜버'].forEach(name=>filter.append(toggleButton(name,category===name,()=>{category=name;$('welcome-work-search').value='';renderWorks()},'welcome-chip')));
 $('welcome-work-search').placeholder={'애니·만화':'예: 닌타마, 나히아, 데스노트','게임':'예: 블아, 띵조, 림버스','웹소설·웹툰':'예: 어바등, 마차살, 괴담출근','버튜버':'예: 홀로, 니지, 스텔'}[category];
}
function renderCharacters(){
 const query=normalizeKeyword($('welcome-character-search').value),target=$('welcome-character-choices');target.replaceChildren();
 for(const work of selected){const group=node('div',undefined,'welcome-character-group');group.append(node('h2',work));const options=node('div',undefined,'welcome-chips');
 options.append(toggleButton('작품 전체',!(characters[work]?.length),()=>{characters[work]=[];persist();renderCharacters()},'welcome-chip'));
 const found=(CHARACTERS[work]||[]).filter(name=>!query||characterAliases(work,name).some(alias=>normalizeKeyword(alias).includes(query)));
 found.forEach(name=>options.append(toggleButton(name,(characters[work]||[]).includes(name),()=>{const prior=characters[work]||[],next=prior.includes(name)?prior.filter(c=>c!==name):[...prior,name];if(choiceItems(selected,{...characters,[work]:next}).length>100){message('관심사는 최대 100개까지 선택할 수 있어요.');return}characters[work]=next;message();persist();renderCharacters()},'welcome-chip')));
 if(!found.length)options.append(node('p',query?'일치하는 캐릭터가 없어요.':'이 작품의 캐릭터 목록은 준비 중이에요. 작품 전체로 선택할 수 있어요.','note'));
 group.append(options);target.append(group);}
}
function renderSummary(){const target=$('welcome-summary');target.replaceChildren();choiceItems(selected,characters).forEach(i=>target.append(node('span',i.work_name+(i.character_name?' · '+i.character_name:' · 전체'))))}
$('welcome-start').onclick=()=>show('works');$('welcome-back-hello').onclick=()=>show('hello');
$('welcome-next-characters').onclick=()=>{if(selected.length)show('characters')};$('welcome-back-works').onclick=()=>show('works');
$('welcome-next-connect').onclick=()=>{if(selected.length){persist();show('connect')}};$('welcome-back-characters').onclick=()=>show('characters');
$('welcome-work-search').oninput=renderWorks;$('welcome-character-search').oninput=renderCharacters;
document.querySelectorAll('.welcome-skip').forEach(link=>link.onclick=()=>{rememberTutorial();if(selected.length)persist();try{sessionStorage.removeItem(WELCOME_CONNECT_KEY);sessionStorage.setItem(WELCOME_BROWSE_KEY,'1')}catch{}});
// Temporary entry: browsing only, without OAuth or account-interest writes.
$('welcome-kakao').onclick=()=>{if(selected.length&&!persist())return;try{
 sessionStorage.removeItem(WELCOME_CONNECT_KEY);sessionStorage.setItem(WELCOME_BROWSE_KEY,'1');
 }catch{}rememberTutorial();location.assign('/app.html?entry=welcome#home')};
const params=new URLSearchParams(location.search);
async function initWelcome(){
 const forced=params.get('tutorial')==='1',recovery=params.get('step')==='connect'&&selected.length;
 let session=null;try{const db=createClient(config.supabaseUrl,config.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:false,persistSession:true}});const r=await db.auth.getSession();session=r.data?.session}catch{}
 let seen=hasSeenTutorial();try{seen=seen||sessionStorage.getItem(WELCOME_BROWSE_KEY)==='1'||!!parseWelcomeDraft(localStorage.getItem(WELCOME_DRAFT_KEY))}catch{}
 if(!shouldShowTutorial({seen,user:!!session,forced,recovery:!!recovery})){
  try{sessionStorage.setItem(WELCOME_BROWSE_KEY,'1')}catch{}rememberTutorial();location.replace('/app.html#home');return;
 }
 rememberTutorial();$('welcome-shell').hidden=false;$('welcome-loading').hidden=true;
 if(recovery){show('connect');if(params.get('error'))message(params.get('error')==='save'?'선택한 관심사를 계정에 저장하지 못했어요. 선택은 보관되어 있으니 다시 연결해 주세요.':'카카오 연결이 완료되지 않았어요. 다시 연결하거나 다른 별들을 먼저 둘러보세요.')}
}
initWelcome();
