// Logic tests. Run with: node tests/run.js
'use strict';

var assert = require('node:assert/strict');
var Pet = require('../js/pet.js');
var Names = require('../js/names.js');

var MIN = 60 * 1000;
var passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log('ok - ' + name);
}

test('a new pet starts full and healthy', function () {
  var p = Pet.create('Bart', 0);
  assert.equal(p.fullness, 5);
  assert.equal(p.health, 5);
  assert.equal(Pet.mood(p), 'happy');
});

test('fullness drops by 1 every 5 minutes, not sooner', function () {
  var p = Pet.create('Bart', 0);
  Pet.advance(p, 5 * MIN - 1);
  assert.equal(p.fullness, 5);
  Pet.advance(p, 1);
  assert.equal(p.fullness, 4);
  Pet.advance(p, 10 * MIN);
  assert.equal(p.fullness, 2);
});

test('time split into small ticks matches one big jump', function () {
  var a = Pet.create('A', 0);
  var b = Pet.create('B', 0);
  for (var i = 0; i < 4 * 23 * 60; i++) Pet.advance(a, 250); // 23 minutes in 250 ms ticks
  Pet.advance(b, 23 * MIN);
  assert.equal(a.fullness, b.fullness);
  assert.equal(a.health, b.health);
  assert.equal(a.carryMs, b.carryMs);
});

test('2x speed means a hunger drop every 2.5 real minutes', function () {
  var p = Pet.create('Bart', 0);
  Pet.advance(p, 2.5 * MIN * 2);
  assert.equal(p.fullness, 4);
});

test('health drops only while fullness is 0, and recovers when fed', function () {
  var p = Pet.create('Bart', 0);
  Pet.advance(p, 20 * MIN); // fullness 5 -> 1, health stays 5
  assert.equal(p.fullness, 1);
  assert.equal(p.health, 5);
  Pet.advance(p, 5 * MIN); // fullness 0, health 4
  assert.equal(p.fullness, 0);
  assert.equal(p.health, 4);
  Pet.advance(p, 10 * MIN);
  assert.equal(p.health, 2);
  Pet.feed(p); Pet.feed(p); Pet.feed(p);
  Pet.advance(p, 5 * MIN); // fullness 3 -> 2, health recovers to 3
  assert.equal(p.fullness, 2);
  assert.equal(p.health, 3);
});

test('stats never go below 0, even after a long time away', function () {
  var p = Pet.create('Bart', 0);
  Pet.advance(p, 30 * 24 * 60 * MIN);
  assert.equal(p.fullness, 0);
  assert.equal(p.health, 0);
  assert.equal(Pet.mood(p), 'sick');
});

test('feeding adds 1 and stops at 5', function () {
  var p = Pet.create('Bart', 0);
  assert.equal(Pet.feed(p), false);
  assert.equal(p.fullness, 5);
  Pet.advance(p, 5 * MIN);
  assert.equal(Pet.feed(p), true);
  assert.equal(p.fullness, 5);
});

test('mood follows the stats', function () {
  assert.equal(Pet.mood({ fullness: 5, health: 5 }), 'happy');
  assert.equal(Pet.mood({ fullness: 3, health: 5 }), 'okay');
  assert.equal(Pet.mood({ fullness: 1, health: 5 }), 'sad');
  assert.equal(Pet.mood({ fullness: 5, health: 2 }), 'sad');
  assert.equal(Pet.mood({ fullness: 5, health: 1 }), 'sick');
});

test('normalize repairs bad saved values', function () {
  var p = Pet.normalize({ name: 'X', fullness: 9, health: -3, carryMs: 'oops', lastUpdate: 0 });
  assert.equal(p.fullness, 5);
  assert.equal(p.health, 0);
  assert.equal(p.carryMs, 0);
});

test('negative or missing time does nothing', function () {
  var p = Pet.create('Bart', 0);
  Pet.advance(p, -10 * MIN);
  Pet.advance(p, NaN);
  assert.equal(p.fullness, 5);
  assert.equal(p.carryMs, 0);
});

test('generated names are capitalized, short, letters only, and allowed', function () {
  for (var i = 0; i < 5000; i++) {
    var n = Names.generate();
    assert.match(n, /^[A-Z][a-z]{2,9}$/);
    assert.ok(Names.isAllowed(n), n);
  }
});

console.log(passed + ' tests passed');
