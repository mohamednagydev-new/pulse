# PULSE on Google Play — the TWA wrapper

**Why bother, given the whole pitch is "no app store".**
Because the two things are not in conflict. The PWA stays the product — it is what the
marketing points at, it is what installs in one tap, and it is what works on a cheap
Android on mobile data. The Play listing exists for one reason only: **store search
traffic**. ElCoach has ~350k downloads and a large share of those came from people
typing "تطبيق تمارين" into Play. Today we get none of that, because we are not there
to be found.

A Trusted Web Activity is not a rebuild. It is a thin native shell that opens
`pulse.geddo.online` in a full-screen Chrome tab with no browser UI. Same code, same
deploy, same service worker. When you push a new bundle, the "app" updates too — no
store review.

---

## What you need once

- A Google Play developer account — **$25, one time**
- Node on any machine (the build runs locally, not on the server)
- Java JDK 17 (Bubblewrap prompts to download one if missing)

---

## 1. Build the wrapper

```bash
npm install -g @bubblewrap/cli
mkdir pulse-twa && cd pulse-twa
bubblewrap init --manifest https://pulse.geddo.online/manifest.webmanifest
```

Answers to the prompts that matter:

| Prompt | Answer |
|---|---|
| Application ID | `online.geddo.pulse` |
| App name | `PULSE` |
| Short name | `PULSE` |
| Display mode | `standalone` |
| Status bar colour | `#F97316` |
| Include support for Play Billing | **No** — there is nothing to sell, and saying yes drags in policy review |
| Signing key | Let it generate one. **Back up `android.keystore` and its passwords immediately** — lose them and you can never update the listing again |

Then:

```bash
bubblewrap build
```

That produces `app-release-bundle.aab` — the file you upload.

---

## 2. Prove you own the domain (required, or the browser bar shows)

Bubblewrap prints a SHA-256 fingerprint at the end of the build. Take it and create
this file on the server so it is served at **`https://pulse.geddo.online/.well-known/assetlinks.json`**:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "online.geddo.pulse",
    "sha256_cert_fingerprints": ["PASTE_THE_FINGERPRINT_FROM_BUBBLEWRAP"]
  }
}]
```

Put it at `apps/web/public/.well-known/assetlinks.json` so it ships with every deploy
and cannot be forgotten. Verify after deploying:

```bash
curl https://pulse.geddo.online/.well-known/assetlinks.json
```

If this file is missing or the fingerprint is wrong, the app still runs but shows a
Chrome address bar across the top — which looks broken and gets one-star reviews.

> **Note:** Play re-signs your bundle with its own key. After the first upload, go to
> **Play Console → Setup → App integrity** and use the **App signing key certificate**
> SHA-256 there, not the one from your local keystore. Getting these two mixed up is
> the single most common reason the address bar shows up in production.

---

## 3. The listing

Play rejects "just a website in a wrapper", so the listing has to describe the product,
not the wrapper. Lead with the same claims as everywhere else (see `MARKETING.md`):

**Short description (80 chars max):**
> The fitness app that asks what hurts before it tells you what to do. Free.

**Arabic short description:**
> التطبيق اللي بيسألك بيوجعك إيه قبل ما يقولك اعمل إيه. مجاني بالكامل.

**Full description — open with the differentiator, not the feature list:**
> Every fitness app asks what your goal is. PULSE asks what hurts.
>
> Nine questions and you get a plan written for you — your level, your training days,
> and the reason for each. If your knee hurts, the plan changes; it doesn't shut you
> out. Every four weeks PULSE checks whether it worked and adjusts.
>
> Everything is free. Not three workouts then a paywall — all of it: 99 guided
> lessons, 85 exercises with form animations, a daily meal plan built from Egyptian
> food, 120 health articles, 92 recipes, coaches, challenges and live group sessions.
>
> Written in Egyptian Arabic by hand. Not machine-translated.

**Required assets:**
- Feature graphic 1024×500
- At least 2 phone screenshots (use: the intake question "what hurts", the plan
  screen with its reasoning, the meal plan, the muscle map)
- Privacy policy URL — **mandatory**, and Play will reject without it

**Data safety form:** declare account data (email, name), health data (workouts,
weight, food logs), and that data is not sold. Answer this honestly and completely;
a wrong answer here is what gets apps pulled later.

---

## 4. Ship

Upload the `.aab` to **Internal testing** first, install on a real phone from the
tester link, and check:

- [ ] No Chrome address bar at the top → assetlinks is correct
- [ ] Back button navigates within the app, does not close it
- [ ] Push notifications still arrive
- [ ] Arabic loads RTL correctly
- [ ] Offline: the app opens and cached screens render

Then promote to Production. Review usually takes a few days for a first listing.

---

## After it is live

**Nothing changes in your deploy loop.** Keep shipping the PWA exactly as now
(`install.ps1` → `seed.ps1`); the Play app picks up every change on next open.

You only rebuild the `.aab` when the *manifest itself* changes — a new name, a new
icon, a new theme colour. Roughly never.

**Do not** put the Play badge in your ads. The link stays `pulse.geddo.online`,
because a one-tap install always beats a 40 MB download. The store listing is there
to catch the people who search Play instead of Google — that is its entire job.
