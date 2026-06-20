# Firebase setup — Les Chiffres

The app works fully on **localStorage** out of the box. Firebase only adds
cross-device progress sync. Until you do this, `firebase-config.js` stays a
placeholder and the app stores progress on each device separately.

> ⚠️ Use a **brand-new, separate** Firebase project. Do **not** reuse the
> `Le-Francais-au-Quotidien` project — the two apps would read/write the same
> database and clobber each other.

## Steps

1. Go to <https://console.firebase.google.com> → **Add project** (e.g.
   `les-chiffres`). Google Analytics is optional.
2. In the project, **Build → Realtime Database → Create Database**. Pick a
   region; start in **test mode** (or set rules — see below).
3. **Project settings (⚙) → General → Your apps → Web (`</>`)**. Register the
   app; copy the `firebaseConfig` object it shows you.
4. Paste those values into `firebase-config.js`, replacing every `YOUR_*`
   placeholder. The `apiKey` must no longer equal `YOUR_API_KEY` — that's the
   flag `app.js` checks before enabling sync.
5. Bump `firebase-config.js?v=` in `index.html` and hard-refresh.

## Database path

Progress is stored under `progress/user1` (single-user). This is independent of
the other app because it's a different project/database.

## Suggested rules (single private user)

Test mode leaves the DB world-readable/writable (fine to start). To lock it to
just you later, the simplest option is to keep it private and rely on the
obscure project — or add Firebase Auth and scope rules to your uid. For a
personal single-user tool, test-mode rules with a far-future expiry are usually
enough; revisit if you ever share the URL widely.
