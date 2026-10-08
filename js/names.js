// Random cute name generator, for names like "Fleegul", "Snippers", or "Bart".
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.Names = api;
  }
})(this, function () {
  'use strict';

  var ONSETS = ['b', 'bl', 'br', 'd', 'fl', 'fr', 'g', 'gl', 'gr', 'j', 'k', 'l', 'm',
    'n', 'p', 'pl', 'pr', 'qu', 's', 'sk', 'sn', 'sp', 'squ', 't', 'tw', 'w', 'z'];
  var VOWELS = ['a', 'ee', 'i', 'o', 'oo', 'u', 'ou', 'ai'];
  var MIDDLES = ['b', 'bb', 'd', 'dd', 'g', 'gg', 'k', 'l', 'll', 'm', 'mm', 'n', 'nn',
    'p', 'pp', 't', 'tt', 'z', 'zz'];
  var ENDINGS = ['le', 'ul', 'er', 'ers', 'y', 'ie', 'o', 'et', 'ip', 'us', 'ix', 'ins', 'a'];
  var CODAS = ['rt', 'b', 'p', 'm', 'nk', 'x', 'g', 't', 'mp', 'sh', 'ff', 'nt'];

  // Substrings that should never appear in a generated name.
  var BLOCKED = ['butt', 'cum', 'tit', 'nig', 'fag', 'fuk', 'fuck', 'shit', 'cunt', 'kunt',
    'dik', 'dick', 'cok', 'cock', 'sex', 'ass', 'jiz', 'wank', 'twat', 'poo', 'gook',
    'spik', 'spic', 'wop', 'jap', 'pak', 'kum', 'tard', 'nazi', 'rape', 'porn', 'pube'];

  function pick(list, rand) {
    return list[Math.floor(rand() * list.length)];
  }

  function isAllowed(name) {
    var lower = name.toLowerCase();
    for (var i = 0; i < BLOCKED.length; i++) {
      if (lower.indexOf(BLOCKED[i]) !== -1) return false;
    }
    return true;
  }

  function build(rand) {
    var name;
    if (rand() < 0.65) {
      // Two syllables, such as fl + ee + g + ul = "fleegul".
      name = pick(ONSETS, rand) + pick(VOWELS, rand) + pick(MIDDLES, rand) + pick(ENDINGS, rand);
    } else {
      // One syllable, such as b + a + rt = "bart".
      name = pick(ONSETS, rand) + pick(VOWELS, rand) + pick(CODAS, rand);
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function generate(rand) {
    rand = rand || Math.random;
    for (var tries = 0; tries < 100; tries++) {
      var name = build(rand);
      if (isAllowed(name)) return name;
    }
    return 'Bart';
  }

  return { generate: generate, isAllowed: isAllowed };
});
