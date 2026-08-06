# Full-App Journey — Findings & Plan (2026-08-06)

A scripted end-user walkthrough (Playwright, real Chrome, iPhone viewport) ran against
**live production** covering 22 journeys / 52 screenshots: onboarding → register → home →
tabs → session → tracker/food → meal plan → challenges → week zero → wellness depth
(kitchen→category→recipe, article) → programs → social sweep (community/people/buddies/
chat/coaches/groups/duels) → reels → progress/leagues/notifications/bookmarks/schedule →
search/store/deals/events/muscle-map/music/yoga → guest contact → full Arabic pass.

Report: `tools/e2e-report.json` · Screenshots: `tools/e2e-shots/`

## What we fell in (found by the journey)

### 🔴 P0 — fixed in code, WAITING ON DEPLOY (`F:\pulse-bundle.zip`)
1. **One dropped request signed users OUT.** Mid-journey, a transient
   `ERR_HTTP2_PROTOCOL_ERROR` hit the token-refresh call; the client treated it as
   "session expired" and dumped the (registered, signed-in) test user back onto
   onboarding — every later screen was actually the logged-out shell. On Egyptian
   mobile networks this means random logouts all day.
   *Fix committed:* refresh only logs out on a real server 401/403; network failures
   keep the session; bootstrap retries once. (`apps/web/src/lib/api.ts`)
2. **The dropped requests themselves.** Node's 5s keepAliveTimeout races IIS/ARR
   connection reuse → random cut responses (`/programs` failed to load this run; also
   the earlier chat "send error"). *Fix committed:* keepAliveTimeout 65s.
3. Chat false "connect to chat" gate; DM realtime (websocket-first) — fixed with voice
   notes + realtime notifications in the pending bundle.
4. Old Wellness (dark identical sections, Play-on-articles), `/contact` 404, funnel
   tracking absent — all in the pending bundle.

### 🟠 P1 — real gaps to fix next (not yet coded)
5. **Session screen has no set logging.** The walkthrough could not log a set weight —
   the workout session records completion only; a lifter can't record 3×10@40kg per
   exercise from the session screen (LiftLog exists in the API but isn't surfaced here).
6. **Community feed first-paint is slow** (caught mid-splash at 2s twice). The feed
   query fires only after socket+auth settle; needs a skeleton + earlier fetch.
7. **Challenge join-by-code is buried** below the badge wall on Achievements — a
   marketing code (PULSE14 posters!) should be reachable in one glance. Move the code
   entry to the top of the challenges tab.
8. **No E2E-visible seed content in some social areas** (group sessions/duels look
   empty to a fresh user) — feels dead on day one. Needs either PULSE-team seeded
   groups or clear "start the first one" empty states (partially done for buddies).

### 🟡 P2 — polish backlog (carried from earlier audits, confirmed by screenshots)
9. Fraunces numerals still missing on Progress/Tracker/session big numbers.
10. MenuDrawer inline-L() strings; btn-pill adoption on remaining CTAs.
11. Lesson video dedup + real cover photos (Canva lists in `deploy/canva/*`).
12. Content human work: film top-20 exercise videos (CONTENT-PRODUCTION.md).

## The plan

**Step 1 — Deploy `F:\pulse-bundle.zip` now.** It closes every P0 above (plus voice
notes, funnel, guest tickets, Home density, admin user control).

**Step 2 — Re-run the journey against the new deploy** (`$env:E2E_BASE='https://pulse.geddo.online'; node tools\e2e.mjs`).
The second half of this run (people→yoga) was invalidated by the session-loss bug, so
those 20 screens must be re-walked on the fixed build before calling them healthy.
Also delete the journey's test users in Admin → Users (`e2e_*@test.local`).

**Step 3 — P1 sprint (1–2 days):** set logging in session (7), join-code placement (8),
community skeleton (6), seeded group sessions + PULSE-team duel challenge (9).

**Step 4 — Launch window.** With P0 deployed + P1 done, ship the TikTok/FB campaign
with UTM links (`?utm_source=tiktok&utm_campaign=launch14`) and watch
Admin → Analytics funnel daily; guest tickets catch the people who fall at the door.

**Step 5 — P2 continuously** between campaign beats; content filming per
CONTENT-PRODUCTION.md stays the biggest non-code lever.
