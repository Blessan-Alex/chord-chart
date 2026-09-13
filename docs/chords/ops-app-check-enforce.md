# App Check — Enforce on Firestore

> Do this when the app is stable on production and you are ready to block unverified clients.

## Prerequisites

- [x] `NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY` set in Vercel (reCAPTCHA Enterprise)
- [x] `initAppCheck()` runs on the client (`webmvp/src/lib/firebase.ts`)
- [x] `lfchords.vercel.app` listed under Firebase Auth → Authorized domains

## Steps (Firebase Console)

1. Open [Firebase Console](https://console.firebase.google.com) → project **song-db-5e4ed**
2. **App Check** → your web app → confirm reCAPTCHA Enterprise is registered
3. **Firestore Database** → **App Check** tab (or App Check → APIs → Cloud Firestore)
4. Change enforcement from **Monitoring** to **Enforced**
5. Smoke test within 15 minutes:
   - Sign in on production
   - Load home library (songIndex read)
   - Open a song, sessions list, admin import

## Rollback

If legitimate users are blocked, switch Firestore App Check back to **Monitoring** while you debug (wrong site key, missing domain, ad blockers blocking reCAPTCHA).

## Notes

- App Check does **not** change `firestore.rules` — it rejects requests before rules run.
- Emulator/local dev: App Check is skipped when `NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY` is unset.
- Spark tier: App Check is free; no Cloud Functions required.
