# PULSE — End-to-End QA Audit

Date: 2026-08-02 · Scope: `apps/web` (React/Vite/TS) ↔ `apps/api` (Express/Prisma/SQLite)
Method: full static cross-check of every `api.*` call vs each Express route's zod schema & response shape, plus journey tracing. Live API on :4000 was unreachable during the run (server restarting) so all findings are from code.

**Headline:** The FE↔API contract is unusually clean — every path the client calls exists at the right method, and no component reads an obviously-undefined field from a mismatched response. The real defects are (a) a shipped-but-unreachable feature (coach verification), (b) revenue/ad placement wiring, and (c) gamification data-integrity. No hard 404/crash-level contract mismatches were found.

---

## P0 — Security / data-integrity

### P0-1. `media-sign` mints a signed URL for ANY media id, no ownership/entitlement check
- Backend: `apps/api/src/routes/me.ts:14-20` (`GET /api/me/media-sign`) + `apps/api/src/lib/mediaSign.ts:8`
- Any authenticated user can request `?type=video&id=<anyId>` and receive a valid 6-hour HMAC URL for any video/audio row, then stream it via `apps/api/src/routes/media.ts:15,58`. There is no check that the caller owns/паid for the content. Today everything is free so impact is low, but the code comment ("all paid-content gating will hook in here later") shows this is the intended gate and it is currently open.
- Fix: when paid tiers land, verify entitlement in `media-sign` before signing (e.g. lesson→program→membership check), and scope the signature to the user id.

### P0-2. Admin CRUD passes raw `req.body` straight into Prisma with no validation or field allow-list
- Backend: `apps/api/src/routes/admin.ts:24-27` (`crud()` `POST`/`PATCH` → `model.create/update({ data: req.body })`)
- No zod, no allow-list. A missing required column (e.g. creating a Challenge without `goalType`/`startsOn`) throws a raw Prisma error surfaced as a 500 with an internal message; type coercion is done only client-side (`AdminResource.tsx:76` `NUMBER_FIELDS`), so any other caller can write wrong types or unexpected columns. Admin-gated, hence data-integrity rather than pure security.
- Fix: give each resource a zod schema (or a per-resource field allow-list) and coerce/validate server-side; return 400 on validation failure.

---

## P1 — Broken journeys / real bugs

### P1-1. Coach verification badge is unreachable — the "verify badge" journey has no UI
- Backend exists: `apps/api/src/routes/admin.ts:49-53` (`POST /api/admin/verify-coach/:userId`).
- Frontend: there is **no call to `verify-coach` anywhere**. `AdminUsers.tsx:20-31` only lists users (name/email/role) with no action; no other screen calls it.
- Result: `user.coachVerified` can never be set to true through the app, yet `CoachBadge verified={...}` is rendered in 6 places (PostCard.tsx:59, UserProfile.tsx:38, People.tsx:47, CoachesDirectory.tsx:42, GroupSessions.tsx:90, GroupSessionDetail.tsx:43). The verified state is permanently unreachable.
- Fix: add a "Verify coach" toggle to `AdminUsers.tsx` (and/or an admin action on `UserProfile`) that calls `api.post('/api/admin/verify-coach/'+id, { verified: true })`.

### P1-2. Home "Sponsored" banner is not filtered by placement — ad inventory leaks across surfaces
- Backend: `apps/api/src/routes/content.ts:8-17` (`GET /api/home`) returns `prisma.banner.findMany({ orderBy:{order} })` — **all** banners regardless of `section`.
- Frontend: `apps/web/src/pages/Home.tsx:32-45` renders `banners[0]` as the home sponsor.
- Admin defines three placements (`adminConfig.ts:108`: `home_sponsor`, `feed_ad`, `workout_promo`), and the feed correctly filters (`Community.tsx:21` → `/api/banners?section=feed_ad`). But Home ignores `section`, so a `feed_ad` or `workout_promo` with `order:0` shows on the home page (and the same ad can appear in both places). Revenue/placement correctness bug.
- Fix: have `/api/home` return only `section:'home_sponsor'` banners (or add a `banners` filter and have Home request `/api/banners?section=home_sponsor`).

### P1-3. Logging food advances "complete N lessons" challenges
- Backend: `apps/api/src/routes/tracker.ts:68-69` (`POST /api/tracker/calories`) calls `bumpChallenges`, and `apps/api/src/lib/social.ts:59` increments `progress + 1` for **every** `goalType==='lessons'` challenge on any activity — including calorie logging and generic workout-done, not just lesson completions.
- Result: a user can "complete" a lessons-based challenge purely by logging meals. Progress is inflated / meaningless.
- Fix: only bump `lessons` challenges from actual lesson/workout completion; pass an activity kind into `bumpChallenges` and gate the `lessons` branch on it.

---

## P2 — Lower-impact bugs / mismatches

### P2-1. Admin upload hint says "JPG/PNG/SVG" but server rejects SVG/anything non-raster
- Frontend: `apps/web/src/pages/admin/AdminUpload.tsx:16` hint "JPG/PNG/SVG".
- Backend: `apps/api/src/routes/admin.ts:77` allows only `image/(jpe?g|png|webp|gif)`. Uploading an SVG (as the hint invites) fails with "Only JPG, PNG, WEBP or GIF images". `AdminResource.tsx:158` shares the same endpoint.
- Fix: correct the hint to "JPG/PNG/WEBP/GIF" (or add SVG support server-side, noting the existing "no svg/html" security intent in `social.ts:90`).

### P2-2. `calories`-type challenge progress overwrites instead of accumulating
- Backend: `apps/api/src/lib/social.ts:61-64` sets `progress = today's total calories` each bump, replacing the prior value. Across days it only ever reflects *today's* calories, so a multi-day calorie goal can never be reached.
- Fix: accumulate against the challenge window, or define the goal as a daily target and compare accordingly.

### P2-3. Coach rating requires no coaching relationship
- Backend: `apps/api/src/routes/coach.ts:112-122` (`POST /:userId/rate`) upserts a rating with no check that the rater is/was a client. `UserProfile.tsx:89` exposes the star input to anyone viewing a coach.
- Fix: require an `accepted` `CoachRequest` (or completed session) before allowing a rating.

### P2-4. Orphaned route `/leaderboard/:id`
- `App.tsx:156` mounts `Leaderboard` at `/leaderboard/:id`, but nothing links to it (Achievements uses the inline weekly board `social/leaderboard/weekly`; ChallengeRoom has its own board tab). Dead but harmless.
- Fix: either link it (e.g. from a challenge card) or remove the route + page.

### P2-5. Feature gaps where a backend endpoint has no UI
- `GET /api/coach/my-coaches` (`coach.ts:100-104`) — a client can never see "my coaches" list; no caller.
- `reminderHour` is patchable via `PATCH /api/tracker/goals` (`tracker.ts:133`) but no UI sets it (default 19:00 only).
- `POST /api/tracker/weight` (`tracker.ts:83`) exists and `Progress` reads the resulting `weights`, but there is no UI to log a weight entry, so the weight chart is always empty.
- Regular users have no avatar-upload UI (avatar only set via OAuth); `PATCH /api/me` accepts `avatarUrl` but nothing sends it.
- Fix (each): add the missing UI, or drop the unused endpoint.

### P2-6. Home banner mixing aside, `/api/home` sends full banner rows unlocalized-consistent
- Minor: `content.ts` is localized (`index.ts:49`), fine. No action needed; noted only to confirm i18n coverage on home.

---

## Journeys verified OK (no defects found)

- Onboarding slides → `/login`/`/register` → wizard `/setup` (`Register.tsx:22`) → `PATCH /api/tracker/goals` → `/workout` (`OnboardingWizard.tsx:28-38`). Field names match the goals schema exactly.
- Login (email + remember) and OAuth redirects (`Login.tsx:79-80` → `/api/auth/google|facebook`, `oauth.ts`).
- Guided WorkoutSession for both muscle group (`/session/:groupId` → `/api/muscle-groups/:id`) and coach workout (`/session/w/:id` → `/api/coach/workouts/:id`); `source.name ?? source.title` and parsed `exercises[]` line up (`WorkoutSession.tsx:34-36`).
- Programs → Workout/Yoga hubs → Coach → Program → Lesson (mark complete → XP/feed/streak). Signed video via `/api/me/media-sign` (`VideoPlayer.tsx`, `media.ts`).
- Community feed: post/react/comment, image + video upload (`/api/social/upload` → `{mediaType,mediaUrl}`), and `feed_ad` banner (`Community.tsx:21`). PostCard reads `reactions`/`myReaction`/`commentCount` which `shapePost` (`social.ts:44-61`) provides.
- People/follow, suggested, public profile, DMs (socket `dm:open/new`, `chat.ts`), challenge room chat + `@coach` AI reply.
- Coach flow: become-coach (`/api/me/coach-profile`) → dashboard → create workout → request → accept → rate. All request/response fields align. (Only the final admin *verify* step is dead — P1-1.)
- Group sessions create/join/leave/detail; `data.coachUserId` used for owner check matches the spread session (`group.ts:91`).
- Tracker + AI calorie estimate (`/api/ai/calories` → `items[]` → `/api/tracker/calories`).
- Music gallery upload/favorite/delete + signed audio session playback.
- Achievements/challenges join & progress; Admin CMS CRUD for all 13 resources (shape-compatible, modulo P0-2/P2-1).
- i18n/RTL (`i18n.ts` `applyDir`, logical `ps-/pe-/ms-/me-/start-/end-` utilities used consistently) and dark mode (`theme.ts` + global `.dark` overrides in `index.css`; `initTheme()` called in `main.tsx:11`).

## Notes
- `env.ts:24` correctly refuses to boot production on the default `dev-access-secret`; `.env` has all real secrets set — good.
- Express route ordering in `coach.ts` is safe (`/:userId/workouts` vs `/workouts/:id` do not collide).
- `verifyMedia` handles unequal-length signatures safely (`timingSafeEqual` wrapped in try/catch).
