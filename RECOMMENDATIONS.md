# PULSE — Recommendations: Robustness · Engagement · Content

**Date:** 2026-08-05 · Follows the full-scan fixes in [ANALYSIS.md](ANALYSIS.md). Everything here is *forward* work — the bug/security backlog is already done.

> **STATUS (same day):** implemented — 1.1 nightly backups (`VACUUM INTO`, keeps 14, `BACKUP_DIR` env), 1.2 serialized ffmpeg queue, 1.3 client-error telemetry (shows as `client-error` in Admin → Analytics top events), 2.1 milestone auto-share prompts, 2.2 comeback card + `?short=1` session mode, 2.3 rank-ring avatar cosmetics, 2.4 Friday league-cliffhanger push (17:00), 3.2 progression links (`easierId`/`harderId` on Exercise + session chips — fill the links in Admin → Exercises), 3.3 rest-timer education tips, 3.4 daily 2-minute reset card, 3.6 Week Zero on-ramp (`/week-zero`), 3.8 grocery list (API + sheet in Meal Plan).
> **Also seeded (no admin work needed):** 3.2 progression content — `prisma/seed-progressions.ts` links 84 exercises into easier/harder ladders (ran locally; runs on deploy via seed.ps1); 3.5 Ramadan content — `prisma/seed-ramadan.ts` creates the "Ramadan Fitness" wellness category with 5 full bilingual guides (training windows, hydration, suhoor, muscle retention, the 3+1 week).
> **Still open (genuinely human work):** 3.1 film the top-20 form videos (pipeline ready — Admin → video import), 3.7 featured-coach-of-the-week curation habit, 1.4/1.5/1.6 ops items (Postgres trigger-watch, uptime monitor, post-deploy smoke script).

---

## 1. Robustness (what keeps the app trustworthy as it grows)

Ranked by risk-to-users, not engineering elegance:

1. **Nightly off-site DB backup.** SQLite is one file on one server. A scheduled task that copies `prod.db` (via `VACUUM INTO`) to object storage or even a second disk is one hour of work and the single highest-value robustness item on this list. Nothing else matters if the data is lost.
2. **Move ffmpeg off the request path.** Uploads currently transcode synchronously; a queue (even a simple DB-backed one processed by the existing hourly scheduler loop, or a `worker_threads` consumer) stops three simultaneous uploads from freezing the API for everyone.
3. **Error telemetry.** The API logs to console; the client logs nowhere. Add a tiny `POST /api/events` `name:'client-error'` hook in the ErrorBoundary + `window.onerror`, and surface counts in Admin → Analytics. You cannot fix crashes you never hear about — and your users won't report them.
4. **Postgres/Turso when (not before) metrics demand it.** The backend is single-instance by construction (in-process cron, presence, cooldowns). WAL SQLite is fine for thousands of users. Set a trigger: sustained write-lock errors in logs → migrate. Prisma makes it a connection-string change.
5. **Uptime + cert monitoring** on pulse.geddo.online (UptimeRobot free tier pinging `/api/health`, which now actually checks the DB).
6. **Staging seed script parity** — `deploy/seed.ps1` already exists; add a smoke script that hits the 10 core endpoints after every deploy so a bad deploy is caught in a minute, not by a user.

## 2. Engagement & entertainment (the retention loops)

The app already has an unusually complete gamification stack (streaks, quests, spin, leagues, duels, seasons, hall of fame). The gaps are not more *mechanics* — they're **moments of feeling seen** and **reasons to open the app when unmotivated**:

1. **Milestone share prompts (highest leverage, mostly built).** ShareCard exists but is passive. Prompt the share sheet automatically at the 3 emotional peaks: first workout ever, every PR, streak day 7/30/100. Every shared card is an ad with your URL on it.
2. **"Comeback" framing instead of guilt.** The lapsed-user push exists; add an in-app moment: after 3+ idle days, Home shows a one-tap "10-minute comeback session" (shortened workout) instead of the full dashboard. Breaking a streak is the #1 churn moment in every fitness app; make day-one-again feel small.
3. **Level-unlock cosmetics.** Levels currently unlock nothing. Cheapest meaningful reward: profile ring colors / app icon variants / exclusive CoverArt themes per rank tier. Zero backend, pure delight, and rank titles (Rookie→Immortal) already exist to hang it on.
4. **Weekly league push at the cliffhanger.** Friday evening: "You're 40 XP from promotion — one session tonight does it." The settlement engine already knows everyone's gap to the promotion line; this is the single most actionable notification the app could send.
5. **Duel spectating + rematch.** Duels end silently. Post the result to both feeds with a "rematch" button — rivalry is a loop, not an event.
6. **Reels as reward, not just content.** After completing a session, auto-queue 3 reels matched to what they trained ("you trained back — watch these"). Training→entertainment→tomorrow's motivation, one loop.
7. **Sound design pass.** The haptics/fanfare system is excellent; extend it to league promotion and quest-complete-all. Entertainment is 30% audio.
8. **Monthly season as an *event*.** Seasons rotate silently. Announce each with a 48h countdown banner + a season-exclusive badge preview. Scarcity works.

## 3. Content: professional training + daily-life usefulness

The engine (assessment → program → adaptation) is more sophisticated than the content it serves. Content is now the bottleneck:

1. **Film real form videos for the top 20 exercises.** The 85 exercises have animated guides; the 20 most-programmed ones (squat, hinge, press, row families) deserve real 30-second videos with Egyptian voiceover — form errors → injuries → churn. The admin video pipeline + bulk importer are already built for exactly this.
2. **Progression paths per exercise.** Add `progressionOf`/`regressionOf` links between exercises (schema addition): can't do a push-up → incline push-up; too easy → archer. This is what makes training *professional* — the plan meets you where you are per-movement, not just per-program.
3. **"Why am I doing this" education drips.** You have 120 articles; nobody finds them. Inject one matched line into rest timers: resting after squats → "Why rest 3 minutes on heavy compounds" → links the article. Rest is captive attention; use it to build a smarter athlete.
4. **Daily-life micro-content (the habit wedge).** The wellness library is desk-life gold that never surfaces. Ship one "2-minute reset" card on Home per day: desk stretches at work, 5 pre-sleep mobility moves, "walked today?" step nudge. The app should be useful on the 4 days people *don't* train — that's where daily-active lives.
5. **Ramadan/seasonal program.** One fasting-aware training + meal template (train after iftar, hydration between iftar/suhoor). Locally unbeatable, annually reusable, and the meal-plan engine already supports the swap logic.
6. **Beginner "Week Zero".** The assessment sorts levels, but true beginners need a 7-day on-ramp: mobility + technique + one habit per day, before program day 1. Biggest funnel drop in fitness apps is week one intensity shock.
7. **Coach-generated content flywheel.** Coaches can already publish workouts; feature the best coach program of the week on Home (curation = quality signal + coach recruitment incentive in one move).
8. **Recipe → grocery list.** Each recipe has ingredients; a "this week's plan → shopping list" button (copy/WhatsApp export) turns the meal plan into a Saturday-morning habit outside the gym entirely.

## Suggested order

| Wave | Items | Why first |
|---|---|---|
| Now | 1.1 backups, 2.1 share prompts, 2.4 league push, 3.3 rest-timer education | Hours each, immediate retention/safety payoff |
| Next month | 2.2 comeback mode, 2.3 level cosmetics, 3.4 daily-life cards, 3.6 week zero, 1.3 error telemetry | The retention layer |
| Quarter | 3.1 filmed form videos, 3.2 progression links, 3.5 Ramadan program, 1.2 ffmpeg queue, 3.8 grocery list | Content moat + scale prep |
