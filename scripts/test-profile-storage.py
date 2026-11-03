#!/usr/bin/env python3
"""Disposable API integration fixtures. Credentials stay in memory and are never printed."""
import importlib.util,json,pathlib,re,secrets,struct,urllib.request,urllib.error,uuid,zlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('db_admin',ROOT/'scripts/db-admin.py');admin=importlib.util.module_from_spec(spec);spec.loader.exec_module(admin)
config=(ROOT/'assets/config.js').read_text();BASE=re.search(r"supabaseUrl: '([^']+)'",config)[1];PUBLIC=re.search(r"publishableKey: '([^']+)'",config)[1]
keys=admin.api('GET',f'/projects/{admin.REF}/api-keys');SERVICE=next(k['api_key'] for k in keys if k.get('name')=='service_role')
users=[];paths=[]
def request(method,path,token=None,body=None,binary=None,mime='application/json',service=False,prefer=None):
 headers={'apikey':SERVICE if service else PUBLIC,'Authorization':'Bearer '+(token or (SERVICE if service else PUBLIC)),'Content-Type':mime}
 if prefer:headers['Prefer']=prefer
 data=binary if binary is not None else (json.dumps(body).encode() if body is not None else None)
 req=urllib.request.Request(BASE+path,data=data,headers=headers,method=method)
 try:
  with urllib.request.urlopen(req,timeout=40) as r:
   raw=r.read();return r.status,json.loads(raw) if 'json' in r.headers.get('Content-Type','') and raw else raw
 except urllib.error.HTTPError as e:
  e.read();return e.code,None

def png(w,h,color):
 def chunk(t,data):return struct.pack('!I',len(data))+t+data+struct.pack('!I',zlib.crc32(t+data)&0xffffffff)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\x00'+bytes(color)*w)*h))+chunk(b'IEND',b'')
def login(u):
 code,data=request('POST','/auth/v1/token?grant_type=password',body={'email':u['email'],'password':u['password']});assert code==200,'Fixture login failed';return data['access_token']
def upload(u,slot,color):
 path=u['id']+'/'+slot+'/'+str(uuid.uuid4())+'.png';paths.append(path)
 code,_=request('POST','/storage/v1/object/profile-media/'+path,u['token'],binary=png(256 if slot=='avatar' else 1200,256 if slot=='avatar' else 320,color),mime='image/png');assert code==200,'Image upload failed';return path
try:
 for _ in range(2):
  email='profile-fixture-'+uuid.uuid4().hex+'@example.invalid';password=secrets.token_urlsafe(32)
  code,data=request('POST','/auth/v1/admin/users',body={'email':email,'password':password,'email_confirm':True},service=True);assert code==200,'Fixture creation failed'
  u={'id':data['id'],'email':email,'password':password};users.append(u);u['token']=login(u)
 a,b=users;avatar=upload(a,'avatar',(134,165,201));banner=upload(a,'banner',(16,30,47))
 row={'user_id':a['id'],'nickname':'프로필 시험','x_handle':'example_user','instagram_handle':'example.user','avatar_path':avatar,'banner_path':banner}
 code,data=request('POST','/rest/v1/user_profiles',a['token'],row,prefer='return=representation');assert code==201 and data[0]['nickname']==row['nickname'],'Profile insert failed'
 code,signed=request('POST','/storage/v1/object/sign/profile-media/'+avatar,a['token'],{'expiresIn':60});assert code==200,'Signed URL failed'
 code,_=request('GET','/storage/v1'+signed['signedURL']);assert code==200,'Signed image download failed'
 code,_=request('GET','/storage/v1/object/public/profile-media/'+avatar);assert code!=200,'Private image is public'
 code,data=request('GET','/rest/v1/user_profiles?select=*&user_id=eq.'+a['id'],b['token']);assert code==200 and data==[],'Other user can read profile'
 code,data=request('PATCH','/rest/v1/user_profiles?user_id=eq.'+a['id'],b['token'],{'nickname':'다른 사용자'},prefer='return=representation');assert code==200 and data==[],'Other user can edit profile'
 code,_=request('POST','/storage/v1/object/profile-media/'+a['id']+'/avatar/'+str(uuid.uuid4())+'.png',b['token'],binary=png(32,32,(0,0,0)),mime='image/png');assert code!=200,'Other user can upload into owner path'
 code,_=request('GET','/storage/v1/object/authenticated/profile-media/'+avatar,b['token']);assert code!=200,'Other user can download image'
 request('DELETE','/storage/v1/object/profile-media',b['token'],{'prefixes':[avatar]})
 code,_=request('GET','/storage/v1/object/authenticated/profile-media/'+avatar,a['token']);assert code==200,'Other user deleted owner image'
 code,data=request('PATCH','/rest/v1/user_profiles?user_id=eq.'+a['id'],a['token'],{'nickname':'<script>'});assert code!=200,'Invalid nickname accepted'
 code,_=request('PATCH','/rest/v1/user_profiles?user_id=eq.'+a['id'],a['token'],{'x_handle':'evil/path'});assert code!=200,'Unsafe SNS handle accepted'
 code,_=request('PATCH','/rest/v1/user_profiles?user_id=eq.'+a['id'],a['token'],{'avatar_path':b['id']+'/avatar/'+str(uuid.uuid4())+'.png'});assert code!=200,'Foreign media path accepted'
 code,_=request('POST','/storage/v1/object/profile-media/'+a['id']+'/avatar/'+str(uuid.uuid4())+'.svg',a['token'],binary=b'<svg/>',mime='image/svg+xml');assert code!=200,'SVG upload accepted'
 replacement=upload(a,'avatar',(203,183,143));replacement_banner=upload(a,'banner',(41,75,115))
 code,_=request('PATCH','/rest/v1/user_profiles?user_id=eq.'+a['id'],a['token'],{'nickname':'수정된 프로필','avatar_path':replacement,'banner_path':replacement_banner});assert code==204,'Profile replacement failed'
 request('DELETE','/storage/v1/object/profile-media',a['token'],{'prefixes':[avatar,banner]})
 token2=login(a)
 code,data=request('GET','/rest/v1/user_profiles?select=*&user_id=eq.'+a['id'],token2);assert code==200 and data[0]['nickname']=='수정된 프로필' and data[0]['avatar_path']==replacement and data[0]['banner_path']==replacement_banner,'Re-login persistence failed'
 code,_=request('PATCH','/rest/v1/user_profiles?user_id=eq.'+a['id'],token2,{'avatar_path':None,'banner_path':None});assert code==204,'Image removal failed'
 request('DELETE','/storage/v1/object/profile-media',token2,{'prefixes':[replacement,replacement_banner]})
 code,data=request('GET','/rest/v1/user_profiles?select=*&user_id=eq.'+a['id'],token2);assert code==200 and data[0]['avatar_path'] is None and data[0]['banner_path'] is None,'Image paths not cleared'
 for path in paths:
  code,_=request('GET','/storage/v1/object/authenticated/profile-media/'+path,token2);assert code!=200,'Deleted image still accessible'
 print('PASS: avatar/banner upload, replacement, deletion, signed/private access, nickname/SNS persistence after fresh sign-in, cross-account read/write/delete isolation, unsafe input rejection')
finally:
 if paths:request('DELETE','/storage/v1/object/profile-media',body={'prefixes':paths},service=True)
 for u in users:request('DELETE','/auth/v1/admin/users/'+u['id'],service=True)
 print('Disposable fixture users and images cleaned up; existing accounts unchanged.')
