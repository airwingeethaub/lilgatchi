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
  assert.equal(d.version, 4);
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
  assert.equal(d.version, 4);
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
  assert.equal(d.version, 4);
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

// A repeatable stand-in for Math.random, so two runs see the same "random" numbers.
function seeded(seed) {
  return function () {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

function constant(value) {
  return function () { return value; };
}

test('a new pet starts clean, with the starting items and $1000', function () {
  var p = Pet.create('Bart', 'frog', 0);
  assert.equal(p.cleanliness, 5);
  assert.deepEqual(p.poops, []);
  assert.deepEqual(p.inventory, { money: 1000, items: { md2020: 1, ngage: 1, pallmall: 10 } });
  assert.equal(Pet.ITEMS.md2020.name, 'MD 20/20');
  assert.equal(Pet.ITEMS.ngage.name, 'Nokia N-Gage');
  assert.equal(Pet.ITEMS.pallmall.name, 'Pall Mall Menthols');
});

test('starting items are copied, so one pet cannot change another', function () {
  var a = Pet.create('A', 'frog', 0);
  var b = Pet.create('B', 'frog', 0);
  Pet.useItem(a, 'pallmall');
  assert.equal(b.inventory.items.pallmall, 10);
  assert.equal(Pet.STARTING_ITEMS.pallmall, 10);
});

test('cleanliness drops by 0.5 every 30 minutes, whatever the hunger pace, and stops at 0', function () {
  var p = Pet.create('Bart', 'frog', 0);
  p.nextPoopMs = 1e12; // No poop in this test.
  Pet.advance(p, 30 * MIN - 1, NORMAL);
  assert.equal(p.cleanliness, 5);
  Pet.advance(p, 1, NORMAL);
  assert.equal(p.cleanliness, 4.5);
  Pet.advance(p, 60 * MIN, FAST);
  assert.equal(p.cleanliness, 3.5);
  Pet.advance(p, 24 * 60 * MIN, NORMAL);
  assert.equal(p.cleanliness, 0);
});

test('the bathhouse fills cleanliness and restarts its timer', function () {
  var p = Pet.create('Bart', 'frog', 0);
  p.nextPoopMs = 1e12;
  Pet.advance(p, 95 * MIN, NORMAL);
  assert.equal(p.cleanliness, 3.5);
  Pet.bathe(p);
  assert.equal(p.cleanliness, 5);
  Pet.advance(p, 29 * MIN, NORMAL);
  assert.equal(p.cleanliness, 5);
  Pet.advance(p, 1 * MIN, NORMAL);
  assert.equal(p.cleanliness, 4.5);
});

test('poop arrives between 30 and 100 minutes apart', function () {
  var early = Pet.create('A', 'frog', 0, constant(0));
  Pet.advance(early, 30 * MIN - 1, NORMAL, constant(0));
  assert.equal(early.poops.length, 0);
  Pet.advance(early, 1, NORMAL, constant(0));
  assert.equal(early.poops.length, 1);

  var late = Pet.create('B', 'frog', 0, constant(0.9999999));
  Pet.advance(late, 99.99 * MIN, NORMAL, constant(0.9999999));
  assert.equal(late.poops.length, 0);
  Pet.advance(late, 0.02 * MIN, NORMAL, constant(0.9999999));
  assert.equal(late.poops.length, 1);

  var rand = seeded(7);
  for (var i = 0; i < 1000; i++) {
    var p = Pet.create('C', 'frog', 0, rand);
    assert.ok(p.nextPoopMs >= 30 * MIN && p.nextPoopMs <= 100 * MIN);
  }
});

test('poops land inside the picture, away from the top-corner badges', function () {
  var p = Pet.create('Bart', 'frog', 0);
  var rand = seeded(3);
  for (var i = 0; i < 500; i++) {
    Pet.cleanUp(p);
    Pet.poopNow(p, rand);
    var spot = p.poops[0];
    assert.ok(spot.x >= 10 && spot.x <= 90, String(spot.x));
    assert.ok(spot.y >= 24 && spot.y <= 90, String(spot.y));
  }
});

test('more than 4 poops costs 0.5 health every 5 minutes; 4 poops costs nothing', function () {
  var p = Pet.create('Bart', 'frog', 0);
  p.nextPoopMs = 1e12;
  for (var i = 0; i < 4; i++) Pet.poopNow(p);
  p.fullness = 5;
  Pet.advance(p, 20 * MIN, NORMAL); // fullness 5 -> 1, still food, so no starving
  assert.equal(p.health, 5);
  Pet.poopNow(p); // 5 poops
  p.fullness = 5;
  Pet.advance(p, 5 * MIN - 1, NORMAL);
  assert.equal(p.health, 5);
  Pet.advance(p, 1, NORMAL);
  assert.equal(p.health, 4.5);
  Pet.advance(p, 10 * MIN, NORMAL);
  assert.equal(p.health, 3.5);
});

test('cleaning up removes every poop and restarts the pile penalty', function () {
  var p = Pet.create('Bart', 'frog', 0);
  p.nextPoopMs = 1e12;
  for (var i = 0; i < 6; i++) Pet.poopNow(p);
  Pet.advance(p, 4 * MIN, NORMAL);
  assert.equal(Pet.cleanUp(p), 6);
  assert.equal(p.poops.length, 0);
  for (i = 0; i < 5; i++) Pet.poopNow(p);
  Pet.advance(p, 4 * MIN, NORMAL); // only 4 minutes since the pile came back
  assert.equal(p.health, 5);
  Pet.advance(p, 1 * MIN, NORMAL);
  assert.equal(p.health, 4.5);
});

test('poop stops piling up at the limit', function () {
  var p = Pet.create('Bart', 'frog', 0);
  for (var i = 0; i < 20; i++) Pet.poopNow(p);
  assert.equal(p.poops.length, Pet.MAX_POOPS);
  assert.equal(Pet.poopNow(p), false);
});

test('a long absence plays out the same as many small ticks', function () {
  var a = Pet.create('A', 'frog', 0, seeded(11));
  var b = Pet.create('B', 'frog', 0, seeded(11));
  var randA = seeded(42);
  var randB = seeded(42);
  Pet.advance(a, 8 * 60 * MIN, NORMAL, randA);
  for (var i = 0; i < 8 * 60 * 4; i++) Pet.advance(b, 15 * 1000, NORMAL, randB);
  assert.equal(a.fullness, b.fullness);
  assert.equal(a.health, b.health);
  assert.equal(a.cleanliness, b.cleanliness);
  assert.equal(a.poops.length, b.poops.length);
  assert.ok(a.poops.length > 0);
});

test('a month away settles at the bottom without errors', function () {
  var p = Pet.create('Bart', 'frog', 0);
  Pet.advance(p, 30 * 24 * 60 * MIN, FAST);
  assert.equal(p.fullness, 0);
  assert.equal(p.health, 0);
  assert.equal(p.cleanliness, 0);
  assert.equal(p.poops.length, Pet.MAX_POOPS);
});

test('using items: drinks and cigarettes run out, the N-Gage does not', function () {
  var p = Pet.create('Bart', 'frog', 0);
  var r = Pet.useItem(p, 'md2020');
  assert.equal(r.used, true);
  assert.equal(r.consumed, true);
  assert.equal('md2020' in p.inventory.items, false);
  assert.equal(Pet.useItem(p, 'md2020').used, false);

  Pet.useItem(p, 'pallmall');
  assert.equal(p.inventory.items.pallmall, 9);

  r = Pet.useItem(p, 'ngage');
  assert.equal(r.used, true);
  assert.equal(r.consumed, false);
  assert.equal(p.inventory.items.ngage, 1);

  assert.equal(Pet.useItem(p, 'nothing').used, false);
  assert.equal(p.inventory.money, 1000);
});

test('item counts read naturally', function () {
  assert.equal(Pet.describeCount('md2020', 1), '1 pint');
  assert.equal(Pet.describeCount('pallmall', 10), '10 cigarettes');
  assert.equal(Pet.describeCount('pallmall', 1), '1 cigarette');
  assert.equal(Pet.describeCount('ngage', 1), '');
  assert.equal(Pet.describeCount('longsword', 2), '\u00d72');
});

test('The Shop sells a vape, a rusty longsword, and a bug in a jar at $500 each', function () {
  assert.deepEqual(Pet.SHOP_STOCK.map(function (s) { return [Pet.ITEMS[s.id].name, s.price]; }),
    [['Vape', 500], ['Rusty longsword', 500], ['Bug in a jar', 500]]);
  assert.deepEqual(Pet.LOCATIONS.map(function (k) { return Pet.LOCATION_NAMES[k]; }), ['The Shop', 'Bathhouse']);
});

test('buying spends money and adds the item; it fails without enough money', function () {
  var p = Pet.create('Bart', 'frog', 0);
  assert.equal(Pet.buy(p, 'vape'), true);
  assert.equal(p.inventory.money, 500);
  assert.equal(p.inventory.items.vape, 1);
  assert.equal(Pet.buy(p, 'vape'), true);
  assert.equal(p.inventory.items.vape, 2);
  assert.equal(p.inventory.money, 0);
  assert.equal(Pet.buy(p, 'bugjar'), false);
  assert.equal('bugjar' in p.inventory.items, false);
  p.inventory.money = 5000;
  assert.equal(Pet.buy(p, 'md2020'), false); // The Shop does not sell it.
  assert.equal(p.inventory.money, 5000);
});

test('medicine tops health up to 5 from a half point', function () {
  var p = Pet.create('Bart', 'frog', 0);
  p.health = 4.5;
  assert.equal(Pet.giveMedicine(p), true);
  assert.equal(p.health, 5);
});

test('a version 3 save gets cleanliness, no poop, and the starting items', function () {
  var d = Pet.migrate({
    version: 3,
    pet: { name: 'Glonk', species: 'clown', fullness: 4, health: 3, fitness: 2,
      attributes: { rowdiness: 0, angst: 0, tism: 0, sin: 0, diligence: 0 },
      stepProgress: 0.5, lightsOn: true, bedtime: 1260, wakeTime: 420, lastUpdate: 1000 },
    settings: { hungerPace: 'normal', clockOffsetMs: 0 }
  });
  assert.equal(d.version, 4);
  assert.equal(d.pet.species, 'clown');
  assert.equal(d.pet.health, 3);
  assert.equal(d.pet.cleanliness, 5);
  assert.deepEqual(d.pet.poops, []);
  assert.deepEqual(d.pet.inventory, { money: 1000, items: { md2020: 1, ngage: 1, pallmall: 10 } });
  assert.ok(d.pet.nextPoopMs >= 30 * MIN && d.pet.nextPoopMs <= 100 * MIN);
});

test('bad inventory and poop data are repaired', function () {
  var d = Pet.migrate({
    version: 4,
    pet: { name: 'X', lastUpdate: 0, inventory: { money: -5, items: { vape: 2, laser: 3, pallmall: 'many' } },
      poops: [{ x: 50, y: 50 }, null, { x: 'a' }, { x: 500, y: -2 }], nextPoopMs: 'soon', cleanliness: 7 },
    settings: {}
  });
  assert.deepEqual(d.pet.inventory, { money: 0, items: { vape: 2 } });
  assert.deepEqual(d.pet.poops, [{ x: 50, y: 50 }, { x: 100, y: 0 }]);
  assert.ok(d.pet.nextPoopMs >= 30 * MIN && d.pet.nextPoopMs <= 100 * MIN);
  assert.equal(d.pet.cleanliness, 5);
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
