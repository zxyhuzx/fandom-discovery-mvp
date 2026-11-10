#!/usr/bin/env python3
"""Verify paid-search authorization without executing an X API request."""
import importlib.util,json,pathlib,re,secrets,urllib.request,urllib.error,uuid
root=pathlib.Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('db_admin',root/'scripts/db-admin.py');db=importlib.util.module_from_spec(s);s.loader.exec_module(db)
config=(root/'assets/config.js').read_text();base=re.search(r"supabaseUrl: '([^']+)'",config)[1];public=re.search(r"publishableKey: '([^']+)'",config)[1]
keys=db.api('GET',f'/projects/{db.REF}/api-keys');service=next(k['api_key'] for k in keys if k.get('name')=='service_role')
def call(path,body,token=None,key=None,origin='https://fandom-discovery-mvp.vercel.app',method='POST'):
 headers={'apikey':key or public,'Content-Type':'application/json','Origin':origin}
 if token:headers['Authorization']='Bearer '+token
 req=urllib.request.Request(base+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
 try:
  with urllib.request.urlopen(req,timeout=30) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:
  raw=e.read()
  try:return e.code,json.loads(raw)
  except:return e.code,None
uid=None
try:
 path='/functions/v1/x-search'
 assert call(path,{'term':'괴담출근'})[0]==401,'Anonymous request accepted'
 assert call(path,{'term':'괴담출근'},token='not-a-session')[0]==401,'Invalid session accepted'
 assert call(path,{'term':'괴담출근'},origin='https://untrusted.example')[0]==403,'Foreign origin accepted'
 email='x-search-fixture-'+uuid.uuid4().hex+'@example.invalid';password=secrets.token_urlsafe(32)
 status,user=call('/auth/v1/admin/users',{'email':email,'password':password,'email_confirm':True},token=service,key=service)
 assert status==200,'Fixture creation failed';uid=user['id']
 status,session=call('/auth/v1/token?grant_type=password',{'email':email,'password':password});assert status==200,'Fixture sign-in failed'
 assert call(path,{'term':'괴담출근'},token=session['access_token'])[0]==403,'Regular account can run paid searches'
 print('PASS: anonymous 401, invalid session 401, untrusted origin 403, regular account 403; zero X calls.')
finally:
 if uid:call('/auth/v1/admin/users/'+uid,None,token=service,key=service,method='DELETE')
 print('Disposable test account removed; existing accounts unchanged.')
