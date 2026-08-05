# PULSE — Wearables & Watch Integration: Feasibility + Plan

**Date:** 2026-08-05 · Status: Phase 1 built (Bluetooth HR, free, live) · Phase 2 built but **dormant**

> **⚠️ CORRECTION (verified 2026-08-05):** Strava paywalled its developer API —
> since June 1, 2026 a Standard-Tier API app requires a paid Strava
> subscription (~$12/mo). The Strava integration in this repo stays fully
> built and **env-gated dormant** (zero cost while the keys are blank); it
> activates in minutes if the economics ever make sense or an Extended-Access
> exemption is granted. The free path forward is below.
>
> **Revised free plan:**
> 1. **Bluetooth live HR** (shipped) — completely free, no accounts, works today.
> 2. **Poll users first** ("which watch do you wear?" via the events pipeline) —
>    build nothing until the demand data says which brand matters.
> 3. **Free direct APIs by demand:** Huawei Health cloud (free dev account —
>    Huawei/Honor bands are big locally), Fitbit (free), Polar (free),
>    Garmin Health (free after partner approval — apply early, it takes weeks).
> 4. **The real free jackpot: Health Connect via a Capacitor Android shell.**
>    PLAY-STORE.md/deploy/twa show a Play Store release is already planned —
>    upgrading that TWA plan to a Capacitor shell (same web app inside) unlocks
>    Health Connect: Samsung Health, Mi Fitness (Xiaomi!), and Google data,
>    on-device, no vendor APIs, no recurring fees. Cost: the $25 one-time Play
>    registration already implied by the store plan. This now replaces Strava
>    as the recommended hub, since it covers the same brands for free on
>    Android — which is where the Egyptian audience overwhelmingly is.

## 1. The honest constraint map

PULSE is a PWA. Wearable ecosystems split into three access tiers from a web app:

| Tier | What | Web-accessible? |
|---|---|---|
| **A. Bluetooth (live)** | Any device broadcasting the standard BLE Heart-Rate service (chest straps: Polar/Garmin/Wahoo/CooSpo; many sport watches in workout-broadcast mode) | ✅ Web Bluetooth — **Chrome/Android + desktop. NOT iOS Safari** |
| **B. Vendor cloud APIs (history sync)** | Strava, Fitbit, Polar AccessLink, Oura, Withings, Huawei Health (cloud), Garmin Health (needs partner approval) | ✅ Plain server-side OAuth2 + webhooks — fully PWA-compatible |
| **C. On-device health stores** | **Apple HealthKit (Apple Watch)**, **Health Connect** (Android — where Samsung Health, Mi Fitness/Xiaomi, Google's own data land) | ❌ Native APIs only. No web access, ever. TWA does NOT unlock them. Requires a Capacitor/native shell |

Key market facts for Egypt:
- **Xiaomi Mi Band / Amazfit dominate** the budget segment. Xiaomi has **no public consumer API**. The realistic route to that data: Zepp/Mi Fitness → **auto-sync to Strava** → our Strava integration. Strava is the de-facto aggregator hub (Garmin, Samsung, Amazfit, Huawei, Polar all push to it).
- **Apple Watch**: unreachable from web. Only a future iOS native shell (Capacitor + HealthKit plugin) gets it.
- **Google Fit REST API is dead** (deprecated in favor of Health Connect, which is native-only) — do not build on it.

## 2. What the data buys us (why bother)

1. **Live heart rate in WorkoutSession** (tier A) — HR + zone coloring next to the timer/voice coach. The single biggest "wow" for serious lifters and HIIT users; also enables real calorie-burn estimates instead of formulas.
2. **Auto-credited activity** (tier B) — a run recorded on the watch lands in PULSE: counts toward the streak, daily quests, challenges, league XP. Passive retention: the app stays honest about your week even when you never opened it.
3. **Anti-cheat for the competitive layer** — league/duel XP from imported, device-recorded workouts is far harder to fake than a "workout done" button. Mark imported activities with a ⌚ verified badge.
4. **Recovery-aware coaching** (later) — sleep + resting-HR trends feed the existing adaptive engine (`lib/adapt.ts`): poor sleep week → the plan proposes a deload. Nobody in the local market does this.

## 3. Recommended plan

### Phase 1 — Live heart rate via Web Bluetooth (~2–3 days, pure client)
- `lib/bluetoothHr.ts`: connect to GATT service `0x180D`, characteristic `0x2A37`, stream bpm.
- WorkoutSession: "Connect HR ⌚" button (shown only when `navigator.bluetooth` exists — feature-detect, it's Android/desktop only), live bpm chip + zone color (5 zones from age-estimated HRmax, birthYear already on the profile), avg/max HR on the completion screen, stored with the session log.
- Zero accounts, zero backend, works with any strap/watch broadcasting HR. iOS users simply don't see the button.

### Phase 2 — Strava as the aggregator hub (~3–4 days, server OAuth + webhook)
- Why Strava first: one integration transitively covers Garmin/Amazfit/Samsung/Huawei/Polar users who enable "sync to Strava" — including the Xiaomi crowd via Zepp.
- Schema: `DeviceConnection { userId, provider, accessToken, refreshToken, expiresAt, externalId }` + `ImportedActivity { userId, provider, externalId @unique, type, startedAt, durationSec, calories?, avgHr? }`.
- API: `GET /api/wearables/strava/connect` (OAuth redirect) → callback stores tokens; Strava **webhook** endpoint for new-activity push; importer maps activity → `workout-done`-equivalent credit (XP + streak touch + quest bump) with **dedupe by externalId** and a daily cap so a 10-activity day can't farm XP.
- UI: "Connected devices" section in Settings (connect/disconnect, last sync); imported activities appear in Progress + feed with the ⌚ badge.
- Needs: a Strava API app (free, instant), `STRAVA_CLIENT_ID/SECRET` env.

### Phase 3 — Second provider (pick by demand data, ~2 days each)
- Add a `provider` abstraction on the Phase-2 tables, then: **Huawei Health** (popular locally; requires Huawei dev account), **Fitbit** (easiest API), **Polar/Oura** (niche). Garmin direct only if the partner application is approved (Strava covers Garmin users meanwhile).
- Instrument first: a "Which watch do you wear?" one-tap poll (existing events pipeline) decides the order.

### Phase 4 — Native shell for the deep stores (only when store distribution is wanted anyway)
- Capacitor wrapper around the existing React build → **Health Connect** (Android: steps/sleep/HR from Samsung Health, Mi Fitness, everything) + **HealthKit** (iOS: Apple Watch).
- This is a distribution decision, not just a feature: it puts PULSE in the app stores. The PWA remains the primary channel; the shell is an add-on for users who want deep health sync. Do not do this before Phases 1–2 prove demand.

## 4. Guardrails
- **XP integrity**: imported activities credit capped (e.g. max 2/day count for XP), duels/leagues count them only when `verified` — and never both an import and a manual "workout done" for the same hour (dedupe window).
- **Privacy**: health data is sensitive — store only aggregates we use (duration/type/avgHR), never raw GPS tracks; add a wearables line to the privacy copy; disconnect must delete tokens AND imported rows on request.
- **Battery/UX**: Web Bluetooth disconnects when the screen locks on some devices — keep the session wake-lock (screen already stays on during sessions) and auto-reconnect once.

## 5. Effort summary

| Phase | Effort | Reach |
|---|---|---|
| 1 · Web Bluetooth HR | 2–3 days | Android/desktop users with any HR strap/watch (broadcast mode) |
| 2 · Strava hub | 3–4 days | Runners + anyone syncing Garmin/Amazfit/Samsung/Huawei→Strava |
| 3 · Direct providers | ~2 days each | Per-brand |
| 4 · Capacitor + HealthKit/Health Connect | 2–3 weeks + store accounts | Apple Watch, Samsung Health, Xiaomi natively |
