# App Store listing pack — PULSE (paste-ready)

App Store Connect → PULSE → **App Store** tab → version **1.0** → fill the fields below → select the latest build → Submit for Review.

---

## 1 · Names (Arabic — primary locale ar-SA)

| Field | Value | Limit |
|---|---|---|
| Name | `PULSE: تمارين ، رجيم ، سعرات` | 30 chars (already set ✓) |
| Subtitle | `كوتشك وصحابك معاك في أي وقت` | 30 chars |

**English (add as second localization, en-US):**

| Field | Value |
|---|---|
| Name | `PULSE: Workouts & Diet` |
| Subtitle | `Your coach & friends, anytime` |

## 2 · Promotional text (170 chars, editable without review)

AR:
```
جيم في موبايلك 🔥 تمارين بالفيديو، حساب سعرات الأكل المصري، تحديات وأصحاب بيشدوا بعض — ببلاش من غير اشتراك.
```
EN:
```
A gym in your pocket 🔥 Video workouts, Egyptian food calorie tracking, challenges and a community that keeps you going — free, no subscription.
```

## 3 · Description (AR)

```
‏PULSE — كوتشك وصحابك، معاك في أي وقت.

🏋️ تمارين بالفيديو
خطط أسبوعية جاهزة للبيت والجيم، لكل مستوى. كل تمرينة بفيديو، وسجّل أوزانك واحتفل لما تكسر رقمك.

🍽 سعرات بالأكل المصري
سجّل أكلك بالعربي — كشري، فول، فراخ مشوية — أو صوّر الأكلة والتطبيق يحسبها. أهداف سعرات ومياه على مقاسك.

🔥 السلسلة والتحديات
حافظ على سلسلة أيامك، اشترك في تحديات أسبوعية بجوايز، واطلع في الدوري مع ناس زيك.

👥 مجتمع بيشد بعضه
أصحاب، سكواد، شير لتقدمك، وتشجيع لما تحتاجه. مش هتكمل لوحدك.

🤖 مساعد ذكي
اسأل عن التمارين والأكل والدايت وخد إجابات على وضعك أنت.

⌚ ساعات ذكية
اربط Strava وتمارين ساعتك بتتحسب لوحدها.

كل ده ببلاش — من غير فيزا، من غير اشتراك، من غير نسخة مدفوعة مخفية.
```

## 4 · Description (EN)

```
PULSE — your coach and your friends, with you anytime.

🏋️ Video workouts
Ready weekly plans for home and gym, every level. Every exercise has a video; log your weights and celebrate new records.

🍽 Egyptian food calorie tracking
Log meals in Arabic — koshary, foul, grilled chicken — or snap a photo and let the app estimate it. Calorie and water targets sized to you.

🔥 Streaks & challenges
Keep your daily streak, join weekly prize challenges, climb the league with people like you.

👥 A community that keeps you going
Friends, squads, progress sharing, and cheers when you need them. You won't do this alone.

🤖 Smart assistant
Ask about training, food and dieting — answers based on your own situation.

⌚ Wearables
Connect Strava and your watch workouts count automatically.

All free — no card, no subscription, no hidden paid tier.
```

## 5 · Keywords (100 chars, comma-separated, no spaces needed)

AR field:
```
تمارين,جيم,دايت,رجيم,سعرات,كوتش,فتنس,لياقة,اكل صحي,تخسيس,مصري
```
EN field:
```
workout,gym,diet,calories,coach,fitness,egypt,arabic,weight loss,meal
```

## 6 · URLs

| Field | Value |
|---|---|
| Support URL | `https://pulse.geddo.online/help` |
| Marketing URL | `https://pulse.geddo.online` |
| Privacy Policy URL | `https://pulse.geddo.online/privacy` |

## 7 · Screenshots

- 6.5" iPhone slot: upload the 8 files from `deploy/appstore-screens-65/` (1284×2778)
- 13" iPad slot: upload the 8 files from `deploy/appstore-screens-ipad/` (2064×2752)

## 8 · App Privacy (questionnaire — match the Play Data safety answers)

Data collected, all **linked to identity**, none used for tracking:
- Contact Info → Name, Email (account)
- Health & Fitness → workouts, nutrition, weight (app functionality)
- User Content → photos (user-initiated meal/progress photos), messages (in-app)
- Identifiers → User ID (account)
- Usage Data → product interaction (analytics)

"Do you or third-party partners use data for tracking?" → **No**.

## 9 · Age rating questionnaire

All "None" except: Unrestricted Web Access → **No** (the app shows only its own content). Expected result: **4+** (or 12+ if UGC question pushes it — answer honestly: users CAN post content, moderation + report + block exist).

## 10 · App Review Information

| Field | Value |
|---|---|
| Sign-in required | Yes |
| Demo account | `playreview@geddo.online` / `PulseReview#2026` |
| Notes | App is fully functional in Arabic (primary) and English. Video exercise content is embedded from official public sources. Community features include reporting and blocking. |

## 11 · After approval

1. Set `APP_STORE_URL` in `apps/web/src/lib/install.ts` to the live listing URL → deploy → every "coming soon" badge becomes a live App Store button and iPhones get steered to the store.
2. Add the App Store badge next to the Play badge in marketing materials.
3. Tag `ios-v1.0.1` etc. for future shell updates — content updates remain server-side, no review.
