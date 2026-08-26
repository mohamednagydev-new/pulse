# Apple 2.1 reply — paste into App Store Connect (Reply to App Review)

Two things only YOU can do first:
1. **Record the video** (checklist at the bottom) on a real iPhone, upload it to Google Drive,
   set link-sharing to "anyone with the link", and put the URL where marked below.
2. **Fill the device line** in item 2 with the actual iPhone model(s)/iOS you tested on via TestFlight.

---

## PASTE THIS REPLY

Hello App Review team,

Thank you for the review. Here is the requested information:

**1. Screen recording**
A full demo recorded on a physical device is available here (view access enabled):
`<<PASTE GOOGLE DRIVE LINK>>`
The recording starts at app launch and shows: registration, login, the onboarding intake, browsing and completing a workout (with exercise demo videos), logging food (including the camera-based meal photo flow and its permission prompt), the community feed with user-generated content — including the report and block mechanisms — the notifications permission prompt, and the account-deletion flow in Settings.

**2. Devices and OS tested**
`<<e.g. iPhone 13, iOS 18.6 — via TestFlight build 3>>` (fill honestly)

**3. App functions and target audience**
PULSE is a free fitness and nutrition app for Arabic-speaking users (primarily in Egypt), also fully usable in English. It solves the problem that mainstream fitness apps don't fit Egyptian users: workout guidance in Egyptian Arabic, and calorie tracking for Egyptian foods (koshary, foul, taameya, etc.) that international databases don't cover well. Core features: guided video workouts and weekly plans, food and water logging with calorie targets, progress tracking (weight, measurements, exercise charts), streaks/challenges/leaderboards for motivation, an optional community feed with friends, and an AI assistant that answers fitness and nutrition questions. The target audience is adults 18+ who want to train at home or in the gym. The app is 100% free: no purchases, no subscriptions, no paid content of any kind.

**4. Setup and access instructions**
- Demo account (already in App Review Information): `playreview@geddo.online` / `PulseReview#2026`
- Launch the app → Sign in with the demo account → you land on the Home screen.
- Main features: Home (daily plan + quick actions) · التمرين/Train tab (muscle map and programs — open any workout and start a session) · الأكل/Food tab (log a meal by text, voice, or photo) · المجتمع/Community tab (feed; long-press or use the ⋯ menu on any post to report or block) · حسابي/Profile (progress, settings, Delete my account).
- The app is bilingual; the demo account defaults to Arabic. Language can be switched from the top of the menu drawer.
- No sample files are needed; all content is built in.

**5. External services used**
- OpenAI API — powers the optional AI assistant and meal-photo calorie estimation (user-submitted text/photos are processed to generate a response; not used for model training).
- YouTube embedded player — exercise demonstration and educational videos are embedded from YouTube using the official embed player (content is streamed from YouTube; nothing is downloaded or re-hosted).
- Google Sign-In (OAuth) — optional login method alongside email/password.
- Brevo (SMTP) — transactional emails only (verification, password reset).
- Strava API — optional, user-initiated connection to import workout activity from wearables.
- Web Push (APNs via web push) — opt-in notifications.
- No payment processors, ad networks, or analytics SDKs are used. No App Tracking Transparency prompt is needed because the app does not track users across other companies' apps or websites.

**6. Regional differences**
The app functions identically in all regions. All features are available worldwide. The interface is Arabic-first with a full English localization. Occasional in-app promotional challenges may offer prizes that can only be delivered inside Egypt; the challenge features themselves work everywhere.

**7. Regulated industry / third-party material**
PULSE provides general fitness and wellness guidance only — it is not a medical app, makes no medical claims, and does not offer diagnosis or treatment. Third-party video material is embedded exclusively through YouTube's official embed player in accordance with YouTube's Terms of Service, with no downloading, re-hosting, or modification of the content. All other content (programs, recipes, text) is our own.

Please let us know if anything else would help the review.

Thank you!
Mohamed — PULSE

---

## Screen-recording checklist (10–12 min total, one continuous take is fine)

iPhone: Settings → Control Center → add Screen Recording → record from Control Center.

1. Launch the app (cold start, shows splash).
2. Register a NEW account (use a throwaway email) → go through the intake wizard.
3. Log out → log IN with the demo account (playreview@geddo.online).
4. Home → open a workout → play an exercise demo video → complete 1–2 exercises → finish.
5. Food tab → log a meal by text → then tap the meal-photo camera flow so the **camera permission prompt** appears on video.
6. Community → scroll the feed → open a post → show **Report** and **Block** options.
7. Trigger the **notifications permission prompt** (it appears from the push nudge or Settings).
8. Profile → Settings → scroll to **Delete my account** → tap it and show the confirmation flow
   (complete the deletion on the THROWAWAY account from step 2 — not the demo account).
9. Stop recording → upload to Google Drive → "Anyone with the link" → copy link into the reply.
