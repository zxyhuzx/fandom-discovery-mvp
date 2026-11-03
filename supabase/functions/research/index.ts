import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
const url=Deno.env.get('SUPABASE_URL')!;
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(['https://fandom-discovery-mvp.vercel.app','http://127.0.0.1:5174','http://127.0.0.1:5176','http://localhost:5174']);
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://fandom-discovery-mvp.vercel.app','Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'허용되지 않은 요청이에요.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 const campaign=new URL(req.url).searchParams.get('campaign')||'';
 if(req.method==='GET'){
  if(!/^[a-z0-9-]{1,60}$/.test(campaign))return reply({error:'설문 회차를 확인해 주세요.'},400);
  const {data,error}=await db.from('research_campaigns').select('id,enabled,consent_version,purpose,retention_days,withdrawal_contact').eq('id',campaign).maybeSingle();
  return error?reply({error:'연구 안내를 불러오지 못했어요.'},503):reply({campaign:data});
 }
 if(req.method!=='POST')return reply({error:'지원하지 않는 요청이에요.'},405);
 try{
  if(Number(req.headers.get('content-length')||0)>32768)return reply({error:'요청이 너무 커요.'},413);
  // Stream bound also handles chunked requests, before JSON parsing.
  const reader=req.body?.getReader();if(!reader)return reply({error:'내용을 확인해 주세요.'},400);
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();return reply({error:'요청이 너무 커요.'},413)}chunks.push(value)}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
  const body=JSON.parse(new TextDecoder().decode(bytes));
  if(!/^[a-z0-9-]{1,60}$/.test(body.campaign||'')||!/^[0-9a-f]{64}$/.test(body.token||'')||!['submit','request','withdraw'].includes(body.action))return reply({error:'제출 정보가 올바르지 않아요.'},400);
  if(body.action!=='withdraw'&&body.consent!==true)return reply({error:'선택적 동의를 확인해 주세요.'},400);
  // Salted, short-lived network hash used only for abuse limits; never store the raw IP.
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const bucket=await hash(secret+'|'+ip);
  const limited=await db.rpc('research_rate_limit',{bucket_key:bucket});
  if(limited.error)return reply({error:'지금은 제출할 수 없어요. 잠시 후 다시 시도해 주세요.'},503);
  if(!limited.data)return reply({error:'요청이 많아요. 잠시 후 다시 시도해 주세요.'},429);
  const {data,error}=await db.rpc('research_write',{p_campaign:body.campaign,p_token_hash:await hash(body.token),p_version:body.consent_version||'',p_action:body.action,p_items:body.items||null,p_request:body.request||null});
  if(error){
   const messages:Record<string,string>={COLLECTION_DISABLED:'현재 연구 데이터 수집이 중지되어 있어요.',CONSENT_CHANGED:'연구 안내가 변경되었어요. 새로고침 후 다시 확인해 주세요.',INVALID_RELATION:'선택한 작품과 캐릭터의 관계를 확인해 주세요.',INVALID_ITEMS:'작품·캐릭터를 1개 이상, 100개 이하로 선택해 주세요.',INVALID_REQUEST:'추가할 작품·캐릭터 이름을 확인해 주세요.',REQUEST_LIMIT:'추가 요청은 회차당 10개까지 가능해요.',RESPONSE_EXPIRED:'기존 참여 데이터의 보유 기간이 끝났어요.'};
   return reply({error:messages[error.message]||'저장하지 못했어요. 잠시 후 다시 시도해 주세요.'},400);
  }
  return reply(data);
 }catch{return reply({error:'요청을 처리하지 못했어요. 다시 시도해 주세요.'},400)}
});
