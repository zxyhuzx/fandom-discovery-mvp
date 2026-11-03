import {config} from '../config.js';
import {RESEARCH_CAMPAIGN,RESEARCH_STORAGE_KEY,researchReady,randomToken,recoveryCode,parseRecoveryCode,surveyWithParticipant} from './domain.js';
const endpoint=config.supabaseUrl+'/functions/v1/research';
let campaignPromise;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n};
export function researchReceipts(){try{return JSON.parse(localStorage.getItem(RESEARCH_STORAGE_KEY)||'{}')}catch{return {}}}
function saveReceipt(campaign,receipt){const all=researchReceipts();all[campaign]=receipt;localStorage.setItem(RESEARCH_STORAGE_KEY,JSON.stringify(all));window.dispatchEvent(new Event('research-change'))}
async function tokenReceipt(){const make=()=>{const current=researchReceipts()[RESEARCH_CAMPAIGN];if(/^[0-9a-f]{64}$/.test(current?.token))return current;const receipt={token:randomToken()};saveReceipt(RESEARCH_CAMPAIGN,receipt);return receipt};return navigator.locks?navigator.locks.request('byeoljup-research-receipt',make):make()}
async function request(body){const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:config.publishableKey},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||'요청을 처리하지 못했어요.');return data}
export function currentSurveyUrl(){return surveyWithParticipant(config.surveyUrl,researchReceipts()[RESEARCH_CAMPAIGN]?.participant_id)}
async function campaign(){if(!campaignPromise)campaignPromise=fetch(endpoint+'?campaign='+RESEARCH_CAMPAIGN,{headers:{apikey:config.publishableKey}}).then(async r=>{if(!r.ok)throw Error();return (await r.json()).campaign}).catch(()=>null);return campaignPromise}
function policyLines(c){return [
 ['연구 목적',c.purpose+' 추가 요청은 작품·캐릭터 목록 보완에도 사용합니다.'],
 ['수집 항목','무작위 참여 ID, 설문 회차, 완료 시점의 작품명·캐릭터명, 동의 버전·시각·제출 시각, 직접 제출한 추가 요청입니다. 이름·연락처·SNS·로그인 계정 ID는 수집하지 않아요.'],
 ['보유 기간',`최초 선택 데이터 또는 추가 요청 제출 후 ${c.retention_days}일이며, 만료 후 1시간 이내 자동 삭제합니다.`],
 ['철회 방법','아래 철회용 비밀 코드로 직접 삭제하거나 참여 ID와 함께 연락해 주세요. 선택 데이터와 추가 요청을 함께 삭제합니다. 이미 내려받은 분석 파일은 운영자가 삭제·갱신합니다.'],
 ['선택적 참여','동의하지 않아도 별줍을 이용할 수 있어요. 중복 제출·철회를 위해 브라우저에 비밀 코드를 보관하고, 남용 방지를 위한 임시 네트워크 해시는 최대 1시간 보관합니다.']
 ]}
export function mountResearch(root,{items=null,requestKind=null,workName=()=>'',manage=false}={}){
 if(!root)return;
 root.classList.add('research-panel');const title=el('h2',manage?'연구 참여 관리':requestKind?'목록 추가 요청':'취향 연구에 참여하시겠어요?');root.append(title);
 const info=el('p','연구 안내를 불러오고 있어요.','note');root.append(info);
 const status=el('p','','note');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 let consent,submit,c=null,busy=false;
 const details=el('div');root.append(details);
 if(!manage){
  const label=el('label',undefined,'research-consent');consent=el('input');consent.type='checkbox';consent.disabled=true;label.append(consent,document.createTextNode('위 내용을 확인했으며 연구 데이터 수집·이용에 선택적으로 동의합니다.'));root.append(label);
  let workInput,characterInput;
  if(requestKind){
   const workLabel=el('label','작품·그룹 이름');workInput=el('input');workInput.maxLength=120;workInput.value=workName();workInput.placeholder='추가하고 싶은 작품·그룹 이름';workLabel.append(workInput);root.append(workLabel);
   if(requestKind==='character'){root.closest('details')?.addEventListener('toggle',()=>{if(!workInput.value)workInput.value=workName()});const characterLabel=el('label','캐릭터·라이버 이름');characterInput=el('input');characterInput.maxLength=120;characterInput.placeholder='추가하고 싶은 캐릭터·라이버 이름';characterLabel.append(characterInput);root.append(characterLabel)}
   root.append(el('p','추가 요청은 선택한 관심사에 자동으로 포함되지 않아요. 이름·연락처 등 개인정보는 입력하지 마세요.','note'));
  }
  submit=el('button',requestKind?'추가 요청 제출하기':'선택 데이터 제출하기','secondary');submit.type='button';submit.disabled=true;root.append(submit);
  submit.onclick=async()=>{
   if(!consent.checked||!researchReady(c))return;
   busy=true;submit.disabled=true;status.textContent='제출하고 있어요…';
   try{
    const receipt=await tokenReceipt();
    const payload={campaign:RESEARCH_CAMPAIGN,token:receipt.token,consent:true,consent_version:c.consent_version,action:requestKind?'request':'submit'};
    if(requestKind)payload.request={kind:requestKind,work_name:workInput.value.trim(),character_name:characterInput?.value.trim()||''};else payload.items=items();
    const data=await request(payload);saveReceipt(RESEARCH_CAMPAIGN,{...receipt,...data});
    status.textContent=requestKind?'추가 요청을 저장했어요.':'선택 데이터를 저장했어요. 이후 구독을 변경해도 이번 연구 응답은 바뀌지 않아요. 아래에서 철회용 비밀 코드를 복사해 보관해 주세요.';
    consent.checked=false;
   }catch(e){status.textContent=e.message==='The quota has been exceeded.'?'철회 코드를 보관할 수 없어 제출을 중지했어요. 브라우저 저장 공간을 확인해 주세요.':e.message||'제출하지 못했어요. 다시 시도해 주세요.'}
   finally{busy=false;sync()}
  };
  consent.onchange=()=>sync();
 }
 const recovery=el('details');recovery.append(el('summary','동의 철회 · 연구 데이터 삭제'));const recoveryBody=el('div');recovery.append(recoveryBody);root.append(recovery,status);
 recoveryBody.append(el('p','철회용 비밀 코드를 보관하시면 다른 기기에서도 삭제할 수 있어요. 코드를 다른 분에게 공유하지 마세요. 브라우저 기록이 없어지기 전에 복사해 두세요.','note'));
 const codeLabel=el('label','철회용 비밀 코드');const code=el('input');code.type='text';code.autocomplete='off';code.spellcheck=false;code.placeholder='회차:비밀 코드';codeLabel.append(code);recoveryBody.append(codeLabel);
 const id=el('p','','note');recoveryBody.append(id);
 const remove=el('button','동의 철회 및 연구 데이터 삭제','secondary');remove.type='button';recoveryBody.append(remove);
 remove.onclick=async()=>{remove.disabled=true;status.textContent='철회를 처리하고 있어요…';try{const parsed=parseRecoveryCode(code.value);await request({...parsed,action:'withdraw'});const all=researchReceipts();if(all[parsed.campaign]?.token===parsed.token){delete all[parsed.campaign];localStorage.setItem(RESEARCH_STORAGE_KEY,JSON.stringify(all))}code.value='';if(consent)consent.checked=false;window.dispatchEvent(new Event('research-change'));status.textContent='동의를 철회했어요. 해당 코드의 선택 데이터와 추가 요청은 삭제되었으며 이후 CSV에 포함되지 않아요. 브라우저의 체험 관심사와 계정 구독은 유지됩니다.'}catch(e){status.textContent=e.message||'철회하지 못했어요. 다시 시도해 주세요.'}finally{remove.disabled=false}};
 function sync(){const r=researchReceipts()[RESEARCH_CAMPAIGN];if(!code.matches(':focus'))code.value=r?.token?recoveryCode(RESEARCH_CAMPAIGN,r.token):'';id.textContent=r?.participant_id?'참여 ID: '+r.participant_id+' · 설문 응답에 이 ID를 입력하시면 선택 데이터와 연결할 수 있어요.':'';if(submit&&!requestKind)submit.textContent=r?.submitted_at?'이번 회차 제출 완료':'선택 데이터 제출하기';if(submit)submit.disabled=busy||!researchReady(c)||!consent.checked||(!requestKind&&!!r?.submitted_at);if(!manage&&!requestKind&&r?.submitted_at)submit.textContent='이번 회차 제출 완료'}
 window.addEventListener('research-change',sync);sync();
 campaign().then(value=>{c=value;details.replaceChildren();if(researchReady(c)){
  info.textContent=manage?'연구 데이터의 보유 기간과 철회 방법을 확인해 주세요.':'연구 참여는 선택 사항이며, 아래 제출 버튼을 눌러야 서버에 저장됩니다.';for(const [label,text] of policyLines(c)){const line=el('p',undefined,'note');line.append(el('strong',label+' · '),document.createTextNode(text));details.append(line)}const contact=el('a','철회 문의: '+c.withdrawal_contact.replace(/^mailto:/,''));contact.href=c.withdrawal_contact;details.append(contact,el('p','코드를 분실하셨다면 참여 ID와 함께 문의해 주세요. 참여 ID만으로 본인임을 확인할 수는 없으며 추가 확인이 필요해요. 이름이나 계정만으로는 응답을 찾을 수 없어요.','note'));if(consent)consent.disabled=false;
 }else info.textContent='현재 연구 데이터 수집이 중지되어 있어요. 보유 기간·철회 연락처 설정 또는 연결 상태를 확인해야 합니다. 동의 없이 기존 체험을 계속하실 수 있어요. 기존 데이터의 철회는 아래에서 진행하실 수 있어요.';sync()});
 if(manage)recovery.open=true;
}
