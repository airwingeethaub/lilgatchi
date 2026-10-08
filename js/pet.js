// Pet rules: species, stats, attributes, the passage of time, care actions,
// poop, cleanliness, items and money, travel destinations, bedtime, and mood.
// Also defines the save format and upgrades older saves.
// This file has no browser-specific code, so it can be tested with Node.
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.Pet = api;
  }
})(this, function () {
  'use strict';

  var MIN = 60 * 1000;
  var MAX_STAT = 5;
  var SAVE_VERSION = 4;

  // The three kinds of pet that can be chosen, in the order they are offered.
  var SPECIES = ['frog', 'clown', 'dog'];
  var SPECIES_NAMES = { frog: 'Frog', clown: 'Clown', dog: 'Dog' };

  // Personality attributes. All start at 0; ways to raise them come later.
  var ATTRIBUTES = ['rowdiness', 'angst', 'tism', 'sin', 'diligence'];
  var ATTRIBUTE_NAMES = {
    rowdiness: 'Rowdiness', angst: 'Angst', tism: '’Tism', sin: 'Sin', diligence: 'Diligence'
  };

  // How much game time passes between hunger steps, for each pace setting.
  var PACES = {
    normal: 5 * MIN, // 5 minutes
    fast: 10 * 1000  // 10 seconds (debug)
  };

  var FITNESS_PER_TRAINING = 0.5;
  var TRAINING_INJURY_CHANCE = 0.05;

  var CLEANLINESS_STEP_MS = 30 * MIN;  // Cleanliness drops by 0.5 every 30 minutes.
  var CLEANLINESS_DROP = 0.5;
  var POOP_MIN_MS = 30 * MIN;          // A poop arrives 30 to 100 minutes after the last.
  var POOP_MAX_MS = 100 * MIN;
  var POOP_PILE_LIMIT = 4;             // More than this many poops hurts health...
  var POOP_PENALTY_MS = 5 * MIN;       // ...by 0.5 every 5 minutes.
  var POOP_PENALTY = 0.5;
  var MAX_POOPS = 12;                  // No more pile up beyond this, to keep the picture readable.

  var DEFAULT_BEDTIME = 21 * 60; // 9:00 PM, in minutes after midnight
  var DEFAULT_WAKE_TIME = 7 * 60; // 7:00 AM

  // Every item that can be owned. Consumable items lose one unit per use;
  // the others can be used again and again.
  var ITEMS = {
    md2020: { name: 'MD 20/20', unit: 'pint', units: 'pints', consumable: true,
      useText: 'drank a pint of MD 20/20.', floater: 'Glug glug' },
    ngage: { name: 'Nokia N-Gage', consumable: false,
      useText: 'played some N-Gage.', floater: 'Beep boop' },
    pallmall: { name: 'Pall Mall Menthols', unit: 'cigarette', units: 'cigarettes', consumable: true,
      useText: 'smoked a Pall Mall menthol.', floater: '*cough*' },
    vape: { name: 'Vape', consumable: false,
      useText: 'hit the vape.', floater: '*puff*' },
    longsword: { name: 'Rusty longsword', consumable: false,
      useText: 'swung the rusty longsword around.', floater: 'Swish!' },
    bugjar: { name: 'Bug in a jar', consumable: false,
      useText: 'stared at the bug in the jar.', floater: '...' }
  };

  // What every new pet starts with. Half a pack of cigarettes is 10.
  var STARTING_MONEY = 1000;
  var STARTING_ITEMS = { md2020: 1, ngage: 1, pallmall: 10 };

  // Places the pet can travel to, in the order they are offered.
  var LOCATIONS = ['shop', 'bathhouse'];
  var LOCATION_NAMES = { shop: 'The Shop', bathhouse: 'Bathhouse' };

  // What The Shop sells, in order. Prices are in dollars, for one item.
  var SHOP_STOCK = [
    { id: 'vape', price: 500 },
    { id: 'longsword', price: 500 },
    { id: 'bugjar', price: 500 }
  ];

  function clamp(value, min, max, fallback) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function toHalf(value) {
    return Math.round(value * 2) / 2;
  }

  function zeroAttributes() {
    var attributes = {};
    ATTRIBUTES.forEach(function (key) { attributes[key] = 0; });
    return attributes;
  }

  function startingInventory() {
    var items = {};
    Object.keys(STARTING_ITEMS).forEach(function (id) { items[id] = STARTING_ITEMS[id]; });
    return { money: STARTING_MONEY, items: items };
  }

  function randomPoopDelay(rand) {
    return POOP_MIN_MS + rand() * (POOP_MAX_MS - POOP_MIN_MS);
  }

  function create(name, species, now, rand) {
    rand = rand || Math.random;
    return {
      name: name,
      species: species,
      fullness: MAX_STAT,
      health: MAX_STAT,
      fitness: 0,
      cleanliness: MAX_STAT,
      attributes: zeroAttributes(),
      inventory: startingInventory(),
      poops: [],                         // Each is { x, y }: a position on the picture, in percent.
      stepProgress: 0,                   // Fraction (0 to 1) of the way to the next hunger step.
      cleanlinessMs: 0,                  // Game time toward the next cleanliness drop.
      nextPoopMs: randomPoopDelay(rand), // Game time until the next poop.
      poopPenaltyMs: 0,                  // Game time spent with too many poops, toward the next health loss.
      lightsOn: true,
      bedtime: DEFAULT_BEDTIME,
      wakeTime: DEFAULT_WAKE_TIME,
      lastUpdate: now                    // Real clock time of the last update, in ms.
    };
  }

  function defaultSettings() {
    return { hungerPace: 'normal', clockOffsetMs: 0 };
  }

  function newSave(name, species, now, rand) {
    return { version: SAVE_VERSION, pet: create(name, species, now, rand), settings: defaultSettings() };
  }

  function normalizeInventory(inventory) {
    inventory = inventory && typeof inventory === 'object' ? inventory : startingInventory();
    var items = inventory.items && typeof inventory.items === 'object' ? inventory.items : {};
    var clean = {};
    Object.keys(items).forEach(function (id) {
      var count = Math.floor(clamp(items[id], 0, 1e6, 0));
      if (ITEMS[id] && count > 0) clean[id] = count;
    });
    return { money: Math.floor(clamp(inventory.money, 0, 1e12, 0)), items: clean };
  }

  function normalizePoops(poops) {
    if (!Array.isArray(poops)) return [];
    return poops.filter(function (p) {
      return p && isFinite(p.x) && isFinite(p.y);
    }).slice(0, MAX_POOPS).map(function (p) {
      return { x: clamp(p.x, 0, 100, 50), y: clamp(p.y, 0, 100, 50) };
    });
  }

  // Repairs any missing or out-of-range values in a loaded pet.
  function normalize(pet, rand) {
    rand = rand || Math.random;
    pet.species = SPECIES.indexOf(pet.species) !== -1 ? pet.species : 'frog';
    var attributes = pet.attributes && typeof pet.attributes === 'object' ? pet.attributes : {};
    pet.attributes = {};
    ATTRIBUTES.forEach(function (key) {
      pet.attributes[key] = toHalf(clamp(attributes[key], 0, MAX_STAT, 0));
    });
    pet.fullness = Math.round(clamp(pet.fullness, 0, MAX_STAT, MAX_STAT));
    pet.health = toHalf(clamp(pet.health, 0, MAX_STAT, MAX_STAT));
    pet.fitness = toHalf(clamp(pet.fitness, 0, MAX_STAT, 0));
    pet.cleanliness = toHalf(clamp(pet.cleanliness, 0, MAX_STAT, MAX_STAT));
    pet.inventory = normalizeInventory(pet.inventory);
    pet.poops = normalizePoops(pet.poops);
    pet.stepProgress = clamp(pet.stepProgress, 0, 0.999999, 0);
    pet.cleanlinessMs = clamp(pet.cleanlinessMs, 0, CLEANLINESS_STEP_MS - 1, 0);
    pet.nextPoopMs = isFinite(pet.nextPoopMs)
      ? clamp(pet.nextPoopMs, 1, POOP_MAX_MS, POOP_MAX_MS) : randomPoopDelay(rand);
    pet.poopPenaltyMs = clamp(pet.poopPenaltyMs, 0, POOP_PENALTY_MS - 1, 0);
    pet.lightsOn = pet.lightsOn !== false;
    pet.bedtime = Math.round(clamp(pet.bedtime, 0, 1439, DEFAULT_BEDTIME));
    pet.wakeTime = Math.round(clamp(pet.wakeTime, 0, 1439, DEFAULT_WAKE_TIME));
    return pet;
  }

  function normalizeSettings(settings) {
    delete settings.speed; // The 2x speed setting was removed in version 3.
    settings.hungerPace = PACES[settings.hungerPace] ? settings.hungerPace : 'normal';
    settings.clockOffsetMs = clamp(settings.clockOffsetMs, -1e13, 1e13, 0);
    return settings;
  }

  // Turns any saved data into a current-version save, or returns null if it
  // cannot be used.
  function migrate(data, rand) {
    rand = rand || Math.random;
    if (!data || typeof data !== 'object' || !data.pet || typeof data.pet.name !== 'string' ||
        !isFinite(data.pet.lastUpdate)) {
      return null;
    }
    if (data.version === 1) {
      // Version 1 stored progress as milliseconds toward a 5-minute step,
      // and had no fitness, lights, bedtime, hunger pace, or clock offset.
      var carry = Number(data.pet.carryMs);
      data.pet.stepProgress = isFinite(carry) ? carry / PACES.normal : 0;
      delete data.pet.carryMs;
      data.version = 2;
    }
    if (data.version === 2) {
      // Version 2 had no species or attributes, and had a 2x speed setting.
      // Every version 2 pet used the frog picture.
      data.pet.species = 'frog';
      data.pet.attributes = zeroAttributes();
      if (data.settings) delete data.settings.speed;
      data.version = 3;
    }
    if (data.version === 3) {
      // Version 3 had no cleanliness, poop, items, or money. Existing pets
      // get the same starting items and a clean slate as a new pet.
      data.pet.cleanliness = MAX_STAT;
      data.pet.inventory = startingInventory();
      data.pet.poops = [];
      data.pet.cleanlinessMs = 0;
      data.pet.nextPoopMs = randomPoopDelay(rand);
      data.pet.poopPenaltyMs = 0;
      data.version = 4;
    }
    if (data.version !== SAVE_VERSION) return null;
    data.settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
    normalize(data.pet, rand);
    normalizeSettings(data.settings);
    return data;
  }

  // One hunger step: fullness drops by 1. If fullness is already empty,
  // health drops by 1 instead.
  function hungerStep(pet) {
    if (pet.fullness > 0) {
      pet.fullness -= 1;
    } else {
      pet.health = Math.max(0, pet.health - 1);
    }
  }

  function addPoop(pet, rand) {
    if (pet.poops.length >= MAX_POOPS) return false;
    // Keep clear of the edges and of the clock and mood badges at the top corners.
    pet.poops.push({ x: 10 + rand() * 80, y: 24 + rand() * 66 });
    return true;
  }

  // True when nothing can change any more, however long time runs.
  function isSettled(pet) {
    return pet.fullness === 0 && pet.health === 0 && pet.cleanliness === 0 &&
      pet.poops.length >= MAX_POOPS;
  }

  var EPSILON = 1e-6;

  // Moves the pet forward by gameMs of game time, with stepMs between hunger
  // steps. Every timer (hunger, cleanliness, poop, and the poop pile penalty)
  // is handled in time order, so a long absence plays out just as it would
  // have live. rand is optional, for testing.
  function advance(pet, gameMs, stepMs, rand) {
    rand = rand || Math.random;
    if (!(gameMs > 0) || !(stepMs > 0)) return;
    var remaining = gameMs;
    while (remaining > EPSILON) {
      if (isSettled(pet)) return;
      var penaltyActive = pet.poops.length > POOP_PILE_LIMIT;
      var dt = Math.min(
        remaining,
        (1 - pet.stepProgress) * stepMs,
        CLEANLINESS_STEP_MS - pet.cleanlinessMs,
        pet.nextPoopMs,
        penaltyActive ? POOP_PENALTY_MS - pet.poopPenaltyMs : Infinity
      );
      dt = Math.max(dt, 0);
      remaining -= dt;
      pet.stepProgress += dt / stepMs;
      pet.cleanlinessMs += dt;
      pet.nextPoopMs -= dt;
      if (penaltyActive) pet.poopPenaltyMs += dt;

      if (pet.stepProgress >= 1 - EPSILON / stepMs) {
        pet.stepProgress = 0;
        hungerStep(pet);
      }
      if (pet.cleanlinessMs >= CLEANLINESS_STEP_MS - EPSILON) {
        pet.cleanlinessMs = 0;
        pet.cleanliness = Math.max(0, pet.cleanliness - CLEANLINESS_DROP);
      }
      if (pet.nextPoopMs <= EPSILON) {
        addPoop(pet, rand);
        pet.nextPoopMs = randomPoopDelay(rand);
      }
      if (penaltyActive && pet.poopPenaltyMs >= POOP_PENALTY_MS - EPSILON) {
        pet.poopPenaltyMs = 0;
        pet.health = Math.max(0, pet.health - POOP_PENALTY);
      }
      if (pet.poops.length <= POOP_PILE_LIMIT) pet.poopPenaltyMs = 0;
    }
  }

  // Game time remaining until the next hunger step.
  function msUntilNextStep(pet, stepMs) {
    return (1 - pet.stepProgress) * stepMs;
  }

  // Adds 1 fullness. Returns false if the pet is already full.
  function feed(pet) {
    if (pet.fullness >= MAX_STAT) return false;
    pet.fullness += 1;
    return true;
  }

  // Adds 1 health, up to 5. Returns false if health is already full.
  function giveMedicine(pet) {
    if (pet.health >= MAX_STAT) return false;
    pet.health = Math.min(MAX_STAT, pet.health + 1);
    return true;
  }

  // Adds 0.5 fitness, with a 5% chance of losing 1 health.
  // Returns { trained, injured }. rand is optional, for testing.
  function train(pet, rand) {
    rand = rand || Math.random;
    if (pet.fitness >= MAX_STAT) return { trained: false, injured: false };
    pet.fitness = Math.min(MAX_STAT, pet.fitness + FITNESS_PER_TRAINING);
    var injured = rand() < TRAINING_INJURY_CHANCE && pet.health > 0;
    if (injured) pet.health = Math.max(0, pet.health - 1);
    return { trained: true, injured: injured };
  }

  // Removes every poop. Returns how many were cleaned up.
  function cleanUp(pet) {
    var count = pet.poops.length;
    pet.poops = [];
    pet.poopPenaltyMs = 0;
    return count;
  }

  // Adds a poop right away (debug). Returns false if the pile is at its limit.
  function poopNow(pet, rand) {
    return addPoop(pet, rand || Math.random);
  }

  // A visit to the bathhouse fills cleanliness and restarts its 30-minute timer.
  function bathe(pet) {
    pet.cleanliness = MAX_STAT;
    pet.cleanlinessMs = 0;
  }

  // Describes how many of an item there are, such as "10 cigarettes".
  function describeCount(id, count) {
    var item = ITEMS[id];
    if (item.unit) return count + ' ' + (count === 1 ? item.unit : item.units);
    return count > 1 ? '×' + count : '';
  }

  // Uses an item. Consumable items lose one unit and disappear at zero.
  // Returns { used, consumed, item } or { used: false } if there is none.
  function useItem(pet, id) {
    var items = pet.inventory.items;
    if (!ITEMS[id] || !(items[id] > 0)) return { used: false };
    var item = ITEMS[id];
    if (item.consumable) {
      items[id] -= 1;
      if (items[id] === 0) delete items[id];
    }
    return { used: true, consumed: item.consumable, item: item };
  }

  function shopPrice(id) {
    for (var i = 0; i < SHOP_STOCK.length; i++) {
      if (SHOP_STOCK[i].id === id) return SHOP_STOCK[i].price;
    }
    return null;
  }

  // Buys one of an item from The Shop. Returns false if The Shop does not
  // sell it or there is not enough money.
  function buy(pet, id) {
    var price = shopPrice(id);
    if (price === null || pet.inventory.money < price) return false;
    pet.inventory.money -= price;
    pet.inventory.items[id] = (pet.inventory.items[id] || 0) + 1;
    return true;
  }

  function toggleLights(pet) {
    pet.lightsOn = !pet.lightsOn;
    return pet.lightsOn;
  }

  // True if the given clock time falls between the pet's bedtime and wake time.
  function isBedtime(pet, date) {
    var minutes = date.getHours() * 60 + date.getMinutes();
    if (pet.bedtime > pet.wakeTime) {
      return minutes >= pet.bedtime || minutes < pet.wakeTime; // Spans midnight.
    }
    return minutes >= pet.bedtime && minutes < pet.wakeTime;
  }

  // The pet is asleep when the lights are off and it is past its bedtime.
  function isAsleep(pet, date) {
    return !pet.lightsOn && isBedtime(pet, date);
  }

  function mood(pet) {
    if (pet.health <= 1) return 'sick';
    if (pet.fullness <= 1 || pet.health <= 2) return 'sad';
    if (pet.fullness <= 3 || pet.health <= 3) return 'okay';
    return 'happy';
  }

  return {
    MAX_STAT: MAX_STAT,
    SAVE_VERSION: SAVE_VERSION,
    SPECIES: SPECIES,
    SPECIES_NAMES: SPECIES_NAMES,
    ATTRIBUTES: ATTRIBUTES,
    ATTRIBUTE_NAMES: ATTRIBUTE_NAMES,
    PACES: PACES,
    ITEMS: ITEMS,
    STARTING_MONEY: STARTING_MONEY,
    STARTING_ITEMS: STARTING_ITEMS,
    LOCATIONS: LOCATIONS,
    LOCATION_NAMES: LOCATION_NAMES,
    SHOP_STOCK: SHOP_STOCK,
    POOP_PILE_LIMIT: POOP_PILE_LIMIT,
    MAX_POOPS: MAX_POOPS,
    create: create,
    newSave: newSave,
    migrate: migrate,
    normalize: normalize,
    advance: advance,
    msUntilNextStep: msUntilNextStep,
    feed: feed,
    giveMedicine: giveMedicine,
    train: train,
    cleanUp: cleanUp,
    poopNow: poopNow,
    bathe: bathe,
    describeCount: describeCount,
    useItem: useItem,
    buy: buy,
    toggleLights: toggleLights,
    isBedtime: isBedtime,
    isAsleep: isAsleep,
    mood: mood
  };
});
