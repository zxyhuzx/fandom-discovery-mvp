import test from 'node:test';
import assert from 'node:assert/strict';
import {SEARCH_LIMIT,searchQuery,searchUrl,postPreviews} from '../lib/x/search.mjs';
test('X paid search uses narrow literal query and bounded result count without profile expansions',()=>{
 const q=searchQuery('  괴담출근  ');assert.equal(q,'"괴담출근" (통판 OR 수요조사 OR 선입금) -is:retweet');
 const u=searchUrl(q);assert.equal(u.origin,'https://api.x.com');assert.equal(u.searchParams.get('max_results'),String(SEARCH_LIMIT));
 assert.equal(u.searchParams.has('expansions'),false);assert.equal(u.searchParams.has('next_token'),false);
 for(const value of ['a','"나루토"','나루토) OR (has:links','a'.repeat(61)])assert.throws(()=>searchQuery(value));
 assert.ok(searchQuery('x OR from:someone').startsWith('"x OR from:someone" '));
});
test('X previews reject invalid ids and unsafe links and remain bounded',()=>{
 const items=postPreviews({data:[{id:'123',text:'통판',entities:{urls:[{expanded_url:'javascript:alert(1)'},{expanded_url:'https://example.com/sale'},{expanded_url:'https://user:pass@example.com'}]}},{id:'<script>',text:'x'},...Array.from({length:15},(_,i)=>({id:String(i+1000),text:'예시'}))]});
 assert.equal(items.length,10);assert.equal(items[0].url,'https://x.com/i/status/123');assert.deepEqual(items[0].links,['https://example.com/sale']);
});
