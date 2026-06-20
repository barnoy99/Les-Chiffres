/* eslint-disable */
/* ============================================================
   numbers.js — French number-to-words engine + number pool
   Loaded before data.js and app.js. Exposes globals:
     numberToFrench, priceToFrench, ordinalToFrench,
     buildNumberPool, fillTemplate, formatNumber
   Also works under Node (module.exports at the bottom) for testing.
   ============================================================ */
(function (root) {
  'use strict';

  var UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept',
    'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze',
    'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];

  var TENS = {
    20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante', 60: 'soixante'
  };

  // 0–99, the part with all the French quirks (70s, 80s, 90s, "et un").
  function below100(n) {
    if (n < 20) return UNITS[n];

    // 70–79: soixante + (10..19)  → soixante-dix, soixante et onze, …
    if (n >= 70 && n < 80) {
      if (n === 71) return 'soixante et onze';
      return 'soixante-' + UNITS[n - 60];
    }

    // 80–99: quatre-vingt(s) + (0..19), no "et", 91 → quatre-vingt-onze
    if (n >= 80) {
      if (n === 80) return 'quatre-vingts';
      return 'quatre-vingt-' + UNITS[n - 80];
    }

    // 20–69
    var tens = Math.floor(n / 10) * 10;
    var unit = n % 10;
    if (unit === 0) return TENS[tens];
    if (unit === 1) return TENS[tens] + ' et un'; // 21,31,41,51,61
    return TENS[tens] + '-' + UNITS[unit];
  }

  // 0–999
  function below1000(n) {
    if (n < 100) return below100(n);
    var hundreds = Math.floor(n / 100);
    var rest = n % 100;
    var head;
    if (hundreds === 1) {
      head = 'cent';
    } else {
      head = UNITS[hundreds] + ' cent';
      // "cents" is plural only when it's a round multiple with nothing after.
      if (rest === 0) head += 's';
    }
    if (rest === 0) return head;
    return head + ' ' + below100(rest);
  }

  function numberToFrench(n) {
    n = Math.floor(Math.abs(n));
    if (n < 1000) return below1000(n);

    if (n < 1000000) {
      var thousands = Math.floor(n / 1000);
      var rest = n % 1000;
      var head;
      // "mille" is invariable and "un mille" is never said → just "mille".
      if (thousands === 1) {
        head = 'mille';
      } else {
        head = below1000(thousands) + ' mille';
      }
      if (rest === 0) return head;
      return head + ' ' + below1000(rest);
    }

    var millions = Math.floor(n / 1000000);
    var rem = n % 1000000;
    var mhead = (millions === 1 ? 'un million' : below1000(millions) + ' millions');
    if (rem === 0) return mhead;
    return mhead + ' ' + numberToFrench(rem);
  }

  // Prices: "trente-quatre euros soixante", "458 euros", "un euro cinquante".
  function priceToFrench(euros, cents) {
    cents = cents || 0;
    var euroWord = (euros === 1) ? 'euro' : 'euros';
    var out = numberToFrench(euros) + ' ' + euroWord;
    if (cents > 0) {
      out += ' ' + numberToFrench(cents);
    }
    return out;
  }

  // Ordinals: premier/première, deuxième, …, septième, vingt et unième.
  function ordinalToFrench(n, feminine) {
    if (n === 1) return feminine ? 'première' : 'premier';
    var base = numberToFrench(n);
    // cinq → cinquième, neuf → neuvième, drop trailing "e" before "ième".
    if (base === 'cinq') base = 'cinq'; // handled by 'q'+'u' below
    if (n === 5) return 'cinquième';
    if (n === 9) return 'neuvième';
    if (base.charAt(base.length - 1) === 'e') base = base.slice(0, -1);
    return base + 'ième';
  }

  // ── Display formatting (digits the user sees) ──────────────

  // Thousands separated by a thin space, French style: 12 500.
  function groupThousands(n) {
    var s = String(n);
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function formatNumber(n) {
    return groupThousands(n);
  }

  function formatPrice(euros, cents) {
    var c = (cents || 0);
    if (c === 0) return groupThousands(euros) + ' €';
    return groupThousands(euros) + ',' + (c < 10 ? '0' + c : c) + ' €';
  }

  // ── Random helpers ─────────────────────────────────────────

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Generate a random number of a given category → {display, fr, en}
  // Used by templated sentences (fresh each showing).
  function randomOfType(type) {
    if (type === 'year') {
      var y = pick([randInt(1900, 1999), randInt(2000, 2025), randInt(1700, 1899)]);
      return { display: String(y), fr: numberToFrench(y), en: String(y) };
    }
    if (type === 'price') {
      var e = randInt(1, 499);
      var c = pick([0, 0, randInt(1, 99)]); // often round
      return { display: formatPrice(e, c), fr: priceToFrench(e, c),
        en: (c === 0 ? '€' + e : '€' + e + '.' + (c < 10 ? '0' + c : c)) };
    }
    if (type === 'tricky') { // 70–99 family
      var t = randInt(70, 99);
      return { display: String(t), fr: numberToFrench(t), en: String(t) };
    }
    if (type === 'big') {
      var b = pick([randInt(1000, 99999), randInt(100, 999) * 100, randInt(10, 99) * 1000]);
      return { display: formatNumber(b), fr: numberToFrench(b), en: formatNumber(b) };
    }
    if (type === 'small') {
      var s = randInt(17, 99);
      return { display: String(s), fr: numberToFrench(s), en: String(s) };
    }
    if (type === 'percent') {
      var p = pick([randInt(1, 99), randInt(1, 9) * 10]);
      return { display: p + ' %', fr: numberToFrench(p) + ' pour cent', en: p + '%' };
    }
    // fallback
    var f = randInt(1, 999);
    return { display: formatNumber(f), fr: numberToFrench(f), en: formatNumber(f) };
  }

  // Replace {n} in a template's en/fr with a fresh random number.
  function fillTemplate(tmpl) {
    var v = randomOfType(tmpl.slot && tmpl.slot.type ? tmpl.slot.type : 'small');
    return {
      en: tmpl.en.replace('{n}', v.en),
      fr: tmpl.fr.replace('{n}', v.fr)
    };
  }

  // ── The curated, stable-id number pool for Option 1 ────────
  // Stable ids matter: per-number Facile/Difficile ratings key on them.
  // seedHard = starts weighted up (the 70–99 family + gnarly cases).
  function buildNumberPool() {
    var pool = [];
    var id = 1;

    function addInt(value, en, seedHard) {
      pool.push({
        id: id++, type: 'int', display: formatNumber(value),
        answer: numberToFrench(value), en: en || formatNumber(value),
        seedHard: !!seedHard
      });
    }
    function addYear(y) {
      pool.push({
        id: id++, type: 'year', display: String(y),
        answer: numberToFrench(y), en: 'the year ' + y, seedHard: false
      });
    }
    function addPrice(e, c, seedHard) {
      pool.push({
        id: id++, type: 'price', display: formatPrice(e, c),
        answer: priceToFrench(e, c),
        en: (c ? '€' + e + '.' + (c < 10 ? '0' + c : c) : '€' + e),
        seedHard: !!seedHard
      });
    }
    function addOrdinal(n) {
      pool.push({
        id: id++, type: 'ordinal', display: n + (n === 1 ? 'er' : 'e'),
        answer: ordinalToFrench(n), en: ordinalSuffixEn(n), seedHard: n >= 70
      });
    }
    function addPercent(p, seedHard) {
      pool.push({
        id: id++, type: 'percent', display: p + ' %',
        answer: numberToFrench(p) + ' pour cent', en: p + '%', seedHard: !!seedHard
      });
    }

    // — Tricky 70–99 family (all seed-hard) —
    [71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 85, 88, 90, 91, 92, 95, 96, 98, 99]
      .forEach(function (v) { addInt(v, String(v), true); });

    // — Years (useful + tricky) —
    [1789, 1815, 1871, 1914, 1918, 1939, 1945, 1968, 1976, 1981, 1989, 1992,
      1995, 1998, 2000, 2001, 2008, 2012, 2015, 2020, 2023, 2024]
      .forEach(addYear);

    // — Prices & decimals —
    [[34, 60], [12, 50], [4, 95], [99, 99], [7, 80], [250, 0], [19, 90],
      [1, 50], [458, 0], [76, 40], [88, 20], [3, 30]]
      .forEach(function (p) { addPrice(p[0], p[1], (p[0] % 100 >= 70 || (p[1] >= 70))); });

    // — Big & misc —
    [100, 200, 300, 500, 1000, 1500, 2500, 3400, 8000, 10000, 12500, 21000,
      45600, 80000, 100000, 250000, 1000000]
      .forEach(function (v) { addInt(v, formatNumber(v), false); });

    // — Ordinals —
    [1, 2, 3, 5, 7, 9, 10, 21, 71, 80].forEach(addOrdinal);

    // — Percentages —
    [10, 25, 50, 75, 80, 90, 99].forEach(function (p) { addPercent(p, p >= 70); });

    return pool;
  }

  function ordinalSuffixEn(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // ── Export ─────────────────────────────────────────────────
  var api = {
    numberToFrench: numberToFrench,
    priceToFrench: priceToFrench,
    ordinalToFrench: ordinalToFrench,
    buildNumberPool: buildNumberPool,
    fillTemplate: fillTemplate,
    randomOfType: randomOfType,
    formatNumber: formatNumber,
    formatPrice: formatPrice
  };

  // Browser globals
  for (var k in api) { if (api.hasOwnProperty(k)) root[k] = api[k]; }
  // Node (testing)
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof window !== 'undefined' ? window : this);
