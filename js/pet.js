// Pet rules: stats, the passage of time, feeding, and mood.
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
  var STEP_MS = 5 * 60 * 1000; // One hunger step every 5 minutes of game time.

  function clampStat(value) {
    var n = Math.round(Number(value));
    if (!isFinite(n)) return MAX_STAT;
    return Math.min(MAX_STAT, Math.max(0, n));
  }

  function create(name, now) {
    return {
      name: name,
      fullness: MAX_STAT,
      health: MAX_STAT,
      carryMs: 0,      // Game time accumulated toward the next step.
      lastUpdate: now  // Real clock time of the last update, in ms.
    };
  }

  // Repairs any out-of-range values in a loaded pet.
  function normalize(pet) {
    pet.fullness = clampStat(pet.fullness);
    pet.health = clampStat(pet.health);
    var carry = Number(pet.carryMs);
    pet.carryMs = isFinite(carry) ? Math.min(STEP_MS - 1, Math.max(0, carry)) : 0;
    return pet;
  }

  // One 5-minute step: fullness drops by 1. While fullness is 0, health
  // drops by 1; otherwise health recovers by 1.
  function step(pet) {
    pet.fullness = Math.max(0, pet.fullness - 1);
    if (pet.fullness === 0) {
      pet.health = Math.max(0, pet.health - 1);
    } else {
      pet.health = Math.min(MAX_STAT, pet.health + 1);
    }
  }

  // Moves the pet forward by gameMs of game time. Returns the number of steps taken.
  function advance(pet, gameMs) {
    if (!(gameMs > 0)) return 0;
    var total = pet.carryMs + gameMs;
    var steps = Math.floor(total / STEP_MS);
    pet.carryMs = total - steps * STEP_MS;
    for (var i = 0; i < steps; i++) {
      if (pet.fullness === 0 && pet.health === 0) break; // Nothing more can change.
      step(pet);
    }
    return steps;
  }

  // Game time remaining until the next step.
  function msUntilNextStep(pet) {
    return STEP_MS - pet.carryMs;
  }

  // Adds 1 fullness. Returns false if the pet is already full.
  function feed(pet) {
    if (pet.fullness >= MAX_STAT) return false;
    pet.fullness += 1;
    return true;
  }

  function mood(pet) {
    if (pet.health <= 1) return 'sick';
    if (pet.fullness <= 1 || pet.health <= 2) return 'sad';
    if (pet.fullness <= 3 || pet.health <= 3) return 'okay';
    return 'happy';
  }

  return {
    MAX_STAT: MAX_STAT,
    STEP_MS: STEP_MS,
    create: create,
    normalize: normalize,
    advance: advance,
    msUntilNextStep: msUntilNextStep,
    feed: feed,
    mood: mood
  };
});
