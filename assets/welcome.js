import {catalogSearch,resolveCatalog} from './catalog-client.js';
import {createClient} from '@supabase/supabase-js';
import {config} from './config.js';
import {shouldShowTutorial,hasSeenTutorial,rememberTutorial} from './first-visit.js';
import {canonicalWork,canonicalCharacter,workGenre} from './domain.js';
import {WELCOME_DRAFT_KEY,WELCOME_CONNECT_KEY,WELCOME_BROWSE_KEY,choiceItems,parseWelcomeDraft} from './welcome-state.js';
const $=id=>document.getElementById(id);
let selected=[],characters=Object.create(null),category='애니·만화',step='hello';
try{const previous=parseWelcomeDraft(localStorage.getItem(WELCOME_DRAFT_KEY),{allowUnloaded:true});if(previous){selected=[...new Set(previous.items.map(i=>i.work_name))];for(const i of previous.items)if(i.character_name)(characters[i.work_name]??=[]).push(i.character_name)}}catch{}
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n}
function message(text=''){$('welcome-status').textContent=text}
function renderStep(name){step=name;message();for(const id of ['hello','works','characters','connect'])$('welcome-'+id).hidden=id!==name;if(name==='works')renderWorks();if(name==='characters')renderCharacters();if(name==='connect')renderSummary();$('welcome-'+name).querySelector('h1').focus()}
// Keep tutorial steps in browser history so device Back and swipe gestures work naturally.
const tutorialSteps=['hello','works','characters','connect'];
const tutorialRun=history.state?.byeoljupTutorialRun||crypto.randomUUID();
const finishedKey='byeoljup-tutorial-finished:'+tutorialRun;
const homeUrl='/app.html?entry=welcome#home';
let leavingTutorial=false;
function isFinished(){try{return leavingTutorial||sessionStorage.getItem(finishedKey)==='1'}catch{return leavingTutorial}}
function redirectFinished(){if(!isFinished())return false;$('welcome-shell').hidden=true;location.replace(homeUrl);return true}
// BFCache can restore this document without rerunning initialization.
window.addEventListener('pageshow',redirectFinished);
function availableStep(name){return tutorialSteps.includes(name)?(['characters','connect'].includes(name)&&!selected.length?'works':name):'hello'}
function show(name,replace=false){
 name=availableStep(name);
 const url=new URL(location.href);if(name==='hello')url.searchParams.delete('step');else url.searchParams.set('step',name);url.searchParams.delete('error');
 const state={...history.state,byeoljupTutorial:name,byeoljupTutorialRun:tutorialRun};
 if(replace||history.state?.byeoljupTutorial===name)history.replaceState(state,'',url);else history.pushState(state,'',url);
 renderStep(name);
}
function previousStep(name){if(history.state?.byeoljupTutorial===step&&step!=='hello')history.back();else show(name,true)}
window.addEventListener('popstate',()=>{
 if(redirectFinished())return;
 const requested=history.state?.byeoljupTutorial||new URL(location.href).searchParams.get('step')||'hello';
 const next=availableStep(requested);if(next!==requested)show(next,true);else renderStep(next);
});
function persist(){try{if(!selected.length){localStorage.removeItem(WELCOME_DRAFT_KEY);return true}localStorage.setItem(WELCOME_DRAFT_KEY,JSON.stringify({version:1,items:choiceItems(selected,characters)}));return true}catch{message('선택 내용을 잠시 저장할 수 없어요. 브라우저 저장 공간을 허용한 뒤 다시 시도해 주세요.');return false}}
function toggleButton(text,active,action,className='welcome-option'){const b=node('button',text,className);b.type='button';b.setAttribute('aria-pressed',String(active));b.onclick=action;return b}
let workRows=[],workKey='',workMore=false,workEpoch=0,workLoaded=false;
let characterRows=[],characterKey='',characterMore=false,characterEpoch=0,characterLoaded=false;
const categories=['애니·만화','게임','웹소설·웹툰','버튜버','아이돌'];
function drawWorks(){
 const target=$('welcome-work-choices');target.replaceChildren();
 for(const {work:{name:work}} of workRows)target.append(toggleButton(work,selected.includes(work),()=>{if(selected.includes(work)){selected=selected.filter(w=>w!==work);delete characters[work]}else{if(choiceItems(selected,characters).length>=100){message('관심사는 최대 100개까지 선택할 수 있어요.');return}selected.push(work)}message();persist();drawWorks()}));
 if(!workRows.length)target.append(node('p','검색 결과가 없어요. 검색어나 분류를 바꿔보세요.','empty-state'));
 if(workMore){const more=node('button','더 보기','secondary');more.type='button';more.id='welcome-works-more';more.onclick=()=>renderWorks(true);target.append(more)}
 drawWorkSelection();
}
function drawWorkSelection(){
 $('welcome-selected-count').textContent=selected.length+'개 작품·그룹 선택';$('welcome-next-characters').disabled=!selected.length;
 const chips=$('welcome-selected-works');chips.replaceChildren();selected.forEach(work=>{const b=toggleButton(work+' ×',true,()=>{selected=selected.filter(w=>w!==work);delete characters[work];persist();drawWorks()},'welcome-chip');b.setAttribute('aria-label',work+' 선택 취소');chips.append(b)});
 const filter=$('welcome-categories');filter.replaceChildren();categories.forEach(name=>filter.append(toggleButton(name,category===name,()=>{category=name;$('welcome-work-search').value='';renderWorks()},'welcome-chip')));
 $('welcome-work-search').placeholder={'애니·만화':'예: 닌타마, 나히아, 데스노트','게임':'예: 블아, 띵조, 림버스','웹소설·웹툰':'예: 어바등, 마차살, 괴담출근','버튜버':'예: 홀로, 니지, 스텔','아이돌':'예: 방탄소년단, 세븐틴, 스키즈'}[category];
}
async function renderWorks(more=false){
 const query=$('welcome-work-search').value.trim(),key=category+'\0'+query,epoch=++workEpoch,target=$('welcome-work-choices');drawWorkSelection();
 if(key===workKey&&workLoaded&&!more){drawWorks();return}
 if(key!==workKey){workRows=[];workMore=false;workKey=key;workLoaded=false}
 target.setAttribute('aria-busy','true');if(!more)target.replaceChildren(node('p','작품·그룹 목록을 불러오고 있어요.','note'));
 try{const page=await catalogSearch({query,kind:'work',genre:category,limit:20,offset:more?workRows.length:0});if(epoch!==workEpoch)return;workRows=more?[...workRows,...page.items]:page.items;workKey=key;workLoaded=true;workMore=page.has_more;drawWorks()}
 catch{if(epoch!==workEpoch)return;target.replaceChildren(node('p','목록을 불러오지 못했어요. 선택한 관심사는 유지돼요.','note'));const retry=node('button','다시 불러오기','secondary');retry.type='button';retry.onclick=()=>renderWorks(more);target.append(retry)}
 finally{if(epoch===workEpoch)target.setAttribute('aria-busy','false')}
}
function drawCharacters(){
 const query=$('welcome-character-search').value.trim(),target=$('welcome-character-choices');target.replaceChildren();
 for(const work of selected){const group=node('div',undefined,'welcome-character-group');group.append(node('h2',work));const options=node('div',undefined,'welcome-chips');
 options.append(toggleButton(['버튜버','아이돌'].includes(workGenre(work))?'그룹 전체':'작품 전체',!(characters[work]?.length),()=>{characters[work]=[];persist();drawCharacters()},'welcome-chip'));
 const found=[...new Set([...characterRows.filter(r=>r.work.name===work).map(r=>r.character.name),...(!query?(characters[work]||[]):[])])];
 found.forEach(name=>options.append(toggleButton(name,(characters[work]||[]).includes(name),()=>{const prior=characters[work]||[],next=prior.includes(name)?prior.filter(c=>c!==name):[...prior,name];if(choiceItems(selected,{...characters,[work]:next}).length>100){message('관심사는 최대 100개까지 선택할 수 있어요.');return}characters[work]=next;message();persist();drawCharacters()},'welcome-chip')));
 if(!found.length)options.append(node('p',characterMore?'아래 더 보기를 누르거나 이름으로 검색해 주세요.':query?'일치하는 캐릭터·인물이 없어요.':'등록된 인물 목록이 없어요. 작품 전체로 선택할 수 있어요.','note'));
 group.append(options);target.append(group)}
 if(characterMore){const more=node('button','캐릭터·인물 더 보기','secondary');more.id='welcome-characters-more';more.type='button';more.onclick=()=>renderCharacters(true);target.append(more)}
}
async function renderCharacters(more=false){
 const query=$('welcome-character-search').value.trim(),key=JSON.stringify([selected,query]),epoch=++characterEpoch,target=$('welcome-character-choices');
 if(key===characterKey&&characterLoaded&&!more){drawCharacters();return}
 if(key!==characterKey){characterRows=[];characterMore=false;characterKey=key;characterLoaded=false}
 target.setAttribute('aria-busy','true');if(!more)target.replaceChildren(node('p','캐릭터·인물 목록을 불러오고 있어요.','note'));
 try{const page=await catalogSearch({query,kind:'character',works:selected,limit:40,offset:more?characterRows.length:0});if(epoch!==characterEpoch)return;characterRows=more?[...characterRows,...page.items]:page.items;characterKey=key;characterLoaded=true;characterMore=page.has_more;drawCharacters()}
 catch{if(epoch!==characterEpoch)return;target.replaceChildren(node('p','목록을 불러오지 못했어요. 선택 내용은 유지돼요.','note'));const retry=node('button','다시 불러오기','secondary');retry.type='button';retry.onclick=()=>renderCharacters(more);target.append(retry)}
 finally{if(epoch===characterEpoch)target.setAttribute('aria-busy','false')}
}
function renderSummary(){const target=$('welcome-summary');target.replaceChildren();choiceItems(selected,characters).forEach(i=>target.append(node('span',i.work_name+(i.character_name?' · '+i.character_name:' · 전체'))))}
$('welcome-start').onclick=()=>show('works');$('welcome-back-hello').onclick=()=>previousStep('hello');
$('welcome-next-characters').onclick=()=>{if(selected.length)show('characters')};$('welcome-back-works').onclick=()=>previousStep('works');
$('welcome-next-connect').onclick=()=>{if(selected.length){persist();show('connect')}};$('welcome-back-characters').onclick=()=>previousStep('characters');
let workTimer,characterTimer;
$('welcome-work-search').oninput=()=>{workEpoch++;clearTimeout(workTimer);workTimer=setTimeout(()=>renderWorks(),180)};
$('welcome-character-search').oninput=()=>{characterEpoch++;clearTimeout(characterTimer);characterTimer=setTimeout(()=>renderCharacters(),180)};
function finishTutorial(){
 if(selected.length&&!persist())return;
 rememberTutorial();leavingTutorial=true;$('welcome-shell').hidden=true;
 try{sessionStorage.setItem(finishedKey,'1');sessionStorage.removeItem(WELCOME_CONNECT_KEY);sessionStorage.setItem(WELCOME_BROWSE_KEY,'1')}catch{}
 // Replace the first tutorial entry, removing all tutorial steps from the Back path.
 const depth=tutorialSteps.indexOf(step);
 if(depth>0)history.go(-depth);else location.replace(homeUrl);
}
document.querySelectorAll('.welcome-skip').forEach(link=>link.onclick=event=>{
 if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();finishTutorial();
});
// Temporary entry: browsing only, without OAuth or account-interest writes.
$('welcome-kakao').onclick=finishTutorial;
const params=new URLSearchParams(location.search);
async function initWelcome(){
 if(redirectFinished())return;
 const forced=params.get('tutorial')==='1',savedStep=history.state?.byeoljupTutorial;
 const recovery=tutorialSteps.includes(savedStep)||tutorialSteps.includes(params.get('step'));
 const initialStep=availableStep(savedStep||params.get('step')||'hello');
 let session=null;try{const db=createClient(config.supabaseUrl,config.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:false,persistSession:true}});const r=await db.auth.getSession();session=r.data?.session}catch{}
 let seen=hasSeenTutorial();try{seen=seen||sessionStorage.getItem(WELCOME_BROWSE_KEY)==='1'||!!parseWelcomeDraft(localStorage.getItem(WELCOME_DRAFT_KEY),{allowUnloaded:true})}catch{}
 if(!shouldShowTutorial({seen,user:!!session,forced,recovery:!!recovery})){
  try{sessionStorage.setItem(WELCOME_BROWSE_KEY,'1')}catch{}rememberTutorial();location.replace('/app.html#home');return;
 }
 if(selected.length){try{await resolveCatalog(choiceItems(selected,characters));const normalized=choiceItems(selected,characters).map(i=>({work_name:canonicalWork(i.work_name),character_name:canonicalCharacter(i.work_name,i.character_name)}));selected=[...new Set(normalized.map(i=>i.work_name))];characters=Object.create(null);for(const i of normalized)if(i.character_name)(characters[i.work_name]??=[]).push(i.character_name)}catch{}}
 rememberTutorial();$('welcome-shell').hidden=false;$('welcome-loading').hidden=true;
 // A direct later-step URL gets real preceding steps; reloads reuse existing entries.
 if(!tutorialSteps.includes(savedStep)){show('hello',true);for(const name of tutorialSteps.slice(1,tutorialSteps.indexOf(initialStep)+1))show(name)}else show(initialStep,true);
 if(recovery&&initialStep==='connect'){if(params.get('error'))message(params.get('error')==='save'?'선택한 관심사를 계정에 저장하지 못했어요. 선택은 보관되어 있으니 다시 연결해 주세요.':'카카오 연결이 완료되지 않았어요. 다시 연결하거나 다른 별들을 먼저 둘러보세요.')}
}
initWelcome();
