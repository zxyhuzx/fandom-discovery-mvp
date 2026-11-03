import {WORKS,CHARACTERS} from '../assets/domain.js';
import {writeFile} from 'node:fs/promises';
const q=s=>"'"+s.replaceAll("'","''")+"'";
const entries=[...new Map(WORKS.flatMap(([w])=>['',...(CHARACTERS[w]||[])].map(c=>[w+'\0'+c,[w,c]]))).values()];
await writeFile('supabase/migrations/20261103190100_research_catalog.sql',`begin;\n-- Canonical work/character pairs shared with the existing tutorial; no user data.\ninsert into public.research_catalog(work_name,character_name) values\n${entries.map(([w,c])=>`(${q(w)},${q(c)})`).join(',\n')}\non conflict do nothing;\ncommit;\n`);
console.log('Research catalog pairs:',entries.length);
