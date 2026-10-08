// The single place where the pet's progress is saved and loaded.
// In the browser this uses localStorage. When the project becomes a
// standalone .exe, only this file should need to change (for example,
// to read and write a save file instead).
(function (root) {
  'use strict';

  var KEY = 'lilgatchi.save.v1';

  function load() {
    try {
      var raw = root.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save(data) {
    try {
      root.localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clear() {
    try {
      root.localStorage.removeItem(KEY);
    } catch (e) {
      // Nothing to clear.
    }
  }

  root.LilStorage = { load: load, save: save, clear: clear };
})(this);
