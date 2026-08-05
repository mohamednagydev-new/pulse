# FIT IT

A bilingual (Arabic / English) fitness content **PWA** — coach-led workout & yoga programs, an interactive muscle-map exercise library, healthy recipes, a wellness article library, plus AI Coach, calorie tracking, progress, and gamification.

- **Frontend**: React + Vite + TypeScript + Tailwind, installable PWA (Workbox), i18n + RTL.
- **Backend**: Node + Express + TypeScript, Prisma over SQLite, self-hosted range-streamed video.
- **AI**: OpenAI — RAG coach chat, EN↔AR translation, plan generator, calorie assistant, semantic search.

See `PLAN.md` (architecture) and `FEATURES.md` (full screen-by-screen coverage of the design).

## Prerequisites
- Node 20+ (tested on 24)
- `ffmpeg` + `ffprobe` on PATH (optional — only needed to transcode uploaded videos; the app runs without it)

## Setup
```bash
npm install
cp .env.example .env          # then fill in secrets (see below)
npm run db:migrate            # create SQLite schema
npm run db:seed               # load all content (coaches, programs, 72 recipes, 120 articles, 85 exercises…)
```

### Optional — AI content (needs OPENAI_API_KEY in .env)
```bash
npm run ai:translate          # fill Arabic (*Ar) fields for all content
npm run ai:embed              # build embeddings for AI Coach + semantic search
```

### Optional — Web Push
```bash
npx web-push generate-vapid-keys   # paste the keys into .env (VAPID_*)
```

## Run (dev)
```bash
npm run dev        # API on :4000, web on :5173 (proxies /api and /media)
```
Open http://localhost:5173. **Admin login**: `admin@fitit.app` / `admin123`.

## Project layout
```
apps/
  api/        Express + Prisma API (auth, content, ai, tracker, gamification, push, admin, media)
  web/        React PWA (all screens, i18n/RTL, AI Coach, tracker)
prisma/
  schema.prisma        bilingual schema
  content/*.json       generated seed content
  seed.ts / translate.ts / embed.ts
uploads/     self-hosted video/image storage (gitignored)
```

## Key scripts
| Command | Does |
|---|---|
| `npm run dev` | Run API + web together |
| `npm run db:seed` | Load/reset seed content |
| `npm run db:studio` | Prisma Studio (browse the DB) |
| `npm run ai:translate` | AI-fill Arabic content |
| `npm run ai:embed` | Build search/RAG embeddings |
| `npm run build` | Build API + web for production |

## Notes
- **SQLite** runs in WAL mode. Because we use Prisma, moving to Postgres/Turso later is a `provider` + URL change.
- **Video** is served only via `/media/video/:id` (range-streamed). Upload MP4s (e.g. Canva exports) through the admin API; never expose `/uploads` directly. Add signed URLs before charging (Phase 4).
- **Bilingual**: base columns hold English, `*Ar` columns hold Arabic; the API localizes by `?lang=ar` / `x-lang` header and falls back to English.
