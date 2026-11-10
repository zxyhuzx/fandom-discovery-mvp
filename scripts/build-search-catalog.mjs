import {writeFile} from 'node:fs/promises';
import {WORKS,CHARACTERS,normalizeWork,normalizeKeyword,workGenre} from '../assets/catalog-data.js';
import {CHARACTER_NAME_ALIASES,RETIRED_CATALOG} from '../assets/name-catalog.js';
import {RETIRED_CURATED_CATALOG,compareWelcomeWorks} from '../assets/curated-catalog.js';
import {SURVEY_NAMES} from '../assets/survey-names.js';
const active=new Set(WORKS.map(r=>r[0])),all=[...WORKS,...RETIRED_CATALOG.map(g=>g.work),...RETIRED_CURATED_CATALOG.map(g=>g.work)];
const byName=new Map();for(const row of all)if(!byName.has(row[0]))byName.set(row[0],row);
const ranks=new Map();for(const genre of ['애니·만화','게임','웹소설·웹툰','버튜버','아이돌'])WORKS.filter(r=>workGenre(r[0])===genre).sort((a,b)=>compareWelcomeWorks(genre,a,b)).forEach((r,i)=>ranks.set(r[0],i));
const works=[...byName.values()].map(row=>({key:normalizeWork(row[0]),name:row[0],aliases:[...new Set(row)],genre:workGenre(row[0]),active:active.has(row[0]),rank:ranks.get(row[0])??1000}));
const characters=[];for(const w of works){const rows=CHARACTER_NAME_ALIASES[w.name]||[];const names=[...new Set([...(CHARACTERS[w.name]||[]),...rows.map(r=>r[0])])];for(const [rank,name] of names.entries()){const aliases=rows.find(r=>r[0]===name)||[name];characters.push({work_key:w.key,name,aliases:[...new Set([name,...aliases])],active:w.active&&(CHARACTERS[w.name]||[]).includes(name),rank})}}
const snapshot={works,characters};
const q=s=>"'"+s.replaceAll("'","''")+"'";
const literal=q(JSON.stringify(snapshot));
await writeFile(process.argv[2]||'supabase/migrations/20261110150100_catalog_seed.sql',`begin;\n-- Existing source names only. Stable work keys preserve saved interests.\nwith source as (select * from jsonb_to_recordset((${literal}::jsonb)->'works') as w(key text,name text,aliases jsonb,genre text,active boolean,rank integer))\ninsert into public.catalog_works(work_key,name,aliases,genre,active,sort_rank) select key,name,array(select jsonb_array_elements_text(aliases)),genre,active,rank from source on conflict(work_key) do update set name=excluded.name,aliases=excluded.aliases,genre=excluded.genre,active=excluded.active,sort_rank=excluded.sort_rank;\nwith source as (select * from jsonb_to_recordset((${q(JSON.stringify(characters))}::jsonb)) as c(work_key text,name text,aliases jsonb,active boolean,rank integer))\ninsert into public.catalog_characters(work_key,name,aliases,active,sort_rank) select work_key,name,array(select jsonb_array_elements_text(aliases)),active,rank from source on conflict(work_key,name) do update set aliases=excluded.aliases,active=excluded.active,sort_rank=excluded.sort_rank;\ncommit;\n`);
const bootstrap={works:works.filter(w=>Object.hasOwn(SURVEY_NAMES,w.name)),characters:characters.filter(c=>SURVEY_NAMES[works.find(w=>w.key===c.work_key)?.name]?.some(r=>r[0]===c.name))};
await writeFile('assets/catalog-bootstrap.json',JSON.stringify(bootstrap));
console.log({works:works.length,activeWorks:works.filter(w=>w.active).length,characters:characters.length,activeCharacters:characters.filter(c=>c.active).length,bootstrapBytes:JSON.stringify(bootstrap).length});
