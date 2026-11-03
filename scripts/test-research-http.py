#!/usr/bin/env python3
"""Disposable campaign only. No production participant data is read or changed."""
import importlib.util,json,secrets,urllib.request,urllib.error,pathlib,subprocess,tempfile,csv,stat
root=pathlib.Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('db_admin',root/'scripts/db-admin.py');db=importlib.util.module_from_spec(s);s.loader.exec_module(db)
campaign='research-http-'+secrets.token_hex(6);base='https://plxdnppizgvrqakjyehm.supabase.co/functions/v1/research';token=secrets.token_hex(32)
def call(body=None,origin='https://fandom-discovery-mvp.vercel.app'):
    request=urllib.request.Request(base+('?campaign='+campaign if body is None else ''),data=None if body is None else json.dumps(body).encode(),headers={'Origin':origin,'Content-Type':'application/json'},method='GET' if body is None else 'POST')
    try:
        with urllib.request.urlopen(request,timeout=30) as response:return response.status,json.load(response)
    except urllib.error.HTTPError as e:return e.code,json.load(e)
def post(**kwargs):return call(dict(campaign=campaign,token=token,consent=True,consent_version='http-v1',action='submit',items=[{'work_name':'원신','character_name':'종려'},{'work_name':'나루토','character_name':''},{'work_name':'하이큐!!','character_name':'히나타 쇼요'}],**kwargs))
try:
    db.sql("insert into public.research_campaigns(id,enabled,consent_version,purpose,retention_days,withdrawal_contact) values('"+campaign+"',true,'http-v1','Disposable HTTP test',60,'mailto:test@example.com')")
    assert call()[0]==200
    body=dict(campaign=campaign,token=token,consent=False,consent_version='http-v1',action='submit',items=[{'work_name':'원신','character_name':'종려'}])
    assert call(body)[0]==400
    body['consent']=True;body['items'][0]['character_name']='히나타 쇼요';assert call(body)[0]==400
    status,response=post();assert status==200,response;pid=response['participant_id']
    status,again=post();assert status==200 and again['participant_id']==pid
    assert call(dict(campaign=campaign,token=token,consent=True,consent_version='http-v1',action='request',request={'kind':'character','work_name':'테스트 작품','character_name':'테스트 캐릭터'}))[0]==200
    rows=db.sql("select * from public.research_export('"+campaign+"')");assert len(rows)==3
    files=json.loads(subprocess.run(['node',str(root/'scripts/research-csv.mjs')],input=json.dumps(rows),text=True,capture_output=True,check=True).stdout);assert len(files)==3
    with tempfile.TemporaryDirectory(prefix='byeoljup-csv-check-') as folder:
        subprocess.run(['python3',str(root/'scripts/research-admin.py'),'export','--campaign',campaign,'--out',folder],capture_output=True,text=True,check=True)
        for name in files:
            path=pathlib.Path(folder)/name
            with path.open(encoding='utf-8-sig',newline='') as file: extracted=list(csv.reader(file))
            assert len(extracted)>1, name
            assert stat.S_IMODE(path.stat().st_mode)==0o600
    wrong=call(dict(campaign=campaign,token=secrets.token_hex(32),action='withdraw'));assert wrong[0]==200
    assert len(db.sql("select * from public.research_export('"+campaign+"')"))==3
    assert call(dict(campaign=campaign,token=token,action='withdraw'))[0]==200
    assert db.sql("select * from public.research_export('"+campaign+"')")==[]
    assert call(origin='https://untrusted.example')[0]==403
    print('PASS: live HTTP consent rejection, relationship validation, guest submit, duplicate protection, requests, 3 CSVs, wrong-token isolation, withdrawal, origin check.')
finally:
    db.sql("delete from public.research_participants where campaign_id='"+campaign+"'; delete from public.research_campaigns where id='"+campaign+"'")
    print('Disposable HTTP campaign and responses cleaned up.')
