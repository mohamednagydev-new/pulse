# PULSE — Facebook Groups Playbook + Marketing Streams

> **Why manual, not API:** Facebook removed the Groups API (April 2024) — apps can no
> longer search groups or publish posts into them programmatically, and page tokens
> (what we have in .env) only post to our own Page feed via `tools/fb-schedule.ts`.
> Group marketing is a copy-paste job — this file makes it a 10-minute one.

---

## 1) Finding the right groups (search these in Facebook)

Search each phrase, sort by "Groups", join the 3–5 biggest ACTIVE ones (posts today,
not last month). Aim for ~15 groups total:

- تخسيس ودايت مصر
- دايت صحي بدون حرمان
- تمارين منزلية للبنات / للرجالة
- جيم مصر / كمال اجسام مبتدئين
- كيتو دايت مصر
- صيام متقطع مصر
- وصفات دايت صحية
- رجيم النقاط / رجيم قاراطاي
- المشي والجري مصر
- حوامل وأمهات — رياضة بعد الولادة
- طلبة الجامعات (جامعتك المستهدفة) — نشاطات
- يوجا مصر

**Rules that keep you unbanned:** read each group's rules first (some ban links —
post value + «التطبيق في أول كومنت»); never post the same text in 5 groups in one
hour (Facebook flags it); answer every comment fast — the algorithm boosts active
posts; 1 post per group per week MAX.

## 2) Five ready-to-paste posts (value-first, no spam smell)

**Post A — the calorie question (best performer type)**
> صحن كشري وسط بكام سعرة؟ 😄
> الإجابة: حوالي ٥٥٠ سعرة — وفيه بروتين نباتي كويس. المشكلة مش في الكشري، المشكلة في الكمية.
> لو عايز تعرف سعرات أي أكلة مصرية بالظبط (فول، طعمية، محشي...) في تطبيق مصري مجاني بيحسبها — وبتقدر تقول أكلت إيه بصوتك وهو يحسب.
> اللينك في أول كومنت 👇

**Post B — the diet journey story**
> أكتر حاجة بتكسر الدايت إنك مش شايف تقدم.
> جربوا حاجة اسمها «رحلة الدايت»: بتحدد وزنك المستهدف، وكل ما توزن نفسك شريط التقدم يتحرك، ولو مشيت صح بيقولك «ماشي صح» ولو اتأخرت بيقولك.
> ولما توصل لهدفك في احتفال حقيقي 🏆 — الفكرة إن الدايت يبقى لعبة ليها خط نهاية.
> (التطبيق مجاني ومصري — في الكومنتات)

**Post C — home workout hook**
> لو مفيش وقت ولا فلوس للجيم — الحل مش إنك متتمرنش.
> في خريطة جسم تفاعلية: بتدوس على العضلة اللي عايز تمرنها وبتاخد جلسة كاملة بالفيديو، من البيت ومن غير أجهزة.
> مجاني بالكامل، بالعربي، ومفيش اشتراكات. مين جرب التمرين في البيت وكمّل؟ 💪

**Post D — the barcode trick**
> نصيحة سوبرماركت: قبل ما تحط أي حاجة معلبة في السلة، اقرا الـ label...
> أو الأسهل: في تطبيق بيخليك تمسح الباركود بالكاميرا ويقولك القيم الغذائية + تقييم من ١٠ على حسب هدفك (تخسيس/عضل).
> وفر على نفسك ٱلف حسبة. اللينك في الكومنتات 📷

**Post E — buddy challenge**
> التمرين مع صاحبك بيخليك تكمل ×٣ مرات أكتر.
> اعمل تحدي ١ ضد ١: أسبوع، اللي يتمرن أيام أكتر ياخد نقط التاني 😄 — وفي دوري أسبوعي بتتنافسوا فيه مع ناس تانية.
> منشن لصاحبك اللي محتاج يتحرك 👇

**First comment (always):** `التطبيق: pulse.geddo.online — مجاني ١٠٠٪، من المتصفح على طول من غير تحميل 💪`

## 3) Pages & partnership paths

- **Local micro-influencers (5k–50k):** fitness/diet pages بالمصري. Offer: free
  shout-for-shout or a "verified coach" profile on PULSE with their name + link to
  their page (costs us nothing, gives them a channel). 10 DMs → expect 2 yeses.
- **Gym & nutritionist pages:** partner deals already exist in-app (Deals/Store) —
  pitch: "we send you clients from the app, you post about us once."
- **University sports pages/groups:** student challenges («تحدي الترم») — young,
  mobile-first, zero-cost audience.
- **Cross-posting:** every marketing card (marketing-cards/) is square — repost the
  same content to Instagram + TikTok photos mode with the same caption.

## 4) Other streams worth doing (ranked)

1. **TikTok + Reels + YouTube Shorts** — the 15s screen-recording format (voice
   logging, barcode scan, muscle map). Biggest free reach in Egypt by far.
2. **WhatsApp** — the invite quest already rides it. Add: a weekly "PULSE tips"
   WhatsApp *Channel* (broadcast, zero cost, huge open rates in Egypt).
3. **Telegram** — دايت/فتنس channels repost freely; offer our cards + link.
4. **SEO articles** — the app already serves 120 Arabic articles + sitemap.xml;
   sharing article links in groups doubles as content marketing AND indexing.
5. **The email machine** (built) — /admin/email weekly; digest + install nudge run themselves.
6. **Referral (built)** — invite quest + badge; mention it in every group post comment thread.
7. **Later, with budget:** boosted posts ONLY on cards that performed organically.

## 5) Cadence (fits in ~1h/week)

- **Sun:** feature-of-the-week push + FB page card (fb-schedule.ts).
- **Mon/Wed:** 2 group posts (different groups, different template).
- **Fri:** answer all comments + 1 group post (rest-day/motivation angle).
- Track what works: ask "من فين عرفتنا؟" in the app's support chat occasionally.
