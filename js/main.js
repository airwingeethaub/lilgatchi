// Connects the pet rules to the page: drawing, buttons, timers, and saving.
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

  function newData(now) {
    return { version: 1, pet: Pet.create(Names.generate(), now), settings: { speed: 1 } };
  }

  function isValid(d) {
    return !!d && d.version === 1 && !!d.pet && typeof d.pet.name === 'string' &&
      isFinite(d.pet.lastUpdate) && !!d.settings &&
      (d.settings.speed === 1 || d.settings.speed === 2);
  }

  function persist() {
    LilStorage.save(data);
  }

  function buildPips(container) {
    for (var i = 0; i < Pet.MAX_STAT; i++) {
      var pip = document.createElement('span');
      pip.className = 'pip';
      container.appendChild(pip);
    }
  }

  function renderPips(container, value) {
    var pips = container.children;
    for (var i = 0; i < pips.length; i++) {
      pips[i].classList.toggle('on', i < value);
    }
    container.setAttribute('aria-valuenow', String(value));
  }

  function formatCountdown(ms) {
    var totalSeconds = Math.ceil(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }

  function render() {
    var pet = data.pet;
    els.name.textContent = pet.name;
    els.name.title = pet.name;
    renderPips(els.health, pet.health);
    renderPips(els.fullness, pet.fullness);

    var mood = Pet.mood(pet);
    if (mood !== shownMood) {
      els.mood.innerHTML = MOOD_ICONS[mood];
      els.mood.title = 'Mood: ' + MOOD_LABELS[mood];
      els.mood.setAttribute('aria-label', 'Mood: ' + MOOD_LABELS[mood]);
      shownMood = mood;
    }

    els.feed.disabled = pet.fullness >= Pet.MAX_STAT;
    els.feed.textContent = els.feed.disabled ? 'Full!' : 'Feed';

    var fast = data.settings.speed === 2;
    els.speed.textContent = fast ? 'On' : 'Off';
    els.speed.setAttribute('aria-pressed', String(fast));
    els.speed.classList.toggle('active', fast);
    els.countdown.textContent = formatCountdown(Pet.msUntilNextStep(pet) / data.settings.speed);
  }

  function tick() {
    var now = Date.now();
    var realMs = Math.max(0, now - data.pet.lastUpdate);
    data.pet.lastUpdate = now;
    Pet.advance(data.pet, realMs * data.settings.speed);
    render();
    persist();
  }

  function playAnimation(className, ms) {
    els.critter.classList.remove(className);
    void els.critter.offsetWidth; // Restart the animation if it is already playing.
    els.critter.classList.add(className);
    setTimeout(function () { els.critter.classList.remove(className); }, ms);
  }

  function blink() {
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
  }

  function bindEvents() {
    els.tabPet.addEventListener('click', function () { showTab('pet'); });
    els.tabDebug.addEventListener('click', function () { showTab('debug'); });

    els.feed.addEventListener('click', function () {
      tick(); // Bring time up to date before feeding.
      if (Pet.feed(data.pet)) {
        playAnimation('munch', 400);
        render();
        persist();
      }
    });

    els.speed.addEventListener('click', function () {
      tick(); // Count the time so far at the old speed.
      data.settings.speed = data.settings.speed === 2 ? 1 : 2;
      render();
      persist();
    });

    els.reset.addEventListener('click', function () {
      if (window.confirm('Start over with a new pet? The current pet will be lost.')) {
        data = newData(Date.now());
        render();
        persist();
        showTab('pet');
      }
    });
  }

  function init() {
    els.tabPet = document.getElementById('tab-pet');
    els.tabDebug = document.getElementById('tab-debug');
    els.panelPet = document.getElementById('panel-pet');
    els.panelDebug = document.getElementById('panel-debug');
    els.critter = document.getElementById('critter');
    els.mood = document.getElementById('mood');
    els.name = document.getElementById('name');
    els.health = document.getElementById('health');
    els.fullness = document.getElementById('fullness');
    els.feed = document.getElementById('feed');
    els.speed = document.getElementById('speed');
    els.countdown = document.getElementById('countdown');
    els.reset = document.getElementById('reset');

    els.critter.src = ART.idle;
    buildPips(els.health);
    buildPips(els.fullness);

    var now = Date.now();
    var loaded = LilStorage.load();
    if (isValid(loaded)) {
      data = loaded;
      Pet.normalize(data.pet);
      // Time keeps passing while the window is closed, at normal speed.
      Pet.advance(data.pet, Math.max(0, now - data.pet.lastUpdate));
      data.pet.lastUpdate = now;
    } else {
      data = newData(now);
    }

    bindEvents();
    render();
    persist();
    setInterval(tick, TICK_MS);
    scheduleBlink();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
