// Regenerate functions only; preserve original migration history and publication triggers.
import {writeFile} from 'node:fs/promises';
import {WORKS,normalizeKeyword,normalizeWork} from '../assets/domain.js';
import {CHARACTER_NAME_ALIASES} from '../assets/name-catalog.js';
const destination=process.argv[2];if(!destination)throw new Error('Pass a NEW migration filename.');
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const aliases=new Map();for(const row of WORKS)for(const name of row)if(!aliases.has(normalizeKeyword(name)))aliases.set(normalizeKeyword(name),row[1]);
let sql="begin;\n-- Names-only catalog normalization. Existing keys and notification deduplication are preserved.\ncreate or replace function public.normalize_work(value text) returns text language sql immutable parallel safe set search_path='' as $$ select case public.normalize_keyword(value)\n";
for(const [alias,key] of aliases)sql+='when '+quote(alias)+' then '+quote(key)+'\n';
sql+="else public.normalize_keyword(value) end $$;\ncreate or replace function public.normalize_character(work text,value text) returns text language sql immutable parallel safe set search_path='' as $$ select case public.normalize_work(work)\n";
for(const [work,rows] of Object.entries(CHARACTER_NAME_ALIASES)){
 sql+='when '+quote(normalizeWork(work))+' then case public.normalize_keyword(value)\n';
 const names=new Map();for(const row of rows)for(const name of row)if(!names.has(normalizeKeyword(name)))names.set(normalizeKeyword(name),normalizeKeyword(row[0]));
 for(const [alias,canonical] of names)sql+='when '+quote(alias)+' then '+quote(canonical)+'\n';
 sql+='else public.normalize_keyword(value) end\n';
}
sql+="else public.normalize_keyword(value) end $$;\nnotify pgrst,'reload schema';\ncommit;\n";
await writeFile(destination,sql,{flag:'wx'});
console.log('Wrote',destination);
