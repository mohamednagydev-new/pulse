# PULSE — Revenue without charging users

The app is **free for all users**. Revenue comes from partners, not user subscriptions. Ranked by how quickly each can turn on.

## Built into the app now
1. **Sponsored ads / brand placements** — `Banner` records with `section` + `url`.
   - `home_sponsor` → clickable banner on Home (the "adidas"-style slot).
   - `feed_ad` → native sponsored card inside the Community feed.
   - Manage in **Admin → Banners / Ads** (title, image, link). Sell these slots to fitness brands.
2. **Affiliate commissions** — every recipe can carry a **"Shop ingredients"** link (`affiliateUrl`), and the model supports gear links on exercises. Use Amazon Associates, iHerb, instacart/meal-kit, or equipment affiliate programs → earn per click/sale. Manage in **Admin → Recipes**.
3. **Sponsored challenges** — a `Challenge` can have a `sponsorName` + `sponsorUrl` ("Sponsored by X"). Brands pay to sponsor a 30-day challenge and reach engaged users. Manage in **Admin → Challenges**.

4. **Store & catalog placement** — partners list products in **Admin → Store Products**. View-only: users tap through to WhatsApp/phone/website and buy offline. Charge a monthly listing fee, and a premium for `featured`.
5. **Deals & coupons** — `PartnerDeal` records with a code the user reveals in the app. Every reveal is counted (`redeems`), so you can bill per redemption or sell the slot flat. Manage in **Admin → Deals & Coupons**.
6. **Lead forms (pay per lead)** — a partner attaches a "Book a free trial / Get a quote / Talk to a nutritionist" form to their profile. The user submits a name and phone; you hand it over and bill per lead.
   - Manage the offers in **Admin → Lead Forms**, read and export the leads in **Admin → Leads Inbox** (CSV, UTF-8 BOM so Arabic opens correctly in Excel).
   - One lead per user per form per 24h, so a double tap can't bill the partner twice.
   - Statuses (`new → sent → contacted → won → lost`) let you prove conversion when you renegotiate the rate.
7. **Events board (paid listings)** — gyms, studios and brands pay to list a class, bootcamp, race or workshop. `sponsored` and `featured` are separate paid upgrades; `views`, RSVPs and `contacts` (booking-link taps) are all counted. Manage in **Admin → Events Board**.

## Easy next (small build)
8. **Featured coaches / brands** — a "featured" flag to promote coaches or gyms to the top of the directory for a placement fee.
9. **Sponsored programs** — a brand-funded workout/meal program (reuses coach content).
10. **Rewarded actions** — optional opt-in video ads that grant XP or a streak-freeze (keeps it non-intrusive).
11. **Recurring event series** — sell a gym a standing weekly slot on the events board instead of one listing at a time.

## Bigger / off-platform (no in-app payment)
12. **B2B / white-label** — license PULSE to gyms, studios, or corporate-wellness programs (flat SaaS deal, billed off-platform).
13. **Coach marketplace (later)** — coaches sell 1:1 coaching; platform takes a cut. This *does* need payments, so it's a future option, not now.
14. **Aggregate insights** — anonymized, opt-in trend data for brands (privacy-first; requires clear consent).

## What is already priced and ready to sell
| Stream | Admin screen | The number you bill on |
| --- | --- | --- |
| Home / feed banners | Banners / Ads | impressions + clicks |
| Sponsored challenge | Challenges | participants |
| Store listing | Store Products | views + contact taps |
| Deal / coupon | Deals & Coupons | code reveals (`redeems`) |
| Lead form | Lead Forms → Leads Inbox | leads (and won leads) |
| Event listing | Events Board | views, RSVPs, booking-link taps |

Every one of these is counted in the database, so a partner can be shown exactly what they bought.

## Principles
- Keep ads **native and tasteful** (one home slot, occasional feed card) — retention is the asset that makes ad inventory valuable.
- Affiliate + sponsorship scale with the audience and cost nothing to users.
- The whole monetization layer is admin-managed, so you can turn streams on/off without code changes.
