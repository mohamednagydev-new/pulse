# PULSE — Growth Roadmap · خطة النمو (90 يوم)

**Written 2026-08-18.** This is the MASTER plan: it sequences everything and tells you which
document to open for each task. It does not repeat their content — it schedules it.

> The one rule that governs everything below: **do not start a later phase because it is
> exciting; start it because the numbers gate opened.** Every phase has an entry gate you can
> read off Admin → Analytics in one minute.

---

## 0. The three engines (and the order they fire)

| Engine | What it does | Fed by |
|---|---|---|
| **A · Awareness** | Strangers hear about PULSE and land | Organic posts, groups, reels, ads, SEO pages |
| **B · Engagement** | Users come back and bring friends | Challenges, leagues, duels, streaks, referral links, walk invites |
| **C · Partners** | Coaches/gyms import their OWN audiences; sponsors pay | Invite links, TV boards, /why-partner, rate card |

They compound in that order: A gives B raw users, B gives C the numbers that make the pitch
credible («عندنا X عضو نشط أسبوعيًا» beats any brochure), and C feeds A back (every coach's
trainee and every gym TV is free awareness). **Do not pitch sponsors before B has numbers.**

---

## Phase 0 — This week: light the fires (no marketing until these are done)

Everything here is done once and multiplies everything after it.

- [ ] **Deploy the current bundle** (invite links, TV board, /why-partner are the backbone of
      Phase 2–3 — nothing can be pitched until they're live). `DEPLOY.md` §12 / installer.
- [ ] **SMTP block in the server `.env`** — password reset + Friday win-back digest are dead
      without it. Verify via the new banner in Admin → Email blast.
- [ ] **Rotate the Google OAuth secret** (owed since Aug 5 — `ANALYSIS.md`, `GO-LIVE.md` §2).
- [ ] **Activate the Meta/TikTok pixel** (`ADS-PLAYBOOK.md` §2) — without CompleteRegistration
      events, every ad pound is spent blind. Do this even if ads start weeks later.
- [ ] **Search Console**: submit the sitemap so the prerendered article/recipe pages start
      earning free traffic. SEO is a slow engine — every week it isn't submitted is a week lost.
- [ ] **Baseline snapshot**: write down today's numbers (registered, weekly actives, D7
      retention from Admin → Analytics). The gates below are measured against movement, and
      you can't see movement without a start line.

---

## Phase 1 — Weeks 1–4 · Awareness + first habit loop
**Goal: 100 weekly actives. Budget: EGP 0 (organic only) or ≤ EGP 1,500 if adding ads.**

### The weekly operating cadence (≈ 6 hours/week, repeats all 90 days)

| Day | ~Time | Task | Doc |
|---|---|---|---|
| Daily | 15 min | Post the day's card from the engagement calendar (or let `fb-schedule.ts` run) | `ENGAGEMENT-POSTS.md` |
| Daily | 30 min | Be helpful in 2–3 Facebook groups; paste-tweak the ready replies | `ORGANIC-PLAYBOOK.md` §1, `MARKETING-GROUPS.md` |
| Sat | — | HANDS OFF — the API auto-posts the league promotion at 12:00 | (auto) |
| Sun | 60 min | Film/assemble 2 reels for the week | `CONTENT-PRODUCTION.md` A–B |
| Wed | 30 min | Stories batch + community shout-outs (screenshot real users, ask first) | `MARKETING.md` §5 |
| Fri | 30 min | Read the funnel (landings → registered per source), kill what's flat, double what moved | `ADS-PLAYBOOK.md` §1 |
| Fri | 30 min | Partner outreach block — see Phase 2/3 quotas | `PARTNERS-PITCH.md` |

### Phase-1 specifics

1. **Run one prize challenge end-to-end** (the Carrefour template exists:
   `CHALLENGE-CARREFOUR.md`). A live «جايزة حقيقية» banner on Home is the single strongest
   registration argument — screenshot it into every group post that week.
2. **Push the referral loop at emotional peaks**: the app already shows WhatsApp share cards on
   PRs/streaks/badges. Your job is only to make the FIRST cohort big enough for peaks to occur.
3. **The five claims discipline** (`MARKETING-POSTS.md` header): every post carries at least one
   claim competitors can't copy; never the four banned phrases.
4. **Ads only if organic shows a working funnel** — objective = registrations, never views
   (`ADS-PLAYBOOK.md` §3). Start EGP 50/day, one campaign, Egyptian-dialect creative.

**Gate to Phase 2 features:** at **~100 weekly actives**, switch on team challenges as the
flagship social push (they need critical mass to feel alive). At **~300 actives**, build the
retention-cohorts dashboard before spending another pound on acquisition — from there on,
retention is cheaper than acquisition.

---

## Phase 2 — Weeks 3–8 · Coaches (start while Phase 1 is still running)
**Goal: 10 active coaches, each importing 10–50 trainees. Coaches are the highest-leverage
acquisition channel you have: one yes = a whole audience, zero ad spend.**

The pitch, objection handling, WhatsApp openers and targeting lists are ready in
**`PARTNERS-PITCH.md`**. The product side is live after Phase 0's deploy: invite link + QR,
client dashboard with quiet-flags, broadcast, private programs.

**Weekly quota (the Friday block):** 10 new coach contacts, 3 follow-ups, target 1 yes/week.

1. **Week 3–4 — the founding five.** Hand-pick 5 coaches you can meet or call (friends-of-
   friends beat cold DMs 10:1 in Egypt). Onboard them PERSONALLY: activate the profile
   together, print their QR card, watch them send the link to 3 trainees on the spot.
2. **Make the first coach famous.** Verified badge, featured directory slot, a post about
   their client's result (with permission). Every later pitch opens with their story.
3. **Week 5+ — systematize.** DM the outreach template to the first-20 list
   (`PARTNERS-PITCH.md` targeting playbook). Track in a simple sheet: name / niche / contacted /
   replied / onboarded / trainees brought (the `referredById` attribution shows this in-app).
4. **Content flywheel**: each onboarded coach = one «مدرب على بالس» post + their trainees'
   PR share-cards carrying their name. Coaches promote PULSE because it promotes them.

**Monetization gate (do NOT jump early):** featured-coach placement and program-fee ideas
(`REVENUE.md`) activate only when the coaches directory has real traffic — coaches must feel
they got value free first. Earliest realistic: week 10+.

---

## Phase 3 — Weeks 6–12 · Gyms + the TV loop
**Goal: 3 pilot gyms with the TV board running. Entry gate: at least 5 coaches live and
~150+ weekly actives — gym owners ask "who's already on it?" and you need an answer.**

1. **Pilot selection**: pick 3 gyms where you or an onboarded coach already knows the owner.
   Mid-size neighborhood gyms (200–800 members) — big chains move too slowly for a pilot.
2. **The pitch is a demo, not a deck**: open `/tv/:id` on their actual TV in the first five
   minutes, then the analytics screen («دي قايمة الأعضاء اللي هيسيبوا الشهر الجاي — النهارده
   تقدر تكلمهم»). Retention language, not tech language. Leave the printed QR at the desk.
3. **Co-funded gym challenge**: month-2 of each pilot, a gym-branded prize challenge where the
   gym funds the prize (a free month costs them ~nothing). The prize engine + Wall of
   Champions already handle it.
4. **Price NOTHING during the pilot.** The rate card (`PARTNER-RATE-CARD.md`) comes out only
   after a pilot gym renews its enthusiasm unprompted — that's your proof point and your
   testimonial in one.

---

## Phase 4 — Weeks 10–13 · Sponsors, stores, events (the paying layer)
**Entry gate: 500+ weekly actives OR one full gym pilot with numbers. Sponsors buy an
audience; before that exists there is nothing to sell — pitching early burns the contact.**

1. **Assemble the one-page media kit from real numbers**: weekly actives, challenge
   participation, event RSVPs, TV-board impressions (gym count × footfall). Pull straight
   from Admin → Analytics; screenshots beat design.
2. **Sell in this order** (easiest yes first): challenge prize sponsorship (`REVENUE.md` has
   it priced) → home sponsor banner → featured store/deals listings → event co-hosting
   (`Events` RSVP flow is the deliverable they can see).
3. **Events as the recurring anchor**: one PULSE community event/month (parkrun-style walk or
   a partner gym open day). Cheap, photogenic, and every RSVP is a warm lead for the hosting
   partner — which is exactly the story the next sponsor pays for.
4. All inbound flows through **`/why-partner`** (leads land in Admin tagged `why-partner`) —
   put that link in every pitch, bio, and printed QR.

---

## KPI dashboard — the six numbers, read every Friday

| # | Metric | Where | Phase-1 target | Phase-4 target |
|---|---|---|---|---|
| 1 | Weekly actives | Admin → Analytics | 100 | 500+ |
| 2 | D7 retention | Admin → Analytics | ≥ 25% | ≥ 35% |
| 3 | Registrations/week by source | funnel view | growing, source known | — |
| 4 | Coaches active (≥3 clients) | coach directory | 2 | 10+ |
| 5 | Partner-imported users (`referredById` + gym codes) | attribution | — | ≥ 30% of signups |
| 6 | Leads/week (why-partner + rate card) | Admin → Leads | — | 5+ |

**Decision rules:** metric 2 below target → stop acquisition spend, fix onboarding/habit loop
first. Metric 5 above 30% → shift the Friday hours from posting to partner ops; the network
now grows itself.

---

## Document map (open the right tool, don't re-read everything)

| Task | Doc |
|---|---|
| What to claim / never say | `MARKETING.md`, `MARKET-RESEARCH.md`, `COMPETITIVE-ANALYSIS.md` |
| Today's post | `ENGAGEMENT-POSTS.md` (calendar) · `MARKETING-POSTS.md`, `FEATURE-POSTS.md`, `NOT-A-GYM-POSTS.md` (packs) |
| Group replies & seeding | `ORGANIC-PLAYBOOK.md`, `MARKETING-GROUPS.md` |
| Reels & filming | `CONTENT-PRODUCTION.md` |
| Launch pushes & influencers | `LAUNCH-CAMPAIGNS.md` |
| Paid ads | `ADS-PLAYBOOK.md` |
| Coach / gym / store / sponsor outreach | `PARTNERS-PITCH.md` → then `PARTNER-RATE-CARD.md` when money enters |
| What to charge for, and when | `REVENUE.md` |
| Server / go-live chores | `GO-LIVE.md`, `DEPLOY.md` |

---

## The honest summary

You are not short on assets — content packs, playbooks, auto-posters, pixels, prize engine,
partner tooling all exist. The scarce resource is **operator hours**, so this plan spends them
where each hour multiplies: daily presence (15–45 min), the Friday numbers-and-outreach block,
and personal onboarding of the first coaches and gyms. Awareness rents users; coaches and gyms
own audiences and hand them to you. Run Phase 1 faithfully for four weeks, land the founding
five coaches, and Phase 3–4 largely sell themselves off the numbers those two produce.
