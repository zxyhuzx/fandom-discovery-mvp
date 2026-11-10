import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {searchQuery,searchUrl,postPreviews} from '../../../lib/x/search.mjs';
const origins=new Set(['https://fandom-discovery-mvp.vercel.app','http://127.0.0.1:5174','http://localhost:5174']);
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://fandom-discovery-mvp.vercel.app','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'허용되지 않은 요청이에요.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'지원하지 않는 요청이에요.'},405);
 try{
  const auth=req.headers.get('authorization')||'';
  if(!auth.startsWith('Bearer '))return reply({error:'로그인이 필요해요.'},401);
  const url=Deno.env.get('SUPABASE_URL')!;
  const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data:{user},error}=await caller.auth.getUser(auth.slice(7));
  if(error||!user)return reply({error:'다시 로그인해 주세요.'},401);
  const role=await caller.rpc('is_app_admin');
  if(role.error||role.data!==true)return reply({error:'운영자만 X 연결을 테스트할 수 있어요.'},403);
  const token=Deno.env.get('X_BEARER_TOKEN');
  if(Deno.env.get('X_API_ENABLED')!=='true'||!token)return reply({error:'X API 연결 준비 중이에요. 아직 유료 검색을 실행하지 않았어요.'},503);
  // Bound the body before parsing, including chunked bodies.
  const reader=req.body?.getReader();if(!reader)return reply({error:'검색어를 입력해 주세요.'},400);
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();return reply({error:'검색어가 너무 길어요.'},413)}chunks.push(value)}
  const raw=new Uint8Array(size);let offset=0;for(const c of chunks){raw.set(c,offset);offset+=c.length}
  let query;try{query=searchQuery(JSON.parse(new TextDecoder().decode(raw)).term)}catch{return reply({error:'작품명이나 캐릭터명을 2~60자로 입력해 주세요. 검색 연산자는 사용할 수 없어요.'},400)}
  const monthly=Number(Deno.env.get('X_MONTHLY_RESOURCE_LIMIT'));
  const daily=Number(Deno.env.get('X_DAILY_RESOURCE_LIMIT')||'20');
  if(!Number.isInteger(monthly)||monthly<10||monthly>4000||!Number.isInteger(daily)||daily<10||daily>100)return reply({error:'사용 예산 설정을 먼저 확인해 주세요.'},503);
  const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const budget=await db.rpc('reserve_x_search',{p_monthly_limit:monthly,p_daily_limit:daily});
  if(budget.error)return reply({error:'검색 한도에 도달했거나 예산을 확인할 수 없어요. 추가 호출은 하지 않았어요.'},429);
  // No retries or pagination, user expansions, likes/followers, DM, or background jobs.
  const response=await fetch(searchUrl(query),{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
  if(!response.ok)return reply({error:response.status===402?'X 크레딧이 부족해요. 결제 상태를 확인해 주세요.':response.status===429?'X 요청 한도에 도달했어요. 잠시 후 확인해 주세요.':'X 연결을 확인하지 못했어요. 토큰과 앱 권한을 확인해 주세요.',upstream_status:response.status},502);
  const payload=await response.json();
  return reply({posts:postPreviews(payload),query,budget:budget.data,warning:'최근 7일의 공개 게시물 검색 결과예요. 판매 여부는 원문에서 확인해 주세요. 자동 공개·구독 알림은 하지 않아요.'});
 }catch{return reply({error:'X 검색을 완료하지 못했어요. 자동 재시도하지 않았어요.'},502)}
});
