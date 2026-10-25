import {build} from 'esbuild';
import {mkdir,rm,copyFile,readFile,writeFile} from 'node:fs/promises';
import {config} from '../assets/config.js';
const url=process.env.PUBLIC_SUPABASE_URL||config.supabaseUrl;
const key=process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY||config.publishableKey;
if(!/^https:\/\//.test(url)||!key.startsWith('sb_publishable_'))throw new Error('Only a public Supabase URL and sb_publishable key may be built.');
await rm('public',{recursive:true,force:true});await mkdir('public/assets',{recursive:true});
for(const page of ['index.html','app.html'])await copyFile(page,'public/'+page);
await copyFile('assets/service.css','public/assets/service.css');
for(const asset of ['brand.css','byeoljup-icon.png'])await copyFile('assets/'+asset,'public/assets/'+asset);
await build({entryPoints:['assets/app.js'],bundle:true,format:'esm',target:['es2022'],outfile:'public/assets/app.js',minify:true,
 plugins:[{name:'public-config',setup(builder){builder.onLoad({filter:/assets\/config\.js$/},()=>({contents:'export const config='+JSON.stringify({supabaseUrl:url,publishableKey:key}),loader:'js'}))}}]});
// Keep landing signup and real app on the same public project when env overrides are used.
const landing=await readFile('public/index.html','utf8');
await writeFile('public/index.html',landing.replace(/const SUPABASE_URL = '[^']+';/,'const SUPABASE_URL = '+JSON.stringify(url)+';').replace(/const SUPABASE_PUBLISHABLE_KEY = '[^']+';/,'const SUPABASE_PUBLISHABLE_KEY = '+JSON.stringify(key)+';'));
console.log('Built landing + authenticated app. No server credentials included.');
