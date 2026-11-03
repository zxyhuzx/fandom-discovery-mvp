import test from 'node:test';
import assert from 'node:assert/strict';
import {nicknameValue,socialHandle,socialUrl,validateProfileFile,validProfileDimensions,ownedMediaPath} from '../assets/profile-domain.js';
test('profile nicknames accept trimmed Unicode and reject empty, excessive or unsafe names',()=>{
 assert.equal(nicknameValue('  나의 별  '),'나의 별');assert.equal(nicknameValue('별줍'),'별줍');
 for(const value of ['', '가', 'a'.repeat(25),'<script>', '별\n줍','\u007f별줍'])assert.throws(()=>nicknameValue(value));
});
test('social handles accept optional @ and only build fixed HTTPS account URLs',()=>{
 assert.equal(socialHandle(' @example_user ','x'),'example_user');
 assert.equal(socialUrl('@example_user','x'),'https://x.com/example_user');
 assert.equal(socialUrl('example.user','instagram'),'https://www.instagram.com/example.user/');
 assert.equal(socialUrl('','x'),null);
 for(const value of ['https://evil.example','user/../../path','x?query','@a@b','a b','<script>','a'.repeat(16)])assert.throws(()=>socialHandle(value,'x'));
 for(const value of ['.user','user.','u..ser','a'.repeat(31),'user/name','javascript:hi'])assert.throws(()=>socialHandle(value,'instagram'));
});
test('raster file validation checks format, slot sizes and decoded image bounds',()=>{
 validateProfileFile({type:'image/png',size:1024},'avatar');validateProfileFile({type:'image/webp',size:8*1024*1024},'banner');
 for(const file of [{type:'image/svg+xml',size:20},{type:'image/gif',size:20},{type:'image/jpeg',size:0},{type:'image/png',size:5*1024*1024+1}])assert.throws(()=>validateProfileFile(file,'avatar'));
 validProfileDimensions(1200,320);for(const [w,h] of [[0,0],[31,400],[8001,400],[8000,8000]])assert.throws(()=>validProfileDimensions(w,h));
 const id='00000000-0000-4000-8000-000000000001';
 assert.equal(ownedMediaPath(id+'/avatar/'+id+'.png',id,'avatar'),true);
 assert.equal(ownedMediaPath(id+'/banner/'+id+'.png',id,'avatar'),false);
 assert.equal(ownedMediaPath('other/avatar/'+id+'.png',id,'avatar'),false);
});
