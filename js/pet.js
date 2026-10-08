// Pet rules: species, stats, attributes, the passage of time, care actions,
// bedtime, and mood.
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

  var MAX_STAT = 5;
  var SAVE_VERSION = 3;

  // The three kinds of pet that can be chosen, in the order they are offered.
  var SPECIES = ['frog', 'clown', 'dog'];
  var SPECIES_NAMES = { frog: 'Frog', clown: 'Clown', dog: 'Dog' };

  // Personality attributes. All start at 0; ways to raise them come later.
  var ATTRIBUTES = ['rowdiness', 'angst', 'tism', 'sin', 'diligence'];
  var ATTRIBUTE_NAMES = {
    rowdiness: 'Rowdiness', angst: 'Angst', tism: '\u2019Tism', sin: 'Sin', diligence: 'Diligence'
  };

  // How much game time passes between hunger steps, for each pace setting.
  var PACES = {
    normal: 5 * 60 * 1000, // 5 minutes
    fast: 10 * 1000        // 10 seconds (debug)
  };

  var FITNESS_PER_TRAINING = 0.5;
  var TRAINING_INJURY_CHANCE = 0.05;

  var DEFAULT_BEDTIME = 21 * 60; // 9:00 PM, in minutes after midnight
  var DEFAULT_WAKE_TIME = 7 * 60; // 7:00 AM

  function clamp(value, min, max, fallback) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function zeroAttributes() {
    var attributes = {};
    ATTRIBUTES.forEach(function (key) { attributes[key] = 0; });
    return attributes;
  }

  function create(name, species, now) {
    return {
      name: name,
      species: species,
      fullness: MAX_STAT,
      health: MAX_STAT,
      fitness: 0,
      attributes: zeroAttributes(),
      stepProgress: 0, // Fraction (0 to 1) of the way to the next hunger step.
      lightsOn: true,
      bedtime: DEFAULT_BEDTIME,
      wakeTime: DEFAULT_WAKE_TIME,
      lastUpdate: now // Real clock time of the last update, in ms.
    };
  }

  function defaultSettings() {
    return { hungerPace: 'normal', clockOffsetMs: 0 };
  }

  function newSave(name, species, now) {
    return { version: SAVE_VERSION, pet: create(name, species, now), settings: defaultSettings() };
  }

  // Repairs any missing or out-of-range values in a loaded pet.
  function normalize(pet) {
    pet.species = SPECIES.indexOf(pet.species) !== -1 ? pet.species : 'frog';
    var attributes = pet.attributes && typeof pet.attributes === 'object' ? pet.attributes : {};
    pet.attributes = {};
    ATTRIBUTES.forEach(function (key) {
      pet.attributes[key] = Math.round(clamp(attributes[key], 0, MAX_STAT, 0) * 2) / 2;
    });
    pet.fullness = Math.round(clamp(pet.fullness, 0, MAX_STAT, MAX_STAT));
    pet.health = Math.round(clamp(pet.health, 0, MAX_STAT, MAX_STAT));
    pet.fitness = Math.round(clamp(pet.fitness, 0, MAX_STAT, 0) * 2) / 2;
    pet.stepProgress = clamp(pet.stepProgress, 0, 0.999999, 0);
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
  function migrate(data) {
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
    if (data.version !== SAVE_VERSION) return null;
    data.settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
    normalize(data.pet);
    normalizeSettings(data.settings);
    return data;
  }

  // One hunger step: fullness drops by 1. If fullness is already empty,
  // health drops by 1 instead.
  function step(pet) {
    if (pet.fullness > 0) {
      pet.fullness -= 1;
    } else if (pet.health > 0) {
      pet.health -= 1;
    }
  }

  // Moves the pet forward by gameMs of game time, with stepMs between hunger
  // steps. Returns the number of steps taken.
  function advance(pet, gameMs, stepMs) {
    if (!(gameMs > 0) || !(stepMs > 0)) return 0;
    var total = pet.stepProgress * stepMs + gameMs;
    var steps = Math.floor(total / stepMs);
    pet.stepProgress = (total - steps * stepMs) / stepMs;
    for (var i = 0; i < steps; i++) {
      if (pet.fullness === 0 && pet.health === 0) break; // Nothing more can change.
      step(pet);
    }
    return steps;
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

  // Adds 1 health. Returns false if health is already full.
  function giveMedicine(pet) {
    if (pet.health >= MAX_STAT) return false;
    pet.health += 1;
    return true;
  }

  // Adds 0.5 fitness, with a 5% chance of losing 1 health.
  // Returns { trained, injured }. rand is optional, for testing.
  function train(pet, rand) {
    rand = rand || Math.random;
    if (pet.fitness >= MAX_STAT) return { trained: false, injured: false };
    pet.fitness = Math.min(MAX_STAT, pet.fitness + FITNESS_PER_TRAINING);
    var injured = rand() < TRAINING_INJURY_CHANCE && pet.health > 0;
    if (injured) pet.health -= 1;
    return { trained: true, injured: injured };
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
    create: create,
    newSave: newSave,
    migrate: migrate,
    normalize: normalize,
    advance: advance,
    msUntilNextStep: msUntilNextStep,
    feed: feed,
    giveMedicine: giveMedicine,
    train: train,
    toggleLights: toggleLights,
    isBedtime: isBedtime,
    isAsleep: isAsleep,
    mood: mood
  };
});
