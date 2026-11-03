import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldShowTutorial} from '../assets/first-visit.js';
test('first visits see tutorial; remembered visits and logged-in accounts skip it',()=>{
 assert.equal(shouldShowTutorial(),true);
 assert.equal(shouldShowTutorial({seen:true}),false);
 assert.equal(shouldShowTutorial({user:true}),false);
 assert.equal(shouldShowTutorial({seen:true,user:true}),false);
});
test('manual tutorial preview and connection recovery are explicit exceptions',()=>{
 assert.equal(shouldShowTutorial({seen:true,user:true,forced:true}),true);
 assert.equal(shouldShowTutorial({seen:true,recovery:true}),true);
});
