(function () {
  'use strict';

  var STORAGE_KEY = 'lesChiffres_state';
  var VERSION = 1;

  var state;
  var db = null;
  var DB_PATH = 'progress/user1';

  // ── Number drill state ──────────────────────────────────
  var NUMBERS = buildNumberPool();   // from numbers.js
  var currentNumber = null;
  var lastNumberId = null;
  var numberSeenThisSession = 0;
  var numberHistory = [];            // back-navigation stack (ids)

  // Session-only auto-read: muted by default, reset every page load.
  var autoReadSession = false;

  // ── Acquis (phrases) state ──────────────────────────────
  var acquisPhrases = [];
  var acquisIndex = 0;
  var acquisRendered = {};           // id → {en, fr} resolved (templates filled)

  // ── Hands-free state (adapted from reference) ───────────
  var handsfreeActive = false;
  var handsfreePaused = false;
  var handsfreePhrases = [];
  var handsfreeIndex = 0;
  var handsfreeItemStart = 0;        // ms timestamp of current item start (back-to-restart)
  var handsfreeHistory = [];
  var handsfreeReadTarget = 3;
  var handsfreeFinalPause = false;
  var handsfreeCurrentFrench = '';
  var handsfreeLastReadNum = 0;
  var handsfreeCurrentReadsDoneCallback = null;
  var handsfreeTimerId = null;
  var handsfreeCountdownId = null;
  var handsfreeResumeMode = null;
  var handsfreeCountdownRemaining = 0;
  var handsfreeCountdownLabel = '';
  var handsfreeCountdownDone = null;
  var handsfreePrevPhase = '';
  var handsfreeRendered = {};        // id → {en, fr} for this session
  var wakeLock = null;
  var audioCtx = null;

  // ── Firebase init ───────────────────────────────────────

  function initFirebase() {
    try {
      if (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY') {
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.database();
        return true;
      }
    } catch (e) { /* local only */ }
    return false;
  }

  // ── DOM helpers ─────────────────────────────────────────

  function $(id) { return document.getElementById(id); }

  function showScreen(id) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove('screen--active');
    }
    $(id).classList.add('screen--active');
  }

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  // ── Persistence ─────────────────────────────────────────

  function defaults() {
    return {
      version: VERSION, numbers: {}, sentences: {}, sessionCount: 0,
      dictee: { boosts: {}, deletedIds: [] }
    };
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed.version) return parsed;
      }
    } catch (e) {}
    return null;
  }

  function load(callback) {
    var localState = loadLocal();
    if (db) {
      db.ref(DB_PATH).once('value').then(function (snapshot) {
        var cloudState = snapshot.val();
        if (cloudState && cloudState.version) {
          if (!localState || cloudState.sessionCount >= localState.sessionCount) {
            state = cloudState;
          } else {
            state = localState;
          }
        } else if (localState) {
          state = localState;
        } else {
          state = defaults();
        }
        normalizeState();
        saveLocal();
        saveCloud();
        if (callback) callback();
      }).catch(function () {
        state = localState || defaults();
        normalizeState();
        if (callback) callback();
      });
    } else {
      state = localState || defaults();
      normalizeState();
      if (callback) callback();
    }
  }

  function normalizeState() {
    if (!state.numbers) state.numbers = {};
    if (!state.sentences) state.sentences = {};
    if (typeof state.sessionCount !== 'number') state.sessionCount = 0;
    if (!state.dictee) state.dictee = { boosts: {}, deletedIds: [] };
    if (!state.dictee.boosts) state.dictee.boosts = {};
    if (!state.dictee.deletedIds) state.dictee.deletedIds = [];
  }

  function saveLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function saveCloud() {
    if (db) { try { db.ref(DB_PATH).set(state); } catch (e) {} }
  }
  function save() { saveLocal(); saveCloud(); }

  // ── Number drill ────────────────────────────────────────

  function getNumberData(id) {
    return state.numbers[id] || { rating: null, timesHard: 0, timesEasy: 0, seen: 0, lastSeen: 0 };
  }

  // Difficile/last-hard → 5, unseen seedHard → 4, unseen → 3, Facile → 1.
  function numberWeight(item) {
    var d = getNumberData(item.id);
    if (d.rating === 'difficile') return 5;
    if (d.seen === 0) return item.seedHard ? 4 : 3;
    if (d.rating === 'facile') return 1;
    return 3;
  }

  function selectNextNumber() {
    var pool = NUMBERS;
    var items = [], weights = [], total = 0;
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].id === lastNumberId && pool.length > 1) continue;
      var w = numberWeight(pool[i]);
      items.push(pool[i]); weights.push(w); total += w;
    }
    var r = Math.random() * total, acc = 0;
    for (var j = 0; j < items.length; j++) {
      acc += weights[j];
      if (r < acc) return items[j];
    }
    return items[items.length - 1];
  }

  var NUMBER_TYPE_LABEL = {
    int: 'Nombre', year: 'Année', price: 'Prix',
    ordinal: 'Ordinal', percent: 'Pourcentage'
  };

  function findNumberById(id) {
    for (var i = 0; i < NUMBERS.length; i++) {
      if (NUMBERS[i].id === id) return NUMBERS[i];
    }
    return null;
  }

  function advanceNumber() {
    if (currentNumber) {
      numberHistory.push(currentNumber.id);
      if (numberHistory.length > 50) numberHistory.shift();
    }
    var next = selectNextNumber();
    currentNumber = next;
    lastNumberId = next.id;
    showScreen('screen-number');
    renderNumber(next);
  }

  function numberPrev() {
    if (numberHistory.length === 0) return;
    var id = numberHistory.pop();
    var item = findNumberById(id);
    if (!item) return;
    currentNumber = item;
    lastNumberId = id;
    renderNumber(item);
  }

  function renderNumber(item) {
    $('number-type').textContent = NUMBER_TYPE_LABEL[item.type] || 'Nombre';
    $('number-display').textContent = item.display;
    $('number-answer').textContent = item.answer;
    $('number-counter').textContent = numberSeenThisSession +
      (numberSeenThisSession === 1 ? ' vu' : ' vus');
    hide($('number-reveal'));
    hide($('btn-number-suivant'));
    show($('number-rating'));
    updateAutoReadButtons();
    var btns = $('number-rating').querySelectorAll('.rating-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = false;
      btns[i].style.opacity = '';
    }
  }

  function rateNumber(rating) {
    if (!currentNumber) return;
    var d = getNumberData(currentNumber.id);
    state.numbers[currentNumber.id] = {
      rating: rating,
      timesHard: d.timesHard + (rating === 'difficile' ? 1 : 0),
      timesEasy: d.timesEasy + (rating === 'facile' ? 1 : 0),
      seen: d.seen + 1,
      lastSeen: Date.now()
    };
    save();
    numberSeenThisSession++;

    var btns = $('number-rating').querySelectorAll('.rating-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (btns[i].getAttribute('data-rating') !== rating) btns[i].style.opacity = '0.35';
    }
    setTimeout(function () {
      hide($('number-rating'));
      show($('number-reveal'));
      show($('btn-number-suivant'));
      if (autoReadSession) speakFrench(currentNumber.answer);
    }, 300);
  }

  // ── Sentence helpers (resolve templates) ────────────────

  function resolveSentence(p, cache) {
    if (!p.template) return { en: p.en, fr: p.fr };
    if (cache && cache[p.id]) return cache[p.id];
    var filled = fillTemplate(p);
    if (cache) cache[p.id] = filled;
    return filled;
  }

  function isBoosted(id) {
    return !!(state.sentences[id] && state.sentences[id].boost);
  }
  function toggleBoost(id) {
    var d = state.sentences[id] || {};
    if (!state.sentences[id]) state.sentences[id] = {};
    state.sentences[id].boost = !d.boost;
    save();
    return state.sentences[id].boost;
  }
  function incrementHfSeen(id) {
    if (!state.sentences[id]) state.sentences[id] = {};
    state.sentences[id].hfSeen = (state.sentences[id].hfSeen || 0) + 1;
    save();
  }
  function markSeen(id) {
    if (!state.sentences[id]) state.sentences[id] = {};
    state.sentences[id].seen = (state.sentences[id].seen || 0) + 1;
    save();
  }

  // boostFn(id) → true when the item is ×6-boosted (defaults to sentence boost).
  function weightedShuffle(arr, boostFn) {
    if (!boostFn) boostFn = isBoosted;
    var pool = arr.slice(), out = [];
    while (pool.length > 0) {
      var total = 0, weights = [];
      for (var i = 0; i < pool.length; i++) {
        var w = boostFn(pool[i].id) ? 3.5 : 1;
        weights.push(w); total += w;
      }
      var r = Math.random() * total, acc = 0, idx = pool.length - 1;
      for (var k = 0; k < pool.length; k++) {
        acc += weights[k];
        if (r < acc) { idx = k; break; }
      }
      out.push(pool.splice(idx, 1)[0]);
    }
    return out;
  }

  function speakFrench(text) {
    if (!('speechSynthesis' in window)) return;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    var voices = speechSynthesis.getVoices();
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].lang.indexOf('fr') === 0) { u.voice = voices[i]; break; }
    }
    speechSynthesis.speak(u);
  }

  // ── Auto-read toggle (session-only, shared by both modes) ──

  function updateAutoReadButtons() {
    ['btn-number-autoread', 'btn-acquis-autoread'].forEach(function (id) {
      var btn = $(id);
      if (!btn) return;
      btn.classList.toggle('activated', autoReadSession);
      var label = btn.querySelector('.btn-autoread-label');
      if (label) label.textContent = autoReadSession ? 'Auto ✓' : 'Auto';
    });
  }

  function toggleAutoRead() {
    autoReadSession = !autoReadSession;
    updateAutoReadButtons();
  }

  // ── Acquis mode (Option 2) ──────────────────────────────

  function updateHomeScreen() {
    $('acquis-count').textContent = '(' + SENTENCES.length + ')';
    $('handsfree-count').textContent = '(' + SENTENCES.length + ')';
  }

  function startAcquis() {
    acquisPhrases = weightedShuffle(SENTENCES);
    acquisIndex = 0;
    acquisRendered = {};
    if (acquisPhrases.length === 0) return;
    showAcquisPhrase();
  }

  function showAcquisPhrase() {
    if (acquisIndex >= acquisPhrases.length) {
      showScreen('screen-acquis-done');
      return;
    }
    var p = acquisPhrases[acquisIndex];
    var r = resolveSentence(p, acquisRendered);
    showScreen('screen-acquis');
    $('acquis-context').textContent = p.context || '';
    $('acquis-english').textContent = r.en;
    $('acquis-french').textContent = r.fr;
    $('acquis-counter').textContent = (acquisIndex + 1) + ' / ' + acquisPhrases.length;
    updateAcquisSixButton();
    updateAutoReadButtons();
    show($('acquis-reveal-area'));
    hide($('acquis-revealed'));
    hide($('btn-suivant'));
  }

  function updateAcquisSixButton() {
    var btn = $('btn-acquis-six');
    if (!btn) return;
    var p = acquisPhrases[acquisIndex];
    var boosted = p ? isBoosted(p.id) : false;
    btn.classList.toggle('activated', boosted);
    btn.textContent = boosted ? '×6 ✓' : '×6';
  }

  function revealAcquis() {
    var p = acquisPhrases[acquisIndex];
    if (p) markSeen(p.id);
    hide($('acquis-reveal-area'));
    show($('acquis-revealed'));
    show($('btn-suivant'));
    if (autoReadSession && p) speakFrench(resolveSentence(p, acquisRendered).fr);
  }

  // ── Hands-free mode (Option 3) — adapted from reference ──

  function speakEnglish(text, onEnd) {
    if (!('speechSynthesis' in window)) { if (onEnd) onEnd(); return; }
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.95;
    var voices = speechSynthesis.getVoices();
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].lang.indexOf('en') === 0) { u.voice = voices[i]; break; }
    }
    if (onEnd) u.onend = onEnd;
    speechSynthesis.speak(u);
  }

  function speakFrenchCb(text, onEnd) {
    if (!('speechSynthesis' in window)) { if (onEnd) onEnd(); return; }
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    var voices = speechSynthesis.getVoices();
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].lang.indexOf('fr') === 0) { u.voice = voices[i]; break; }
    }
    if (onEnd) u.onend = onEnd;
    speechSynthesis.speak(u);
  }

  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playDing(type, cb) {
    if (!audioCtx) { if (cb) cb(); return; }
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var freq = (type === 'fr') ? 880 : 440;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.stop(audioCtx.currentTime + 0.15);
      setTimeout(function () { if (cb) cb(); }, 200);
    } catch (e) { if (cb) cb(); }
  }

  function requestWakeLock() {
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(function (wl) {
        wakeLock = wl;
        wl.addEventListener('release', function () { wakeLock = null; });
      }).catch(function () {});
    }
  }
  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
  }

  function cancelCurrentStep() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (handsfreeTimerId) { clearTimeout(handsfreeTimerId); handsfreeTimerId = null; }
    if (handsfreeCountdownId) { clearInterval(handsfreeCountdownId); handsfreeCountdownId = null; }
    handsfreeFinalPause = false;
    handsfreeLastReadNum = 0;
    handsfreeResumeMode = null;
    handsfreeCountdownDone = null;
  }

  function stopHandsfree() {
    handsfreeActive = false;
    handsfreePaused = false;
    cancelCurrentStep();
    releaseWakeLock();
    updateHomeScreen();
    showScreen('screen-home');
  }

  function pauseHandsfree() {
    handsfreePaused = true;
    handsfreePrevPhase = $('handsfree-phase').textContent;
    if ('speechSynthesis' in window && (speechSynthesis.speaking || speechSynthesis.pending)) {
      speechSynthesis.pause();
      handsfreeResumeMode = 'speech';
    } else if (handsfreeCountdownId) {
      clearInterval(handsfreeCountdownId);
      handsfreeCountdownId = null;
      handsfreeResumeMode = 'countdown';
    } else {
      handsfreeResumeMode = 'step';
    }
    $('handsfree-phase').textContent = 'En pause…';
    $('btn-handsfree-pause').textContent = '▶ Reprendre';
  }

  function resumeHandsfree() {
    handsfreePaused = false;
    $('btn-handsfree-pause').textContent = '⏸ Pause';
    if (handsfreeResumeMode === 'speech') {
      if ('speechSynthesis' in window && (speechSynthesis.paused || speechSynthesis.speaking)) {
        if (handsfreePrevPhase) $('handsfree-phase').textContent = handsfreePrevPhase;
        speechSynthesis.resume();
      } else {
        handsfreeStep();
      }
    } else if (handsfreeResumeMode === 'countdown' && handsfreeCountdownDone) {
      startCountdown(handsfreeCountdownRemaining, handsfreeCountdownLabel, handsfreeCountdownDone);
    } else {
      handsfreeStep();
    }
    handsfreeResumeMode = null;
  }

  function skipNextHandsfree() {
    if (!handsfreeActive) return;
    cancelCurrentStep();
    handsfreeIndex++;
    handsfreeStep();
  }

  // Apple-Music-style back: restart the current item; only jump to the previous
  // one if pressed again within 2s (i.e. near the start of the item).
  function skipPrevHandsfree() {
    if (!handsfreeActive) return;
    cancelCurrentStep();
    if (Date.now() - handsfreeItemStart <= 2000 && handsfreeIndex > 0) {
      handsfreeIndex--;
    }
    handsfreeStep();
  }

  function startHandsfree() {
    handsfreePhrases = weightedShuffle(SENTENCES);
    handsfreeIndex = 0;
    handsfreePaused = false;
    handsfreeHistory = [];
    handsfreeRendered = {};
    if (handsfreePhrases.length === 0) return;
    initAudio();
    handsfreeActive = true;
    $('btn-handsfree-pause').textContent = '⏸ Pause';
    requestWakeLock();
    showScreen('screen-handsfree');
    handsfreeStep();
  }

  function startCountdown(seconds, label, onDone) {
    if (!handsfreeActive) return;
    $('handsfree-phase').textContent = label;
    handsfreeCountdownLabel = label;
    handsfreeCountdownDone = onDone;
    handsfreeCountdownRemaining = seconds;
    $('handsfree-countdown-num').textContent = seconds;
    handsfreeCountdownId = setInterval(function () {
      if (!handsfreeActive) { clearInterval(handsfreeCountdownId); return; }
      handsfreeCountdownRemaining--;
      $('handsfree-countdown-num').textContent = handsfreeCountdownRemaining;
      if (handsfreeCountdownRemaining <= 0) {
        clearInterval(handsfreeCountdownId);
        handsfreeCountdownId = null;
        var done = handsfreeCountdownDone;
        handsfreeCountdownDone = null;
        done();
      }
    }, 1000);
  }

  function showSpeakingIndicator(label) {
    if (label) $('handsfree-phase').textContent = label;
    $('handsfree-countdown-num').textContent = '♪';
  }

  function doFrenchReads(frenchText, readNum, onDone) {
    if (!handsfreeActive) return;
    playDing('fr', function () {
      if (!handsfreeActive) return;
      showSpeakingIndicator('Répétez !');
      speakFrenchCb(frenchText, function () {
        if (!handsfreeActive) return;
        handsfreeLastReadNum = readNum;
        if (readNum >= handsfreeReadTarget) {
          onDone();
        } else {
          startCountdown(7, 'Encore…', function () {
            doFrenchReads(frenchText, readNum + 1, onDone);
          });
        }
      });
    });
  }

  function updateSixButton() {
    var btn = $('btn-handsfree-six');
    if (!btn) return;
    var p = handsfreePhrases[handsfreeIndex];
    var boosted = p ? isBoosted(p.id) : false;
    btn.classList.toggle('activated', boosted);
    btn.textContent = boosted ? '×6 ✓' : '×6';
  }

  function handsfreeStep() {
    if (!handsfreeActive) return;
    if (handsfreeIndex >= handsfreePhrases.length) {
      handsfreeActive = false;
      releaseWakeLock();
      showScreen('screen-acquis-done');
      return;
    }

    handsfreeHistory.push({ index: handsfreeIndex });
    if (handsfreeHistory.length > 30) handsfreeHistory.shift();
    handsfreeItemStart = Date.now();

    var p = handsfreePhrases[handsfreeIndex];
    var r = resolveSentence(p, handsfreeRendered);
    $('handsfree-counter').textContent = (handsfreeIndex + 1) + ' / ' + handsfreePhrases.length;

    handsfreeReadTarget = isBoosted(p.id) ? 6 : 3;
    handsfreeFinalPause = false;
    handsfreeLastReadNum = 0;
    updateSixButton();

    var englishText = r.en, frenchText = r.fr;

    $('handsfree-english').textContent = englishText;
    $('handsfree-french').textContent = frenchText;
    show($('handsfree-english-card'));
    show($('handsfree-french-area'));
    incrementHfSeen(p.id);
    showSpeakingIndicator('Écoutez en anglais…');

    playDing('en', function () {
      if (!handsfreeActive) return;
      speakEnglish(englishText, function () {
        if (!handsfreeActive) return;
        handsfreeCurrentFrench = frenchText;
        var advanceFn = function () {
          if (!handsfreeActive) return;
          handsfreeFinalPause = true;
          startCountdown(8, 'Suivant…', function () {
            handsfreeFinalPause = false;
            handsfreeIndex++;
            handsfreeStep();
          });
        };
        handsfreeCurrentReadsDoneCallback = advanceFn;
        startCountdown(2, 'Écoutez en anglais…', function () {
          startCountdown(9, 'Rappelez-vous…', function () {
            doFrenchReads(frenchText, 1, advanceFn);
          });
        });
      });
    });
  }

  // ── Dictée mode (Option 4) — FR read → 5s think → EN ×N ────
  // Self-contained engine (own state) so Mains Libres is untouched. Reuses the
  // stateless primitives: playDing / speakEnglish / speakFrenchCb / initAudio /
  // wake lock / weightedShuffle.

  var DICTEE = buildDicteeItems();   // from numbers.js
  var ecouteActive = false;
  var ecoutePaused = false;
  var ecouteItems = [];
  var ecouteIndex = 0;
  var ecouteItemStart = 0;           // ms timestamp of current item start (back-to-restart)
  var ecouteHistory = [];
  var ecouteReadTarget = 3;
  var ecouteFinalPause = false;
  var ecouteLastReadNum = 0;
  var ecouteCurrentItem = null;
  var ecouteReadsDoneCallback = null;
  var ecouteCountdownId = null;
  var ecouteCountdownRemaining = 0;
  var ecouteCountdownLabel = '';
  var ecouteCountdownDone = null;
  var ecouteResumeMode = null;
  var ecoutePrevPhase = '';

  function activeDictee() {
    var del = state.dictee.deletedIds || [];
    if (!del.length) return DICTEE;
    return DICTEE.filter(function (it) { return del.indexOf(it.id) === -1; });
  }
  function isDicteeBoosted(id) {
    return !!(state.dictee.boosts && state.dictee.boosts[id]);
  }
  function toggleDicteeBoost(id) {
    if (!state.dictee.boosts) state.dictee.boosts = {};
    if (state.dictee.boosts[id]) delete state.dictee.boosts[id];
    else state.dictee.boosts[id] = true;
    save();
    return isDicteeBoosted(id);
  }
  function deleteDictee(id) {
    if (!state.dictee.deletedIds) state.dictee.deletedIds = [];
    if (state.dictee.deletedIds.indexOf(id) === -1) state.dictee.deletedIds.push(id);
    save();
  }

  function ecouteCancelStep() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (ecouteCountdownId) { clearInterval(ecouteCountdownId); ecouteCountdownId = null; }
    ecouteFinalPause = false;
    ecouteLastReadNum = 0;
    ecouteResumeMode = null;
    ecouteCountdownDone = null;
  }

  function ecouteStartCountdown(seconds, label, onDone) {
    if (!ecouteActive) return;
    $('dictee-phase').textContent = label;
    ecouteCountdownLabel = label;
    ecouteCountdownDone = onDone;
    ecouteCountdownRemaining = seconds;
    $('dictee-countdown-num').textContent = seconds;
    ecouteCountdownId = setInterval(function () {
      if (!ecouteActive) { clearInterval(ecouteCountdownId); return; }
      ecouteCountdownRemaining--;
      $('dictee-countdown-num').textContent = ecouteCountdownRemaining;
      if (ecouteCountdownRemaining <= 0) {
        clearInterval(ecouteCountdownId);
        ecouteCountdownId = null;
        var done = ecouteCountdownDone;
        ecouteCountdownDone = null;
        done();
      }
    }, 1000);
  }

  function ecouteSpeaking(label) {
    if (label) $('dictee-phase').textContent = label;
    $('dictee-countdown-num').textContent = '♪';
  }

  function updateDicteeSix() {
    var btn = $('btn-dictee-six');
    if (!btn) return;
    var it = ecouteItems[ecouteIndex];
    var boosted = it ? isDicteeBoosted(it.id) : false;
    btn.classList.toggle('activated', boosted);
    btn.textContent = boosted ? '×6 ✓' : '×6';
  }

  // Think-pause length (seconds) before the next French re-read.
  // Round 2 → 5s, round 3 and beyond → 4s.
  function ecouteThinkSecs(roundNum) {
    return roundNum === 2 ? 5 : 4;
  }

  // One French reading. Round 1 is the listening test: number hidden → speak FR
  // → 5s think → reveal number + English → read English → 1s → next round.
  // Rounds 2+ just re-read the French (number now visible) → think pause → next.
  // ecouteReadTarget = total French reads (default 3, ×6 → 6), checked live.
  function doFrenchRead(item, roundNum, onDone) {
    if (!ecouteActive) return;
    ecouteSpeaking('Écoutez en français…');
    playDing('fr', function () {
      if (!ecouteActive) return;
      speakFrenchCb(item.answer, function () {
        if (!ecouteActive) return;
        ecouteLastReadNum = roundNum;

        if (roundNum === 1) {
          // First read: think, then reveal + read English, then 1s, then re-read.
          ecouteStartCountdown(5, 'Traduisez…', function () {
            if (!ecouteActive) return;
            show($('dictee-number-area'));
            show($('dictee-english-area'));
            playDing('en', function () {
              if (!ecouteActive) return;
              ecouteSpeaking('En anglais…');
              speakEnglish(item.en, function () {
                if (!ecouteActive) return;
                if (roundNum >= ecouteReadTarget) { onDone(); return; }
                ecouteStartCountdown(4, 'Encore…', function () {
                  doFrenchRead(item, roundNum + 1, onDone);
                });
              });
            });
          });
        } else {
          // Re-reads: just a think pause (no English), then next read or item.
          ecouteStartCountdown(ecouteThinkSecs(roundNum), 'Répétez…', function () {
            if (!ecouteActive) return;
            if (roundNum >= ecouteReadTarget) onDone();
            else doFrenchRead(item, roundNum + 1, onDone);
          });
        }
      });
    });
  }

  function ecouteStep() {
    if (!ecouteActive) return;
    if (ecouteIndex >= ecouteItems.length) {
      ecouteActive = false;
      releaseWakeLock();
      showScreen('screen-acquis-done');
      return;
    }

    ecouteHistory.push(ecouteIndex);
    if (ecouteHistory.length > 30) ecouteHistory.shift();

    ecouteItemStart = Date.now();
    var item = ecouteItems[ecouteIndex];
    ecouteCurrentItem = item;
    $('dictee-counter').textContent = (ecouteIndex + 1) + ' / ' + ecouteItems.length;

    ecouteReadTarget = isDicteeBoosted(item.id) ? 6 : 3;  // total French reads
    ecouteFinalPause = false;
    ecouteLastReadNum = 0;
    updateDicteeSix();

    // Pre-fill but keep hidden until after the first French read + think.
    $('dictee-display').textContent = item.display;
    $('dictee-french').textContent = item.answer;
    $('dictee-english').textContent = item.en;
    hide($('dictee-number-area'));
    hide($('dictee-english-area'));

    // The last re-read's think pause already spaces items, so advance directly.
    var advanceFn = function () {
      if (!ecouteActive) return;
      ecouteIndex++;
      ecouteStep();
    };
    ecouteReadsDoneCallback = advanceFn;

    doFrenchRead(item, 1, advanceFn);
  }

  function startEcoute() {
    ecouteItems = weightedShuffle(activeDictee(), isDicteeBoosted);
    ecouteIndex = 0;
    ecoutePaused = false;
    ecouteHistory = [];
    if (ecouteItems.length === 0) return;
    initAudio();
    ecouteActive = true;
    $('btn-dictee-pause').textContent = '⏸ Pause';
    requestWakeLock();
    showScreen('screen-dictee');
    ecouteStep();
  }

  function stopEcoute() {
    ecouteActive = false;
    ecoutePaused = false;
    ecouteCancelStep();
    releaseWakeLock();
    showScreen('screen-home');
  }

  function pauseEcoute() {
    ecoutePaused = true;
    ecoutePrevPhase = $('dictee-phase').textContent;
    if ('speechSynthesis' in window && (speechSynthesis.speaking || speechSynthesis.pending)) {
      speechSynthesis.pause();
      ecouteResumeMode = 'speech';
    } else if (ecouteCountdownId) {
      clearInterval(ecouteCountdownId);
      ecouteCountdownId = null;
      ecouteResumeMode = 'countdown';
    } else {
      ecouteResumeMode = 'step';
    }
    $('dictee-phase').textContent = 'En pause…';
    $('btn-dictee-pause').textContent = '▶ Reprendre';
  }

  function resumeEcoute() {
    ecoutePaused = false;
    $('btn-dictee-pause').textContent = '⏸ Pause';
    if (ecouteResumeMode === 'speech') {
      if ('speechSynthesis' in window && (speechSynthesis.paused || speechSynthesis.speaking)) {
        if (ecoutePrevPhase) $('dictee-phase').textContent = ecoutePrevPhase;
        speechSynthesis.resume();
      } else {
        ecouteStep();
      }
    } else if (ecouteResumeMode === 'countdown' && ecouteCountdownDone) {
      ecouteStartCountdown(ecouteCountdownRemaining, ecouteCountdownLabel, ecouteCountdownDone);
    } else {
      ecouteStep();
    }
    ecouteResumeMode = null;
  }

  function skipNextEcoute() {
    if (!ecouteActive) return;
    ecouteCancelStep();
    ecouteIndex++;
    ecouteStep();
  }

  // Apple-Music-style back: restart the current number; only go to the previous
  // one if pressed again within 2s (near the start).
  function skipPrevEcoute() {
    if (!ecouteActive) return;
    ecouteCancelStep();
    if (Date.now() - ecouteItemStart <= 2000 && ecouteIndex > 0) {
      ecouteIndex--;
    }
    ecouteStep();
  }

  // ── Progress overlay ────────────────────────────────────

  function renderProgress() {
    var hard = [], easy = [], unseen = [];
    for (var i = 0; i < NUMBERS.length; i++) {
      var d = getNumberData(NUMBERS[i].id);
      var entry = { item: NUMBERS[i], data: d };
      if (d.seen === 0) unseen.push(entry);
      else if (d.rating === 'difficile') hard.push(entry);
      else easy.push(entry);
    }

    var seenCount = hard.length + easy.length;
    $('progress-overview-text').textContent =
      seenCount + ' / ' + NUMBERS.length + ' nombres travaillés';

    var sentBoosts = 0, sentHf = 0;
    for (var s = 0; s < SENTENCES.length; s++) {
      var sd = state.sentences[SENTENCES[s].id];
      if (sd && sd.boost) sentBoosts++;
      if (sd && sd.hfSeen) sentHf += sd.hfSeen;
    }
    $('progress-stats-text').textContent =
      hard.length + ' difficiles · ' + easy.length + ' faciles' +
      (sentHf > 0 ? ' · ◆' + sentHf + ' Mains Libres' : '') +
      (sentBoosts > 0 ? ' · ×6: ' + sentBoosts : '');

    var list = $('progress-list');
    list.innerHTML = '';

    var groups = [
      { title: 'À retravailler', cls: 'new', items: hard },
      { title: 'Acquis', cls: 'mastered', items: easy },
      { title: 'Pas encore vus', cls: 'unseen', items: unseen }
    ];

    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      if (group.items.length === 0) continue;
      var title = document.createElement('p');
      title.className = 'progress-group-title level-' + group.cls;
      title.textContent = group.title + ' (' + group.items.length + ')';
      list.appendChild(title);

      for (var j = 0; j < group.items.length; j++) {
        var entry = group.items[j];
        var item = document.createElement('div');
        item.className = 'progress-item';

        var dot = document.createElement('span');
        dot.className = 'progress-dot level-' + group.cls;

        var text = document.createElement('span');
        text.className = 'progress-phrase';
        text.textContent = entry.item.display + ' — ' + entry.item.answer;

        var seen = document.createElement('span');
        seen.className = 'progress-seen';
        seen.textContent = entry.data.seen > 0 ? ('×' + entry.data.seen) : '';

        item.appendChild(dot);
        item.appendChild(text);
        item.appendChild(seen);
        list.appendChild(item);
      }
    }
  }

  // ── Event binding ───────────────────────────────────────

  function setup() {
    initFirebase();
    if ('speechSynthesis' in window) speechSynthesis.getVoices();

    load(function () {
      state.sessionCount++;
      save();
      updateHomeScreen();
    });

    // Home → modes
    $('btn-number').addEventListener('click', function () {
      numberSeenThisSession = 0;
      numberHistory = [];
      currentNumber = null;
      advanceNumber();
    });
    $('btn-acquis').addEventListener('click', startAcquis);
    $('btn-handsfree').addEventListener('click', startHandsfree);
    $('btn-dictee').addEventListener('click', startEcoute);

    // Number drill
    $('btn-number-home').addEventListener('click', function () {
      updateHomeScreen();
      showScreen('screen-home');
    });
    $('btn-number-prev').addEventListener('click', numberPrev);
    $('btn-number-next').addEventListener('click', advanceNumber);
    $('btn-number-suivant').addEventListener('click', advanceNumber);
    $('btn-number-autoread').addEventListener('click', toggleAutoRead);
    $('btn-number-tts').addEventListener('click', function () {
      if (currentNumber) speakFrench(currentNumber.answer);
    });
    var numRatingBtns = $('number-rating').querySelectorAll('.rating-btn');
    for (var i = 0; i < numRatingBtns.length; i++) {
      numRatingBtns[i].addEventListener('click', function () {
        if (this.disabled) return;
        rateNumber(this.getAttribute('data-rating'));
      });
    }

    // Acquis
    $('btn-acquis-home').addEventListener('click', function () {
      updateHomeScreen();
      showScreen('screen-home');
    });
    $('btn-reveler').addEventListener('click', revealAcquis);
    $('btn-tts').addEventListener('click', function () {
      var p = acquisPhrases[acquisIndex];
      if (p) speakFrench(resolveSentence(p, acquisRendered).fr);
    });
    $('btn-suivant').addEventListener('click', function () {
      acquisIndex++;
      showAcquisPhrase();
    });
    $('btn-acquis-prev').addEventListener('click', function () {
      if (acquisIndex > 0) { acquisIndex--; showAcquisPhrase(); }
    });
    $('btn-acquis-next').addEventListener('click', function () {
      acquisIndex++;
      showAcquisPhrase();
    });
    $('btn-acquis-six').addEventListener('click', function () {
      var p = acquisPhrases[acquisIndex];
      if (!p) return;
      toggleBoost(p.id);
      updateAcquisSixButton();
    });
    $('btn-acquis-autoread').addEventListener('click', toggleAutoRead);
    $('btn-acquis-done-home').addEventListener('click', function () {
      releaseWakeLock();
      updateHomeScreen();
      showScreen('screen-home');
    });

    // Acquis keyboard shortcuts
    document.addEventListener('keydown', function (e) {
      if (!$('screen-acquis').classList.contains('screen--active')) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (acquisIndex > 0) { acquisIndex--; showAcquisPhrase(); }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        acquisIndex++;
        showAcquisPhrase();
      } else if (e.key === ' ') {
        e.preventDefault();
        if ($('acquis-revealed').classList.contains('hidden')) revealAcquis();
      }
    });

    // Hands-free
    $('btn-handsfree-home').addEventListener('click', stopHandsfree);
    $('btn-handsfree-pause').addEventListener('click', function () {
      if (handsfreePaused) resumeHandsfree(); else pauseHandsfree();
    });
    $('btn-handsfree-prev').addEventListener('click', skipPrevHandsfree);
    $('btn-handsfree-next').addEventListener('click', skipNextHandsfree);
    $('btn-handsfree-six').addEventListener('click', function () {
      var p = handsfreePhrases[handsfreeIndex];
      if (!p) return;
      var nowBoosted = toggleBoost(p.id);
      if (nowBoosted) {
        handsfreeReadTarget = Math.max(6, handsfreeLastReadNum + 3);
        if (handsfreeFinalPause && handsfreeCurrentFrench && handsfreeCurrentReadsDoneCallback) {
          handsfreeFinalPause = false;
          if (handsfreeTimerId) { clearTimeout(handsfreeTimerId); handsfreeTimerId = null; }
          if (handsfreeCountdownId) { clearInterval(handsfreeCountdownId); handsfreeCountdownId = null; }
          doFrenchReads(handsfreeCurrentFrench, handsfreeLastReadNum + 1, handsfreeCurrentReadsDoneCallback);
        }
      } else {
        handsfreeReadTarget = handsfreeLastReadNum < 3 ? 3 : handsfreeLastReadNum + 1;
      }
      updateSixButton();
    });

    // Dictée
    $('btn-dictee-home').addEventListener('click', stopEcoute);
    $('btn-dictee-pause').addEventListener('click', function () {
      if (ecoutePaused) resumeEcoute(); else pauseEcoute();
    });
    $('btn-dictee-prev').addEventListener('click', skipPrevEcoute);
    $('btn-dictee-next').addEventListener('click', skipNextEcoute);
    $('btn-dictee-six').addEventListener('click', function () {
      var it = ecouteItems[ecouteIndex];
      if (!it) return;
      var nowBoosted = toggleDicteeBoost(it.id);
      // Target = total French reads. The round-boundary check picks this up live,
      // so toggling mid-item extends (6) or stops after the current read (≥3).
      if (nowBoosted) {
        ecouteReadTarget = 6;
      } else {
        ecouteReadTarget = Math.max(3, ecouteLastReadNum);
      }
      updateDicteeSix();
    });
    $('btn-dictee-delete').addEventListener('click', function () {
      var it = ecouteItems[ecouteIndex];
      if (!it) return;
      if (!confirm('Supprimer définitivement :\n\n« ' + it.display + ' »  (' + it.answer + ')')) return;
      deleteDictee(it.id);
      ecouteItems.splice(ecouteIndex, 1);
      if (ecouteItems.length === 0) { stopEcoute(); return; }
      if (ecouteIndex >= ecouteItems.length) ecouteIndex = 0;
      ecouteCancelStep();
      ecouteStep();
    });

    // Progress overlay
    $('btn-home-progress').addEventListener('click', function () {
      renderProgress();
      show($('overlay-progress'));
    });
    $('btn-close-progress').addEventListener('click', function () {
      hide($('overlay-progress'));
    });
    $('btn-reset-progress').addEventListener('click', function () {
      if (!confirm('Réinitialiser tout le progrès ?')) return;
      state = defaults();
      state.sessionCount = 1;
      save();
      lastNumberId = null;
      numberSeenThisSession = 0;
      hide($('overlay-progress'));
      updateHomeScreen();
      showScreen('screen-home');
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if ((handsfreeActive && !handsfreePaused) || (ecouteActive && !ecoutePaused)) {
      requestWakeLock();
    }
  });

  document.addEventListener('DOMContentLoaded', setup);
})();
