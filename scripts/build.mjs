import {build} from 'esbuild';
import {mkdir,rm,copyFile} from 'node:fs/promises';
import {config} from '../assets/config.js';
import {resolve} from 'node:path';
const browserCatalog={name:'paged-catalog',setup(builder){builder.onResolve({filter:/catalog-data\.js$/},()=>({path:resolve('assets/catalog-store.js')}))}};
const url=process.env.PUBLIC_SUPABASE_URL||config.supabaseUrl;
const key=process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY||config.publishableKey;
if(!/^https:\/\//.test(url)||!key.startsWith('sb_publishable_'))throw new Error('Only a public Supabase URL and sb_publishable key may be built.');
await rm('public',{recursive:true,force:true});await mkdir('public/assets',{recursive:true});
for(const page of ['index.html','app.html','data-sources.html'])await copyFile(page,'public/'+page);
await mkdir('public/data',{recursive:true});
for(const file of ['expanded-catalog.json','CHARACTER_SOURCE_LICENSE.md'])await copyFile('data/'+file,'public/data/'+file);
await mkdir('public/assets/profile',{recursive:true});
for(const name of ['avatar-default','banner-default'])await copyFile('assets/profile/'+name+'.svg','public/assets/profile/'+name+'.svg');
await mkdir('public/assets/survey',{recursive:true});
for(const name of ['keyring','doll','stickers','photocard','stand','badge','pouch','postcard'])await copyFile('assets/survey/'+name+'.svg','public/assets/survey/'+name+'.svg');
await copyFile('assets/service.css','public/assets/service.css');
for(const asset of ['brand.css','welcome.css','theme.js','byeoljup-icon.png'])await copyFile('assets/'+asset,'public/assets/'+asset);
const appBuild=await build({metafile:true,entryPoints:['assets/app.js'],bundle:true,format:'esm',target:['es2022'],outfile:'public/assets/app.js',minify:true,
 plugins:[browserCatalog,{name:'public-config',setup(builder){builder.onLoad({filter:/assets\/config\.js$/},()=>({contents:'export const config='+JSON.stringify({...config,supabaseUrl:url,publishableKey:key}),loader:'js'}))}}]});
const welcomeBuild=await build({metafile:true,entryPoints:['assets/welcome.js'],bundle:true,format:'esm',target:['es2022'],outfile:'public/assets/welcome.js',minify:true,
 plugins:[browserCatalog,{name:'public-config',setup(builder){builder.onLoad({filter:/assets\/config\.js$/},()=>({contents:'export const config='+JSON.stringify({...config,supabaseUrl:url,publishableKey:key}),loader:'js'}))}}]});
for(const output of [appBuild,welcomeBuild])if(Object.keys(output.metafile.inputs).some(path=>/expanded-catalog\.json$|catalog-data\.js$|name-catalog\.js$/.test(path)))throw Error('Full catalog must not be bundled into browser entry points.');
console.log('Built first-visit flow + authenticated app. No server credentials included.');
