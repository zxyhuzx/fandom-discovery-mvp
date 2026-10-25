"""Accept translated labels only when the entity is explicitly a fictional character."""
import json,pathlib,urllib.request,urllib.parse,time
root=pathlib.Path(__file__).resolve().parents[1];p=root/'data/wikidata-labels.json';cache=json.loads(p.read_text())
ids=list(dict.fromkeys(e['id'] for e in cache.values() if e and e.get('labels',{}).get('ko') and 'verified_character' not in e))
verified={}
for start in range(0,len(ids),40):
    url='https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode(dict(action='wbgetentities',ids='|'.join(ids[start:start+40]),props='descriptions',languages='ko|en',format='json'))
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ByeoljupMVP/1.0 (metadata verification)'}),timeout=30) as r:data=json.load(r)
    except urllib.error.HTTPError as e:
        print('HTTP',e.code,'retry-after',e.headers.get('Retry-After'));break
    for key,e in data.get('entities',{}).items():
        text=' '.join(v['value'] for v in e.get('descriptions',{}).values()).lower()
        verified[key]=any(t in text for t in ['fictional character','fictional human','fictional protagonist','character from','character in','등장인물','등장 인물','가공의 인물','캐릭터'])
    time.sleep(12)
for e in cache.values():
    if e and e['id'] in verified:e['verified_character']=verified[e['id']]
p.write_text(json.dumps(cache,ensure_ascii=False,indent=1))
print('Identity verified',sum(verified.values()),'/',len(verified))
