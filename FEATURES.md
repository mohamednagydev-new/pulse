# FIT IT — Complete Feature Coverage Audit

Every screen and UI element in `FIT-IT-Colortheme-Final.pdf` (48 pages) mapped to a feature, so nothing is missed. Status: ☐ planned · ◐ in progress · ☑ done.

## A. Onboarding & Auth (pages 1–6)
- ☐ **A1** Splash / intro carousel — 4 slides with hero image, video play button, title + caption, page dots, **Skip**. Slides: Count Your Calories · A Workout For Everybody · Yoga & Meditation · The Wellness Kitchen.
- ☐ **A2** Sign In — email, password, **Forget Password?**, **Remember Me** checkbox, OR divider, **Sign in with Facebook**, **Sign in with Google**, **Sign In** button, "Don't have account? Create new one" link.
- ☐ **A3** Sign Up — First Name, Last Name, Mobile Number, Email, Password, Zip/Postal Code, **Sign Up** button.
- ☐ **A4** Forgot-password flow (implied by "Forget Password?").
- ☐ **A5** Session persistence ("Remember Me" → long-lived refresh token).

## B. App shell & navigation (all main pages)
- ☐ **B1** Bottom tab bar: **Recommended · Programs · Wellness Library · Profile** + 3-dot **Info** entry. Active tab colored per section; raised center icon.
- ☐ **B2** Per-section theming (pink=home/auth, blue=programs, green=wellness).
- ☐ **B3** Top bar variants: hamburger + logo + search (home), back arrow + title (detail).
- ☐ **B4** Curved-bottom header treatment (auth, coach, profile).

## C. Recommended / Home (page 7)
- ☐ **C1** Sponsor banner ("adidas — Exclusive Fit It Offers") — admin-managed `Banner`.
- ☐ **C2** **Fit For Life** horizontal carousel (workout videos) with page dots + "see all" chevron.
- ☐ **C3** **Fit It Coaches** row — circular coach cards (Cole Chance, Abou El Naga) → coach page.
- ☐ **C4** **Prepare Your Meal** row — meal-prep video cards ("Flavourmag: The Benefits…").
- ☐ **C5** **Workout** promo banner → Programs.
- ☐ **C6** Global search (magnifier in header).

## D. Programs (pages 8–9, 24–44)
- ☐ **D1** Programs intro: "Welcome To FIT IT Programs" (arrow to continue).
- ☐ **D2** "Stay Focused / Train Hard / Keep Grinding" → choose **Yoga** or **Workout** (horizontal cards).
- ☐ **D3** **Yoga path**: intro ("Yoga — Free your Mind") → Coach (Cole Chance) → program list (7-Day Rejuvenating Yoga Series, Pregnancy Yoga, Yin Yoga & Poetry).
- ☐ **D4** Program detail: hero + title pill + description + arrow → **lesson list** (video thumbnails with duration e.g. "25.25min").
- ☐ **D5** **Workout path**: "Fitness Workouts — Choose the right program" → Coach (Abou El Naga) **or** Exercises.
- ☐ **D6** Coach → **level select** (Beginners / Intermediate / Advanced).
- ☐ **D7** Level → **program select** (First / Second / Third Program) with preview video.
- ☐ **D8** Program → lesson list (video thumbnails with duration e.g. "0.25Sec").
- ☐ **D9** **Fit For Life** path: "Welcome To FIT for Life" → "Don't Limit Your Challenges" (Beginners / Intermediate challenge cards).
- ☐ **D10** **Exercises muscle map**: front & back body, tappable muscle hotspots (Shoulders, Chest, Biceps, Forearm, Abs, Obliques, Quads, Abductors, Adductors, Triceps, Traps, Lats, Lower Back, Glutes, Hamstrings, Calves), **Cardio** badge, timer badge, **180° flip** front/back → exercise list per muscle.
- ☐ **D11** **Video player** (lesson/exercise) — self-hosted, range-streamed, seekable.

## E. Wellness Library (pages 10–23)
- ☐ **E1** Intro: "Welcome To The Wellness Library" (arrow).
- ☐ **E2** "Integrate Wellness Into Your Life" → **Wellness Initiatives · Wellness Kitchen · Wellness Articles** (horizontal cards).
- ☐ **E3** **Wellness Initiatives** → intro → category grid (Healthy Eating, Staying Active, Weight Management, Musculoskeletal Health, Healthy Travel, Better Sleep, + more) with search + featured carousel → list → **article detail** (video + body).
- ☐ **E4** **Wellness Kitchen** → intro → "Healthy Recipe Collection" category grid (Appetizers, Soups, Breads, Vegetarian Salads, Meatless Main Dishes, Poultry, Meat, Seafood, Vegetables & Legumes, Grains, Sauces & Condiments…) → recipe list → **recipe detail** (image, About The Food, **Ingredients** list).
- ☐ **E5** **Wellness Articles** → intro → category grid (Arthritis & Joint Health, Back Pain & Spine, Blood Pressure, Cancer, Cholesterol, Dental Health, + more) → article list → **article detail** (image/video + body).
- ☐ **E6** In-section search bar (present on every library list screen).
- ☐ **E7** Featured horizontal carousel at top of each category grid.

## F. Profile & Info (pages 45–47)
- ☐ **F1** Profile: avatar, name, **Bookmarks (View All)**, **Programs Done (View All)**.
- ☐ **F2** Bookmarks list screen (saved lessons/recipes/articles).
- ☐ **F3** Programs Done list screen (completion history).
- ☐ **F4** Info screen accordions: **Settings** (Change Email, Change Password), **Membership**, **Support**, **Instagram** (external link), **Logout**.
- ☐ **F5** Membership accordion: Subscription Status, **Active Plan** (e.g. "Yoga"), Purchase Membership → **More Plans** (red CTA).
- ☐ **F6** Support screen/section (contact / FAQ).

## G. Cross-cutting features
- ☐ **G1** **Bookmark** any lesson/recipe/article (toggle) — profile "Bookmarks".
- ☐ **G2** **Mark complete** for lessons/programs — profile "Programs Done".
- ☐ **G3** **Search** — server-side, across programs, recipes, articles, exercises (SQLite FTS5). Global (home) + scoped (per library section).
- ☐ **G4** Video streaming with range/seek; poster thumbnails; duration display.
- ☐ **G5** PWA install + offline app shell + cached content text.
- ☐ **G6** Responsive: mobile-first (matches 375px design) but usable on desktop/tablet.

## H. Admin CMS (not in PDF — required to manage all above)
- ☐ **H1** Admin auth (role=ADMIN) + guarded dashboard.
- ☐ **H2** CRUD: Coaches, Programs, Lessons, Exercises, Muscle groups, Categories, Articles, Recipes, Banners, Membership Plans.
- ☐ **H3** Media upload: video (→ ffmpeg transcode, ffprobe duration + thumbnail) and images.
- ☐ **H4** Reorder (drag/order field) for carousels, grids, lessons.
- ☐ **H5** User list / role management.

## I. Monetization (Phase 4 — schema ready now)
- ☐ **I1** Membership plans (Yoga / Workout / All-Access), pricing, interval.
- ☐ **I2** Stripe subscription checkout + webhooks.
- ☐ **I3** Paywall gating on programs/lessons by active plan.
- ☐ **I4** Signed video URLs for paid content.

---

### Content inventory to seed (generated as detailed JSON, then loaded)
| Section | Categories | Depth |
|---|---|---|
| Wellness Kitchen | 12 recipe categories | 6 full recipes each (ingredients + steps + macros) |
| Wellness Articles | 12 health categories | 5 articles each (multi-paragraph) |
| Wellness Initiatives | 12 lifestyle categories | 5 guides each |
| Exercises | 17 muscle groups (front+back) | 5 exercises each (form instructions) |
| Programs | 2 coaches | Yoga: 3 series · Workout: 9 programs (3 levels × 3), lessons each |
| Home | banners, Fit-for-Life, meal-prep, challenges | populated |

*All content is original, generated for the app; health facts verified via web search. Real coach photos/videos to be supplied by you and uploaded via the admin CMS.*
