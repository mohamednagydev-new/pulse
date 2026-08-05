# PULSE — Deep Competitive Analysis (August 2026)

**Method:** two parallel live-web research passes (Egypt/MENA landscape + global leaders benchmark), synthesized against PULSE's actual shipped feature set. Supersedes the threat ranking in MARKET-RESEARCH.md. Sources inline.

---

## 1. The market in one paragraph

Globally, fitness apps cluster into trackers ($24–30/yr: Hevy, Strong), AI programming ($80–100/yr: Fitbod, Alpha Progression), produced content ($150–190/yr: Peloton, Centr, Ladder) and human coaching ($200–420/mo: Caliber) — and **none of the 13 category leaders ships Arabic UI, RTL, dialect coaching, or local food data**. Regionally, ElCoach (Cairo→Riyadh) has stalled (~$176K raised ever, 2.2k ratings, billing-complaint reviews), while the **Welnes–Miran merger (Apr 2025)** created the one fast-moving bilingual competitor — Saudi-funded, with Welnes's proven Egyptian community-challenge playbook and a stated Egypt expansion plan. New niche entrants: **Kam Calorie** (2025, dialect-voice calorie logging of Egyptian food, iOS-only, EGP 50/mo — proof of the niche AND of the real Egyptian price ceiling) and gym-access aggregators **PlusPass/GymTag**. No Egyptian consumer-fitness startup raised meaningful money in 2025–H1 2026 — nobody is about to outspend anyone here.

## 2. Feature position — PULSE vs the field

**Where PULSE already clears the global table-stakes bar:** workout logging with rest timers/PR detection, 85-exercise library with progression ladders, adaptive rule-based programming with 4-week re-checks, streaks/leagues/duels/quests (the exact Duolingo-derived stack the retention research validates: streak mechanics lift retention 12–55%, friend-group competition +18–34%), social feed + DMs + live group sessions, meal planning + food database, dark mode/RTL polish, web everywhere.

**Where PULSE beats everyone (regional AND global) — the unique list:**
1. **Explainable plans** — every plan and plate carries its written reason. Global AI apps are black boxes; Miran markets the black box as the feature.
2. **Injury-aware programming** — intake asks what hurts, plans route around it, exercises carry contraindication flags. Fitbod's #1 review complaint is precisely this absence; regionally only paid humans (Fitlov) handle it.
3. **Free forever with full content** — the #1 complaint cluster across all global apps is paywall betrayal (MFP barcode rage, Strava strip-back, Peloton hikes). PULSE structurally cannot commit it.
4. **Zero-commission coach marketplace in Arabic** — Caliber's model, unserved in Arabic; Fitlov/Miran economics depend on the take-rate PULSE doesn't charge.
5. **Hand-written Egyptian-dialect content + portion-real Egyptian food data** — Kam does dialect *input*; nobody does dialect *coaching output*.
6. **~1MB link install** vs 100MB+ native competitors — decisive on Egyptian mobile data.

**Where PULSE is behind (close in this order):**
1. **Store distribution** — everyone else is in the stores; publish the prepared TWA *before* Miran's Egypt push spikes "تطبيق تمارين" searches.
2. **Wearable sync** — ElCoach already ships Apple Health, so it's no longer a nobody-has-it gap. Mitigation shipped (Bluetooth live HR); Health Connect via Capacitor is the free full answer (WEARABLES.md).
3. **AI food input UX** — Miran scans photos, Kam takes dialect voice; PULSE has photo-estimate (AI-key-gated) and search. Voice input in Arabic is a realistic add (Web Speech API).
4. **AI form feedback (camera)** — Miran's flagship. Expensive to match well; watch, don't chase yet.
5. **Live Activities/lock-screen presence** — global-standard now; PWA-limited, partial via notifications + wake lock.

## 3. The threat ranking (revised)

1. **Miran (Welnes)** — the real one. Product velocity (camera form-feedback, photo food-scan), the Egyptian community-challenge playbook run by its inventors, Saudi revenue to fund an Egypt entry, explicit Egypt expansion plan. Their attack lands exactly on PULSE's community moat.
   *Defense:* own Ramadan season early (content shipped), deepen the social graph (duels/leagues/buddies switching costs), publish the TWA, and keep hammering "free vs their subscription" + "explains itself vs black box."
2. **Kam Calorie** — if it ships Android + keeps dialect voice, it neutralizes the food-table UX edge. *Defense:* Arabic voice logging via Web Speech into the existing food table; PULSE's bundle (training+food+community) vs their single feature.
3. **PlusPass/GymTag** — could lock Cairo gyms into exclusives and strand the gym directory. *Defense:* approach them as directory/data partners now, while PULSE is complementary rather than competitive.
4. **ElCoach** — stalled; out-position, don't fear. Its billing-distrust reviews are marketing ammunition.
5. **Arabic ad-farm workout apps (10M+ installs)** — own store search volume but different category; irrelevant to product, relevant to store SEO expectations.

## 4. Barriers to entry / moats (ranked by durability)

1. **Business-model moats (strongest):** free-forever and zero-commission are *structural* — every funded competitor's unit economics collapse if they copy them. Partner/sponsor monetization (rate card, leads, deals) is a two-sided asset that compounds.
2. **The explainable rule engine:** making a marketed "AI" explain itself, encode contraindications, and audit its own outcomes is a re-architecture plus a positioning reversal — years, not sprints.
3. **Social-graph switching costs:** streaks, league history, duel rivalries, buddy connections, coach-client relationships — every week a user stays, leaving costs more. This is Strava's moat mechanism at local scale; it's also the moat Miran attacks, so growth speed here IS the defense.
4. **Egyptian-dialect corpus + food table:** locally decisive today; LLMs erode the writing cost yearly, but portion-realistic food data and cultural judgment (Ramadan mode, injury phrasing) still need local care.
5. **Web/PWA competence:** 1MB installs, instant updates, no store tax — no regional competitor shows any PWA capability. Copyable in principle, but nobody's DNA points that way.

**What PULSE can never win — don't try:** produced-video content arms races (Peloton/Centr studio budgets), celebrity halo, deep native Apple Watch integration (until a Capacitor shell), 180M-user network effects, paid-acquisition wars.

## 5. Action list distilled

| # | Action | Why now |
|---|---|---|
| 1 | Publish the prepared TWA to Play Store | Capture store search before Miran's Egypt entry |
| 2 | Ship Arabic voice food-logging (Web Speech → existing food table) | Neutralize Kam's edge with a weekend of work |
| 3 | Own Ramadan: campaign + the shipped Ramadan pack + challenge cohorts | Welnes's own playbook, run first |
| 4 | Partner talks with PlusPass/GymTag | Turn a future gatekeeper into a directory source |
| 5 | Health Connect via Capacitor when doing the store release | Free wearable depth ElCoach can't match |
| 6 | Marketing: weaponize competitor billing complaints ("free means free", refund-trap stories) | #1 complaint cluster globally and locally |
| 7 | Keep the retention stack tight (streaks × friend leagues × push at the cliffhanger) | The measured 18–55% retention lifts live here |

**Pricing reality check for the rate card:** the Egyptian consumer ceiling is **~EGP 50/mo** (Kam), not ElCoach's EGP 170–250 list (which needs 40% coupons to move). PULSE's "we give this away" story should be priced against reality, not list prices.
