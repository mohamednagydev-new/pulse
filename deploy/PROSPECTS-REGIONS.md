# PULSE Prospects — Regional Egypt (outside Greater Cairo)

**Date:** 2026-08-24
**Pitch:** PULSE free member-retention toolkit for local independent gyms.
**Coverage:** Alexandria (deep: Miami, Smouha, Sidi Gaber, Agami/Bitash/Hannoville, Mandara, Montazah, Glim, Kafr Abdo, Sidi Bishr), Zagazig, Ismailia, Port Said, Suez, Damietta, Kafr El-Sheikh, Menoufia (Shibin El-Kom), Beni Suef, Minya, Assiut, Sohag, Luxor, Aswan, Hurghada, Sharm El-Sheikh. **60 gyms.**

**Method & rules:**
- Session WebSearch quota was exhausted, so everything below comes from **directly fetched live pages** (Egypt Yellow Pages search/profile pages + its public phones endpoint, OpenStreetMap via the Overpass API, and Facebook pages fetched with a crawler user-agent). Nothing is fabricated; every row's `notes` field is the one canonical source URL the data was taken from.
- Public business contact info only (published directory phones / public pages).
- Local independents only. Excluded: international/national chains (Gold's, World Gym, Fitness First, Snap Fitness, City Club, Monkeynastix), hotel/resort health clubs in Hurghada/Sharm, and Cairo/Giza rows that matched on street names (e.g. "Gesr El Suez St.").
- Rows already on the sibling starter list (Premiere, Leader, Eagle, Smart Gym Alexandria; Mansoura/Tanta gyms) are **not repeated** here.
- Phone numbers are copied exactly as published by the source (local Egyptian formats). Empty email/phone fields mean the source publishes none — those rows carry their page URL in notes.
- **Qena:** no verifiable local gym listing was found in any accessible source (Yellow Pages has none in Qena governorate; OSM has zero mapped gyms there). Left out rather than guessed.

## Prospect CSV

```csv
name,org,type,email,phone,notes
Score Gym,Score Gym Miami Alexandria,gym,,03-5532-685 / 0102-6000-782,https://yellowpages.com.eg/en/profile/score/463485
Super Gym Club,Super Gym Club Miami Alexandria,gym,,03-5547-116,https://yellowpages.com.eg/en/profile/super-gym-club/219479
Professional Gym,Professional Gym Smouha Alexandria,gym,,03-4202-779 / 0100-5116-677,https://yellowpages.com.eg/en/profile/professional-gym/469053
International Gymnastics Center,International Gymnastics Center Sidi Gaber Alexandria,gym,,03-4209-372,https://yellowpages.com.eg/en/profile/international-gymnastics-center/184684
Academy Gym,Academy Gym El Mandara Alexandria,gym,,03-5544-321,https://yellowpages.com.eg/en/profile/academy-gym/186726
Max Gym,Max Gym El Mandara Alexandria,gym,,0109-7879-981,https://yellowpages.com.eg/en/profile/max-gym/695379
Friends Gym,Friends Gym El Mandara Alexandria,gym,,0122-7431-828 / 0106-5505-090,https://yellowpages.com.eg/en/profile/friends-gym/253549
Holiday Gym,Holiday Gym El Nakhil Agami Alexandria,gym,,0100-5251-007,https://yellowpages.com.eg/en/profile/holiday-gym/509068
Menhaten Gym,Menhaten Gym El Bitash Agami Alexandria,gym,,03-3080-385,https://yellowpages.com.eg/en/profile/menhaten-gym/227988
Try Gym,Try Gym El Bitash Agami Alexandria,gym,,03-4333-116,https://yellowpages.com.eg/en/profile/try-gym/228066
Winner Gym,Winner Gym Hannoville Agami Alexandria,gym,,0128-9887-676,https://yellowpages.com.eg/en/profile/winner-gym/333247
Fit Zone Gym,Fit Zone Gym Glim Alexandria,gym,,03-5861-726 / 0100-2738-764,https://yellowpages.com.eg/en/profile/fit-zone-gym/580590
The Hit Fitness Center,The Hit Fitness Center Kafr Abdo Alexandria,gym,,03-5466-443 / 0111-3599-043,https://yellowpages.com.eg/en/profile/the-hit-fitness-center/668018
Aifu Gym,Aifu Gym El Montazah Alexandria,gym,,03-5800-203 / 0111-1567-479,https://yellowpages.com.eg/en/profile/aifu-gym/313775
Dragon Gym,Dragon Gym Sidi Bishr Alexandria,gym,,0122-2464-175,https://yellowpages.com.eg/en/profile/dragon-gym/233143
Gym Squad,Gym Squad Zagazig Sharqia,gym,,,https://www.facebook.com/gymsquadzag/
Active Gym,Active Gym Zagazig Sharqia,gym,,0106-8421-219,https://yellowpages.com.eg/en/profile/active-gym/543923
Doctor Gym,Doctor Gym Zagazig Sharqia,gym,,0122-9073-012,https://yellowpages.com.eg/en/profile/doctor-gym/327625
Royal Gym,Royal Gym Zagazig Sharqia,gym,,0102-5144-442 / 0106-6638-785,https://yellowpages.com.eg/en/profile/royal-gym/439144
Skyfit Gym,Skyfit Gym Zagazig Sharqia,gym,,0120-0803-202,https://yellowpages.com.eg/en/profile/skyfit-gym/697875
El Safwa Gym,El Safwa Gym El Afrang Ismailia,gym,,0100-9337-741,https://yellowpages.com.eg/en/profile/el-safwa-gym/291451
Golden Gym,Golden Gym El Afrang Ismailia,gym,,0100-5669-422,https://yellowpages.com.eg/en/profile/golden-gym/291283
Hero Gym,Hero Gym El Afrang Ismailia,gym,,0122-1191-418,https://yellowpages.com.eg/en/profile/hero-gym/290983
Stadium Gym,Stadium Gym Araisheyat Ismailia,gym,,064-3112-222 / 0109-9455-657,https://yellowpages.com.eg/en/profile/stadium-gym/619301
CrossFit Proactive,CrossFit Proactive El Shark Port Said,gym,,0120-7949-978,https://yellowpages.com.eg/en/profile/crossfit-proactive/511798
El Amrikeya Gym,El Amrikeya Gym El Shark Port Said,gym,,0109-9872-820,https://yellowpages.com.eg/en/profile/el-amrikeya-gym/316433
Grand Gym,Grand Gym El Shark Port Said,gym,,0100-0480-038,https://yellowpages.com.eg/en/profile/grand-gym/315909
Tabarak Gym,Tabarak Gym Port Fouad Port Said,gym,,0122-5741-671,https://yellowpages.com.eg/en/profile/tabarak-gym/379990
Master Gym,Master Gym Port Said,gym,,,https://www.facebook.com/100085850007298/
The Rock Gym,The Rock Gym El Nemsa Suez,gym,,0106-1251-187,https://yellowpages.com.eg/en/profile/the-rock-gym/297158
Wadi El Nil Gym,Wadi El Nil Gym El Arbeen Suez,gym,,0100-2761-919 / 0100-7035-920,https://yellowpages.com.eg/en/profile/wadi-el-nil/295460
Fitness Gym,Fitness Gym El Sayala Damietta,gym,,0109-9001-355,https://yellowpages.com.eg/en/profile/fitness-gym/510618
Team Fitness,Team Fitness Corniche El Nil Damietta,gym,,0109-6000-119 / 0100-4735-868,https://yellowpages.com.eg/en/profile/team-fitness/507078
The Show Gym,The Show Gym Bab El Haras Damietta,gym,,0106-3205-171,https://yellowpages.com.eg/en/profile/the-show-gym/503467
We Can Gym,We Can Gym Damietta,gym,,0100-2076-585,https://yellowpages.com.eg/en/profile/we-can-gym/506745
Samoo Gym,Samoo Gym Ezbet El Borg Damietta,gym,,057-2702-292 / 0122-5863-396,https://yellowpages.com.eg/en/profile/samoo-gym/602172
Royal Gym,Royal Gym Downtown Kafr El-Sheikh,gym,,0102-0555-597 / 0100-9111-946,https://yellowpages.com.eg/en/profile/royal-gym/344572
Master Center,Master Center Downtown Kafr El-Sheikh,gym,,047-3215-650 / 0106-5481-088,https://yellowpages.com.eg/en/profile/master-center/345149
Oxygen Gym,Oxygen Gym Disuq Kafr El-Sheikh,gym,,0120-4898-837,https://yellowpages.com.eg/en/profile/oxygen-gym/667280
Hero Gym,Hero Gym Beilla Kafr El-Sheikh,gym,,0122-2511-148 / 0100-7403-638,https://yellowpages.com.eg/en/profile/hero-gym/364120
Golden Gym,Golden Gym Kaleen Kafr El-Sheikh,gym,,0114-3043-877,https://yellowpages.com.eg/en/profile/golden-gym/359367
Noamany Fitness Center,Noamany Fitness Center Shibin El-Kom Menoufia,gym,,0109-991-3601,https://www.openstreetmap.org/node/10300017209
Heroes Gym,Heroes Gym Shibin El-Kom Menoufia,gym,,0112-455-5527,https://www.openstreetmap.org/node/10300005709
Power House & Muscles,Power House & Muscles Shibin El-Kom Menoufia,gym,,+201060760385,https://www.openstreetmap.org/node/10991148305
M Fitness Studio,M Fitness Studio Shibin El-Kom Menoufia,gym,,,https://www.openstreetmap.org/node/10299509109
Fitness Beat,Fitness Beat Shibin El-Kom Menoufia,gym,,,https://www.openstreetmap.org/node/9826478817
Beni Suef Sporting Club Gym,Beni Suef Sporting Club Gym Beni Suef,gym,,,https://www.openstreetmap.org/node/4515929390
Lady Gym,Lady Gym Abou Qurqas Minya,gym,,0102-5724-666,https://yellowpages.com.eg/en/profile/lady-gym/314780
Godzilla Gym,Godzilla Gym Assiut,gym,,,https://www.openstreetmap.org/node/13324226904
Platinum Gym,Platinum Gym Sohag,gym,,0127-6595-066,https://yellowpages.com.eg/en/profile/platinum-gym/667289
Seeba Gym,Seeba Gym Luxor,gym,,095-2871-601,https://yellowpages.com.eg/en/profile/seeba-gym/216032
Rock Gym,Rock Gym Aswan,gym,,,https://www.openstreetmap.org/node/11697715428
International Gym,International Gym Aswan,gym,,,https://www.openstreetmap.org/node/11697715437
Star Gym,Star Gym El Kawther Hurghada,gym,,0109-9090-901 / 065-3453-584,https://yellowpages.com.eg/en/profile/star-gym/314770
Platinum Gym,Platinum Gym Sekala Hurghada,gym,,0101-0585-036 / 0101-0838-120,https://yellowpages.com.eg/en/profile/platinum-gym/667288
Golden Moon Gym,Golden Moon Gym Dahar Hurghada,gym,,0121-1507-105,https://yellowpages.com.eg/en/profile/golden-moon/675738
Cleopatra Gym,Cleopatra Gym El Hadaba Hurghada,gym,,065-3404-112 / 065-3442-235,https://yellowpages.com.eg/en/profile/cleopatra/237426
Saya World,Saya World Fitness Complex Sekala Hurghada,gym,,0100-0487-200,https://yellowpages.com.eg/en/profile/saya-world/688169
Sharm Center Gym,Sharm Center Gym Tower Bay Sharm El-Sheikh,gym,,069-4660-261,https://yellowpages.com.eg/en/profile/sharm-center/215903
City Gym,City Gym Sharm El-Sheikh,gym,,,https://www.openstreetmap.org/node/10660995153
```

## Per-city counts

| City | Rows | Primary source |
|---|---|---|
| Alexandria | 15 | Yellow Pages |
| Zagazig | 5 | Yellow Pages + Facebook/OSM |
| Ismailia | 4 | Yellow Pages |
| Port Said | 5 | Yellow Pages + Facebook/OSM |
| Suez | 2 | Yellow Pages |
| Damietta | 5 | Yellow Pages |
| Kafr El-Sheikh | 5 | Yellow Pages |
| Menoufia (Shibin El-Kom) | 5 | OpenStreetMap |
| Beni Suef | 1 | OpenStreetMap |
| Minya | 1 | Yellow Pages |
| Assiut | 1 | OpenStreetMap |
| Sohag | 1 | Yellow Pages |
| Luxor | 1 | Yellow Pages |
| Aswan | 2 | OpenStreetMap |
| Hurghada | 5 | Yellow Pages |
| Sharm El-Sheikh | 2 | Yellow Pages + OSM |
| Qena | 0 | nothing verifiable found |
| **Total** | **60** | |

## Sources

[V] = page/API response directly fetched during this research session (2026-08-24).

| # | Source | What it provided | Fetched |
|---|---|---|---|
| 1 | https://yellowpages.com.eg/en/search/gym (all 61 result pages, p1-p61) | Names, addresses/districts, profile URLs for 1,153 gyms nationwide; filtered to target cities | [V] |
| 2 | https://yellowpages.com.eg/en/getPhones/{id}/false (public phones endpoint, one call per matched gym) | Published phone numbers for all 140 city-matched YP gyms | [V] |
| 3 | Yellow Pages profile pages (the per-row URLs in notes; spot-verified: score/463485 "Score, Miami — Gym"; seeba-gym/216032 "Seeba Gym, Luxor — Gym"; platinum-gym/667289 "Platinum Gym, Sohag — Gym"; skyfit-gym/697875 "Skyfit Gym, El Zagazig — Gym"; sharm-center/215903 "Sharm Center, Tower Bay — Gym") | Row-level canonical citations | [V] |
| 4 | Overpass API (https://overpass-api.de/api/interpreter) over OpenStreetMap, leisure=fitness_centre + gym-name queries, city and governorate bounding boxes for all 17 target areas | OSM-sourced rows (Shibin El-Kom, Aswan, Assiut, Beni Suef, Sharm, plus FB links below); per-row citation is the OSM element URL | [V] |
| 5 | https://www.facebook.com/gymsquadzag/ (page title confirmed: "GYM SQUAD - Zagazig") | Verified active FB page for Gym Squad Zagazig | [V] |
| 6 | https://www.facebook.com/100085850007298/ (page title confirmed: "Master gym - Port Said") | Verified active FB page for Master Gym Port Said | [V] |
| 7 | https://sayaworld.com/ (title: "SAYA WORLD - Health, Fitness, Social and Leisure Complex") | Confirmed Saya World Hurghada is live/local | [V] |
| 8 | http://www.aifualex.com/ (title: "Aifu Resort") | Confirmed Aifu Alexandria is a local operation (resort with public gym) | [V] |

**Verification caveats (honest flags):**
- OSM-sourced rows without phones (Master Gym has FB instead; M Fitness Studio, Fitness Beat, Beni Suef SC, Godzilla, Rock Gym, International Gym, City Gym have map listing only) are lower-confidence leads — walk-in / Facebook-first outreach.
- facebook.com/MisterGymAlexandria (from an OSM tag) was fetched but now titles as a different page ("Gym Fit"), so that gym was **excluded** rather than risk a wrong row.
- Search engines (Bing, DuckDuckGo, Brave, Startpage, Yahoo, SearXNG instances) all served bot-blocked or degraded results this session, so no rows are based on search snippets — only on the fetched pages above.
