# ADS PLAYBOOK — from views to registered users

> Situation this fixes: 5,000+ ad views, ~no registrations. That ratio is
> NORMAL for view-optimized campaigns — "views" are 3-second impressions, and
> platforms sell them cheap because they're worth little. The fix is not more
> budget; it's optimizing for the right event with the right creative.

## 1. The three numbers to check before changing anything

In Ads Manager (not the app):
- **Link clicks** (not views, not engagement). 5,000 views typically = 30–80 clicks.
- **CPC** (cost per link click). Egypt fitness: 1–4 EGP is healthy.
- **Campaign objective** you picked. If it says *Video views* / *Engagement* /
  *Awareness* → that's the whole story. Those objectives buy watchers, not users.

In the app (Admin → Analytics → funnel): landings vs registered per source.
If clicks arrive but don't register, it's a page problem. If clicks barely
arrive, it's an ads problem. So far the evidence says: ads problem.

## 2. The one-time setup that changes everything: the Pixel

The app now fires **CompleteRegistration** to Meta and TikTok pixels the moment
an account is created (plus ViewContent on the landing page for retargeting).
Activate it once:

1. Meta: business.facebook.com → **Events Manager** → Data sources → Create
   Pixel (name it PULSE) → copy the ID.
2. TikTok: ads.tiktok.com → **Assets → Events** → Web Events → Create Pixel
   (manual setup) → copy the ID.
3. Paste both into `apps/web/.env.production` (`VITE_FB_PIXEL_ID=`,
   `VITE_TIKTOK_PIXEL_ID=`) → rebuild bundle → deploy.
4. Verify: Events Manager → Test events → open pulse.geddo.online, register a
   test account → you should see PageView + CompleteRegistration arrive.

## 3. Campaign structure that actually converts (Meta)

- **Objective: Leads → Conversions**, optimization event **CompleteRegistration**
  (needs the pixel above). Until the pixel has ~50 events, run **Traffic →
  Landing page views** as the warm-up — never Views/Engagement.
- **One campaign, 2–3 ad sets, CBO, 150–300 EGP/day total.** Ad sets:
  1. Broad: Egypt, 18–40, all — let the algorithm find them (works once pixel learns).
  2. Interests: home workout, gym, حمية غذائية, كمال أجسام + طعام صحي.
  3. (later) Lookalike 1% of registrants — the end-game audience.
- **Placements:** Advantage+ or manual: Reels + Stories + Feed. Mobile only.
- **Link:** `https://pulse.geddo.online/?utm_source=facebook&utm_campaign=<name>`
  → lands on the new landing page. Our funnel card cross-checks the platform's numbers.

## 4. Creative — the real reason people don't click

Views without clicks = the ad was watchable but gave no reason to act. Rules:

- **Show the app, not stock gym footage.** Screen recordings convert for apps:
  voice-log a كشري → calories appear (this is the wow moment — lead with it);
  tap a muscle → workout starts; PR confetti; the challenge room.
- **Hook in the first 2 seconds, in Arabic, text on screen** (most watch muted):
  «بتقول للموبايل أكلت إيه… وهو بيحسب» / «جيم كامل في موبايلك، ببلاش».
- **Say FREE early and again at the end.** It's the strongest differentiator
  and the objection-killer. «من غير فيزا ولا اشتراك».
- **CTA that names the action:** «جرب دلوقتي — من غير حساب حتى» (guest browsing
  lowered the ask; use it in the ads).
- 9:16 vertical, 15–30s, captions burned in. FEATURE-POSTS.md captions are
  ready-made ad copy; the "Visual:" lines are the shot list.
- Make 3–4 variants, let the platform kill the losers after ~2,000 impressions each.

## 5. TikTok specifics

- Objective: **Website conversions** on CompleteRegistration (after pixel), else
  Traffic. Egypt, 18–34.
- TikTok punishes ad-looking ads. The winning format is a phone-held selfie
  video: «جربت أقول للتطبيق أكلت إيه بالصوت وشوفوا حصل إيه…» + screen recording.
  Native > polished.
- Comments are ranking fuel — reply to every single one (even «هو ده مجاني؟» →
  «ببلاش ١٠٠٪ 😄 جرب من غير حساب»).

## 6. Free reach that compounds while ads run

- The posting machine: ENGAGEMENT-POSTS (daily) + FEATURE-POSTS + NOT-A-GYM
  bursts + Saturday league auto-posts + Admin → Posts AI suggestions.
- WhatsApp loops now in the app (challenge invites, PR brags, recipes, the
  post-workout "challenge a friend") — every active user recruits.
- Egyptian Facebook groups (فتنس مصر، دايت وتخسيس، تمارين منزلية): don't drop
  links — answer questions genuinely, mention the free app when relevant. 30
  min/day of this reliably beats 100 EGP of cold ads at this stage.
- Play Store TWA (deploy/PLAY-STORE.md): "not on the store" costs trust with
  exactly the audience the ads reach.

## 7. What "working" looks like (so you don't judge too early)

- Week 1 after pixel: cost per landing-page view < 2 EGP, CTR > 1.5%.
- Week 2–3: pixel exits learning (~50 registrations), cost per registration
  becomes the number you manage. For Egypt, 5–15 EGP/registration is a fine start.
- Judge creatives at ~2,000 impressions, ad sets at ~1 week. Kill losers, feed winners.
- The funnel card tells you WHERE any remaining leak is — share it and we fix
  that exact step.
