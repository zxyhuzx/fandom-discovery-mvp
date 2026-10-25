#!/usr/bin/env python3
"""Build a metadata-only ODbL derivative; no bios, images or sales listings."""
import json,pathlib,urllib.request,urllib.parse,time,collections,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
raw=json.loads((ROOT/'data/character-source.json').read_text())['data']
curation=json.loads((ROOT/'data/korean-curation.json').read_text())
appearances=collections.defaultdict(dict)
for c in raw:
    for a in c['animeAppearances']:
        appearances[a['anime']['title']][c['mal_id']]=c
selection=[]
for line in (ROOT/'data/work-selection.txt').read_text().splitlines():
    if not line or line.startswith('#'):continue
    ko,title=line.split('|');chars=list(appearances.get(title,{}).values())
    if not chars:print('MISSING:',title);continue
    chars.sort(key=lambda c:-c.get('favorites',0))
    selection.append((ko,title,chars[:12]))
cachefile=ROOT/'data/wikidata-labels.json'
cache=json.loads(cachefile.read_text()) if cachefile.exists() else {}
def fetch(site,titles):
    pending=list(dict.fromkeys(t for t in titles if t and site+':'+t not in cache and '|' not in t))
    for start in range(0,len(pending),40):
        batch=pending[start:start+40]
        url='https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode(dict(action='wbgetentities',sites=site,titles='|'.join(batch),props='labels|aliases|sitelinks',languages='ko|en|ja',sitefilter=site,format='json',redirects='yes'))
        req=urllib.request.Request(url,headers={'User-Agent':'ByeoljupMVP/1.0 (open fandom name catalog; metadata only)'})
        try:
            with urllib.request.urlopen(req,timeout=30) as response: entities=json.load(response).get('entities',{})
        except urllib.error.HTTPError as e:
            print('API paused: HTTP',e.code,'retry-after',e.headers.get('Retry-After'));return False
        except Exception as e:
            print('API paused:',type(e).__name__);return False
        for title in batch:cache[site+':'+title]=None
        for entity in entities.values():
            title=entity.get('sitelinks',{}).get(site,{}).get('title')
            if not title:continue
            entry={'id':entity['id'],'labels':{k:v['value'] for k,v in entity.get('labels',{}).items()},'aliases':{k:[a['value'] for a in v] for k,v in entity.get('aliases',{}).items()}}
            cache[site+':'+title]=entry
            # MediaWiki title capitalization only; never guess identity by fuzzy matching.
            for requested in batch:
                if requested.casefold()==title.casefold():cache[site+':'+requested]=entry
        cachefile.write_text(json.dumps(cache,ensure_ascii=False,indent=1))
        print(site,start+len(batch),'/',len(pending),flush=True);time.sleep(12)
    return True
chars={c['mal_id']:c for _,_,cs in selection for c in cs}
if '--offline' not in sys.argv:
    completed=fetch('enwiki',[c['name'] for c in chars.values()])
    if completed and '--english-only' not in sys.argv:
        fetch('jawiki',[c.get('name_kanji') for c in chars.values() if not (cache.get('enwiki:'+c['name']) or {}).get('labels',{}).get('ko')])
out=[]
for ko,title,cs in selection:
    members=[]
    for c in cs:
        en=cache.get('enwiki:'+c['name']) or {};ja=cache.get('jawiki:'+str(c.get('name_kanji'))) or {}
        if not en.get('verified_character'):en={}
        if not ja.get('verified_character'):ja={}
        entity=en if en.get('labels',{}).get('ko') else ja if ja.get('labels',{}).get('ko') else en or ja
        labels=entity.get('labels',{});display=curation['characters'].get(str(c['mal_id'])) or labels.get('ko') or c['name']
        names=list(dict.fromkeys([display,c['name'],c.get('name_kanji') or '',*labels.values(),*(a for rows in entity.get('aliases',{}).values() for a in rows)]))
        members.append({'names':[n for n in names if n and len(n)<=120],'source':c['url'],'wikidata':entity.get('id'),'korean_verified':bool(labels.get('ko')),'label_source':'curated' if str(c['mal_id']) in curation['characters'] else 'wikidata' if labels.get('ko') else 'original'})
    work_id=next(a['anime']['mal_id'] for a in cs[0]['animeAppearances'] if a['anime']['title']==title)
    out.append({'work':[ko,'mal-'+str(work_id),title,*curation['workAliases'].get(ko,[])],'source':'https://myanimelist.net/anime/'+str(work_id),'genre':'애니·만화','members':members})
(ROOT/'data/expanded-catalog.json').write_text(json.dumps({'license':'ODbL-1.0 / DbCL-1.0','source':'https://github.com/arda-/anime-character-offline-database/tree/prod','works':out},ensure_ascii=False,indent=1)+'\n')
print('Imported',len(out),'works',sum(len(g['members']) for g in out),'members;',sum(m['korean_verified'] for g in out for m in g['members']),'verified Korean labels')
