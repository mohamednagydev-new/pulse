# PULSE — The Next Plan (written 2026-08-19)

One page, sequenced, with owners. Merges the launch backlog, COMPETITIVE-ANALYSIS.md's
action list, and GROWTH-ROADMAP.md's gates. **Rule: nothing from a later block starts
while an earlier block has an unchecked item that takes under an hour.**

Owners: **YOU** = needs your hands/accounts · **CLAUDE** = say the word, done from here ·
**MAC** = the borrowed-Mac session.

---

## BLOCK 1 — This week: ship what's sitting on disk

| # | Action | Owner | Effort |
|---|---|---|---|
| 1 | Deploy the current `F:\pulse-bundle.zip` (carries the iOS-auth server bits + latest fixes) | YOU | 10 min |
| 2 | **Play Console submission** — follow `deploy/PLAY-LISTING.md` top to bottom (app record, AAB upload, listing, data safety, review creds are pre-made) | YOU | 30–45 min |
| 3 | After AAB upload: check *Setup → App integrity* — if Google's signing SHA-256 differs from `85:B0:13…`, send it over → assetlinks update + redeploy | YOU→CLAUDE | 5 min |
| 4 | Server hygiene still owed: SMTP block in `.env` (if not done), **rotate the Google OAuth secret**, change the admin password from `admin123` | YOU | 20 min |
| 5 | Submit sitemap to Google Search Console; activate the Meta pixel (ADS-PLAYBOOK §2); write down baseline numbers (registered / weekly actives / D7) | YOU | 30 min |

## BLOCK 2 — Next 2 weeks: presence + first partners

| # | Action | Owner | Effort |
|---|---|---|---|
| 6 | Start the weekly marketing cadence (GROWTH-ROADMAP §Phase 1): daily post + 30 min in FB groups + Sunday reels + Friday numbers review | YOU | ~6 h/week |
| 7 | Run one prize challenge end-to-end (Carrefour template ready) — screenshot the live banner into every group post that week | YOU | 2 h setup |
| 8 | **Founding five coaches**: hand-pick, onboard personally, print their QR invite cards. This is the highest-leverage hour you can spend anywhere | YOU | 1 h each |
| 9 | Play listing goes live → announce ("PULSE دلوقتي على جوجل بلاي") across page/groups/status; ask early users for 5-star reviews in the app's celebration moments | YOU→CLAUDE | CLAUDE drafts the pack |
| 10 | **Mac session** for the App Store — `deploy/APPSTORE-MAC-GUIDE.md` is the script; friend installs Xcode the day before | MAC | 2–3 h |
| 11 | FIT IT: decide launch timing. Everything is deploy-ready (`FITIT-DEPLOY.md`); it costs focus, not work — recommendation: hold until PULSE's Play launch settles | YOU | decision |

## BLOCK 3 — This month: the competitive plays

| # | Action | Owner | Effort |
|---|---|---|---|
| 12 | Marketing angle: **weaponize the billing-complaint cluster** — "free means free" campaign posts (never name ElCoach; describe the trap, offer the escape) | CLAUDE drafts | 1 h |
| 13 | First gym pilot (of 3): demo = open `/tv/:id` on their TV + at-risk list. Price nothing yet | YOU | per gym |
| 14 | Partner-not-compete outreach to PlusPass/GymTag (directory data partners) | YOU | email |
| 15 | Watch the intake-gate funnel weekly (register → wizard completion). If completion craters, soften the gate | YOU→CLAUDE | 5 min/wk |
| 16 | iOS submitted → handle the possible Guideline 4.2 round with the pre-written appeal in the Mac guide | YOU | if needed |

## BLOCK 4 — The 90-day horizon (gates, not dates)

- **100 weekly actives** → switch on team-challenge push as flagship social feature
- **300 actives** → retention-cohorts dashboard before any more acquisition spend
- **5 coaches + 150 actives** → gym pilots expand; co-funded prize challenges
- **500 actives or 1 proven gym pilot** → sponsors/rate-card selling begins (REVENUE.md order: challenge prizes → banner → listings → events)
- **Capacitor store release cycle** → add Health Connect wearable sync (the free depth ElCoach can't match)
- **December** → Ramadan campaign build starts (Ramadan ≈ Feb 2027; Welnes's own playbook, run first: cohort challenges + the shipped Ramadan content)

## The one-line strategy (from the research)

> Don't out-ElCoach ElCoach. Be the species they can't become: free-forever, community-owned,
> Egyptian-to-the-bone, monetized through partners — and make every week of streaks, leagues
> and buddy rivalries raise the cost of ever leaving. The clock that matters is Miran's Egypt
> entry: the store listing, the coaches, and Ramadan need to be OURS before it lands.

**Standing offer:** items marked CLAUDE (and any drafting/building in this table) happen the
moment you say go. The single most valuable 45 minutes on this entire page is item #2.
