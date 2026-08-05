# PULSE on Google Play (TWA)

Wrap the live PWA (https://pulse.geddo.online) as a **Trusted Web Activity** — a real Play Store
app with zero code changes. The store app is a thin shell; every update you deploy to the website
updates the app instantly.

## Prerequisites (your machine, one time)
- Node.js (you have it) and **JDK 17**: https://adoptium.net
- Android SDK is downloaded automatically by Bubblewrap on first run.
- A **Google Play Console** account ($25 one-time): https://play.google.com/console

## 1. Generate the Android project

```powershell
npm i -g @bubblewrap/cli
mkdir C:\pulse-twa ; cd C:\pulse-twa
bubblewrap init --manifest https://pulse.geddo.online/manifest.webmanifest
```

Answer the prompts:
- **Application ID:** `online.geddo.pulse` (must match assetlinks.json)
- **Host:** pulse.geddo.online · **Start URL:** /
- **Name / colors / icons:** pre-filled from the manifest — accept.
- **Signing key:** let Bubblewrap create one (`android.keystore`). **BACK THIS FILE + PASSWORDS UP** — losing it means you can never update the app.

## 2. Build

```powershell
bubblewrap build
```

Produces `app-release-signed.apk` (for testing on your phone) and `app-release-bundle.aab` (for the Play Store).

## 3. Digital Asset Links (removes the browser bar — REQUIRED)

The site already serves `https://pulse.geddo.online/.well-known/assetlinks.json` (it ships in the web build).
You must put the real certificate fingerprint in it:

1. After your first Play Console upload, go to **Play Console → your app → Setup → App integrity → App signing** and copy the **SHA-256 certificate fingerprint** (use the *App signing key* one, since Play re-signs your app).
2. Edit `apps/web/public/.well-known/assetlinks.json` in the project: replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT_FROM_PLAY_CONSOLE` with that fingerprint (keep the `AA:BB:...` colon format).
3. Rebuild + redeploy the web app (normal deploy loop). Verify:
   `https://pulse.geddo.online/.well-known/assetlinks.json` shows the fingerprint.

## 4. Publish

Play Console → Create app → upload the `.aab` → fill the store listing (use the share-card style
branding; screenshots straight from your phone) → submit for review. First review takes a few days.

## Notes
- The TWA opens your live site — content, fixes, and features ship via your normal web deploy, no store re-submission needed (store updates are only for icon/name/signing changes).
- Push notifications keep working (same web push).
- iOS: no TWA equivalent — iPhone users keep the "Add to Home Screen" install (already prompted in-app).
