# GO-LIVE — the single-afternoon checklist (2026-08-05)

The bundle with everything from this session is built: **`F:\pulse-bundle.zip`**.
Work through this top to bottom; each block says exactly where it runs.

## 1 · Deploy (on the server, ~15 min)

1. Copy `F:\pulse-bundle.zip` to the server, extract over `C:\pulse` (replace files).
2. Add the new optional vars to `C:\pulse\.env` (nothing breaks if you skip, but do it):
   ```
   MEDIA_SIGN_SECRET=<any long random string>
   BACKUP_DIR=<see step 3>
   # optional, only if you ever activate Strava:
   # STRAVA_CLIENT_ID= / STRAVA_CLIENT_SECRET= / STRAVA_VERIFY_TOKEN=
   ```
3. Run `powershell -File C:\pulse\deploy\install.ps1` — it installs deps, applies the
   3 new migrations (indexes/JobRun, exercise progressions, wearables), builds, and
   restarts the NSSM service.
4. Run `powershell -File C:\pulse\deploy\seed.ps1` — adds the progression ladder
   (84 exercises) and the Ramadan guide pack. Existing user data untouched.
5. Smoke check: open the site → Home loads → `pulse.geddo.online/api/health`
   returns `{"ok":true}` → change language to عربي → open a workout, quick session
   cards show *different* icons now → Tracker → add food → the mic button appears
   (Chrome/Android).

## 2 · Rotate the Google OAuth secret (console.cloud.google.com, ~5 min)

The old secret sat in the repo before it was gitignored — treat it as burned.
1. Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client.
2. **Add a new client secret**, copy it.
3. On the server: update `GOOGLE_CLIENT_SECRET` in `C:\pulse\.env`, restart the service
   (`nssm restart pulse-api` or the service name you used).
4. Test "Sign in with Google" on the live site.
5. Back in the console, **delete the old secret**.
6. On the dev machine: update `F:\FIT_IT\.env` too, and delete
   `F:\FIT_IT\client_secret_*.json` (it's gitignored and excluded from bundles now,
   but the file itself should go).

## 3 · Off-site backups (on the server, ~10 min)

The API now writes a consistent snapshot nightly at 04:00 and keeps 14. Make them
survive the machine:
- Easiest: install/sign into **Google Drive for desktop** (or OneDrive) on the server,
  create `G:\My Drive\pulse-backups` (or `C:\Users\<you>\OneDrive\pulse-backups`),
  set `BACKUP_DIR=` to that path in `.env`, restart the service.
- Verify tomorrow: a `pulse-YYYY-MM-DD.db` file appears there and in the cloud web UI.
- No cloud on the server? A second physical disk is acceptable as step one —
  but cloud is the point of "off-site".

## 4 · Uptime monitor (any browser, ~5 min)

1. uptimerobot.com → free account → **Add Monitor**.
2. Type: HTTP(s) · URL: `https://pulse.geddo.online/api/health` · interval 5 min.
3. Keyword monitor variant: alert when response does **not** contain `"ok":true`
   (this catches the DB being down, not just the web server).
4. Alert contact: your email (add Telegram/WhatsApp via their integrations if you like).

## 9 · Launch week (marketing — start the same evening)

Everything is pre-written in **MARKETING-POSTS.md**; this is just the order:

| Day | Do |
|---|---|
| 0 (today) | Set up the Instagram/TikTok profiles exactly per MARKETING.md §1 (bio text is written). Post **LAUNCH POST 1 — Announcement** (AR then EN in comments). Story: the install-in-one-tap screen recording. |
| 1 | **POST 2 — The real problem** ("asks what hurts"). Reply to every comment in Egyptian Arabic. |
| 2 | **POST 3 — Muscle map** + screen-recording story of tapping a muscle. |
| 3 | **FEATURE POST — The meal plan that explains itself** (the new one — it's the differentiator vs Kam/Miran). Story poll: "لفيت النهارده؟ 🎡". |
| 4 | **POST 4 — Reels** + repost the first community reel if any. |
| 5 | **POST 5 — The kitchen** + voice-logging demo story: say "طبق كشري" into the tracker on camera — nobody else in the market can show this on Android. |
| 6 | **POST 7 — Challenge kickoff**: open a public 7-day challenge in the app, post the invite code. This is the Welnes playbook — run it before they do. |
| Every Saturday after | Post the league promotions ("مبروك لـ… طلعوا 🥇") — the fixed weekly appointment. |

Rules while doing it (MARKETING.md §12): one claim per post, never stack two;
Egyptian dialect only; reply to every single comment for the first month; repost every
user share-card to the story. The share cards carry your URL — users are the ad budget.

---
*Also queued but deliberately not this afternoon: Play Store TWA (deploy/PLAY-STORE.md),
Garmin Health partner application (free, slow — submit whenever), PlusPass/GymTag
partnership emails (PARTNER-RATE-CARD.md has the numbers).*
