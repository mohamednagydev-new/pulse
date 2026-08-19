# PULSE — Google Play listing pack (copy-paste ready)

Everything the Console asks for, in order. Artifacts referenced live in `C:\pulse-twa\store-assets\`.

---

## 1 · App details

| Field | Value |
|---|---|
| App name (30 chars) | `PULSE: تمارين ودايت بالمصري` |
| Default language | Arabic (ar) |
| App or game | App |
| Free or paid | Free |
| Category | Health & Fitness |
| Tags | Fitness, Nutrition, Workout |
| Contact email (public, required) | `support@geddo.online` — **make sure this inbox actually exists before submitting** |
| Website | `https://pulse.geddo.online` |
| Privacy policy URL | `https://pulse.geddo.online/privacy` |

## 2 · Short description (max 80 chars)

**Arabic (primary):**
```
تمارين بالفيديو وسعرات الأكل المصري وتحديات مع أصحابك — مجاني ١٠٠٪
```
**English:**
```
Video workouts, Egyptian food calorie tracking & challenges — 100% free
```

## 3 · Full description (max 4000 chars)

**Arabic (primary):**
```
كوتشك المصري في جيبك 💪

PULSE مش مجرد تطبيق تمارين — ده نظام كامل للتمرين والأكل والالتزام، معمول بالمصري ولينا احنا.

🏋️ تمرّن صح
• برامج تمارين بالفيديو لكل المستويات — جيم أو بيت من غير أي معدات
• التطبيق بيسألك «بيوجعك إيه؟» وبيبني الخطة حوالين إصابتك بدل ما يتجاهلها
• خريطة عضلات تفاعلية: دوس على العضلة وشوف تمارينها بالفيديو
• سجّل مجموعاتك (وزن × عدات) وشوف أرقامك القياسية ورسم تقدمك لكل تمرين
• مؤقت راحة، كوتش صوتي، وموسيقى جوه التمرينة

🍽 كُل صح — بالأكل المصري
• أول حاسبة سعرات بتفهم أكلنا: كشري، فول، طعمية، محشي... بأرقام حقيقية
• سجّل أكلك بالصوت أو صوّر طبقك والذكاء الاصطناعي يحسبه
• امسح باركود أي منتج من السوبر ماركت
• خطة أكل يومية مبنية على هدفك، وهدف وزن بمتابعة أسبوعية

🔥 التزم مع أصحابك
• تحديات جماعية بجوايز حقيقية ودوري أسبوعي بنقط XP
• اعزم صاحبك على مشوار مشي أو تمرينة، وشجعه لما يكسل
• مجتمع كامل: منشورات، ريلز قصيرة، مدربين حقيقيين تقدر تتواصل معاهم

✅ ليه PULSE مختلف؟
• الخطة بتقولك «هي كده ليه» — مش أوامر من غير سبب
• بيراجع خطتك كل ٤ أسابيع ويظبطها على نتايجك الحقيقية
• مكتوب بالمصري مش مترجم — من أول التمرين لآخر وصفة
• مجاني بجد: مفيش نسخة مدفوعة ولا اشتراك مخفي

ابدأ النهارده — جسمك هيشكرك 🧡
```

**English:**
```
Your coach in your pocket 💪

PULSE is a complete training, nutrition and consistency system — built in Egyptian Arabic, for us.

🏋️ TRAIN RIGHT
• Video workout programs for every level — gym or home, no equipment needed
• The plan asks what hurts and builds around your injuries instead of ignoring them
• Interactive muscle map with video demos for every exercise
• Log your sets, track personal records, and watch a progress chart per exercise

🍽 EAT RIGHT — WITH EGYPTIAN FOOD
• The first calorie counter that understands koshary, foul and taameya with real numbers
• Log by voice, snap a photo of your plate, or scan any supermarket barcode
• A daily meal plan built from your calorie target, plus a tracked weight-goal journey

🔥 STAY CONSISTENT WITH FRIENDS
• Group challenges with real prizes and a weekly XP league
• Invite a friend for a walk or a workout; cheer them when they slack
• A full community: posts, short reels, and real coaches you can connect with

✅ WHY PULSE IS DIFFERENT
• The plan explains WHY, and re-checks itself every 4 weeks against your real results
• Written in Egyptian Arabic, not translated
• Genuinely free: no paid tier, no hidden subscription

Start today — your body will thank you 🧡
```

## 4 · Graphics (all in `C:\pulse-twa\store-assets\`)

- App icon: `icon-512.png` (512×512)
- Feature graphic: `feature-graphic.png` (1024×500)
- Phone screenshots (min 2): `s-home.jpg`, `s-tracker.jpg`, `s-progress.jpg`, `s-muscles.jpg`

## 5 · The questionnaire answers

**App access** (login is required, so reviewers need credentials):
- Choose "All or some functionality is restricted" → add instructions:
  - Username: *create a fresh account for this — e.g. `playreview@geddo.online` / a password you set* (do NOT hand out the admin account)
  - Note for reviewers: `After login the app requires completing a short fitness questionnaire (9 quick questions) before the home screen — this is the intended onboarding.`

**Ads:** Yes, contains ads (sponsor banners) — no ad SDKs, so no advertising-ID collection.

**Content rating (IARC):** Health/fitness app · no violence/sex/drugs/gambling · **contains user-generated content** (community feed) → answer Yes, and Yes to "users can report content and block users" (both true). Expected result: Everyone / rated with UGC notice.

**Target audience:** 18 and over (simplest; avoids the children's-policy track).

**Data safety** — declare:
| Data type | Collected? | Shared? | Purpose |
|---|---|---|---|
| Name, Email | Yes | No | Account management |
| Phone number | Optional | No | Account management |
| Health & fitness (workouts, nutrition, weight) | Yes | No | App functionality |
| Photos (meal + progress photos, user-initiated) | Yes | No* | App functionality |
| Messages (in-app) | Yes | No | App functionality |
| App interactions | Yes | No | Analytics |

\* Meal photos/text are processed ephemerally by our AI provider to generate estimates and are not used for training — under Play's rules, ephemeral service-provider processing does not need to be declared as "shared", but keep the answer consistent with the privacy page.

- Data encrypted in transit: **Yes** (HTTPS everywhere)
- Users can request deletion: **Yes** (in-app account deletion + support contact)

**Government app / COVID / Financial features:** No to all.
**Health apps declaration:** general fitness & nutrition; no medical device claims.

## 6 · Release

- Countries: start with **Egypt + Saudi Arabia + UAE + Kuwait + Qatar + Jordan** (or all countries — content is global, local layer is country-scoped anyway)
- Upload: `C:\pulse-twa\app-release-bundle.aab`
- Accept **Google Play App Signing**. Then check *Setup → App integrity*: if Google shows a **different** "App signing key certificate" SHA-256 than `85:B0:13:AA:...:F5:81`, send it to the developer — it must be ADDED to `/.well-known/assetlinks.json` or the installed app will show a browser bar.

## 7 · After approval

- Future store releases: `powershell -File C:\pulse-twa\release.ps1 -VersionCode 2 -VersionName 1.0.1` → upload the new `.aab`. Website deploys need NO store release.
- Optional next step: a Play API service account enables fully automatic uploads.
