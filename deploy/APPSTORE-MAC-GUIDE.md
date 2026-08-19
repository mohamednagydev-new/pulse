# PULSE on the App Store — the borrowed-Mac session guide

The iOS project is prepared in this repo (`apps/web/ios`, Capacitor — the web app is
**bundled inside** the app, which is what keeps Apple's "not just a website" rule happy).
The Mac is only needed to **build, sign and upload**. Everything else was done on Windows.

**Publishing under your friend's Apple Developer account.** One thing to understand before
starting: the app will legally live in THEIR account — their team name may show as the
seller, and future updates need their account. That's fine for launch; Apple supports
transferring an app to your own account later (App Transfer) if you enroll someday.
Recommended: have your friend add you to their team (App Store Connect → Users and Access →
add your Apple ID as **App Manager**) so you can edit the listing yourself afterwards.

---

## 0 · BEFORE the session (saves hours on the day)

- [ ] On the Mac: install **Xcode** from the Mac App Store (10–15 GB — do this a day early)
      and open it once so it installs its components. `xcode-select --install` for CLI tools.
- [ ] Install Node 20+ on the Mac: https://nodejs.org (or `brew install node`)
- [ ] ~~CocoaPods~~ NOT needed: the generated project (Capacitor 8) uses **Swift Package
      Manager** — Xcode resolves packages by itself on first open.
- [ ] Friend signs into **Xcode → Settings → Accounts** with their developer Apple ID.
- [ ] Have at hand: this repo's GitHub access, and the review credentials
      (`playreview@geddo.online` / `PulseReview#2026`).

## 1 · Get the code and build the web bundle (Terminal)

```bash
git clone https://github.com/mohamednagydev-new/pulse.git
cd pulse && npm install
cd apps/web
npx vite build --mode ios          # builds with VITE_API_BASE=https://pulse.geddo.online
npx @capacitor/assets generate --ios --assetPath resources   # app icon + splash from resources/
npx cap sync ios                   # copies dist into the iOS project
# No `pod install` — Capacitor 8 projects use Swift Package Manager; Xcode
# resolves the Capacitor packages automatically the first time you open the project.
```

## 2 · Open and sign in Xcode

```bash
open App.xcodeproj                 # from apps/web/ios/App (SPM project — no .xcworkspace exists)
```
- Select the **App** target → **Signing & Capabilities**:
  - Team: your friend's team
  - Bundle Identifier: `online.geddo.pulse` (leave as configured)
  - "Automatically manage signing" ✓ — Xcode registers the bundle ID + certificates itself.
- Top bar device selector: **Any iOS Device (arm64)**.
- Optional sanity check: pick a Simulator (e.g. iPhone 15) and press ▶ — the app should
  boot to the PULSE landing/login. Log in with the review account to smoke-test.

## 3 · Create the app record (Safari, friend's account)

appstoreconnect.apple.com → **My Apps → + → New App**:
- Platform iOS · Name **PULSE** (if taken globally, use "PULSE — تمارين ودايت")
- Primary language: Arabic · Bundle ID: `online.geddo.pulse` (appears after Xcode registered it)
- SKU: `pulse-app` · Full access.

## 4 · Archive and upload (Xcode)

- Menu **Product → Archive** (5–10 min). The Organizer window opens when done.
- **Distribute App → App Store Connect → Upload** → accept defaults → Upload.
- Wait ~10–30 min: the build appears in App Store Connect → TestFlight (processing email arrives).

## 5 · Fill the listing (App Store Connect)

Reuse the Play pack (`deploy/PLAY-LISTING.md`) — same texts work:
- Description: the Arabic full description (+ English in the English localization)
- Keywords field (100 chars, iOS-only): `تمارين,دايت,سعرات,رجيم,كوتش,fitness,workout,calories,gym,challenge`
- Support URL: `https://pulse.geddo.online` · Privacy Policy URL: `https://pulse.geddo.online/privacy`
- Screenshots: iOS wants **6.7" (1290×2796)** and **6.5" (1284×2778 or 1242×2688)** sets.
  Easiest: run the app in the iPhone 15 Pro Max simulator and press ⌘S on each screen
  (Home, Food, Progress, Muscle map) — the simulator saves correctly-sized PNGs to the Desktop.
- **App Privacy** questionnaire: mirror the Play data-safety table in PLAY-LISTING.md §5
  (collects: name, email, health & fitness, photos, messages, usage data — all "App
  Functionality", not used for tracking, not sold; deletion available in-app).
- Age rating questionnaire: everything "None" → likely 4+ (UGC questions: unrestricted
  web access NO; user-generated content YES with moderation/report/block).

## 6 · Submit for review

- Select the uploaded build · **App Review Information**: sign-in required ✓ →
  `playreview@geddo.online` / `PulseReview#2026`
  Notes: "Fitness & nutrition app with full offline-capable feature set: workout logging,
  calorie tracking with an Egyptian food database, social challenges. The review account
  is pre-onboarded."
- Export compliance: uses standard HTTPS encryption only → the standard exemption (answer:
  Yes uses encryption / Yes exempt).
- Submit. Typical review: 1–3 days.

**If rejected under Guideline 4.2 ("minimum functionality")**: don't panic — reply in the
Resolution Center listing the native-quality functionality (offline logging + sync, camera
meal-photo analysis, barcode scanner, voice logging, haptics, per-user coaching engine),
and mention an iOS-specific roadmap (push via APNs). Wrapper-looking apps get waved through
on appeal regularly when the functionality is real — ours is.

---

## Updating the iOS app later — IMPORTANT DIFFERENCE from Android

The Play (TWA) app shows the live website → **website deploys update it instantly**.
The iOS app **bundles** the web code → UI changes reach iOS users only via a new build:
repeat steps 1 (build+sync), 4 (archive+upload), bump the version in Xcode, submit.
API/server-side changes (content, prices, fixes in endpoints) reflect immediately on iOS too.
If store-free iOS updates become important later, we can add a self-hosted live-update
layer (Capgo/capacitor-updater) — say the word.
