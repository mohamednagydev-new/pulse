# PULSE (FIT IT) — Codebase Audit

**Scope:** `prisma/schema.prisma`, `apps/api/src/**`, `apps/web/src/**`. Read-only audit.
**Date:** 2026-07-30
**Priority key:** **P0** = fix before any real deployment · **P1** = important, schedule soon · **P2** = worthwhile · **P3** = nice-to-have.

---

## 0. Executive Snapshot

The app is broad and genuinely functional: auth, bilingual content, programs/lessons, a guided workout-session player, wellness library, AI coach (RAG) + plan/calorie assistants, tracker, streaks/XP/badges/challenges, real-time feed + DMs + presence, music gallery, and an admin CMS. The engineering is clean and consistent.

The gaps are concentrated in three areas: (1) **production-hardening** (no rate limiting, no security headers, a hardcoded JWT fallback secret, unrestricted file uploads, unauthenticated media streaming); (2) **half-built product surfaces** (coach "phase-2", monetization, forgot-password, personalized schedule are scaffolded but non-functional); and (3) **activation/retention loops** (a marketing-only onboarding that never captures the fitness profile the schema is built around, and a thin reminder strategy).

---

## 1. BUGS / RISKS

### P0 — Security must-fix before deploy

- **Hardcoded JWT fallback secret.** `apps/api/src/env.ts:13` — `JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret'`. If the env var is unset in production, every access token is signed with a public, well-known secret → **anyone can forge an admin token**. There is no startup validation. Fix: throw on boot when `NODE_ENV==='production'` and the secret is missing/default. (Note also `.env.example` ships `JWT_REFRESH_SECRET` but the code never uses it — refresh tokens are random+hashed, which is fine, but the example is misleading.)

- **No rate limiting anywhere.** `apps/api/src/index.ts` has no `express-rate-limit`. `POST /api/auth/login` (`routes/auth.ts:31`) is open to unlimited credential-stuffing; `POST /api/auth/register` to spam; and the AI routes (`routes/ai.ts` `/chat`, `/plan`, `/calories`) let any authed user run **unbounded, billable OpenAI calls** — a direct cost-DoS. No `helmet`/security headers either (confirmed: neither dependency present).

### P1 — Security / data-integrity

- **Media streaming is unauthenticated.** `routes/media.ts` (`/media/video/:id`, `/media/audio/:id`) is mounted with no `requireAuth` (`index.ts:48`). Every video/audio is world-readable to anyone who has (or guesses/enumerates) an id. The code comments say paid gating "will hook in here later," but today there is **no gating and no signed URLs**, so Phase-4 monetization is structurally impossible without reworking this path.

- **Unrestricted file uploads → stored-XSS / abuse.** None of the upload endpoints validate MIME or extension:
  - `routes/social.ts:87` `POST /api/social/upload` — open to **any authenticated user**, 300 MB limit, keeps the user-supplied extension (`path.extname(req.file.originalname)`), then `routes/media.ts:63` serves it via `res.sendFile` (Content-Type inferred from extension). A user can upload `evil.svg`/`evil.html` and get it served inline from the API origin → stored XSS, plus disk-fill abuse.
  - Same pattern in `routes/admin.ts:69` (image) and `routes/music.ts:27`. Fix: allowlist extensions/MIME, force a safe extension, and send `X-Content-Type-Options: nosniff` + `Content-Disposition` on media responses.

- **XP / feed farming via `/api/me/workout-done`.** `routes/me.ts:144` awards **+60 XP + a feed post + streak touch on every call**, with no dedup or throttle. A user (or a loop) can spam it for unlimited XP, level-ups, and feed spam. Contrast with `/completions` which is idempotent per lesson. Fix: throttle (e.g. one credit per N minutes) or tie to a server-validated session.

- **Admin CRUD mass-assignment.** `routes/admin.ts:14` `crud()` passes `req.body` straight into `model.create/update` with **no zod validation**. An admin request (or a compromised admin session / CSRF-style form) can set arbitrary columns. Lower severity because admin-gated, but it's a data-integrity landmine (e.g. writing `order`, relation ids, or unexpected fields).

- **Challenge `calories` goal type is dead.** Schema allows `goalType: 'calories'` (`schema.prisma:424`) but `lib/social.ts:52 bumpChallenges()` only handles `'lessons'` and `'streak'`. Any calorie-based challenge **never progresses** and can never be completed.

### P2

- **OAuth silent account-linking.** `routes/oauth.ts:103` matches an existing user by `provider/providerId` **OR by email**, then logs them in. If a user signed up with email+password, anyone who controls a Google/Facebook account bearing that same email is logged straight into the existing account. Consider linking only on verified-email match with an explicit confirmation.

- **Semantic search is O(n) in memory.** `routes/ai.ts:15` loads **all** `ContentEmbedding` rows and computes cosine in-process on every query/chat turn. Fine at seed scale, but it will not scale and adds latency to every AI chat message (called on each `/ai/chat`).

- **Reactions/comments to a missing post 500.** `routes/social.ts:145` creates a `postComment` before confirming the post exists; a bad `:id` throws an FK error → 500 instead of 404.

- **Refresh-token rotation race.** `routes/auth.ts:50` deletes the old token then issues a new one; two concurrent refreshes (common on app cold-start with parallel requests) can leave one request 401'd and log the user out. No reuse-detection either.

- **Search ignores Arabic + only matches titles.** `routes/content.ts:149` LIKE-searches base (English) columns only; Arabic content (`*Ar`) is unsearchable, and programs/exercises match on `title`/`name` only. FEATURES.md G3 promises SQLite FTS5 — not implemented.

- **`localize()` strips every key ending in `Ar`.** `lib/localize.ts:18` drops any field whose name ends in "Ar" (e.g. a future `year`, `avatar`… `avatarUrl` is safe, but the rule is a foot-gun). Works today by naming luck.

---

## 2. GAPS & MISSED FEATURES

### P1 — Scaffolded but non-functional

- **Coach "Phase-2" is mostly absent.** The brief lists coach-authored workouts, coaching requests/clients, ratings, and verification as "in progress." In reality the **schema has none of these models** — only `User.isCoach`, `coachHeadline/Bio/Specialties`, and a bare `coachVerified` boolean. There is:
  - no model/route for coach-authored workouts, coaching requests, client relationships, or ratings/reviews;
  - no admin (or any) endpoint to set `coachVerified` — the verified badge (`components/CoachBadge`, shown in `CoachesDirectory.tsx:42`) can never be earned;
  - no un-coach path (`me.ts:156 /coach-profile` only ever sets `isCoach:true`).
  So the coach feature today = self-declared flag + directory + follow. This is the single biggest feature-vs-claim gap.

- **Monetization is dead UI.** `Info.tsx:37-55` renders plans with "Choose" / "Purchase Membership" buttons that do nothing. There is **no Stripe route, no checkout, no webhook, no paywall gating, no signed video**. The `Subscription`/`MembershipPlan` models exist but are never written to. `.env.example` reserves Stripe keys; no code consumes them. (FEATURES.md I1–I4.)

- **Forgot-password is a no-op.** `routes/auth.ts:43` validates the email and returns `{ok:true}` without generating a reset token or sending mail. The UI flow (`ForgotPassword.tsx`, Login link) looks complete but **cannot actually reset a password**. There is also no email verification on registration.

- **Onboarding never collects the fitness profile.** `Onboarding.tsx` is 4 marketing slides → `/login`. `Register.tsx` collects name/email/password/mobile/zip. **Nothing captures `fitnessGoal`, `fitnessLevel`, `heightCm`, `weightKg`, or nutrition goals** — the exact fields the AI personalization, plan generator, and tracker are built around (`schema.prisma:31-40`). They're only editable ad-hoc via `PATCH /api/tracker/goals`. This kneecaps personalization and the activation funnel.

### P2

- **Personalized schedule is hardcoded.** `programs/Schedule.tsx:9` is a static `SPLIT` array with "Custom schedules coming soon." Not persisted, not tied to the user's goal/level, and Friday maps to a `Cardio` group that may not exist in seed → Start button silently no-ops (`startDay` returns nothing if no group id matches).

- **Home cards are partly decorative.** `Home.tsx` — "Fit For Life" and "Prepare Your Meal" cards render a `PlayBadge` but have **no onClick/link** (`FeaturedItem` has no link target in schema), so tapping does nothing. Only `banners[0]` is rendered (`Home.tsx:32`); additional banners are ignored.

- **No global/social leaderboard.** `routes/social.ts:175 /leaderboard/weekly` is scoped to *self + people you follow*, so a new user with zero follows sees only themselves. The `/leaderboard/:id` route is per-challenge only. No app-wide ranking to compete on.

- **Challenges lack lifecycle.** `gamification.ts:42 join` doesn't check the challenge exists or is within `startsOn`/`endsOn`; expired challenges remain joinable; completion yields only a feed post (no badge/XP reward, no "claim").

- **`goalProtein/Carbs/Fat` etc.** are collected by `tracker/goals` but there is no dedicated goal-setup screen; discoverability is low.

### P3

- DMs: no block/report, no message deletion, no media, no typing indicator (presence exists but not per-thread).
- No "continue where you left off" for programs/lessons despite `LessonCompletion` data being available.
- `Banner.linkType/linkId` exist in schema but are never used by the client.

---

## 3. ENGAGEMENT RECOMMENDATIONS (ranked by impact-to-effort)

1. **Activation wizard: onboarding → first workout (P1, high impact / medium effort).**
   After signup, run a 3–4 step wizard capturing goal + level + height/weight, auto-compute calorie/macro goals, then **deep-link straight into a matching guided session** (`/session/:groupId`) and prompt push-permission at the "win" moment. Reuses existing `PATCH /api/tracker/goals`, `WorkoutSession`, and `enablePush()`. This is the highest-leverage change: it fills the personalization fields the whole app assumes and gets users to their first "Workout complete!" confetti in minutes.

2. **Expand the reminder/notification engine (P1, medium/medium).**
   Today `lib/reminders.ts` only sends an evening streak-nudge. Add: (a) per-user preferred workout-time reminder; (b) **lapsed-user re-engagement** (no activity in 3/7 days → "your streak reset, come back"); (c) challenge-ending nudges; (d) "goal almost hit — log one more meal." Infra already exists (`notifyUser`, `PushSubscription`, hourly scheduler). Store a `reminderHour`/opt-in on `User`.

3. **Turn `TodayStrip`/Home into a daily dashboard (P1, medium/low).**
   One "Today" card: today's scheduled focus + one-tap resume, calorie/protein progress ring (`/api/tracker/day`), current streak with "at risk" state, and next badge progress. Converts the home screen from a content catalog into a daily habit surface.

4. **Daily quests / habit loop (P2, medium/medium).**
   A rotating daily checklist ("log a meal • do 1 workout • react to a friend") granting bonus XP on completion. `XpEvent` already ledgers XP; add a lightweight `DailyQuest`/completion table. Drives multi-feature daily returns.

5. **Gamification depth (P2, medium/medium).**
   Levels exist but unlock nothing. Add level-gated rewards (themes, badge tiers), a **weekly XP goal**, and leagues/divisions built on the existing weekly XP aggregation. Make `coachVerified` earnable to give coaches a status ladder.

6. **Social hooks at milestone moments (P2, low/low).**
   The share-card (`ShareCardButton`, `lib/shareCard.ts`) and completion feed posts already exist — prompt a share after level-ups/badges/PRs, seed follow-suggestions during onboarding (`/api/social/suggested`), and add a global "Discover" tab so the feed isn't empty for users who follow no one.

7. **"Continue where you left off" + bookmark-driven recs (P2, low).**
   Surface the most recent incomplete program/lesson and recommend content from bookmarked categories on Home.

---

## 4. QUICK WINS (< 1 day each)

| # | Item | File(s) |
|---|------|---------|
| Q1 | Add `helmet` + `express-rate-limit` (auth, register, AI, upload routes). | `apps/api/src/index.ts` |
| Q2 | Throw at boot if `JWT_ACCESS_SECRET` is missing/`dev-*` in production. | `apps/api/src/env.ts` |
| Q3 | Allowlist upload MIME/extension; force safe extension; add `X-Content-Type-Options: nosniff` on `/media/*`. | `routes/social.ts`, `routes/admin.ts`, `routes/music.ts`, `routes/media.ts` |
| Q4 | Throttle/dedup `POST /api/me/workout-done` to stop XP farming. | `routes/me.ts:144` |
| Q5 | Fix `bumpChallenges` to advance `goalType:'calories'` (or hide calorie challenges from UI). | `lib/social.ts:52` |
| Q6 | Make Home "Fit For Life" / "Prepare Your Meal" cards link somewhere (or drop the Play badge). | `pages/Home.tsx` |
| Q7 | Honestly wire forgot-password: generate a reset token + email (or log link in dev). | `routes/auth.ts:43` |
| Q8 | Guard comment/reaction creation with a post-exists check → 404 not 500. | `routes/social.ts:145` |
| Q9 | Add an "un-coach" toggle and validate `coachSpecialties`. | `routes/me.ts:156` |
| Q10 | Render/rotate all banners instead of only `banners[0]`. | `pages/Home.tsx:32` |
| Q11 | Add a zod schema to the admin `crud()` factory (at least reject unknown keys). | `routes/admin.ts:14` |

---

## 5. Notable things done well (keep)

- Access token in memory + httpOnly refresh cookie with rotation (`store/auth.ts`, `lib/session.ts`) — solid token hygiene.
- `optionalAuth`/`requireAuth`/`requireAdmin` split and consistent `req.userId` scoping on user-owned queries (bookmarks, tracker, DMs verify thread membership).
- Range-aware video streaming (`routes/media.ts`) and ffmpeg fallback (`lib/video.ts`).
- Bilingual localization middleware + graceful AI degradation (`aiEnabled()` guards throughout).
- Real-time layer is authenticated at the socket handshake (`lib/realtime.ts:12`).
