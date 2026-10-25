#!/usr/bin/env python3
"""Supabase Management API helper. Credentials stay in memory; never logs keys."""
import argparse, base64, json, os, pathlib, subprocess, urllib.request, urllib.error
ROOT = pathlib.Path(__file__).resolve().parents[1]
REF = json.loads((ROOT / 'supabase/project.json').read_text())['ref']
def api(method, path, body=None):
    token = os.environ.get('SUPABASE_ACCESS_TOKEN')
    if not token:
        result = subprocess.run(['security', 'find-generic-password', '-s', 'Supabase CLI', '-w'], capture_output=True, text=True)
        if result.returncode: raise SystemExit('SUPABASE_ACCESS_TOKEN 또는 기존 CLI 키체인 로그인이 필요합니다.')
        token = result.stdout.strip()
    if token.startswith('go-keyring-base64:'): token = base64.b64decode(token.split(':', 1)[1]).decode()
    req = urllib.request.Request('https://api.supabase.com/v1' + path,
        data=json.dumps(body).encode() if body is not None else None, method=method,
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            raw=response.read()
            return json.loads(raw) if raw.strip() else None
    except urllib.error.HTTPError as error:
        # SQL errors do not contain credential bodies. Never print auth/provider configuration.
        detail = error.read().decode() if '/database/query' in path else '응답 내용은 비밀 설정 보호를 위해 생략합니다.'
        raise SystemExit(f'Management API HTTP {error.code}: {detail}')
def sql(query): return api('POST', f'/projects/{REF}/database/query', {'query': query})
if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('action', choices=['audit', 'sql', 'apply', 'redirects']); parser.add_argument('file', nargs='?'); args = parser.parse_args()
    if args.action == 'audit':
        p = api('GET', f'/projects/{REF}'); auth = api('GET', f'/projects/{REF}/config/auth')
        print(json.dumps({'project': {k: p.get(k) for k in ('ref','name','status','region')},
            'auth': {k: auth.get(k) for k in ('external_kakao_enabled', 'site_url', 'uri_allow_list')},
            'tables': sql("select tablename, rowsecurity from pg_tables where schemaname='public' order by tablename") if p.get('status')=='ACTIVE_HEALTHY' else 'Database not ready'}, ensure_ascii=False))
    elif args.action == 'sql': print(json.dumps(sql(pathlib.Path(args.file).read_text()), ensure_ascii=False))
    elif args.action == 'apply':
        path = pathlib.Path(args.file); version, _, name = path.stem.partition('_')
        sql('create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations(version text primary key, statements text[], name text);')
        found = sql("select version from supabase_migrations.schema_migrations where version='" + version + "'")
        if found: print('Already applied:', version)
        else:
            query = path.read_text().strip(); assert query.startswith('begin;') and query.endswith('commit;')
            query = query[:-7] + "insert into supabase_migrations.schema_migrations(version,name) values ('" + version + "','" + name.replace("'", "''") + "');\ncommit;"
            sql(query); print('Applied:', path.name)
    elif args.action == 'redirects':
        config = api('GET', f'/projects/{REF}/config/auth'); allowed = set(filter(None, (config.get('uri_allow_list') or '').split(',')))
        allowed.update(['https://fandom-discovery-mvp.vercel.app/app.html', 'http://127.0.0.1:5174/app.html', 'http://localhost:5174/app.html'])
        api('PATCH', f'/projects/{REF}/config/auth', {'site_url':'https://fandom-discovery-mvp.vercel.app', 'uri_allow_list':','.join(sorted(allowed))})
        print('Exact app callback URLs configured; provider credentials unchanged.')
