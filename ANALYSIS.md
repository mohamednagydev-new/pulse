# PULSE (FIT IT) — Full App Scan: Features, Flows, Gaps & UI/UX

**Date:** 2026-08-05 · **Scope:** `apps/api` (28 route modules, ~10k LOC), `apps/web` (68 pages, 43+ components, ~19k LOC), `prisma/schema.prisma` (~70 models).
**Method:** three parallel deep static analyses (backend, frontend flows, UI/UX), cross-checked against AUDIT.md (Jul 30) and QA-REPORT.md (Aug 2).

---

## ✅ IMPLEMENTATION STATUS (2026-08-05, same day)

The findings below were implemented in three commits (`git log` from the baseline snapshot):
`d38455b` backend hardening · `b3ead43` frontend core · `f613d09` UX sweep.

**Fixed:** B1–B4, B6–B10, B12–B14 · S1–S4 (rate limits), S6–S11 · U2 (first-run + PushToggle; drawer/Help inline-`isAr` pattern remains), U3, U4, U5 (zoom re-enabled; 14.5px root + gray-400 contrast audit remains), U6, U9 (autoComplete + retry affordances), U10 (code splitting + error boundary + offline banner + scroll restoration) · dark mode: `darkMode:'class'` + pastel-tint coverage + system-follow · schema: hot-path indexes, `JobRun`, dead `GeneratedPlan` dropped · orphans: meal-prefs UI built, push unsubscribe built, `/leaderboard` dead code deleted.

**Verified false positive:** B11 (streak-freeze milestone) — the counter increments by exactly 1 in the freeze branch, so `% 7` milestones cannot be skipped.

**Deliberately not done (decisions/scale, not bugs):** Stripe/monetization (product decision), AI coach chat screen (product decision), cursor pagination beyond caps, ffmpeg job queue, SQLite→Postgres, full `dark:`-variant rewrite, full type-scale/contrast audit, locale-file consolidation of the drawer/Help inline-bilingual pattern.

**Requires manual action:** rotate the Google OAuth client secret (the `client_secret_*.json` at repo root was live; it is now gitignored but should be rotated and moved out of the repo) · optionally set `MEDIA_SIGN_SECRET` in `.env` (falls back to `JWT_ACCESS_SECRET`) · redeploy (deploy/install.ps1 runs `prisma migrate deploy`, which applies the new migration).

---

## 0. Executive summary

The app is **broad, genuinely functional, and mostly complete**. Every frontend API call resolves to a real backend route (0 broken contracts), locale files are 100% in parity (685 EN / 689 AR keys, 0 missing), and the domain logic (coaching engine, leagues, duels, AI budget, meal planner) is unusually well-reasoned. Most of the July AUDIT.md findings were since fixed.

The remaining problems cluster in five areas:

1. **Two shipped-but-broken infrastructure bugs** — the service worker swallows the Google OAuth redirect, and the realtime socket authenticates with a null token on cold load (all live features silently dead).
2. **Security at the HTTP edge** — private body photos served unauthenticated, challenge chat open to anyone, unprotected partner-billing counters, a live Google OAuth secret at the repo root.
3. **A UTC-vs-Cairo timezone split** that breaks quests/streaks nightly between 22:00–24:00.
4. **The first-run experience is English-only** for an Egyptian-Arabic-first product, despite complete Arabic locale files.
5. **Systemic UX gaps** — ~60 of 68 screens fail silently on network errors; 19 nav destinations hidden behind a drawer that exists on only 2 screens.

---

## 1. Feature inventory — what's implemented

### Complete and working (backend + frontend + nav entry)

| Area | Features |
|---|---|
| **Auth** | Register (with referral codes → streak freezes), login (remember-me), forgot/reset password (hashed single-use tokens), rotating refresh tokens, Google/Facebook OAuth (env-gated, graceful fallback) |
| **Training** | Workout/Yoga hubs, coach pages, programs → lessons with signed range-streamed video, interactive muscle map (BodySvg), guided WorkoutSession (632 LOC: timers, rest rings, set logging, PR detection, voice coaching, music, confetti, contraindication warnings), weekly schedule editor |
| **Coaching engine** | 9-question assessment → level/program/schedule/nutrition targets (rule-based, writes through to user profile + enrollment), weekly check-ins with adherence measurement, one-proposal-at-a-time plan adjustment with cooldowns, program path with self-healing enrollment |
| **Nutrition** | Rule-based meal plan (deterministic per user+date), meal swaps, Egyptian food DB with Arabic normalization, calorie tracker, AI photo/free-text estimates (budget-capped), weekly recap (rule-based prose, AI rewrite optional) |
| **Tracking** | Calories, water, weight, lifts + PRs, body measurements + photos, 119-day XP heatmap, progress share cards |
| **Gamification** | XP ledger, levels, badges, streaks + freezes, global/personal/group challenges with invite codes and chat (@coach AI), daily quests (3-of-7 deterministic), spin wheel, workout roulette, 5-tier leagues (rooms of 20, promote/demote, lazy + scheduled settlement), monthly auto-rotating seasons, buddy duels with XP wagers, weekly hall of fame |
| **Social** | Feed (+pinned announcements, live socket refresh), posts with media, reactions/comments, follow, connections (request/accept), DMs (connection-gated, unread badges), people search, public profiles, buddies + cheers, presence, coach directory |
| **Coach marketplace** | Become-a-coach, coach-authored workouts/programs (exercise fuzzy-match enrichment), coaching requests/clients, ratings, admin verification, live group sessions (socket-synced timer, emoji bursts) |
| **Reels** | Curated (YouTube oEmbed, no API key) + community reels, affinity-weighted "For You", favorites, watch telemetry, admin curation (paste-link, bulk, channel RSS, moderation, blocklist) |
| **Commerce (catalog)** | Partner store, deals with redeem/view counters, gyms directory (haversine, filters, openNow), events board with RSVP + lead forms (deduped), rate-card counters |
| **Admin CMS** | Generic CRUD over 17-18 resources with fire-and-forget Arabic auto-translation, media upload + ffmpeg transcode, analytics dashboard, leads inbox + CSV export, support tickets, video bulk-import, user list, coach verify |
| **Platform** | PWA (installable, iOS instructions, maskable icons, offline shell), web push (VAPID-gated, in-app notification fallback, dead-sub pruning), hourly scheduler (nudges, recaps, lapsed-user re-engagement, data retention), i18n EN/AR with RTL, dark mode toggle, analytics events pipeline, desktop QR gate, support tickets with hand-rolled rate limits |

### Deliberately retired / by-design stubs
- `POST /api/ai/plan` → intentional 410; `/plan` route redirects to `/meals` (rule-based planner replaced it).
- AI everywhere degrades gracefully when `OPENAI_API_KEY` absent (503s, silent @coach, rule-based recap fallback) — this is done well.
- Store is catalog-only (no checkout) by design.

---

## 2. Broken things (bugs found in this scan)

### 🔴 Critical — features silently dead in production

| # | Bug | Evidence |
|---|---|---|
| B1 | **Service worker breaks Google sign-in.** `navigateFallback: '/index.html'` with no `navigateFallbackDenylist` — once the SW is active, the top-level navigation to `/api/auth/google` (`Login.tsx:108`) is answered with the cached SPA shell and never reaches the server. Confirmed in built `dist/sw.js`. | `vite.config.ts:28` — fix: `navigateFallbackDenylist: [/^\/api/, /^\/media/]` |
| B2 | **Realtime is dead on cold load.** `CelebrationListener` constructs the socket before `bootstrap()` sets the access token → server rejects the handshake and socket.io does not retry after middleware rejection. `refreshSocketAuth()` exists (`lib/socket.ts:14`) but is **never called anywhere**. No level-ups, presence, live feed, chat, challenge, or group-timer updates until a lucky reload. | `App.tsx:271-283`, `lib/socket.ts:14` |
| B3 | **Timezone split breaks quests/streaks nightly.** `lib/time.ts` provides Cairo `dayString()`, but `tracker.ts:11-13` and `gamification.ts:68-89` use UTC, and `daily.ts:82`, `leagues.ts:31`, `social.ts:80` use server-local. Between 22:00–24:00 Cairo, a logged meal lands on "yesterday" and never satisfies today's quest. | `tracker.ts:11` vs `lib/time.ts:6` |
| B4 | **Admin AI budget exemption is dead code.** Middleware sets `req.role`; `ai.ts:24,249` reads `req.userRole` (never set) — the exemption branch is unreachable. | `ai.ts:24,249`, `middleware/auth.ts:21` |

### 🟠 High — functional defects

| # | Bug | Evidence |
|---|---|---|
| B5 | Undefined token `brand-orange` (not in `tailwind.config.js`) used in 5 places — MealPlan header gradient starts transparent, Tracker icons lose color, admin checkbox defaults blue. | `MealPlan.tsx:71,133,143`, `Tracker.tsx:118`, `AdminResource.tsx:221` |
| B6 | `store` and `venues` routers mounted without `optionalAuth` → `req.userId` always undefined → the user's saved country is ignored; a Saudi user sees Egyptian gyms/deals. (`board.ts` does it right.) | `index.ts:97,102`, `lib/geo.ts:109-113` |
| B7 | Deep links lost after login: `state.from` is captured by `RequireAuth` but `Login.tsx:48` always navigates to `/`. | `App.tsx:109`, `Login.tsx:48` |
| B8 | No global 401→logout: if token refresh fails the error becomes a toast and the user is stranded on a half-broken screen. | `lib/api.ts:46-48` |
| B9 | MenuDrawer slides from the wrong side in Arabic: panel anchored with logical `start-0` (right in RTL) but framer-motion animates physical `x: '-100%'` (always from the left). | `MenuDrawer.tsx:127-130` |
| B10 | Back arrow points the wrong way in Arabic on all 43 TopBar screens (`ChevronLeft` with no `rtl:rotate-180`); only 18 of 46 directional icons mirror. | `TopBar.tsx:45` |
| B11 | Streak-freeze grant only fires on exact 7-day multiples; a freeze-saved streak skips the milestone silently. | `lib/gamify.ts:36` |
| B12 | Scheduler re-runs immediately on every boot — restarting twice in the 18:00 hour double-sends the lapsed-user nudge (same for Friday recap). | `lib/reminders.ts:10-13` |
| B13 | Video bulk-import `apply` re-resolves from raw text instead of the previewed ids — applied set can differ from what admin reviewed. | `admin.ts:255-269` |
| B14 | `/api` Workbox cache (`NetworkFirst`) has no `expiration` — grows unbounded and can serve stale personalized data. | `vite.config.ts:33-34` |

---

## 3. Security & hardening gaps

Cross-referenced with QA-REPORT.md — P0-1 (media-sign no entitlement) and P0-2 (admin CRUD raw body) are **still open**; the rest below are new findings.

| # | Finding | Evidence |
|---|---|---|
| S1 | **Private body photos served unauthenticated.** `GET /media/image/*` has no auth, no signature, no rate limit — the same directory stores `BodyLog.photo`, which the schema documents as "private to the user". Random-hex filenames are the only protection. | `media.ts:70-78`, `schema.prisma:450` |
| S2 | **Challenge chat open to anyone.** Any authenticated user can read and post into any challenge (including private/personal ones) — join is gated but messages/leaderboard/detail are not. | `gamification.ts:150-191` |
| S3 | **Socket rooms unauthorized.** `dm:open` / `challenge:open` / `group:open` perform no membership checks — any authenticated socket can join any DM thread room and receive live messages. | `lib/realtime.ts:41-47` |
| S4 | **Partner-billing counters are unauthenticated and unlimited.** Banner impressions/clicks, deal redeems/views, partner/product contacts, event contacts — all mutable by a curl loop, and PARTNER-RATE-CARD.md says partners are billed on these numbers. | `content.ts:51-58`, `store.ts:74-122`, `board.ts:111-114` |
| S5 | **Live Google OAuth secret at repo root**, not in `.gitignore` (`client_secret_*.json`). | repo root |
| S6 | OAuth account linking matches by unverified email (`OR: [{provider,providerId},{email}]`) — account-takeover path via provider account with matching unverified address. | `oauth.ts:103-105` |
| S7 | Push subscription hijack: upsert on unique `endpoint` reassigns `userId` on conflict. | `push.ts:30-34` |
| S8 | Media-sign signs any id for any authenticated user (no ownership check — includes other users' private music uploads), and the HMAC key reuses `JWT_ACCESS_SECRET` (rotating JWT secret invalidates all media URLs). | `me.ts:15-21`, `mediaSign.ts:6` |
| S9 | Rate limiting covers only login/register/AI/events. Missing: forgot-password (email-bombing + SMTP quota burn), refresh, uploads (300MB–2GB each spawning a **synchronous ffmpeg transcode on the request path**, no queue), posts, counters. No `helmet`/security headers at all. | `index.ts:57-63`, `lib/video.ts:60-66` |
| S10 | Admin CRUD factory passes raw `req.body` into Prisma across 18 models (mass assignment, raw 500s on bad input); admin video upload has no mimetype check at 2GB. | `admin.ts:43-58,485-492` |
| S11 | Misc validation: unbounded reaction emoji over HTTP (socket path caps at 8 chars), `mediaUrl` on posts/reels never validated against owned uploads, `avatarUrl` accepts `javascript:` URIs, mailer logs full password-reset links to console on SMTP failure. | `social.ts:174,155-171`, `me.ts:39`, `mailer.ts:53-57` |

---

## 4. Unfinished / orphaned features

### Built on the server, no UI (decide: surface or delete)
- `PATCH /api/meals/prefs` — **dietary preferences unreachable**; the meal planner can't be told about allergies/vegetarianism. Highest-value orphan.
- `GET /api/coach/my-coaches` — clients can't see their coaches list.
- `DELETE /api/path/program/:id/start` (leave program), `DELETE /api/duels/:id` (cancel duel), `GET /api/group/mine`, `GET /api/meals/foods/categories` (FoodPicker is search-only).
- `POST /api/ai/chat` — full RAG coach endpoint + rate limiter + 4 locale keys exist; **no chat screen was ever built**.
- Membership plans: admin CRUD + public API exist, but the app hardcodes "everything is free" (`Info.tsx:41-49`); `Subscription` is never written; zero Stripe code despite `.env.example` keys.
- `Food` model has no admin CRUD — seed-script only.

### Built on the client, half-wired
- **Push toggle is one-way** — no unsubscribe path; also entirely hardcoded English despite existing locale keys (`PushToggle.tsx`).
- **Dark mode has 0 `dark:` variants** — implemented as ~14 `!important` overrides in `index.css:385-440`; 66 pastel-tint backgrounds break on dark (`Home.tsx:275`, `Profile.tsx:41`, `MealPlan.tsx:133`). No system-follow / `prefers-color-scheme` default.
- `/leaderboard/:id` route + `Leaderboard.tsx` — **zero inbound links**; dead code.
- Facebook login: locale key exists, no button.

### Dead code / schema
- `GeneratedPlan` model — fully dead (orphaned by retired AI planner). `Subscription` read-only, never written.
- `ShareButton.tsx`, `lib/contentIcon.tsx`, `refreshSocketAuth()` — exported, never imported.
- No `@@index` on hot columns: `XpEvent(userId,createdAt)` (aggregated by leagues/duels/recaps/quests/heatmap), `CalorieEntry`, `LessonCompletion`, `DMMessage.threadId`, `Follow`, `FeedPost.userId`.
- ~20 String join-columns with no FK (coach, connection, notification, DM models) — user deletion would strand a large orphan tail; `coach.ts:117,170` can create rows pointing at nonexistent users.

---

## 5. UI/UX assessment

### Done well (keep and build on)
1. **Back-navigation logic** (`TopBar.tsx:31-35`) — history-aware fallback routing that never ejects the user from the site; better than most production apps.
2. **RTL foundation** — 75% logical properties (129 vs 42 physical), `dir` forced LTR on 20 numeric runs, Tajawal font swap, 100% locale-key parity.
3. **Mobile viewport craft** — `100dvh` remaps, `overscroll-behavior`, 28 safe-area declarations, load-bearing comments.
4. **Loading states** — content-shaped skeletons with `aria-busy`, branded ECG PulseLoader; the haptics library (4 semantic tiers, respects `prefers-reduced-motion`) and motion system are real systems.
5. **The `.btn-pill` component layer** and section theming give a coherent brand identity; TabBar `layoutId` indicator and desktop QR gate are polished.

### Systemic problems (ranked)

| # | Issue | Scale |
|---|---|---|
| U1 | **Silent failure on network errors** — 60 of 73 files with `useQuery` never read the error branch; failure renders as a permanently empty screen with no message or retry. `ErrorMsg` exists but is used by 10 files; no retry affordance anywhere. | ~60 screens |
| U2 | **First-run experience English-only** — Onboarding slides (`Onboarding.tsx:9-14`), all Register placeholders, PushToggle. 35 files never import `useTranslation` (incl. all 10 admin pages, CoachPage, ChatRoom). A parallel `isAr ? ar : en` system (159 hardcoded Arabic literals, 35 ternaries — the entire MenuDrawer nav) bypasses the locale files; translators can't reach it, third locale impossible. | acquisition funnel |
| U3 | **Discoverability** — 19 destinations (Store, Deals, Gyms, Events, Tracker, Meal Plan, Leagues, Group Live…) live in a drawer mounted on only 2 of 66 screens (Home, Info). From any other tab they're unreachable without going Home first. Search & notifications are Home-only; messaging Community-only. | app-wide IA |
| U4 | **22 hand-rolled modals** — 0 focus traps, 0 Escape handlers, 0 `aria-modal`, 0 focus restoration; 21 of 22 don't lock background scroll. 12 are the *same* bottom sheet re-implemented with diverging radii/heights. One shared `<Sheet>` fixes all at once. | 22 files |
| U5 | **Readability** — pinch-zoom disabled (`index.html:13`, WCAG 1.4.4 fail), root font forced to 14.5px, 282 uses of `text-gray-400` (2.8:1, fails AA), 211 uses of 10–11px text, 89 stacking both. | app-wide |
| U6 | **Toasts invisible to assistive tech** — no `aria-live`/`role=status` anywhere in the app, and toasts (the primary error channel) render under the iPhone notch (`Toaster.tsx:7`, no safe-area). Cheapest high-impact fix in this report. | 1 file |
| U7 | **Home overload + layout shift** — 18 stacked sections, 15 independent queries, 4 competing "start" CTAs; skeleton gates on 1 of 15 queries so cards pop in for seconds. | Home |
| U8 | **Design-token drift** — `brand-pink` is actually orange (#F97316), so 111 raw `orange-*` + 60 `amber-*` uses grew alongside 145 `brand-pink`; 98 hex literals in TSX; no spacing/type tokens; safe-area header padding copy-pasted 16× with 5 different values; 15 locally redefined primitives (`Stat` ×3, `Section` ×2 — already diverged: Home's copy lost its aria-label and RTL mirror). | app-wide |
| U9 | **Forms** — placeholder-as-label throughout, 0 `aria-invalid`/`aria-describedby`, only 2 `autoComplete` attributes in the app (Login/Register have none → password managers won't offer to save/fill), Assessment's disabled Next button never says why. | all forms |
| U10 | **Performance envelope** — no code splitting (all 68 pages + framer-motion + socket.io + both locales in one bundle), no error boundary (any render throw blanks the app), no offline handling (`navigator.onLine` unused), language switch does a full `window.location.reload()`. | app-wide |

---

## 6. Recommendations (prioritized)

### P0 — this week (bugs + exposure)
1. Fix the SW denylist (B1) and socket auth race (B2) — two config-level fixes restoring OAuth and all realtime.
2. Unify day boundaries on `lib/time.ts` Cairo everywhere (B3).
3. Protect `/media/image/*` (sign like video, or auth + ownership for body photos) (S1).
4. Add membership checks to challenge chat + socket room joins (S2, S3).
5. Move `client_secret_*.json` out of the repo and rotate the secret (S5).
6. Rate-limit forgot-password and uploads; add `helmet` (S9).
7. Fix `req.userRole` → `req.role` (B4) and mount `optionalAuth` on store/venues (B6).

### P1 — next two weeks (revenue + market fit)
8. Sign or rate-limit partner counters before selling on the rate card (S4).
9. Translate the first-run funnel: Onboarding, Register, PushToggle (U2) — the keys already exist.
10. `rtl:rotate-180` on TopBar chevron + the other 28 unmirrored icons; fix drawer slide direction (B9, B10).
11. Global error strategy: a `<QueryBoundary>` wrapper (error + retry + empty) adopted by the ~60 silent screens (U1); global 401→logout (B8); honor `state.from` after login (B7).
12. Mount MenuDrawer (or a "more" tab) on all 5 tab screens (U3).
13. Build one shared `<Sheet>` with dialog semantics and migrate the 12 bottom sheets (U4); add `aria-live` to Toaster + safe-area top (U6).

### P2 — this month (quality + scale)
14. Re-enable pinch zoom; audit `text-gray-400`+10px stacks toward AA (U5).
15. Rebuild dark mode on Tailwind `darkMode: 'class'` + `dark:` variants; add system-follow (§4).
16. Route-level code splitting (`React.lazy` per route group) + an error boundary (U10).
17. Consolidate design tokens: rename `brand-pink`→`brand-orange` (fixing B5 for free), extract `.screen-header` safe-area utility, promote `Stat`/`Section`/`Pill` to shared components (U8).
18. Add the missing Prisma `@@index`s; add zod to the admin CRUD factory (S10, QA P0-2).
19. Surface or delete the orphaned endpoints (§4) — dietary prefs UI first.
20. Move ffmpeg transcodes off the request path (queue), and plan the SQLite→Postgres/Turso + object-storage move before multi-instance (the backend is single-instance by construction: in-process cron, presence, cooldown maps).

### Product opportunities (from the scan, not yet planned anywhere)
- **AI coach chat screen** — the backend, rate limiter, and locale keys are all built; only the screen is missing.
- **Monetization** — Stripe scaffolding exists in schema/env; Info page hardcodes "free forever". Decide the model (subscriptions vs partner-funded) before building; if partner-funded, S4 (counter integrity) becomes the real P0.
- **Onboarding → first-workout activation** — the assessment writes everything needed; deep-link its output straight into a first guided session and prompt for push at the "workout complete" moment.
- **Session-expired UX, offline banner, scroll restoration on back** — small, high-frequency wins.
