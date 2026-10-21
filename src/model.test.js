import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fresh,load,purchase,serve} from './model.js';
test('serve earns money, then food purchase restores happiness without free upgrades',()=>{const s=fresh();s.happiness=40;assert.equal(serve(s,1),20);assert.equal(s.money,60);assert.equal(s.served,1);assert.equal(purchase(s,'cat'),false);assert.equal(s.money,60);assert.equal(purchase(s,'food'),true);assert.equal(s.money,45);assert.equal(s.happiness,70);});
test('upgrades cost money and stop at limits',()=>{const s=fresh();s.money=2000;for(let i=0;i<3;i++)assert.equal(purchase(s,'cat'),true);assert.equal(s.cats,4);const before=s.money;assert.equal(purchase(s,'cat'),false);assert.equal(s.money,before);assert.equal(purchase(s,'decor'),true);assert.equal(purchase(s,'decor'),true);assert.equal(purchase(s,'decor'),false);});
test('saved progress loads and invalid data recovers safely',()=>{const s=fresh();serve(s,1);assert.deepEqual(load(JSON.stringify(s)),s);assert.deepEqual(load('broken'),fresh());assert.deepEqual(load('{}'),fresh());assert.equal(load(JSON.stringify({...s,cats:99})).cats,4);});
