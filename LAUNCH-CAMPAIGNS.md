# PULSE — Big-Launch Strategy: Facebook + Instagram (Egypt)

**Companion docs:** MARKETING.md (positioning/tone — reread §0 before writing anything),
MARKETING-POSTS.md (the actual post texts, referenced below by number), GO-LIVE.md (launch week).
**Principle:** every campaign below uses a mechanic that already exists in the app —
challenges with invite codes, referral streak-freezes, share cards, the coach marketplace,
partner lead forms. Marketing that demos real features can't over-promise.

---

## 0. Goals & numbers to hold yourself to

| Phase | Goal | KPI (measure weekly, MARKETING.md §11) |
|---|---|---|
| Week 1–2 | Awareness + first 1,000 installs | Link taps → `/api/admin/analytics` DAU; install events |
| Week 3–6 | Habit proof | D7 retention of the cohort; streaks ≥3 days; challenge joins |
| Week 7–12 | Community flywheel | Share-cards posted, referral signups, coach signups |

Egypt paid-media reality: FB/IG CPMs are among the world's cheapest (≈ EGP 15–40 / 1,000
impressions). **EGP 5,000–15,000 total** is a real launch budget here, not a token one.

## 1. Channel roles (they are not the same channel)

- **Instagram Reels** = discovery engine. Vertical screen-recordings + trend audio. Target: 18–30.
- **Instagram Stories** = daily retention ritual (polls, streak checks, league results).
- **Facebook Feed/Page** = 30+ audience + shareability. Longer captions work; boost the winners.
- **Facebook Groups** = Egypt's real fitness internet. Massive groups for gym-goers, home
  workouts, dieting, نتايج التخسيس. This is seeding territory, not ad territory (§4).
- **WhatsApp (via both)** = the share unit. Every asset should be worth forwarding to a group chat.

## 2. The three flagship campaigns

### Campaign A — «التحدي الكبير» The Big Launch Challenge (weeks 1–2) — THE centerpiece
The app already has group challenges with invite codes and leaderboards. Turn launch into one:
1. ✅ BUILT: `prisma/seed-launch-challenge.ts` creates **«التحدي الكبير — أول ١٤ يوم»** —
   code **PULSE14**, 10 workouts in 14 days, 300 XP + the exclusive 🚀 «من الأوائل»
   (Founding Member) badge on completion, visible on Home for everyone.
   **On launch day, run on the server:** `node node_modules/tsx/dist/cli.mjs prisma/seed-launch-challenge.ts`
   (re-running resets the 14-day window to that day — that's why it's not in seed.ps1).
2. Announce (POST 7 as the template): "افتح التطبيق، ادخل التحدي بالكود **PULSE14** —
   أول ١٠٠ واحد يخلصوه هيدخلوا لوحة الشرف". Pin the post on FB, link-in-bio on IG.
3. Daily Story: the live leaderboard screenshot at 9pm ("مين هيلحق التوب ١٠ النهارده؟").
4. Finishers get celebrated by name (with consent) in a weekly carousel post — recognition
   is the cheapest prize that exists, and the hall-of-fame screen renders it for you.
5. Paid boost: EGP 2,000–3,000 behind the announcement Reel, Egypt, 18–35, interests
   fitness/gym/home workout, optimizing for link clicks.
**Why it wins:** it's Welnes's proven Egyptian playbook — run before Miran brings it back —
and every participant experiences streaks/leaderboards/XP, i.e. the retention stack, in week one.

### Campaign B — «مجاني يعني مجاني» Free Means Free (weeks 1–4, always-on after)
The #1 complaint across every competitor is paywalls and billing traps (COMPETITIVE-ANALYSIS §2).
- Carousel/Reel format: screenshots of competitor paywalls & App-Store billing complaints
  (blur names — the *category* is the villain, stay classy) vs PULSE screens all unlocked.
- The line (from MARKETING.md, verbatim): «مجاني ١٠٠٪ — مش "جرّب ٣ مرات" ولا "المدفوع أحسن"».
- FB version invites comments: "اكتبلنا أغرب اشتراك جيم/تطبيق دفعته ومنفعش تلغيه 👇" —
  grievance threads are engagement gold and every comment is reach.
- Boost the best-performing variant with EGP 1,500 to broad Egypt 20–40.

### Campaign C — «قولها بالمصري» Say It In Egyptian (weeks 2–6) — the demo nobody can copy
A Reel series of things ONLY PULSE does, each a ≤20s raw screen recording:
1. **The voice log:** hold the phone, say "طبق كشري" → the food appears with calories. Caption:
   "قول أكلت إيه… بالمصري. التطبيق فاهم." (No competitor can film this on Android.)
2. **What hurts:** intake asks "في حاجة بتوجعك؟" → plan visibly changes. POST 2 caption.
3. **The plan explains itself:** scroll the meal plan's "ليه الطبق ده" reasons.
4. **1MB install:** timer on screen, tap link → installed before a 3G bar moves.
5. **Live HR:** strap on, bpm pulsing in the session (Android).
Post 2×/week, same hook format ("حاجة مفيش تطبيق تاني بيعملها — رقم ٣")، numbered like a
series so people follow for the next one. Boost #1 (voice) hardest — it's the jaw-dropper.

## 3. Launch-week grid (merges with GO-LIVE.md §9)

| Day | IG Reel/Post | IG Story | FB |
|---|---|---|---|
| 0 | POST 1 announcement + install screen-rec | countdown + link sticker | POST 1 long-form, pinned |
| 1 | POST 2 "what hurts" | poll: "بتتمرن فين؟ جيم/بيت" | share Reel + seed §4 groups |
| 2 | Campaign A challenge announce | leaderboard #1 | challenge post + boost starts |
| 3 | Campaign C #1 voice-log Reel | "لفيت النهارده؟ 🎡" | Campaign B carousel |
| 4 | POST 3 muscle map | leaderboard + finisher shoutout | grievance thread post |
| 5 | Meal-plan-explains-itself feature post | recipe of the day from the app | POST 5 kitchen |
| 6 | Campaign C #2 | challenge halfway hype | week-1 recap + numbers ("انضم X") |
| Every Sat | League promotions post («مبروك 🥇») | new-week league reset | same, boosted EGP 100 |

## 4. Facebook Groups seeding (free reach, handle with care)
- List the 10 biggest Egyptian fitness/diet/home-workout groups; join with the personal
  account of a real founder/coach, not the brand page.
- Never drop links cold. Answer questions genuinely for a week, then share as a story:
  "جربت أعمل تطبيق مجاني بالمصري بيسأل الأول إيه اللي بيوجعك — رأيكم؟" + screenshots.
  Founders-story framing survives group rules that "ads" don't.
- The voice-log clip is the best group-native asset: it looks like a wow-share, not an ad.

## 5. Micro-influencer seeding (EGP 0 tier first)
- 10–20 Egyptian micro fitness/food creators (5k–50k). Offer: early access + their own
  challenge with their name on it in the app (kind:'group', their invite code) + a
  featured-coach profile if they coach. Revenue ask: none — the pitch is "free tool your
  followers will thank you for."
- Their natural content: running THEIR challenge leaderboard weekly. That's recurring
  co-marketing you don't pay for.
- Paid tier only after organic signal: EGP 500–1,500/creator for a dedicated Reel, judged
  on installs not likes.

## 6. Paid ads plan (start small, scale winners)

| Line | Budget (EGP) | Objective | Creative |
|---|---|---|---|
| Challenge announce boost | 2,000–3,000 | Link clicks | Campaign A Reel |
| Free-means-free | 1,500 | Engagement→retarget | Campaign B carousel |
| Voice-log Reel | 2,000 | Link clicks | Campaign C #1 |
| Retargeting engagers | 1,000 | Conversions (install) | POST 1 variant |
| Saturday league (recurring) | 100/wk | Reach | promotions graphic |

Targeting: Egypt · 18–40 · Advantage+ with interest seeds (gym, fitness, تخسيس, home workout).
Always AR-first creative; EN duplicate only for the 10% expat/EN audience.
Kill anything above EGP 10/install; double anything below EGP 3.

## 7. Measurement loop
- UTM every link (`?src=fb-challenge`, `?src=ig-voice`) — screen-view analytics already
  aggregates in Admin → Analytics; add `src` to the tracked landing event if needed.
- Weekly 10-minute review per MARKETING.md §11: installs by source, D7, challenge joins,
  share-cards seen in the wild. Feed winners, starve losers, and post the numbers
  transparently ("بقينا X متدرب") — public momentum is itself a campaign.

## 8. Rules that keep it working (from MARKETING.md, non-negotiable)
One claim per post · Egyptian dialect, never فصحى · reply to EVERY comment for 30 days ·
repost every user share-card to Story · never say "AI-powered/personalized plans" (banned
phrases list) · the app link works in one tap — every asset ends on it.
