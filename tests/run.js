// Logic tests. Run with: node tests/run.js
'use strict';

var assert = require('node:assert/strict');
var Pet = require('../js/pet.js');
var Names = require('../js/names.js');

var MIN = 60 * 1000;
var NORMAL = Pet.PACES.normal;
var FAST = Pet.PACES.fast;
var passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log('ok - ' + name);
}

function at(hours, minutes) {
  return new Date(2026, 9, 7, hours, minutes, 0);
}

test('a new pet starts full, healthy, unfit, with lights on and zero attributes', function () {
  var p = Pet.create('Bart', 'clown', 0);
  assert.equal(p.species, 'clown');
  assert.deepEqual(p.attributes, { rowdiness: 0, angst: 0, tism: 0, sin: 0, diligence: 0 });
  assert.equal(p.fullness, 5);
  assert.equal(p.health, 5);
  assert.equal(p.fitness, 0);
  assert.equal(p.lightsOn, true);
  assert.equal(Pet.mood(p), 'happy');
});

test('fullness drops by 1 every 5 minutes, not sooner', function () {
  var p = Pet.create('Bart', 'frog', 0);
  Pet.advance(p, 5 * MIN - 1, NORMAL);
  assert.equal(p.fullness, 5);
  Pet.advance(p, 1, NORMAL);
  assert.equal(p.fullness, 4);
  Pet.advance(p, 10 * MIN, NORMAL);
  assert.equal(p.fullness, 2);
});

test('the fast debug pace drops fullness every 10 seconds', function () {
  var p = Pet.create('Bart', 'frog', 0);
  Pet.advance(p, 9999, FAST);
  assert.equal(p.fullness, 5);
  Pet.advance(p, 1, FAST);
  assert.equal(p.fullness, 4);
  Pet.advance(p, 30 * 1000, FAST);
  assert.equal(p.fullness, 1);
});

test('switching pace keeps progress as a fraction, with no burst of drops', function () {
  var p = Pet.create('Bart', 'frog', 0);
  Pet.advance(p, 4 * MIN, NORMAL); // 80% of the way to a drop
  Pet.advance(p, 1000, FAST);      // then 1 second at the fast pace: 90%
  assert.equal(p.fullness, 5);
  Pet.advance(p, 1000, FAST);      // 100%: exactly one drop
  assert.equal(p.fullness, 4);
});

test('small ticks match one big jump', function () {
  var a = Pet.create('A', 'frog', 0);
  var b = Pet.create('B', 'frog', 0);
  for (var i = 0; i < 4 * 23 * 60; i++) Pet.advance(a, 250, NORMAL);
  Pet.advance(b, 23 * MIN, NORMAL);
  assert.equal(a.fullness, b.fullness);
  assert.equal(a.health, b.health);
  assert.ok(Math.abs(a.stepProgress - b.stepProgress) < 1e-6);
});

test('health drops at the hunger pace only once fullness is empty, and never recovers', function () {
  var p = Pet.create('Bart', 'frog', 0);
  Pet.advance(p, 25 * MIN, NORMAL); // five drops: fullness 5 -> 0, health untouched
  assert.equal(p.fullness, 0);
  assert.equal(p.health, 5);
  Pet.advance(p, 5 * MIN, NORMAL);  // fullness already empty: health drops
  assert.equal(p.health, 4);
  Pet.advance(p, 10 * MIN, NORMAL);
  assert.equal(p.health, 2);
  Pet.feed(p); Pet.feed(p); Pet.feed(p); // fullness 3
  Pet.advance(p, 15 * MIN, NORMAL);      // fullness 3 -> 0, health stays 2
  assert.equal(p.fullness, 0);
  assert.equal(p.health, 2);
});

test('health follows the fast pace too', function () {
  var p = Pet.create('Bart', 'frog', 0);
  Pet.advance(p, 60 * 1000, FAST); // six drops: five for fullness, one for health
  assert.equal(p.fullness, 0);
  assert.equal(p.health, 4);
});

test('stats never go below 0, even after a long time away', function () {
  var p = Pet.create('Bart', 'frog', 0);
  Pet.advance(p, 30 * 24 * 60 * MIN, NORMAL);
  assert.equal(p.fullness, 0);
  assert.equal(p.health, 0);
  assert.equal(Pet.mood(p), 'sick');
});

test('feeding adds 1 and stops at 5', function () {
  var p = Pet.create('Bart', 'frog', 0);
  assert.equal(Pet.feed(p), false);
  Pet.advance(p, 5 * MIN, NORMAL);
  assert.equal(Pet.feed(p), true);
  assert.equal(p.fullness, 5);
});

test('medicine adds 1 health and stops at 5', function () {
  var p = Pet.create('Bart', 'frog', 0);
  assert.equal(Pet.giveMedicine(p), false);
  p.health = 3;
  assert.equal(Pet.giveMedicine(p), true);
  assert.equal(p.health, 4);
});

test('training adds 0.5 fitness and stops at 5', function () {
  var p = Pet.create('Bart', 'frog', 0);
  var safe = function () { return 0.99; };
  for (var i = 0; i < 10; i++) assert.equal(Pet.train(p, safe).trained, true);
  assert.equal(p.fitness, 5);
  assert.equal(Pet.train(p, safe).trained, false);
  assert.equal(p.fitness, 5);
  assert.equal(p.health, 5);
});

test('training injures (health -1) exactly when the roll is under 5%', function () {
  var p = Pet.create('Bart', 'frog', 0);
  assert.equal(Pet.train(p, function () { return 0.05; }).injured, false);
  assert.equal(p.health, 5);
  assert.equal(Pet.train(p, function () { return 0.049; }).injured, true);
  assert.equal(p.health, 4);
  p.health = 0;
  assert.equal(Pet.train(p, function () { return 0; }).injured, false);
  assert.equal(p.health, 0);
});

test('training injures about 5% of the time', function () {
  var p = Pet.create('Bart', 'frog', 0);
  var injuries = 0;
  for (var i = 0; i < 100000; i++) {
    p.fitness = 0;
    p.health = 5;
    if (Pet.train(p).injured) injuries++;
  }
  assert.ok(injuries > 4500 && injuries < 5500, String(injuries));
});

test('bedtime runs from 9 PM to 7 AM by default', function () {
  var p = Pet.create('Bart', 'frog', 0);
  assert.equal(Pet.isBedtime(p, at(20, 59)), false);
  assert.equal(Pet.isBedtime(p, at(21, 0)), true);
  assert.equal(Pet.isBedtime(p, at(0, 0)), true);
  assert.equal(Pet.isBedtime(p, at(6, 59)), true);
  assert.equal(Pet.isBedtime(p, at(7, 0)), false);
  assert.equal(Pet.isBedtime(p, at(12, 0)), false);
});

test('the pet is asleep only with lights off after bedtime', function () {
  var p = Pet.create('Bart', 'frog', 0);
  assert.equal(Pet.isAsleep(p, at(23, 0)), false); // lights on
  Pet.toggleLights(p);
  assert.equal(Pet.isAsleep(p, at(23, 0)), true);
  assert.equal(Pet.isAsleep(p, at(15, 0)), false); // lights off, but daytime
  Pet.toggleLights(p);
  assert.equal(p.lightsOn, true);
});

test('mood follows the stats', function () {
  assert.equal(Pet.mood({ fullness: 5, health: 5 }), 'happy');
  assert.equal(Pet.mood({ fullness: 3, health: 5 }), 'okay');
  assert.equal(Pet.mood({ fullness: 1, health: 5 }), 'sad');
  assert.equal(Pet.mood({ fullness: 5, health: 2 }), 'sad');
  assert.equal(Pet.mood({ fullness: 5, health: 1 }), 'sick');
});

test('the three species and five attributes are named as the owner asked', function () {
  assert.deepEqual(Pet.SPECIES.map(function (k) { return Pet.SPECIES_NAMES[k]; }), ['Frog', 'Clown', 'Dog']);
  assert.deepEqual(Pet.ATTRIBUTES.map(function (k) { return Pet.ATTRIBUTE_NAMES[k]; }),
    ['Rowdiness', 'Angst', '\u2019Tism', 'Sin', 'Diligence']);
});

test('newSave records the chosen species', function () {
  var d = Pet.newSave('Bart', 'dog', 0);
  assert.equal(d.version, 3);
  assert.equal(d.pet.species, 'dog');
  assert.deepEqual(d.settings, { hungerPace: 'normal', clockOffsetMs: 0 });
});

test('a version 2 save is upgraded to a frog with zero attributes and no 2x setting', function () {
  var d = Pet.migrate({
    version: 2,
    pet: { name: 'Grooff', fullness: 2, health: 3, fitness: 1.5, stepProgress: 0.25, lightsOn: false,
      bedtime: 1260, wakeTime: 420, lastUpdate: 1000 },
    settings: { speed: 2, hungerPace: 'fast', clockOffsetMs: 60000 }
  });
  assert.equal(d.version, 3);
  assert.equal(d.pet.species, 'frog');
  assert.equal(d.pet.fitness, 1.5);
  assert.equal(d.pet.lightsOn, false);
  assert.deepEqual(d.pet.attributes, { rowdiness: 0, angst: 0, tism: 0, sin: 0, diligence: 0 });
  assert.deepEqual(d.settings, { hungerPace: 'fast', clockOffsetMs: 60000 });
});

test('a version 1 save is upgraded without losing the pet', function () {
  var old = {
    version: 1,
    pet: { name: 'Fleegul', fullness: 3, health: 4, carryMs: 2.5 * MIN, lastUpdate: 1000 },
    settings: { speed: 2 }
  };
  var d = Pet.migrate(old);
  assert.equal(d.version, 3);
  assert.equal(d.pet.name, 'Fleegul');
  assert.equal(d.pet.species, 'frog');
  assert.equal(d.pet.fullness, 3);
  assert.equal(d.pet.health, 4);
  assert.equal(d.pet.fitness, 0);
  assert.equal(d.pet.stepProgress, 0.5);
  assert.equal(d.pet.lightsOn, true);
  assert.equal(d.pet.bedtime, 21 * 60);
  assert.equal(d.pet.wakeTime, 7 * 60);
  assert.equal('carryMs' in d.pet, false);
  assert.deepEqual(d.settings, { hungerPace: 'normal', clockOffsetMs: 0 });
});

test('bad or unknown saves are rejected or repaired', function () {
  assert.equal(Pet.migrate(null), null);
  assert.equal(Pet.migrate({ version: 99, pet: { name: 'X', lastUpdate: 0 } }), null);
  assert.equal(Pet.migrate({ version: 3, pet: { lastUpdate: 0 } }), null);
  var d = Pet.migrate({
    version: 3,
    pet: { name: 'X', species: 'dragon', lastUpdate: 0, fullness: 9, health: -3, fitness: 2.3,
      stepProgress: 'oops', attributes: { angst: 12, sin: 'lots' } },
    settings: { speed: 7, hungerPace: 'turbo' }
  });
  assert.equal(d.pet.species, 'frog');
  assert.deepEqual(d.pet.attributes, { rowdiness: 0, angst: 5, tism: 0, sin: 0, diligence: 0 });
  assert.equal(d.pet.fullness, 5);
  assert.equal(d.pet.health, 0);
  assert.equal(d.pet.fitness, 2.5);
  assert.equal(d.pet.stepProgress, 0);
  assert.deepEqual(d.settings, { hungerPace: 'normal', clockOffsetMs: 0 });
});

test('negative or missing time does nothing', function () {
  var p = Pet.create('Bart', 'frog', 0);
  Pet.advance(p, -10 * MIN, NORMAL);
  Pet.advance(p, NaN, NORMAL);
  assert.equal(p.fullness, 5);
  assert.equal(p.stepProgress, 0);
});

test('generated names are capitalized, short, letters only, and allowed', function () {
  for (var i = 0; i < 5000; i++) {
    var n = Names.generate();
    assert.match(n, /^[A-Z][a-z]{2,9}$/);
    assert.ok(Names.isAllowed(n), n);
  }
});

console.log(passed + ' tests passed');
