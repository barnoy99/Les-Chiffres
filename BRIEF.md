# Les Chiffres — build brief

This is a **new** web app, modeled on an existing one of mine. Read this whole
file first, then read the reference app's source, then give me a short plan
before writing any code.

---

## The reference app (read it, do NOT modify it)

Location: `C:\Users\User\Documents\Claude Code\Le-Francais-au-Quotidien`

Read these four files to learn the architecture (they are small, plain files —
no build step, no framework):

- `index.html` — all screens as `<section class="screen">` blocks, toggled by a
  single active class. Loads `firebase-*-compat.js`, then `firebase-config.js`,
  then `data.js`, then `app.js`. Every local asset has a `?v=N` cache-buster.
- `app.js` — one IIFE. All logic: state/persistence, screen routing, the four
  modes, speech synthesis, spaced-repetition scheduling.
- `data.js` — the content: `var PHRASES = [ {id, fr, en, context, alt_usage,
  alt_usage_en}, ... ]`. One object per item, stable integer ids (gaps are OK).
- `style.css` — "Parisian chic" theme via CSS variables in `:root`. Sticky
  bottom action bars, mobile-first.

Also read this note about how the reference app is built, deployed, and tested:
`C:\Users\User\.claude\projects\C--Users-User-Dropbox-October-2012-3--------\memory\project_quotidien_deploy.md`

### What the reference app does

A French phrase-learning PWA with four modes, reachable from a home screen:

1. **Apprentissage** — spaced-repetition flashcards. Each phrase has a `level`
   (0 unseen … 4 mastered); `selectNext()` picks the next due item using
   per-level intervals/weights. You rate "Déjà connu" / "Pas encore", then the
   translation is revealed and you press Suivant.
2. **Mes Acquis** — recall practice over the **mastered** pool (`level === 4`).
   Show prompt → Révéler → Suivant. Has a per-phrase ×6 "boost" toggle.
3. **Mains Libres** — hands-free audio drill of the mastered pool using the Web
   Speech API (`speechSynthesis`): beep → speak English → think countdown →
   repeat the French N times → next. Pause/resume, ×6 boost.
4. **Chercher** — search all items (matches main + alt text); each result can be
   moved between pools (→ Mes Acquis / → Apprentissage) or deleted.

### Key architecture facts to reuse

- **State model:** one object `{ version, phrases:{ id:{level,lastSeen,
  timesSeen,hfSeen,boost} }, sessionCount, deletedIds:[] }`. Persisted to
  `localStorage` (key `frenchSR_state`) AND mirrored to a Firebase Realtime DB.
- **Pools:** mastered = `level === 4` (Mes Acquis and Mains Libres draw from the
  same pool); Apprentissage = everything below 4 that's due.
- **Firebase = sync only, not hosting.** It stores per-user progress so the same
  state follows the user across devices.
- **Deploy = static site in a GitHub repo.** Changes only reach the user after
  `git commit` + `git push`; the user then hard-refreshes. Bump the `?v=N` on
  any asset tag whose file changed.
- **Mobile-first, sticky bottom bar:** on practice screens the frequently-tapped
  action sits in a fixed bottom row; delete/×6 grouped at the left.

---

## The new app: "Les Chiffres"

Goal: a **French numbers** trainer, reusing the reference app's structure,
styling, persistence, and (where they make sense) the Apprentissage / Mes Acquis
/ Mains Libres / Chercher modes — but with numbers as the content instead of
idiomatic phrases.

> FILL IN BEFORE STARTING — tell Claude the specifics, e.g.:
> - Exact scope of numbers (0–100? 0–1000? dates, prices, phone numbers, years?)
> - What each card shows/asks (digits → French words? spoken French → type the
>   digits? French words → digits?)
> - How `data.js` should be generated (hand-authored list vs. generated
>   programmatically from a range) and what fields each item needs.
> - Which of the four modes to keep, and any new mode.

### Must do differently from the reference (don't copy blindly)

- **New, separate GitHub repo** for this app (its own remote).
- **New, separate Firebase project / `firebase-config.js`** if you want progress
  sync — do NOT reuse Le-Francais-au-Quotidien's config, or the two apps would
  read/write the same database and clobber each other. (Or skip Firebase and use
  localStorage only to start.)
- Pick a fresh `localStorage` key (not `frenchSR_state`).

### First steps for the session

1. Read the reference files above and this brief.
2. Ask me any open questions from the FILL IN list, then give a short plan.
3. Only then scaffold `index.html` / `app.js` / `data.js` / `style.css` here in
   `C:\Users\User\Documents\Claude Code\Les Chiffres`.
