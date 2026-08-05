# FIT IT — Full Build Plan (Web App + PWA)

> A subscription-style fitness content platform (workouts, yoga, recipes, wellness articles) delivered as an installable **Progressive Web App**, backed by a **Node + SQLite** API and a protected **admin CMS**.
>
> Derived from the 48-screen design in `FIT-IT-Colortheme-Final.pdf`.

---

## 1. What the design actually is

FIT IT is a **content-driven, video-heavy fitness app**. It is not a workout *tracker* — there is no timer/rep-logging flow. It is a curated library of coach-led programs and wellness content that users browse and watch, gated behind an account (and later, a subscription).

**Screen inventory (mapped from the PDF):**

| # | Area | Screens |
|---|------|---------|
| 1–4 | Onboarding | 4-slide intro carousel (Count Calories · Workout for Everybody · Yoga & Meditation · Wellness Kitchen), each with Skip |
| 5–6 | Auth | Sign In (email/pass, Facebook, Google, Remember me, Forgot password) · Sign Up (first/last name, mobile, email, password, zip) |
| 7 | Home | "Recommended" — sponsor banner, "Fit for Life" carousel, "Fit It Coaches", "Prepare Your Meal" video cards, Workout banner |
| 8–9 | Programs intro | "Welcome to FIT for Life", "Don't Limit Your Challenges" (Beginners / Intermediate) |
| 10–23 | Wellness Library | Intro → Initiatives / Kitchen / Articles → category grids → list views → **detail** (article body, recipe with ingredients) |
| 24–25 | Exercises | Interactive **muscle map** (front & back body) with Cardio, timer, 180° rotate |
| 26–37 | Programs (Yoga path) | Welcome → Yoga/Workout → Coach (Cole Chance) → program series (7-Day Rejuvenating, Pregnancy Yoga, Yin Yoga) → **video lesson list** (durations) |
| 38–44 | Programs (Workout path) | Fitness Workouts → Coach (Abou El Naga) → Beginners/Intermediate/Advanced → First/Second/Third Program → video list |
| 45 | Profile | Avatar, name, Bookmarks (View All), Programs Done (View All) |
| 46–47 | Info | Settings (change email/password), Membership (subscription status, plans), Support, Instagram, Logout |

**Core content types:** Coaches · Programs → Lessons (video) · Exercises (video, on a muscle map) · Recipes (image + about + ingredients + video) · Articles (text + video) · Categories · Banners/Sponsors.

**Navigation:** bottom tab bar — Recommended · Programs · Wellness Library · Profile — plus a hamburger "Info" screen.

---

## 2. Recommended stack

Your proposal (React PWA + backend + SQLite) is a good fit for this app. Here is the concrete stack, with the reasoning where it matters.

### Frontend
| Concern | Choice | Why |
|---|---|---|
| Build/dev | **Vite + React + TypeScript** | Fast, first-class PWA plugin support |
| PWA | **`vite-plugin-pwa` (Workbox)** | Installable, offline app shell, precache — the "install on web or phone" requirement |
| Routing | **React Router v6** | Nested routes match the tab + drill-down structure |
| Server state | **TanStack Query** | Caching, loading/error states for all the list/detail fetches |
| Client state | **Zustand** (auth/session only) | Tiny; most state is server state |
| Styling | **Tailwind CSS** + CSS variables | The design uses per-section theme colors — variables make that clean (see §7) |
| Forms | **react-hook-form + zod** | Sign in/up, admin forms, validation |
| Video | **HTML5 `<video>`** + `react-player` wrapper | Self-hosted MP4 with HTTP range works natively; wrapper handles UI |
| Icons | **lucide-react** | Matches the thin-line iconography in the design |

### Backend
| Concern | Choice | Why |
|---|---|---|
| Runtime | **Node.js + Express + TypeScript** | Simple, huge ecosystem; Fastify is a fine swap if you want speed |
| ORM | **Prisma** over **SQLite** | Type-safe, migrations, and **trivial to move to Postgres/Turso later** — this is the key hedge on SQLite (see §8) |
| Auth | **JWT** (access + refresh) + **argon2** hashing | Stateless API auth; refresh tokens in httpOnly cookies |
| Social login | Google + Facebook OAuth (`arctic` or `passport`) | Design shows both buttons |
| Uploads | **multer** + **ffmpeg/ffprobe** | Store video/images on disk, transcode to web MP4, extract duration + thumbnail |
| Video serving | Express **Range** streaming endpoint (HTTP 206) | Required for seekable self-hosted video |
| Validation | **zod** (shared with frontend) | One schema source |

### Why not a mobile framework?
You asked for web + PWA, which is right for this content app: no native device APIs are needed (no HealthKit, no background sensors). A well-built PWA installs to the home screen on Android and iOS and gives a near-native feel. If an App Store/Play Store presence becomes a hard requirement later, wrap the same PWA with **Capacitor** — no rewrite.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser / Installed PWA (React + Workbox service worker)│
│   • App shell cached offline                             │
│   • Article/recipe text cached; video streamed on demand │
└───────────────┬─────────────────────────────────────────┘
                │ HTTPS (JSON API + JWT)
┌───────────────▼─────────────────────────────────────────┐
│  Node + Express API                                      │
│   /api/auth  /api/content  /api/me  /api/admin  /media   │
│   • JWT auth + role guard (user / admin)                 │
│   • Range-streaming for /media/video/:id                 │
└───────┬───────────────────────────────┬─────────────────┘
        │ Prisma                         │ fs (disk / mounted volume)
┌───────▼────────┐              ┌────────▼─────────┐
│  SQLite (data) │              │  /uploads        │
│  metadata only │              │  videos, images  │
└────────────────┘              │  thumbnails      │
                                └──────────────────┘
```

**Golden rule:** the database stores **metadata only** (paths, durations, titles). Binary video/image bytes live on the filesystem, never in SQLite. This keeps the DB small and fast and makes a later move to a CDN or streaming service a config change, not a migration.

### Monorepo layout
```
FIT_IT/
├─ apps/
│  ├─ web/            # React PWA (user-facing)
│  ├─ admin/          # React admin CMS (can share components with web)
│  └─ api/            # Express + Prisma backend
├─ packages/
│  └─ shared/         # zod schemas, TS types shared FE/BE
├─ uploads/           # video + image storage (gitignored)
├─ prisma/            # schema.prisma + migrations + seed
└─ PLAN.md
```
*(Admin can start as a route group inside `web` behind an admin guard and be split out only if it grows.)*

---

## 4. Data model (Prisma / SQLite)

Sketch of the core schema — enough to build against, refine during implementation.

```prisma
// ---------- Users & auth ----------
model User {
  id           String   @id @default(cuid())
  firstName    String
  lastName     String
  email        String   @unique
  passwordHash String?          // null for pure-OAuth accounts
  mobile       String?
  zip          String?
  avatarUrl    String?
  role         Role     @default(USER)
  provider     String?          // "google" | "facebook" | null
  providerId   String?
  createdAt    DateTime @default(now())

  bookmarks     Bookmark[]
  completions   LessonCompletion[]
  subscription  Subscription?
}
enum Role { USER ADMIN }

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  createdAt DateTime @default(now())
}

// ---------- Media ----------
model Video {
  id           String  @id @default(cuid())
  filePath     String          // /uploads/videos/xyz.mp4
  thumbnailPath String?
  durationSec  Int?
  status       String  @default("ready") // uploaded|processing|ready
}

// ---------- Coaches & programs ----------
model Coach {
  id        String @id @default(cuid())
  name      String
  headline  String?            // e.g. "Star Coach"
  bio       String?
  avatarUrl String?
  type      CoachType          // YOGA | WORKOUT
  programs  Program[]
}
enum CoachType { YOGA WORKOUT }

model Program {
  id          String  @id @default(cuid())
  coachId     String
  coach       Coach   @relation(fields: [coachId], references: [id])
  title       String             // "7-Day Rejuvenating Yoga Series" / "First Program"
  description String?
  coverImage  String?
  level       Level?             // BEGINNER|INTERMEDIATE|ADVANCED (workout) or null (yoga)
  order       Int     @default(0)
  lessons     Lesson[]
}
enum Level { BEGINNER INTERMEDIATE ADVANCED }

model Lesson {
  id        String  @id @default(cuid())
  programId String
  program   Program @relation(fields: [programId], references: [id])
  title     String
  videoId   String
  video     Video   @relation(fields: [videoId], references: [id])
  order     Int     @default(0)
}

// ---------- Exercises (muscle map) ----------
model Exercise {
  id          String @id @default(cuid())
  name        String
  muscleGroup String            // "Chest", "Biceps", "Glutes", "Cardio"...
  bodySide    String            // "front" | "back"
  posX        Float?            // hotspot coordinates on the body image (0-1)
  posY        Float?
  videoId     String?
  description String?
}

// ---------- Wellness library ----------
model Category {
  id       String   @id @default(cuid())
  kind     String            // "initiative" | "recipe" | "article"
  title    String            // "Healthy Eating", "Appetizers", "Blood Pressure"
  image    String?
  icon     String?
  order    Int      @default(0)
  articles Article[]
  recipes  Recipe[]
}

model Article {
  id         String   @id @default(cuid())
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])
  title      String
  excerpt    String?
  body       String            // long text
  coverImage String?
  videoId    String?
  order      Int      @default(0)
}

model Recipe {
  id          String   @id @default(cuid())
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  title       String
  coverImage  String?
  about       String
  ingredients String            // JSON array stored as text
  videoId     String?
  order       Int      @default(0)
}

// ---------- Home / promo ----------
model Banner {
  id       String @id @default(cuid())
  section  String            // "home_sponsor", "fit_for_life"...
  title    String?
  image    String
  linkType String?
  linkId   String?
  order    Int    @default(0)
}

// ---------- User activity ----------
model Bookmark {
  id          String @id @default(cuid())
  userId      String
  user        User   @relation(fields: [userId], references: [id])
  contentType String            // "lesson"|"recipe"|"article"|"program"
  contentId   String
  createdAt   DateTime @default(now())
  @@unique([userId, contentType, contentId])
}

model LessonCompletion {
  id          String @id @default(cuid())
  userId      String
  user        User   @relation(fields: [userId], references: [id])
  lessonId    String
  completedAt DateTime @default(now())
  @@unique([userId, lessonId])
}

// ---------- Membership (schema now, billing in Phase 2) ----------
model MembershipPlan {
  id          String @id @default(cuid())
  name        String            // "Yoga", "Workout", "All Access"
  priceCents  Int
  interval    String            // "month" | "year"
  active      Boolean @default(true)
}

model Subscription {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  planId    String?
  status    String   @default("none") // none|active|canceled|past_due
  provider  String?           // "stripe" (Phase 2)
  externalId String?          // stripe subscription id
  startedAt DateTime?
  endsAt    DateTime?
}
```

**Note on `ingredients`:** SQLite has no array type, so store JSON as text (`["450g salmon", "1 tsp salt"]`) and parse in the API. Prisma's `Json` type also works.

---

## 5. API surface (REST)

```
# Auth
POST   /api/auth/register           firstName,lastName,email,password,mobile?,zip?
POST   /api/auth/login              email,password  → access token + refresh cookie
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/google             OAuth redirect
GET    /api/auth/google/callback
GET    /api/auth/facebook / callback
POST   /api/auth/forgot-password

# Current user
GET    /api/me                      profile
PATCH  /api/me                      update profile / avatar
PATCH  /api/me/email                change email
PATCH  /api/me/password             change password
GET    /api/me/bookmarks
POST   /api/me/bookmarks            {contentType, contentId}
DELETE /api/me/bookmarks/:id
GET    /api/me/completions          "Programs Done"
POST   /api/me/completions          {lessonId}
GET    /api/me/subscription

# Content (public/authed reads)
GET    /api/home                    banners + coaches + featured (Recommended screen)
GET    /api/coaches           /:id
GET    /api/programs?coachId=&level=&type=
GET    /api/programs/:id            includes ordered lessons
GET    /api/lessons/:id
GET    /api/exercises?side=front|back
GET    /api/categories?kind=initiative|recipe|article
GET    /api/articles?categoryId=    /:id
GET    /api/recipes?categoryId=     /:id
GET    /api/plans                   membership plans

# Media (range streaming)
GET    /media/video/:id             HTTP 206 partial content, seekable
GET    /media/image/:path

# Admin (role=ADMIN)
POST/PATCH/DELETE  /api/admin/coaches | programs | lessons
POST/PATCH/DELETE  /api/admin/exercises | categories | articles | recipes | banners | plans
POST   /api/admin/upload/video      multipart → transcode → Video row
POST   /api/admin/upload/image
GET    /api/admin/users
```

---

## 6. Self-hosted video — how to do it well

Since you chose to host videos on the server, do these five things so playback is smooth and the paywall can be added later:

1. **On upload**, run `ffmpeg` to transcode to a web-safe MP4 (H.264 + AAC, `faststart` flag so the moov atom is at the front → instant playback). Store the result under `/uploads/videos/`.
2. **Extract metadata** with `ffprobe`: duration (shown as "25.25min" in the design) and a poster thumbnail (`-ss 00:00:02`). Save paths + duration to the `Video` row.
3. **Serve with HTTP Range support** (respond `206 Partial Content` to `Range:` headers) so users can seek/scrub. Plain `res.sendFile` on Express handles this, but a small manual range handler gives you control for auth checks.
4. **Put Nginx in front** in production and use `X-Accel-Redirect` so Node authorizes the request but Nginx streams the bytes — Node isn't tied up pushing video.
5. **Plan the escape hatch:** keep video access behind `/media/video/:id` (never expose raw `/uploads` URLs). When you outgrow self-hosting, you swap that one endpoint for signed CDN/streaming URLs — no client changes. Storage grows fast with video, so budget disk and back it with a mounted volume or object storage (S3/R2) from the start.

**Caveat to accept now:** self-hosted files without signed URLs are copyable by a determined user. That's fine for a free MVP; revisit before charging money (Phase 2).

---

## 7. Design system (extracted from the PDF)

The app themes each section with its own color. Define these as CSS variables and let Tailwind read them.

```css
:root {
  --brand-pink:   #E01E8B;  /* auth, yoga, profile header, primary CTA */
  --brand-blue:   #0E63D6;  /* programs / workout section */
  --brand-green:  #22A45D;  /* wellness library + kitchen */
  --brand-teal:   #00BCD4;  /* profile cards, links, accents */
  --brand-red:    #E30613;  /* membership "More Plans" CTA */
  --brand-yellow: #FFD400;  /* exercise muscle-map hotspots */
  --ink:          #141414;  /* dark content-list backgrounds */
  --surface:      #F4F4F6;
  --facebook:     #1877F2;
}
```

- **Rounded, pill-shaped** buttons and cards throughout; large hero images with a **curved bottom edge** on headers (auth, coach, profile screens).
- **Bottom tab bar** with a raised center action (green apple on Wellness, blue clipboard on Programs, pink on the active tab).
- Font: a geometric sans (Poppins / Montserrat is a close match to the design's headings).
- Logo: the "FIT IT" running-figure mark — export from the PDF as SVG for crisp rendering (`apps/web/public/logo.svg`).

---

## 8. On SQLite — the honest tradeoffs

SQLite is a genuinely good choice **for this app's MVP** because reads dominate (users browse content; writes are just auth, bookmarks, completions). It's zero-ops, fast, and file-based.

**Where it bites, and the mitigation:**
- *Concurrent writes* are serialized (one writer at a time). Enable **WAL mode** (`PRAGMA journal_mode=WAL`) — this alone makes it comfortable for hundreds of concurrent users.
- *Single server only* — SQLite doesn't do horizontal scaling. If you deploy multiple API instances, they can't share one SQLite file.
- **Mitigation baked into the plan:** using **Prisma** means moving to **Postgres** (or **Turso/libSQL**, which *is* SQLite-that-scales) is a connection-string + `provider` change plus a migration — not a rewrite. Start on SQLite, graduate only when metrics say so.

---

## 9. PWA specifics ("install on web or phone")

- `vite-plugin-pwa` with a **Web App Manifest** (name, icons 192/512, `display: standalone`, theme color = brand pink) → gives the Android/desktop install prompt and iOS "Add to Home Screen".
- **Workbox runtime caching strategy:**
  - App shell + JS/CSS → **precache** (offline launch).
  - Content JSON (articles, recipes, program lists) → **stale-while-revalidate**.
  - Images → **cache-first** with expiration.
  - **Video → network-only** (never cache — too large; streamed on demand).
- Show a custom **"Install FIT IT"** button using the captured `beforeinstallprompt` event.
- Offline fallback page for when there's no network and no cache.
- iOS PWA limits to know: no push notifications on older iOS, 50MB cache ceilings — fine here since video isn't cached.

---

## 10. Phased roadmap

### Phase 0 — Foundation (setup)
- Monorepo, TypeScript, ESLint/Prettier, `.env` handling.
- Prisma + SQLite schema (§4) + first migration + seed script with sample coaches/programs/articles/recipes.
- Extract logo + reusable assets from the PDF; set up Tailwind + design tokens (§7).

### Phase 1 — Auth & shell
- Register / Login (email+password), JWT + refresh, argon2.
- Onboarding carousel (4 slides) + routing guard.
- App shell: bottom tab bar, section theming, PWA manifest + service worker (installable).
- Profile screen + Info screen (change email/password, logout).

### Phase 2 — Content consumption (the heart of the app)
- Admin CMS: CRUD for coaches, programs, lessons, exercises, categories, articles, recipes, banners; **video/image upload + transcode + thumbnail**.
- Home ("Recommended"): banners, coaches, featured rows.
- Programs: Yoga & Workout paths → coach → program → **video lesson player** (range streaming).
- Wellness Library: Initiatives / Kitchen / Articles → category grids → list → detail (article body, recipe ingredients).
- Exercises muscle map (front/back, hotspots → exercise video).
- Bookmarks + "Programs Done".

### Phase 3 — Social login & polish
- Google + Facebook OAuth.
- Search within categories (the search bars in the design).
- Forgot-password email flow.
- Offline caching polish, loading skeletons, error states.

### Phase 4 — Monetization (when ready)
- Integrate **Stripe** subscriptions against the `MembershipPlan`/`Subscription` schema (already modeled).
- Paywall gating on programs/lessons; webhook handling; "More Plans" screen wired to real checkout.
- Consider signed video URLs at this point to protect paid content.

### Phase 5 — Hardening & scale (as needed)
- Move media to object storage + CDN; swap `/media/video/:id` for signed URLs.
- If write load / multi-instance is needed → migrate SQLite → Postgres or Turso (Prisma makes this cheap).
- Analytics, rate limiting, backups, CI/CD.

---

## 11. First concrete steps

1. Scaffold the monorepo (`apps/web`, `apps/api`, `prisma/`, `uploads/`).
2. Drop in the Prisma schema from §4, run the first migration, write a seed script.
3. Stand up `/api/auth/register` + `/api/auth/login` and the React login/onboarding screens.
4. Build the admin upload endpoint (multer + ffmpeg) and the `/media/video/:id` range streamer — everything else is CRUD on top of these.
5. Wire the PWA manifest + service worker early so "installable" is true from day one.

---

*Open decisions to revisit later: exact membership plan tiers & pricing, whether Programs Done tracks per-lesson or per-program completion, and whether search should be server-side (SQLite FTS5) or client-side filtering.*
```
