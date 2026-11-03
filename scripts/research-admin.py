#!/usr/bin/env python3
"""Operator only. Management API login is required; never expose these operations to the browser."""
import argparse,hashlib,importlib.util,json,pathlib,subprocess,os
root=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('db_admin',root/'scripts/db-admin.py');db=importlib.util.module_from_spec(spec);spec.loader.exec_module(db)
p=argparse.ArgumentParser();sub=p.add_subparsers(dest='action',required=True)
e=sub.add_parser('export');e.add_argument('--campaign',required=True);e.add_argument('--out',required=True)
w=sub.add_parser('withdraw');w.add_argument('--code',help='생략하면 화면에 표시되지 않는 입력으로 받습니다.')
args=p.parse_args()
def quote(s):return "'"+s.replace("'","''")+"'"
if args.action=='export':
    rows=db.sql('select * from public.research_export('+quote(args.campaign)+')')
    result=subprocess.run(['node',str(root/'scripts/research-csv.mjs')],input=json.dumps(rows),text=True,capture_output=True,check=True)
    folder=pathlib.Path(args.out).expanduser().resolve()
    if folder==root or root in folder.parents:raise SystemExit('응답 CSV는 공개 저장소 밖의 안전한 폴더에 저장해 주세요.')
    folder.mkdir(parents=True,exist_ok=True,mode=0o700)
    for name,content in json.loads(result.stdout).items():
        path=folder/name
        fd=os.open(path,os.O_CREAT|os.O_WRONLY|os.O_TRUNC|os.O_NOFOLLOW,0o600)
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w',encoding='utf-8',newline='') as file:file.write(content)
    print(json.dumps({'participants':len({r['participant_id'] for r in rows}),'choices':len(rows),'files':3,'output':str(folder)},ensure_ascii=False))
else:
    import getpass,re
    code=args.code or getpass.getpass('철회용 비밀 코드: ')
    try:campaign,token=code.strip().split(':')
    except ValueError:raise SystemExit('철회 코드 형식을 확인해 주세요.')
    if not re.fullmatch('[a-z0-9-]{1,60}',campaign) or not re.fullmatch('[0-9a-f]{64}',token):raise SystemExit('철회 코드 형식을 확인해 주세요.')
    db.sql('select public.research_write('+','.join([quote(campaign),quote(hashlib.sha256(token.encode()).hexdigest()),"''","'withdraw'"])+')')
    print('해당 코드의 연구 선택 데이터와 추가 요청을 삭제했습니다. 이후 CSV에 포함되지 않습니다.')
