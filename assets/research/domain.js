export const RESEARCH_CAMPAIGN='taste-survey-2026-11';
export const RESEARCH_STORAGE_KEY='byeoljup-research-receipts-v1';
export function researchReady(c){return !!(c?.enabled&&c.consent_version&&c.purpose&&Number.isInteger(c.retention_days)&&c.retention_days>0&&/^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|https:\/\/[^\s]+)$/.test(c.withdrawal_contact||''))}
export function randomToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('')}
export function recoveryCode(campaign,token){if(!/^[a-z0-9-]{1,60}$/.test(campaign)||!/^[0-9a-f]{64}$/.test(token))throw Error('철회 코드를 확인해 주세요.');return campaign+':'+token}
export function parseRecoveryCode(code){const [campaign,token,...rest]=String(code).trim().split(':');if(rest.length)throw Error('철회 코드를 확인해 주세요.');recoveryCode(campaign,token);return {campaign,token}}
export function surveyWithParticipant(raw,participant){try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password)return null;if(participant&&/^[0-9a-f-]{36}$/.test(participant))u.searchParams.set('participant_id',participant);return u.href}catch{return null}}
// Each CSV cell is quoted, and spreadsheet formula prefixes are neutralized.
export function csvCell(value){let text=String(value??'');if(/^[\s\uFEFF]*[=+@-]/u.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'}
export function csv(headers,rows){return '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'}
export function researchExports(rows){
 const counts=new Map(),people=new Map(),pairs=new Map();
 for(const r of rows){if(!r.character_name)continue;const key=JSON.stringify([r.work_name,r.character_name]);if(!counts.has(key))counts.set(key,new Set());counts.get(key).add(r.participant_id);if(!people.has(r.participant_id))people.set(r.participant_id,new Set());people.get(r.participant_id).add(key)}
 for(const keys of people.values()){const list=[...keys].sort();for(let a=0;a<list.length;a++)for(let b=a+1;b<list.length;b++){const key=JSON.stringify([JSON.parse(list[a]),JSON.parse(list[b])]);pairs.set(key,(pairs.get(key)||0)+1)}}
 return {
 'participant_choices.csv':csv(['participant_id','campaign_id','consent_version','submitted_at','work_name','character_name','selection_type'],rows.map(r=>[r.participant_id,r.campaign_id,r.consent_version,r.submitted_at,r.work_name,r.character_name,r.character_name?'character':'work'])),
 'character_counts.csv':csv(['work_name','character_name','participants'],[...counts].sort().map(([key,ids])=>[...JSON.parse(key),ids.size])),
 'character_pairs.csv':csv(['work_a','character_a','work_b','character_b','participants'],[...pairs].sort().map(([key,n])=>[...JSON.parse(key).flat(),n]))
 }
}
