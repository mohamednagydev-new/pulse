# Codemagic — build & upload the iOS app WITHOUT a Mac

Codemagic runs macOS build machines in the cloud. The repo already contains
`codemagic.yaml` (repo root) — the whole iOS pipeline: install deps → build the
web bundle in iOS mode → `cap sync ios` → sign → build the .ipa → upload to
TestFlight. What remains is ~15 minutes of one-time clicking.

Free tier: 500 macOS build minutes/month — a build takes ~10-15 min, so
~30 free builds/month. More than enough.

---

## What you need from the Apple Developer account (the friend's)

An **App Store Connect API key** — this replaces logging into the Mac:

1. The account owner opens https://appstoreconnect.apple.com → Users and Access
   → **Integrations** → App Store Connect API → **Team Keys** → ➕.
2. Name: `codemagic`, Access: **App Manager**.
3. Download the **.p8 file** (downloadable ONCE — keep it safe), and note the
   **Key ID** and the page's **Issuer ID**.

Also make sure the app exists in App Store Connect (My Apps → ➕ New App,
bundle ID `online.geddo.pulse`) — same as the Mac path required.

## One-time Codemagic setup

1. Sign up at https://codemagic.io with the GitHub account → grant access to
   `mohamednagydev-new/pulse`.
2. Add application → select the repo → it auto-detects `codemagic.yaml`.
3. **Teams → Personal team → Integrations → Developer Portal → App Store
   Connect**: add the API key (Issuer ID, Key ID, upload the .p8) and name it
   exactly **`appstore-key`** (the yaml references that name).
4. That's it — signing certificates and provisioning profiles are created and
   managed automatically by Codemagic against that key (`ios_signing` block).

## Running a build

- **Manual**: Codemagic dashboard → the app → Start new build → workflow
  "PULSE iOS → TestFlight" → branch `main`.
- **Automatic**: push a git tag matching `ios-v*`:
  ```
  git tag ios-v1.0.0 && git push origin ios-v1.0.0
  ```

The build appears in TestFlight ~15 minutes later. From TestFlight you (and
the friend) can install it on real iPhones, and when ready, submit that same
build for App Store review from App Store Connect.

## Notes

- The web bundle is built with `--mode ios`, which reads `apps/web/.env.ios`
  (`VITE_API_BASE=https://pulse.geddo.online`) — already in the repo.
- Server-side changes reflect in the app instantly; **UI changes need a new
  build** (push a new `ios-v*` tag) — same trade-off as the Mac path.
- The Mac guide (`deploy/APPSTORE-MAC-GUIDE.md`) remains valid as the manual
  fallback; Codemagic is the same steps, automated.
- Android: not needed — the Play Store TWA is built locally (C:\pulse-twa),
  but a Codemagic Android workflow can be added later if wanted.
