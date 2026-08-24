# PULSE — Partner Prospects (Stores / Sponsors / Event Organizers / Coaches)

Compiled: 2026-08-24 — via live web search + direct site fetches.
Sibling file `PROSPECTS-STARTER.md` covers gyms; **no gyms in this file.**

Rules followed:
- Every row comes from a page or search result actually found during this sweep — nothing invented. Source URL for each row is in the Sources table at the bottom.
- Only publicly listed **business** contact info (site contact pages, hotlines, published business emails/WhatsApp).
- Prospects with no public contact are in the **page-only** table for manual FB/IG outreach — not in the CSV.
- International corporate chains (Decathlon, Dr. Nutrition UAE, IRONMAN Group, Squat Wolf…) excluded.

Honesty note on category depth:
- **Stores, sponsors, events:** targets met with verified contacts — Egyptian supplement retail is very reachable (hotlines everywhere).
- **Coaches/influencers:** as expected this is the contact-scarce category. Egyptian coaches overwhelmingly run on Instagram DM only. 8 coach-side leads have a verified public business contact; the rest of the 15-25 target is covered by the page-only table (25+ named, sourced coaches) for manual DM outreach.

---

## 1. Import CSV (Growth dashboard)

Format: `name,org,type,email,phone` — type ∈ store | sponsor | coach | influencer | other (event organizers = other).

```csv
iFIT Supplements,iFIT (ifit-eg.com),store,,+201286555553
MF Supplements,MF Supplements (7 stores + online),store,,+201108119776
Max Muscle Elite,Max Muscle Elite,store,info@maxmuscle.com.eg,19983
House of Supplements,House of Supplements New Cairo,store,contact@houseofsupplements.com,+201068770263
Super Supplement,Super Supplement (Cairo/Alex),store,,+201111022587
Dragon Pharma Egypt,Dragon Pharma Egypt online store,store,,+201111954999
TSS The Supplement Shop,TSS distributor + 14 retail stores,store,,+20224021085
Sports Mall,Sports Mall Mohandiseen (since 1994),store,sales1@sportsmallegypt.com,+201112239001
Entercise,Entercise fitness equipment Mohandessin,store,info@entercise.com,16293
Blue Shell Sport,Blue Shell gym equipment Giza,store,sales@blueshellsport.com,+201020301006
Athlete Home,Athlete Home sportswear & equipment Nasr City,store,,+201060444060
Power Fit Supplements,Power Fit (Madinaty/Zagazig/Mansoura),store,powerfit597@gmail.com,+201501039783
ASN Egypt,Advanced Sports Nutrition (since 1993),sponsor,info@salesucre.com,19632
Sigma Fit,Sigma Fit techwear (Egyptian brand),sponsor,support@sigmafiteg.com,
Abu Auf,Abu Auf healthy foods,sponsor,info@abuauf.com,+201050624300
Juhayna,Juhayna Food Industries (Zabado sponsored Cairo Runners),sponsor,,16630
Organix,Organix supplements manufacturer (OEM),sponsor,gm@organix-eg.com,+201270002808
Magma Sportswear,Magma Sportswear Cairo,sponsor,,+201117000650
Libra Sport,Libra modest sportswear (Salamtex),sponsor,support@libra-sport.com,+201018008787
PureGanic,PureGanic Egyptian supplement brand,sponsor,support@pureganic-eg.com,
Cairo Runners,Cairo Runners (Cairo Marathon organizer),other,info@cairorunners.com,
The TriFactory,TriFactory endurance events Zamalek,other,info@thetrifactory.com,+201062768365
Egyptian Marathon,Egyptian Marathon (Luxor Marathon / Sharm Half),other,info@egyptianmarathon.com,
ELFIT,In The Zone Sports / ELFIT championships,other,info@elfiteg.com,
Cairo Fitness Expo,Sportech Nutrition / Cairo Fitness Expo,other,info@cairofitnessexpo.com,
Sports Events Egypt,sportseventsegypt.com events directory,other,info@sportseventsegypt.com,+201021298602
Miracle Nassif,Miracle Nassif women's fitness coaching,coach,miracle@miraclenassif.com,
Aly Mazhar,BeFit 360 New Cairo,coach,info@befiteg.com,+201101360360
Dietitian Yassin,dietitianyassin.com online coaching,coach,support@dietitianyassin.com,+201154023012
Abdelrahman Alaa,HIT Egypt (25+ coaches),coach,info@hitegypt.com,+201096498452
Ahmed Barakat,XFIT Tribe calisthenics,coach,,+201065539117
KAJ Fitness Platform,KAJ online coaching platform,coach,info@kaj.fitness,+201202623000
Farah Nofal,Yogithings / Eden Wellness yoga & nutrition,coach,farahnofal91@gmail.com,
Dr. Shorouk Saeed Badr,RESIZERS women-only coaching (via Athlete Home),coach,,+201060444060
```

Notes on specific rows:
- **MF Supplements**: site email is Cloudflare-obfuscated; WhatsApp +201108119776 and call center +20 2 2124 6886 are published.
- **ASN Egypt**: `info@salesucre.com` is the email ASN's own site lists (shared parent company) — verified on asnegypt.com.
- **Abu Auf**: hotline 19969 also published; WhatsApp used as phone. Now majority-owned by Agthia (UAE) but operationally Egyptian; drop if you count that as international.
- **Juhayna**: emails on their contact page are click-protected; hotline 16630 verified. Proven fitness sponsor (Zabado sponsored Cairo Runners Half Marathon).
- **Cairo Fitness Expo**: site phone is a `+20 100 000 0000` placeholder — omitted; email verified. Expo was March 2026, next edition likely — they sell exhibitor booths (store+sponsor cross-sell).
- **Dr. Shorouk Saeed**: her women-only programs are sold through Athlete Home; the WhatsApp is Athlete Home's published number (same as their store row) — mention her name when contacting.
- Short numbers (19983, 16293, 19632, 16630) are Egyptian hotlines, dial as-is inside Egypt.

---

## 2. Page-only leads (no public email/phone — manual Facebook/Instagram outreach)

| Name | Category | City | Page URL |
|---|---|---|---|
| Life Supplements | store | Egypt (online) | https://lifesupplementseg.com/ |
| Protein House Egypt | store | Giza / Sheikh Zayed | https://proteinhouseeg.com/ |
| Garage Gear | store (equipment maker) | Egypt | https://www.instagram.com/garage.gear/ |
| KICK Nutrition | sponsor (protein snacks) | Egypt | https://www.instagram.com/kicknutritionegypt/ (site kicknutritionegypt.com in pre-launch) |
| Beast Protein Bar | sponsor (vegan bars) | Egypt | https://www.instagram.com/beast.eg/ |
| Alex Runners | event organizer / community | Alexandria | https://www.instagram.com/alexrunners/ |
| Maadi Runners | event organizer / community | Cairo (Maadi) | https://www.facebook.com/maadirunner/ |
| Alameda Tri Team | event community (triathlon) | Cairo | listed at https://www.sportseventsegypt.com/clubs/ |
| Wadi Ibex | event community (first Egyptian trail-running team) | Cairo | listed at https://www.sportseventsegypt.com/clubs/ |
| Fouad Ahmed (28K IG) | coach/influencer | Egypt | https://www.instagram.com/fouadahmedfitt/ |
| Mohamed Eslam (5.4K IG) | coach | New Cairo | https://www.instagram.com/coach.mohamed.eslam/ |
| Hassan Gabr "The Gorilla" | coach (Gorilla Fit app) | Cairo-born, Dubai-based | https://hassangabr.com/ (blocks bots; WhatsApp support advertised in-app) |
| Zeina Kassas | coach (women/moms, Rahet Bally TD) | Cairo | https://www.instagram.com/coachbigzee/ |
| Rana El Hariri | coach (women's programs) | Cairo | https://www.instagram.com/ranaelhariri/ |
| Karim Dash (Dash Fitness) | coach/influencer | Cairo | https://www.instagram.com/karimdash/ |
| Sam Samouny | coach (ISSA online) | Cairo | https://www.instagram.com/samsamouy/ |
| Mahmoud Ezz | coach (LA7 chief coach) | Cairo | https://www.instagram.com/mahmoud_ezz_11/ |
| Amr Reda (Remove challenge / MOVE Egypt) | coach | Cairo | https://www.instagram.com/amrrreda/ |
| Muhammad Deeb | coach | Cairo | https://www.instagram.com/dr.deeb_/ |
| Allaa Ashmawii (Train with Ash) | coach | Cairo | https://www.instagram.com/ashmawiii/ |
| Ahmed Kamal (Z Fitness Studio) | coach | Cairo | https://www.instagram.com/ahmedkamal_k/ |
| Ali Abughaben | coach (home/functional) | Cairo | https://www.instagram.com/ali_abughaben/ |
| Mohamed Hany | coach | Cairo | https://www.instagram.com/mohamedhany_pro/ |
| Youssef Sawaby | coach (12-week natural transformation) | Cairo | https://www.instagram.com/youssefsawaby/ |
| Ahmed Fayek | coach (Zoom group training) | Cairo | https://www.instagram.com/ahmed_fayek/ |
| Nour El Ganzoury (Eatducate) | influencer (nutrition) | Cairo | https://www.instagram.com/eatducate/ |
| Maye Noureldin | coach (calisthenics/pole, women) | Cairo | https://www.instagram.com/mayenoureldin/ |
| Yara Zohairy | coach (LA7, online) | Cairo | https://www.instagram.com/yarazoheiry/ |
| Dania Abd El Kader (The Barn / Airon) | coach (online, women) | Cairo | https://www.instagram.com/daniaabdelkader/ |
| Salma Taha (MOVE Egypt) | coach (online, women) | Cairo | https://www.instagram.com/salmatahaaaa/ |
| Aya Aqil (Core Egypt) | coach (online, women) | Cairo | https://www.instagram.com/aya_aqil/ |
| Loai Abdelkader (11.3K YT) | coach/influencer | Alexandria | https://www.instagram.com/loai_abdelkader/ |
| Karima Gaafar (91K YT) | influencer (fitness/dance) | Cairo | https://www.youtube.com/@karimagaafar9652 |
| Sarah "The Unicorn" (Ironlifters) | coach (functional + nutrition) | Cairo | https://www.instagram.com/sarah_theunicorn/ |
| Ingy Sweid | coach (women, pre/post-natal — NOTE: now Dubai-based) | Dubai/Cairo | https://ingy-sweid.zbooni.com/ |

Women's-fitness outreach shortlist (underserved segment, per task): Miracle Nassif, Dr. Shorouk Saeed, Zeina Kassas, Rana El Hariri, Maye Noureldin, Dania Abd El Kader, Salma Taha, Aya Aqil, Sarah The Unicorn, Farah Nofal + Libra Sport (modest-sportswear sponsor fit).

---

## 3. Sources

[V] = contact page fetched directly during this sweep. (snippet) = contact taken from a search-result snippet of the named site/directory — re-verify before first email blast.

| Prospect | Source URL | Verified |
|---|---|---|
| iFIT | https://ifit-eg.com/ | [V] |
| MF Supplements | https://mfsupps.com/contact-us/ | [V] |
| Max Muscle Elite | https://www.maxmuscleelite.com/ | [V] |
| House of Supplements | https://houseofsupplements.com/ | [V] |
| Super Supplement | https://super-eg.com/ | [V] |
| Dragon Pharma Egypt | https://dragonpharmaegypt.com/ | [V] |
| TSS The Supplement Shop | https://hotlines.tel/en/sps/1720 (site tssegypt.com unreachable at sweep time) | (snippet) |
| Sports Mall | https://sportsmallegypt.com/ | (snippet — email+phone from site via search result) |
| Entercise | https://entercise.com/ | [V] |
| Blue Shell Sport | https://www.blueshellsport.com/ | [V] |
| Athlete Home | https://athletehome-eg.com/en | [V] |
| Power Fit Supplements | https://www.powerfitsupplements.com/ | [V] |
| Life Supplements | https://lifesupplementseg.com/ | [V] (no contact published) |
| Protein House Egypt | https://proteinhouseeg.com/ | [V] (no contact published) |
| Garage Gear | https://www.instagram.com/garage.gear/ | (snippet) |
| ASN Egypt | https://www.asnegypt.com/ | [V] |
| Sigma Fit | https://sigmafiteg.com/pages/contact-us | [V] |
| Abu Auf | https://www.abuauf.com/en/contact-us | [V] |
| Juhayna | https://www.juhayna.com/contact-us/ + https://identity-mag.com/let-the-energy-out-juhayna-zabado-sponsors-cairo-runners-half-marathon/ | [V] |
| Organix | https://organix-eg.com/ | [V] |
| Magma Sportswear | https://www.magmasportswear.com/ | [V] |
| Libra Sport | https://libra-sportswear.com/pages/our-stores | [V] |
| PureGanic | https://pureganic-eg.com/ | (snippet — email from site snippet; contact page JS-only on fetch) |
| KICK Nutrition | https://www.kicknutritionegypt.com/ | [V] (pre-launch, no contact) |
| Beast Protein Bar | https://sceneeats.com/Fresh/Egyptian-Brand-Launches-Vegan-Protein-Bars + https://www.instagram.com/beast.eg/ | (snippet) |
| Cairo Runners | https://www.cairorunners.com/ | [V] |
| The TriFactory | https://www.thetrifactory.com/ | [V] |
| Egyptian Marathon | https://www.egyptianmarathon.com/ | [V] |
| ELFIT / In The Zone Sports | https://www.elfiteg.com/about-us/ (fetched, no contact on page) + info@elfiteg.com via https://www.zoominfo.com/p/Adam-Elzoghby/2090025788 search snippet | (snippet) |
| Cairo Fitness Expo | https://www.cairofitnessexpo.com/ | [V] |
| Sports Events Egypt | https://www.sportseventsegypt.com/contact/ | [V] |
| Alex Runners / Maadi Runners | https://www.instagram.com/alexrunners/ + https://www.facebook.com/maadirunner/ | (snippet) |
| Alameda Tri Team / Wadi Ibex | https://www.sportseventsegypt.com/clubs/ | [V] (directory page) |
| Miracle Nassif | https://miraclenassif.com/contact/ | [V] |
| Aly Mazhar / BeFit 360 | https://www.befiteg.com/ourstory | [V] |
| Dietitian Yassin | https://dietitianyassin.com/ | [V] |
| HIT Egypt | https://www.hitegypt.com/our-team | [V] |
| XFIT Tribe | https://xfittribe.com/ | [V] |
| KAJ Fitness Platform | https://kaj.fitness/ | [V] |
| Farah Nofal | https://identity-mag.com/farah-nofal-yoga-instructor-and-the-founder-of-eden-wellness/ (email in article; farahnofal.com DNS-dead at sweep time) | (snippet) |
| Dr. Shorouk Saeed Badr | https://athletehome-eg.com/en/pages/dr-shorouk-saeed-badr | [V] |
| Coach page-only list | https://cairogyms.com/34-egyptian-health-bloggers-to-boost-your-wellness-fitness-journey-with/ + https://cairogyms.com/top-online-fitness-programs-to-reach-your-2020-goals/ + https://cairogyms.com/40-egyptian-empowering-women-to-follow-on-instagram-in-2025/ + https://www.heepsy.com/top-youtube/fitness/cairo | [V] (aggregator articles fetched) |
| Fouad Ahmed / Mohamed Eslam | https://www.instagram.com/fouadahmedfitt/ + https://www.instagram.com/coach.mohamed.eslam/ | (snippet) |
| Hassan Gabr | https://hassangabr.com/ (403 to bots) + https://cairoscene.com/buzz/gorilla-fit-is-the-new-concept-egyptian-app-making-fitness-accessible | (snippet) |
| Zeina Kassas | https://www.instagram.com/coachbigzee/ (a search hit also claimed info@zeinakassas.com but zeinakassas.com is DNS-dead — treat as unverified, use IG) | (snippet) |

Excluded on purpose: Amazon.eg / Noon (marketplaces), Dr. Nutrition (UAE chain), Decathlon / Go Sport / Skechers (international), IRONMAN 70.3 Egypt (IRONMAN Group), Sheeli Nafsik (Saudi), Welnes (competitor app), gyms & studios (covered in PROSPECTS-STARTER.md; Tycoons Fitness, Samia Allouba, ROW.IN etc. skipped as gyms).
