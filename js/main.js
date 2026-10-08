// Connects the pet rules to the page: drawing, buttons, timers, the clock, and saving.
(function () {
  'use strict';

  var TICK_MS = 250;

  // Critter art. When real art exists, set `blink` to a closed-eyes image
  // (for example 'assets/critter-blink.png') and blinking will swap to it.
  // While `blink` is null, the critter does a quick squash instead.
  var ART = { idle: 'assets/critter.jpg', blink: null };

  var MOOD_LABELS = { happy: 'Happy', okay: 'Okay', sad: 'Sad', sick: 'Sick' };

  function face(fill, inner) {
    return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10" fill="' + fill + '" stroke="#3b3530" stroke-width="1.3"/>' +
      '<g fill="none" stroke="#3b3530" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      inner + '</g></svg>';
  }

  var MOOD_ICONS = {
    happy: face('#ffd75e', '<path d="M7 10.5q1.5-2 3 0M14 10.5q1.5-2 3 0"/><path d="M7.5 14q4.5 4.5 9 0"/>'),
    okay: face('#ffe7a3', '<path d="M8.5 10v.4M15.5 10v.4" stroke-width="2.4"/><path d="M8.5 15.5h7"/>'),
    sad: face('#cfe0f5', '<path d="M8.5 10v.4M15.5 10v.4" stroke-width="2.4"/><path d="M8 17q4-3.5 8 0"/>'),
    sick: face('#c9e3b5', '<path d="M7 8.5l3 3M10 8.5l-3 3M14 8.5l3 3M17 8.5l-3 3"/><path d="M7.5 16.5q1.5-1.5 3 0t3 0t3 0"/>')
  };

  var data;
  var els = {};
  var shownMood = null;

  function persist() {
    LilStorage.save(data);
  }

  function stepMs() {
    return Pet.PACES[data.settings.hungerPace];
  }

  // The time shown on the clock: the system clock plus any offset from a
  // manually set time or from running at 2x speed.
  function clockNow() {
    return new Date(Date.now() + data.settings.clockOffsetMs);
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function formatClock(date) {
    var h = date.getHours();
    var suffix = h < 12 ? 'AM' : 'PM';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + pad(date.getMinutes()) + ' ' + suffix;
  }

  function formatCountdown(ms) {
    var totalSeconds = Math.ceil(ms / 1000);
    return Math.floor(totalSeconds / 60) + ':' + pad(totalSeconds % 60);
  }

  function buildPips(container) {
    for (var i = 0; i < Pet.MAX_STAT; i++) {
      var pip = document.createElement('span');
      pip.className = 'pip';
      container.appendChild(pip);
    }
  }

  // Fills whole segments, plus a half segment for values such as 2.5.
  function renderPips(container, value) {
    var pips = container.children;
    for (var i = 0; i < pips.length; i++) {
      pips[i].classList.toggle('on', i + 1 <= value);
      pips[i].classList.toggle('half', i < value && i + 1 > value);
    }
    container.setAttribute('aria-valuenow', String(value));
  }

  function setHand(el, degrees) {
    el.setAttribute('transform', 'rotate(' + degrees + ' 20 20)');
  }

  function renderClock(now) {
    var h = now.getHours() % 12;
    var m = now.getMinutes();
    var s = now.getSeconds();
    setHand(els.handHour, (h + m / 60) * 30);
    setHand(els.handMinute, (m + s / 60) * 6);
    setHand(els.handSecond, s * 6);
    var label = formatClock(now);
    els.clock.title = label;
    els.clock.setAttribute('aria-label', 'Time: ' + label);
    els.clockReadout.textContent = label;
  }

  function render() {
    var pet = data.pet;
    var now = clockNow();

    els.name.textContent = pet.name;
    els.name.title = pet.name;
    renderPips(els.health, pet.health);
    renderPips(els.fullness, pet.fullness);
    renderPips(els.fitness, pet.fitness);

    var mood = Pet.mood(pet);
    if (mood !== shownMood) {
      els.mood.innerHTML = MOOD_ICONS[mood];
      els.mood.title = 'Mood: ' + MOOD_LABELS[mood];
      els.mood.setAttribute('aria-label', 'Mood: ' + MOOD_LABELS[mood]);
      shownMood = mood;
    }

    renderClock(now);
    els.portrait.classList.toggle('dark', !pet.lightsOn);
    els.portrait.classList.toggle('asleep', Pet.isAsleep(pet, now));

    els.feed.disabled = pet.fullness >= Pet.MAX_STAT;
    els.medicine.disabled = pet.health >= Pet.MAX_STAT;
    els.train.disabled = pet.fitness >= Pet.MAX_STAT;
    els.lights.textContent = pet.lightsOn ? 'Lights off' : 'Lights on';
    els.lights.setAttribute('aria-pressed', String(!pet.lightsOn));

    var fast = data.settings.speed === 2;
    els.speed.textContent = fast ? 'On' : 'Off';
    els.speed.setAttribute('aria-pressed', String(fast));
    els.speed.classList.toggle('active', fast);

    var pace = data.settings.hungerPace;
    els.paceNormal.setAttribute('aria-pressed', String(pace === 'normal'));
    els.paceFast.setAttribute('aria-pressed', String(pace === 'fast'));

    els.countdown.textContent = formatCountdown(Pet.msUntilNextStep(pet, stepMs()) / data.settings.speed);
    var onSystemClock = Math.abs(data.settings.clockOffsetMs) < 1000;
    els.clockMode.textContent = onSystemClock ? 'System clock' : 'Custom time';
    els.clockSystem.disabled = onSystemClock;
  }

  function tick() {
    var now = Date.now();
    var realMs = Math.max(0, now - data.pet.lastUpdate);
    data.pet.lastUpdate = now;
    var speed = data.settings.speed;
    // At 2x, the clock also runs fast: it gains the extra time as an offset.
    data.settings.clockOffsetMs += realMs * (speed - 1);
    Pet.advance(data.pet, realMs * speed, stepMs());
    render();
    persist();
  }

  function playAnimation(className, ms) {
    els.critter.classList.remove(className);
    void els.critter.offsetWidth; // Restart the animation if it is already playing.
    els.critter.classList.add(className);
    setTimeout(function () { els.critter.classList.remove(className); }, ms);
  }

  // Shows a short message that floats up over the picture, such as "Ouch!".
  function floatText(text, className) {
    var el = document.createElement('span');
    el.className = 'floater ' + (className || '');
    el.textContent = text;
    els.floaters.appendChild(el);
    setTimeout(function () { el.remove(); }, 1300);
  }

  function blink() {
    if (Pet.isAsleep(data.pet, clockNow())) return; // Eyes are already closed.
    if (ART.blink) {
      els.critter.src = ART.blink;
      setTimeout(function () { els.critter.src = ART.idle; }, 140);
    } else {
      playAnimation('blink', 180);
    }
  }

  function scheduleBlink() {
    var delay = 2500 + Math.random() * 4000;
    setTimeout(function () {
      blink();
      scheduleBlink();
    }, delay);
  }

  function showTab(name) {
    var isPet = name === 'pet';
    els.tabPet.setAttribute('aria-selected', String(isPet));
    els.tabDebug.setAttribute('aria-selected', String(!isPet));
    els.panelPet.hidden = !isPet;
    els.panelDebug.hidden = isPet;
    if (!isPet) {
      var now = clockNow();
      els.clockInput.value = pad(now.getHours()) + ':' + pad(now.getMinutes());
    }
  }

  // Runs an action after bringing time up to date, then redraws and saves.
  function act(fn) {
    return function () {
      tick();
      fn();
      render();
      persist();
    };
  }

  function bindEvents() {
    els.tabPet.addEventListener('click', function () { showTab('pet'); });
    els.tabDebug.addEventListener('click', function () { showTab('debug'); });

    els.feed.addEventListener('click', act(function () {
      if (Pet.feed(data.pet)) playAnimation('munch', 400);
    }));

    els.medicine.addEventListener('click', act(function () {
      if (Pet.giveMedicine(data.pet)) floatText('+1', 'good');
    }));

    els.train.addEventListener('click', act(function () {
      var result = Pet.train(data.pet);
      if (!result.trained) return;
      playAnimation('hop', 400);
      floatText(result.injured ? 'Ouch!' : '+½', result.injured ? 'bad' : 'good');
    }));

    els.lights.addEventListener('click', act(function () {
      Pet.toggleLights(data.pet);
    }));

    els.speed.addEventListener('click', act(function () {
      data.settings.speed = data.settings.speed === 2 ? 1 : 2;
    }));

    els.paceNormal.addEventListener('click', act(function () {
      data.settings.hungerPace = 'normal';
    }));

    els.paceFast.addEventListener('click', act(function () {
      data.settings.hungerPace = 'fast';
    }));

    els.clockSet.addEventListener('click', act(function () {
      var parts = els.clockInput.value.split(':');
      if (parts.length < 2) return;
      var target = clockNow();
      target.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
      data.settings.clockOffsetMs = target.getTime() - Date.now();
    }));

    els.clockSystem.addEventListener('click', act(function () {
      data.settings.clockOffsetMs = 0;
      var now = clockNow();
      els.clockInput.value = pad(now.getHours()) + ':' + pad(now.getMinutes());
    }));

    els.reset.addEventListener('click', function () {
      if (window.confirm('Start over with a new pet? The current pet will be lost.')) {
        var settings = data.settings;
        data = Pet.newSave(Names.generate(), Date.now());
        data.settings = settings; // Keep the debug settings.
        render();
        persist();
        showTab('pet');
      }
    });
  }

  function init() {
    var ids = {
      tabPet: 'tab-pet', tabDebug: 'tab-debug', panelPet: 'panel-pet', panelDebug: 'panel-debug',
      portrait: 'portrait', critter: 'critter', mood: 'mood', floaters: 'floaters',
      clock: 'clock', handHour: 'hand-hour', handMinute: 'hand-minute', handSecond: 'hand-second',
      name: 'name', health: 'health', fullness: 'fullness', fitness: 'fitness',
      feed: 'feed', medicine: 'medicine', train: 'train', lights: 'lights',
      speed: 'speed', paceNormal: 'pace-normal', paceFast: 'pace-fast', countdown: 'countdown',
      clockReadout: 'clock-readout', clockInput: 'clock-input', clockSet: 'clock-set',
      clockMode: 'clock-mode', clockSystem: 'clock-system', reset: 'reset'
    };
    Object.keys(ids).forEach(function (key) { els[key] = document.getElementById(ids[key]); });

    els.critter.src = ART.idle;
    buildPips(els.health);
    buildPips(els.fullness);
    buildPips(els.fitness);

    var now = Date.now();
    data = Pet.migrate(LilStorage.load());
    if (data) {
      // Time keeps passing while the window is closed, at normal speed.
      Pet.advance(data.pet, Math.max(0, now - data.pet.lastUpdate), stepMs());
      data.pet.lastUpdate = now;
    } else {
      data = Pet.newSave(Names.generate(), now);
    }

    bindEvents();
    render();
    persist();
    setInterval(tick, TICK_MS);
    scheduleBlink();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
