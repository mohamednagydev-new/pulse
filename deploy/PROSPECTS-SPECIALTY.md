# PULSE — Specialty Fitness Prospects (CrossFit / Ladies / Combat / Padel / Physio / Nutrition)

Compiled: 2026-08-24 — via live web search + direct site fetches.
Siblings: `PROSPECTS-STARTER.md` (general gyms), `PROSPECTS-PARTNERS.md` (stores/sponsors/events/coaches). No overlap intended.

Categories covered:
1. CrossFit boxes & functional-training studios (Cairo + Alexandria)
2. Ladies-only gyms & women's studios (priority segment)
3. Boxing / MMA / martial-arts gyms
4. Padel & racquet clubs (squash note below)
5. Physiotherapy & sports-injury clinics (referral fit for limitation-aware training)
6. In-person nutrition / diet clinics

Rules followed:
- Every row comes from a page actually found during this sweep — nothing invented. The `notes` column holds ONE canonical source/channel URL per row.
- Only publicly listed business contact info (site contact pages, published hotlines/emails). Businesses with no public phone/email are included with their page URL as the outreach channel.
- Local Egyptian businesses only — international franchises (F45, Gold's, World Gym, Curves…) excluded; venues hosted inside franchise gyms kept only when the operator is local.
- Phones normalized to +20 where the source showed a local mobile number; short hotlines kept as-is.

Honesty notes on category depth:
- **Squash:** standalone bookable squash venues with public contacts did not surface — Egyptian squash lives inside members' sporting clubs. The segment is represented by Wadi Degla (club chain hotline) and the padel clubs, several of which sit inside sporting clubs.
- **Nutrition clinics:** thinner than other categories (4 rows) — Egyptian clinical nutrition is dominated by individual doctors on booking platforms (Vezeeta/CliniDo), which the sibling online-dietitian list covers.
- Pitch angle per segment: boxes/studios & combat gyms → invite codes + retention; ladies gyms → priority partner pages; padel clubs → deals placement to an affluent audience; physio & nutrition clinics → referral fit with PULSE's limitation-aware training.

---

## 1. Import CSV (Growth dashboard)

Format: `name,org,type,email,phone,notes` — type ∈ gym | store | other; notes = source URL.

```csv
CrossFit Stars,CrossFit Stars Egypt — Swan Lake New Cairo (first box in Egypt),gym,,+201090061161,https://cairogyms.com/top-10-crossfit-locations-in-cairo/
CrossFit Engine38,Engine38 — Sodic Westown Hub Beverly Hills,gym,,+201007378175,https://cairogyms.com/top-10-crossfit-locations-in-cairo/
TD Athletics,TD Athletics — Zamalek / New Cairo / Sheikh Zayed,gym,,+201027285560,https://cairogyms.com/top-10-crossfit-locations-in-cairo/
CrossFit Monkey Bars,Monkey Bars — New Cairo (Elite Education campus),gym,,+201066738843,https://cairogyms.com/top-10-crossfit-locations-in-cairo/
CrossFit Hitters,Hitters — Heliopolis Club / El Orouba St,gym,,+201000450010,https://cairogyms.com/top-10-crossfit-locations-in-cairo/
CrossFit Hustle,Hustle — Bandar Mall New Maadi,gym,,+201002723966,https://cairogyms.com/top-10-crossfit-locations-in-cairo/
Silver Giant CrossFit,Silver Giant — Heliopolis + New Cairo,gym,,+201223911405,https://cairogyms.com/top-10-crossfit-locations-in-cairo/
CrossFit Pharaohs,Pharaohs — Nehro St Heliopolis,gym,,+201007979008,https://cairogyms.com/top-10-crossfit-locations-in-cairo/
Ignite Egypt,Ignite group training — Club7 Maadi / Almaza / Lakeview / Point90,gym,,,https://cairogyms.com/top-23-crossfit-and-group-training-hubs-in-town-2021/
BeFit 360,BeFit 360 functional training — 8 branches incl Alexandria & North Coast,gym,,,https://cairogyms.com/top-23-crossfit-and-group-training-hubs-in-town-2021/
The Fitness Grind,Fitness Grind — Trivium Complex + Sporting Club Alexandria,gym,,,https://cairogyms.com/top-23-crossfit-and-group-training-hubs-in-town-2021/
Lift Gym,Lift Gym — first hybrid gym in Alexandria,gym,,,https://www.instagram.com/liftgymegypt
FitZone Ladies Only,FitZone Egypt Ladies Only Gym & Fitness Center,gym,,+201010900829,https://www.facebook.com/@fitzoneladiesonly/
Your Gym For Ladies,Your Gym — Nasr City / Dokki / New Cairo,gym,,+201009111151,https://cairogyms.com/tag/women-only/
HIT CLAN,HIT CLAN women-only studios — Suncity Mall / Concorde El Salam,gym,,+201096498452,https://cairogyms.com/tag/women-only/
Eve's Gym,Eve's Gym Ladies Only + EMS — Nozha Cairo,gym,info@evegym.com,+201224444714,https://evegym.com/
HERS Gym,HERS ladies gym — Zamalek + 4 more branches,gym,,+201028028454,https://www.cairo360.com/article/health-fitness/5-fitness-centres-with-ladies-only-options/
Infinity Fitness,Infinity Fitness Ladies Only Gym & Spa — Maadi,gym,,+201111776670,https://www.cairo360.com/article/health-fitness/5-fitness-centres-with-ladies-only-options/
Cairo Gym For Ladies,Cairo Gym For Ladies — Nasr City,gym,,+201010004333,https://www.cairo360.com/article/health-fitness/5-fitness-centres-with-ladies-only-options/
Samia Allouba,Samia Allouba Gym Dance & Fitness — Maadi (ladies-only classes),gym,,+201112238864,https://www.cairo360.com/article/health-fitness/5-fitness-centres-with-ladies-only-options/
Vibes Ladies Fitness,Vibes Ladies GYM & Wellness Center — New Cairo,gym,,+201091445664,https://www.cairo360.com/article/health-fitness/5-fitness-centres-with-ladies-only-options/
Fitbox,Fitbox boxing gym — Maskan Sheraton Heliopolis,gym,,+201022050000,https://cairogyms.com/top-8-boxing-and-mma-locations-in-cairo/
Fight and Fitness Factory,F3 Egypt — Arkan 6th of October,gym,,+201280501070,https://cairogyms.com/top-8-boxing-and-mma-locations-in-cairo/
Boxing Academy,Boxing Academy (founder Mohamed Reda) — Mokattam / Rehab / Shorouk,gym,,+201061010088,https://cairogyms.com/top-8-boxing-and-mma-locations-in-cairo/
The Fight Zone,Fight Zone Egypt — Mall 66 5th Settlement,gym,,+201227055962,https://cairogyms.com/top-8-boxing-and-mma-locations-in-cairo/
TapouT Fighting Club,TapouT — Abdul Aziz Fahmi Heliopolis + Golds Sheraton,gym,,+201204417073,https://cairogyms.com/top-8-boxing-and-mma-locations-in-cairo/
SK Martial Arts Academy,SK MMA / Kickboxing / Muay Thai — Mohandessin + Dokki (est 2018),gym,,+201274499972,https://sk-martialarts.com/
S&B Academy,S&B Boxing & MMA Academy — El-Nozha + New Cairo (1000+ students),gym,,+201040478908,https://sbfight.com/
Team Hashash,Kickboxing academy of champion Mahmoud El Hashash — Sheikh Zayed (BSE + Clubliko),gym,info@teamhashash.com,+201010381392,https://teamhashash.com/
Fight Club Egypt,Fight Club Egypt — 6 combat disciplines / 500+ trainees,gym,fclubegypt@gmail.com,+201273494347,https://fclubegypt.com/
Go Padel,Go Padel — Katameya Heights / Madinaty / Rehab,gym,,+201159005500,https://www.nawy.com/blog/122536-21-padel-courts-in-egypt-with-prices-locations
Cairo Padel,Cairo Padel — Park Mall New Cairo + Mountain View Hyde Park,gym,,+201067530303,https://www.nawy.com/blog/122536-21-padel-courts-in-egypt-with-prices-locations
J Padel,J Padel — Swan Lake 1st Settlement,gym,,+201005605300,https://www.nawy.com/blog/122536-21-padel-courts-in-egypt-with-prices-locations
SR Padel,SR Padel — Club 7 The Field Maadi + NIS Shorouk + Azha Sokhna,gym,,+201119947790,https://www.nawy.com/blog/122536-21-padel-courts-in-egypt-with-prices-locations
Padel Up Elite,Padel Up Elite — Street 250 Maadi,gym,,+201011001615,https://www.nawy.com/blog/122536-21-padel-courts-in-egypt-with-prices-locations
The Padel Zone,Padel Zone — Almaza Heliopolis (3 courts),gym,,+201125520530,https://www.nawy.com/blog/122536-21-padel-courts-in-egypt-with-prices-locations
Padel Point,Padel Point — Talaaea Sporting Club Nasr City,gym,,+201120717722,https://www.nawy.com/blog/122536-21-padel-courts-in-egypt-with-prices-locations
The Padel Club,Padel Club — Galleria40 Sheikh Zayed,gym,,+201001122422,https://www.nawy.com/blog/122536-21-padel-courts-in-egypt-with-prices-locations
Wadi Degla Clubs,Wadi Degla local sporting-club chain (racquet sports) — HQ Zahraa El Maadi,gym,,19917,https://www.wadidegla.com/
INSPIRE Clinic,INSPIRE Physical Therapy & Sports Injury — Heliopolis + Cairo Stadium,other,,+201200777828,https://inspirephysioclinic.com/
PhysioFit,PhysioFit physiotherapy — inside Z-Fitness Sheraton + World Gym New Cairo,other,info@physiofiteg.com,+201005577889,https://physiofiteg.com/
Fizik Center,Fizik sports rehab & spine — Sheraton / Sheikh Zayed / Nasr City / Mansoura,other,,,https://fizikeg.com/
PhysioEgypt,PhysioEgypt clinics — Sheikh Zayed + Maadi,other,Physioegypt@gmail.com,+201009899785,https://physioegyptclinics.com/
PhysioTech Clinic,PhysioTech sports injury & rehab — Maadi,other,physiotecheg@gmail.com,+201555385057,https://physiotechclinic.com/
Alnada Center,Alnada Physical Therapy & Women's Health (Dr Reham Hamed) — New Cairo + Manial,other,info@alnadaclinic.com,+201061236916,https://alnadaclinic.com/
Dr Ramy Atia Physio,Sports-injury rehab / dry needling — Cairo & Giza,other,,,https://drramyatiaphysio.com/
Oasis Clinics Nutrition,Oasis Clinics nutrition dept — Sheikh Zayed / New Cairo / North Coast,other,,+201004000777,https://oasisclinics.com/clinics/nutrition/
101 Clinics Nutrition,101 Clinics nutrition dept — LaMirada Plaza New Cairo,other,info@101clinics.com,+201118070701,https://101clinics.com/nutritionist-near-me/
The Nutrition Clinic,Clinical dietitian & food scientist clinic — Cairo,other,,,https://www.facebook.com/thenutritionclinic.eg/
Cairo Diet Clinic,Dr Mohamed Mansour nutrition clinic (Cairo University professor),other,,,https://www.instagram.com/cairodietclinic/
```

50 rows: 12 CrossFit/functional (3 Alexandria) · 9 ladies-only · 9 combat · 9 padel/club · 7 physio · 4 nutrition.

---

## 2. Sources

[V] = page fetched directly during this sweep. Others surfaced in search results with details quoted in the result listing.

| Source | Used for | [V] |
|---|---|---|
| https://cairogyms.com/top-10-crossfit-locations-in-cairo/ | 8 CrossFit boxes + phones | [V] |
| https://cairogyms.com/top-23-crossfit-and-group-training-hubs-in-town-2021/ | Ignite / BeFit 360 / Fitness Grind (Alexandria) + 20 more studio names | [V] |
| https://cairogyms.com/tag/women-only/ | Your Gym For Ladies + HIT CLAN phones | [V] |
| https://cairogyms.com/top-8-boxing-and-mma-locations-in-cairo/ | Fitbox / F3 / Boxing Academy / Fight Zone / TapouT phones | [V] |
| https://www.cairo360.com/article/health-fitness/5-fitness-centres-with-ladies-only-options/ | HERS / Infinity / Cairo Gym / Samia Allouba / Vibes phones | [V] |
| https://www.cairo360.com/article/health-fitness/7-places-to-play-padel-in-cairo/ | Padel venue cross-check (UPadel / Go! Padel / Padel One) | [V] |
| https://www.nawy.com/blog/122536-21-padel-courts-in-egypt-with-prices-locations | 21 padel clubs with phones + prices | [V] |
| https://evegym.com/ | Eve's Gym contact | [V] |
| https://hersegypt.com/ | HERS branches confirmation | [V] |
| https://sk-martialarts.com/ | SK Martial Arts contact | [V] |
| https://sbfight.com/ | S&B Academy contact | [V] |
| https://teamhashash.com/ | Team Hashash contact | [V] |
| https://fclubegypt.com/ | Fight Club Egypt contact | [V] |
| https://statspros.com/best-mma-gyms-in-cairo-egypt/ | MMA scene cross-check (Egyptian Top Team etc — no public contacts) | [V] |
| https://inspirephysioclinic.com/ | INSPIRE contact | [V] |
| https://physiofiteg.com/ | PhysioFit contact | [V] |
| https://fizikeg.com/ | Fizik branches | [V] |
| https://physioegyptclinics.com/ | PhysioEgypt contact | [V] |
| https://physiotechclinic.com/ | PhysioTech contact | [V] |
| https://alnadaclinic.com/ | Alnada contact | [V] |
| https://oasisclinics.com/clinics/nutrition/ | Oasis nutrition contact | [V] |
| https://101clinics.com/nutritionist-near-me/ | 101 Clinics nutrition contact | [V] |
| https://www.wadidegla.com/ | Wadi Degla hotline 19917 | [V] |
| https://www.instagram.com/liftgymegypt | Lift Gym Alexandria channel | |
| https://www.facebook.com/@fitzoneladiesonly/ | FitZone channel + phone (from search listing) | |
| https://www.facebook.com/thenutritionclinic.eg/ | The Nutrition Clinic channel | |
| https://www.instagram.com/cairodietclinic/ | Cairo Diet Clinic channel | |
| https://drramyatiaphysio.com/ | Dr Ramy Atia channel (from search listing) | |

Caveats found during verification:
- `samiaallouba.com` is dead (parked blog) — the Cairo360 phone + Facebook page are the working channels.
- PhysioFit's listed New Cairo number (+201234567890) is an obvious site placeholder — only the Sheraton number is included.
- Oasis and SK emails are bot-obfuscated on their sites — phone/contact-form outreach instead.
