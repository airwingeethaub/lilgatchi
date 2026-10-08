// Connects the pet rules to the page: drawing, buttons, tabs, the windows
// that open over the main window (pet picker, travel, locations, items),
// timers, the clock, and saving.
(function () {
  'use strict';

  var TICK_MS = 250;

  // Art for each species. When real art exists, set `blink` to a closed-eyes
  // image (for example 'assets/frog-blink.png') and the pet will blink now and
  // then by swapping to it. While `blink` is null, the pet does not blink.
  var ART = {
    frog: { idle: 'assets/frog.jpg', blink: null },
    clown: { idle: 'assets/clown.jpg', blink: null },
    dog: { idle: 'assets/dog.jpg', blink: null }
  };

  // Placeholder art for each travel destination: a backdrop behind the pet
  // and a foreground in front of it (a counter, the front of a tub).
  var LOCATION_ART = {
    shop: { back: 'assets/locations/shop.svg', front: 'assets/locations/shop-front.svg' },
    bathhouse: { back: 'assets/locations/bathhouse.svg', front: 'assets/locations/bathhouse-front.svg' }
  };

  var STATUS_METERS = [
    { key: 'health', label: 'Health' },
    { key: 'fullness', label: 'Fullness' },
    { key: 'fitness', label: 'Fitness' },
    { key: 'cleanliness', label: 'Cleanliness' }
  ];

  var MOOD_LABELS = { happy: 'Happy', okay: 'Okay', sad: 'Sad', sick: 'Sick' };

  function face(fill, inner) {
    return '<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">' +
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

  var TABS = ['pet', 'status', 'attributes', 'debug'];
  var OVERLAYS = ['picker', 'travelMenu', 'location', 'inventory'];

  var data = null; // Null until a pet has been chosen.
  var els = {};
  var meters = {}; // Meter elements by stat or attribute key.
  var shownMood = null;
  var shownPoops = null; // The poop positions currently drawn, as a string.
  var openOverlayName = null;
  var pickerCanCancel = true;
  var currentLocation = null;

  function persist() {
    if (data) LilStorage.save(data);
  }

  function stepMs() {
    return Pet.PACES[data.settings.hungerPace];
  }

  // The time shown on the clock: the system clock plus any offset from a
  // time set by hand in the Debug tab.
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
    var totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(totalSeconds / 60) + ':' + pad(totalSeconds % 60);
  }

  function formatMoney(amount) {
    return '$' + amount.toLocaleString('en-US');
  }

  // Builds a labeled five-segment meter row and remembers it under `key`.
  function buildMeter(container, key, label) {
    var name = document.createElement('span');
    name.className = 'meter-label';
    name.textContent = label;

    var pips = document.createElement('div');
    pips.className = 'pips ' + key;
    pips.setAttribute('role', 'meter');
    pips.setAttribute('aria-label', label);
    pips.setAttribute('aria-valuemin', '0');
    pips.setAttribute('aria-valuemax', String(Pet.MAX_STAT));
    for (var i = 0; i < Pet.MAX_STAT; i++) {
      var pip = document.createElement('span');
      pip.className = 'pip';
      pips.appendChild(pip);
    }

    var value = document.createElement('span');
    value.className = 'meter-value mono';

    container.appendChild(name);
    container.appendChild(pips);
    container.appendChild(value);
    meters[key] = { pips: pips, value: value };
  }

  // Fills whole segments, plus a half segment for values such as 2.5.
  function renderMeter(key, value) {
    var meter = meters[key];
    var pips = meter.pips.children;
    for (var i = 0; i < pips.length; i++) {
      pips[i].classList.toggle('on', i + 1 <= value);
      pips[i].classList.toggle('half', i < value && i + 1 > value);
    }
    meter.pips.setAttribute('aria-valuenow', String(value));
    meter.value.textContent = String(value);
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

  // Draws a poop emoji at each saved spot on the picture.
  function renderPoops(poops) {
    var key = JSON.stringify(poops);
    if (key === shownPoops) return;
    shownPoops = key;
    els.poops.textContent = '';
    poops.forEach(function (spot) {
      var el = document.createElement('span');
      el.className = 'poop';
      el.textContent = '💩';
      el.style.left = spot.x + '%';
      el.style.top = spot.y + '%';
      els.poops.appendChild(el);
    });
    els.poops.setAttribute('aria-label', poops.length + ' poops');
  }

  function render() {
    if (!data) return;
    var pet = data.pet;
    var now = clockNow();

    var art = ART[pet.species];
    if (els.critter.getAttribute('src') !== art.idle && !els.critter.dataset.blinking) {
      els.critter.setAttribute('src', art.idle);
    }
    els.critter.alt = pet.name + ' the ' + Pet.SPECIES_NAMES[pet.species];
    els.portrait.classList.toggle('pixel', pet.species === 'clown');
    renderPoops(pet.poops);

    els.name.textContent = pet.name;
    els.name.title = pet.name;

    STATUS_METERS.forEach(function (m) { renderMeter(m.key, pet[m.key]); });
    Pet.ATTRIBUTES.forEach(function (key) { renderMeter(key, pet.attributes[key]); });
    els.species.textContent = Pet.SPECIES_NAMES[pet.species];

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
    els.clean.disabled = pet.poops.length === 0;
    els.lights.textContent = pet.lightsOn ? 'Lights off' : 'Lights on';
    els.lights.setAttribute('aria-pressed', String(!pet.lightsOn));

    var pace = data.settings.hungerPace;
    els.paceNormal.setAttribute('aria-pressed', String(pace === 'normal'));
    els.paceFast.setAttribute('aria-pressed', String(pace === 'fast'));
    els.countdown.textContent = formatCountdown(Pet.msUntilNextStep(pet, stepMs()));
    els.poopCountdown.textContent = formatCountdown(pet.nextPoopMs);
    els.poopCount.textContent = pet.poops.length === 1 ? '1 poop on the floor' : pet.poops.length + ' poops on the floor';
    els.poopNow.disabled = pet.poops.length >= Pet.MAX_POOPS;

    var onSystemClock = Math.abs(data.settings.clockOffsetMs) < 1000;
    els.clockMode.textContent = onSystemClock ? 'System clock' : 'Custom time';
    els.clockSystem.disabled = onSystemClock;
  }

  function tick() {
    if (!data) return;
    var now = Date.now();
    var realMs = Math.max(0, now - data.pet.lastUpdate);
    data.pet.lastUpdate = now;
    Pet.advance(data.pet, realMs, stepMs());
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

  // Blinks only if the species has a closed-eyes picture.
  function blink() {
    if (!data) return;
    var art = ART[data.pet.species];
    if (!art.blink || Pet.isAsleep(data.pet, clockNow())) return;
    els.critter.dataset.blinking = '1';
    els.critter.setAttribute('src', art.blink);
    setTimeout(function () {
      delete els.critter.dataset.blinking;
      els.critter.setAttribute('src', ART[data.pet.species].idle);
    }, 140);
  }

  function scheduleBlink() {
    var delay = 2500 + Math.random() * 4000;
    setTimeout(function () {
      blink();
      scheduleBlink();
    }, delay);
  }

  function showTab(name) {
    TABS.forEach(function (tab) {
      var selected = tab === name;
      els['tab_' + tab].setAttribute('aria-selected', String(selected));
      els['panel_' + tab].hidden = !selected;
    });
    if (name === 'debug') {
      var now = clockNow();
      els.clockInput.value = pad(now.getHours()) + ':' + pad(now.getMinutes());
    }
  }

  // ----- Windows that open over the main window -----

  function openOverlay(name) {
    OVERLAYS.forEach(function (other) { els[other].hidden = other !== name; });
    openOverlayName = name;
    var first = els[name].querySelector('button:not([disabled])');
    if (first) first.focus();
  }

  function closeOverlay() {
    OVERLAYS.forEach(function (name) { els[name].hidden = true; });
    openOverlayName = null;
    currentLocation = null;
  }

  // The pet picker. `canCancel` is false on the very first run, when there
  // is no current pet to go back to.
  function openPicker(canCancel) {
    pickerCanCancel = canCancel;
    els.pickerNote.hidden = !canCancel;
    els.pickerCancel.hidden = !canCancel;
    openOverlay('picker');
  }

  function choosePet(species) {
    var settings = data ? data.settings : null;
    data = Pet.newSave(Names.generate(), species, Date.now());
    if (settings) data.settings = settings; // Keep the debug settings.
    shownMood = null;
    shownPoops = null;
    closeOverlay();
    showTab('pet');
    render();
    persist();
  }

  function buildPicker() {
    Pet.SPECIES.forEach(function (species) {
      var button = document.createElement('button');
      button.className = 'pick';
      button.dataset.species = species;
      var img = document.createElement('img');
      img.src = ART[species].idle;
      img.alt = '';
      if (species === 'clown') img.className = 'pixel';
      var label = document.createElement('span');
      label.textContent = Pet.SPECIES_NAMES[species];
      button.appendChild(img);
      button.appendChild(label);
      button.addEventListener('click', function () { choosePet(species); });
      els.pickerOptions.appendChild(button);
    });
  }

  // Travel: a menu of destinations, then a window showing the pet there.
  function buildDestinations() {
    Pet.LOCATIONS.forEach(function (place) {
      var button = document.createElement('button');
      button.className = 'destination';
      button.dataset.location = place;
      var img = document.createElement('img');
      img.src = LOCATION_ART[place].back;
      img.alt = '';
      var label = document.createElement('span');
      label.textContent = Pet.LOCATION_NAMES[place];
      button.appendChild(img);
      button.appendChild(label);
      button.addEventListener('click', function () { goTo(place); });
      els.destinations.appendChild(button);
    });
  }

  function goTo(place) {
    tick();
    var pet = data.pet;
    currentLocation = place;
    els.locationTitle.textContent = Pet.LOCATION_NAMES[place];
    els.scene.dataset.location = place;
    els.sceneBack.src = LOCATION_ART[place].back;
    els.sceneFront.src = LOCATION_ART[place].front;
    els.scenePet.src = ART[pet.species].idle;
    els.scenePet.alt = pet.name + ' at ' + Pet.LOCATION_NAMES[place];
    els.scenePet.classList.toggle('pixel', pet.species === 'clown');
    els.locationBody.hidden = place !== 'shop';
    els.locationMessage.textContent = '';

    if (place === 'bathhouse') {
      Pet.bathe(pet);
      els.locationMessage.textContent = pet.name + ' had a long soak. Cleanliness is full.';
      render();
      persist();
    } else {
      renderShop();
    }
    openOverlay('location');
  }

  function renderShop() {
    var pet = data.pet;
    els.shopMoney.textContent = formatMoney(pet.inventory.money);
    els.shopList.textContent = '';
    Pet.SHOP_STOCK.forEach(function (stock) {
      var item = Pet.ITEMS[stock.id];
      var row = document.createElement('div');
      row.className = 'list-row';
      var name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = item.name;
      var owned = pet.inventory.items[stock.id];
      if (owned) {
        var note = document.createElement('span');
        note.className = 'hint';
        note.textContent = ' (have ' + owned + ')';
        name.appendChild(note);
      }
      var price = document.createElement('span');
      price.className = 'price mono';
      price.textContent = formatMoney(stock.price);
      var button = document.createElement('button');
      button.className = 'small-btn';
      button.dataset.buy = stock.id;
      button.textContent = 'Buy';
      button.disabled = pet.inventory.money < stock.price;
      button.addEventListener('click', function () {
        if (Pet.buy(data.pet, stock.id)) {
          els.locationMessage.textContent = data.pet.name + ' bought a ' + item.name.toLowerCase() + '.';
          persist();
        }
        renderShop();
      });
      row.appendChild(name);
      row.appendChild(price);
      row.appendChild(button);
      els.shopList.appendChild(row);
    });
  }

  // Items: everything the pet owns, with a Use button for each.
  function openInventory() {
    tick();
    els.inventoryMessage.textContent = '';
    renderInventory();
    openOverlay('inventory');
  }

  function renderInventory() {
    var pet = data.pet;
    els.inventoryMoney.textContent = formatMoney(pet.inventory.money);
    els.itemList.textContent = '';
    var ids = Object.keys(Pet.ITEMS).filter(function (id) { return pet.inventory.items[id] > 0; });
    if (ids.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'No items.';
      els.itemList.appendChild(empty);
    }
    ids.forEach(function (id) {
      var item = Pet.ITEMS[id];
      var row = document.createElement('div');
      row.className = 'list-row';
      var name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = item.name;
      var count = document.createElement('span');
      count.className = 'hint';
      count.textContent = Pet.describeCount(id, pet.inventory.items[id]);
      var button = document.createElement('button');
      button.className = 'small-btn';
      button.dataset.use = id;
      button.textContent = 'Use';
      button.addEventListener('click', function () {
        var result = Pet.useItem(data.pet, id);
        if (result.used) {
          els.inventoryMessage.textContent = result.item.floater + ' — ' + data.pet.name + ' ' + result.item.useText;
          persist();
        }
        renderInventory();
      });
      row.appendChild(name);
      row.appendChild(count);
      row.appendChild(button);
      els.itemList.appendChild(row);
    });
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
    TABS.forEach(function (tab) {
      els['tab_' + tab].addEventListener('click', function () { showTab(tab); });
    });

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

    els.clean.addEventListener('click', act(function () {
      if (Pet.cleanUp(data.pet) > 0) floatText('Clean!', 'good');
    }));

    els.lights.addEventListener('click', act(function () {
      Pet.toggleLights(data.pet);
    }));

    els.travel.addEventListener('click', function () { openOverlay('travelMenu'); });
    els.travelCancel.addEventListener('click', closeOverlay);
    els.leave.addEventListener('click', closeOverlay);
    els.items.addEventListener('click', openInventory);
    els.inventoryClose.addEventListener('click', closeOverlay);

    els.paceNormal.addEventListener('click', act(function () {
      data.settings.hungerPace = 'normal';
    }));

    els.paceFast.addEventListener('click', act(function () {
      data.settings.hungerPace = 'fast';
    }));

    els.poopNow.addEventListener('click', act(function () {
      Pet.poopNow(data.pet);
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

    els.reset.addEventListener('click', function () { openPicker(true); });
    els.pickerCancel.addEventListener('click', closeOverlay);

    // Escape closes an open window, except the first-run picker.
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !openOverlayName) return;
      if (openOverlayName === 'picker' && !pickerCanCancel) return;
      closeOverlay();
    });
  }

  function init() {
    var ids = {
      portrait: 'portrait', critter: 'critter', poops: 'poops', mood: 'mood', floaters: 'floaters',
      clock: 'clock', handHour: 'hand-hour', handMinute: 'hand-minute', handSecond: 'hand-second',
      name: 'name', species: 'species', statusMeters: 'status-meters', attributeMeters: 'attribute-meters',
      travel: 'travel', items: 'items',
      feed: 'feed', medicine: 'medicine', train: 'train', clean: 'clean', lights: 'lights',
      paceNormal: 'pace-normal', paceFast: 'pace-fast', countdown: 'countdown',
      poopCountdown: 'poop-countdown', poopCount: 'poop-count', poopNow: 'poop-now',
      clockReadout: 'clock-readout', clockInput: 'clock-input', clockSet: 'clock-set',
      clockMode: 'clock-mode', clockSystem: 'clock-system', reset: 'reset',
      picker: 'picker', pickerOptions: 'picker-options', pickerNote: 'picker-note', pickerCancel: 'picker-cancel',
      travelMenu: 'travel-menu', destinations: 'destinations', travelCancel: 'travel-cancel',
      location: 'location', locationTitle: 'location-title', scene: 'scene', sceneBack: 'scene-back',
      scenePet: 'scene-pet', sceneFront: 'scene-front', locationBody: 'location-body',
      shopMoney: 'shop-money', shopList: 'shop-list', locationMessage: 'location-message', leave: 'leave',
      inventory: 'inventory', inventoryMoney: 'inventory-money', itemList: 'item-list',
      inventoryMessage: 'inventory-message', inventoryClose: 'inventory-close'
    };
    Object.keys(ids).forEach(function (key) { els[key] = document.getElementById(ids[key]); });
    TABS.forEach(function (tab) {
      els['tab_' + tab] = document.getElementById('tab-' + tab);
      els['panel_' + tab] = document.getElementById('panel-' + tab);
    });

    STATUS_METERS.forEach(function (m) { buildMeter(els.statusMeters, m.key, m.label); });
    Pet.ATTRIBUTES.forEach(function (key) { buildMeter(els.attributeMeters, key, Pet.ATTRIBUTE_NAMES[key]); });
    buildPicker();
    buildDestinations();
    bindEvents();

    var now = Date.now();
    data = Pet.migrate(LilStorage.load());
    if (data) {
      // Time keeps passing while the window is closed.
      Pet.advance(data.pet, Math.max(0, now - data.pet.lastUpdate), stepMs());
      data.pet.lastUpdate = now;
      render();
      persist();
    } else {
      openPicker(false); // First run: choose a pet before anything else.
    }

    setInterval(tick, TICK_MS);
    scheduleBlink();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
