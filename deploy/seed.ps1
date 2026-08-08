<#
  PULSE content seeding. Run AFTER install.ps1 (which applies migrations and builds).

  Usage, from an elevated PowerShell:
    powershell -ExecutionPolicy Bypass -File C:\pulse\deploy\seed.ps1

  Every script here is idempotent — safe to re-run after any deploy. Nothing is
  deleted and nothing is overwritten that an admin has since edited by hand.

  Demo-data scripts (demo users, demo partners, demo events, demo venue data) are
  NOT in the active list: prisma/clean-demo.ts removes exactly that data before
  launch, and re-running them here would re-create it on a cleaned production DB.
  They are kept commented out below for first-install / demo environments only.
#>
[CmdletBinding()]
param(
  [string]$Root = 'C:\pulse'
)

$ErrorActionPreference = 'Stop'

function Step($m) { Write-Host ""; Write-Host ("==> " + $m) -ForegroundColor Cyan }
function Ok($m)   { Write-Host ("    " + $m) -ForegroundColor Green }
function Die($m)  { Write-Host ("ERROR: " + $m) -ForegroundColor Red; exit 1 }

if (-not (Test-Path $Root)) { Die ("Project root not found: " + $Root) }

$tsx = Join-Path $Root 'node_modules\tsx\dist\cli.mjs'
if (-not (Test-Path $tsx)) { Die ("tsx not found at " + $tsx + ". Run install.ps1 first (npm ci).") }

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = "$env:ProgramFiles\nodejs\node.exe" }
if (-not (Test-Path $node)) { Die 'node.exe not found. Add Node to PATH or install Node 20+.' }

# DELIBERATELY EXCLUDED: prisma\seed.ts
#   That script is a first-install reset. It calls deleteMany() on badges, challenges,
#   coaches, programs, lessons, articles, recipes and banners — AND on userBadge and
#   challengeParticipant, which destroys every user's earned badges and challenge
#   progress. It belongs to a fresh database only. Never run it on a live server.
#
# FIRST-INSTALL / DEMO ONLY — never on a cleaned production DB.
#   prisma/clean-demo.ts deletes the demo users, demo " (Demo)" partners, the
#   seed-board demo events and the demo venue data these scripts create.
#   Re-enabling them after clean-demo.ts has run would resurrect that demo data.
#   Kept here (commented out) for reference / fresh demo environments:
#     'prisma\seed-users.ts',            # demo @pulse.app user accounts
#     'prisma\seed-partners.ts',         # demo partners + store products + deals
#     'prisma\seed-board.ts',            # demo events board + lead forms (needs partners)
#     'prisma\seed-venue-demo.ts',       # coordinates/hours/facilities on demo partners
#
# Order matters: content before the Arabic passes, partners before anything that
# attaches to a partner.
$scripts = @(
  'prisma\seed-coaches-challenges.ts',   # content Coach rows (no user accounts) — MUST come before seed-coach-programs,
  'prisma\seed-coach-programs.ts',       #   which only fills coaches that exist and have no programs yet
  'prisma\seed-program-naming.ts',       # readable programme names, levels, and specialised-audience marks
  'prisma\seed-program-covers.ts',       # bundled cover images for the 9 programs that shipped without one
  'prisma\seed-engagement.ts',
  'prisma\seed-onboarding.ts',
  'prisma\seed-reel-overrides.ts',
  'prisma\seed-gamification.ts',         # badges, challenges, league enrolment
  'prisma\seed-videos.ts',               # YouTube lesson links (verified; --clear undoes it)
  'prisma\seed-exercise-videos.ts',      # YouTube exercise demos + woman-led variants
  'prisma\seed-contraindications.ts',    # tag exercises by the joint they load (injury-aware sessions)
  'prisma\seed-progressions.ts',         # easier/harder ladder between exercises (session progression chips)
  'prisma\seed-ramadan.ts',              # Ramadan fitness guide pack (bilingual initiative articles)
  'prisma\seed-content-videos.ts',       # recipe videos + article videos (institutional sources only)
  'prisma\seed-recipe-macros.ts',        # per-serving macros + meal slots — the meal planner skips recipes without them
  'prisma\seed-egyptian-recipes.ts',     # 20 Egyptian dishes + the breakfast category the library never had
  'prisma\seed-foods.ts',                # 154-item Egyptian food table for calorie logging
  'prisma\seed-reels.ts',                # 29 vetted YouTube reels (verifies each is still embeddable)
  'prisma\polish-content.ts',            # audited content fixes: Home card titles/links, challenge staging,
                                         #   recipe unit cleanup, numeral consistency, food aliases, free plans
  'prisma\translate-manual.ts',          # Arabic passes — fills any empty *Ar columns
  'prisma\ar\base.ts',
  'prisma\ar\articles-1.ts',
  'prisma\ar\articles-2.ts',
  'prisma\ar\articles-3.ts',
  'prisma\ar\recipes.ts',
  'prisma\ar\exercises.ts',
  'prisma\ar\challenge-descriptions.ts',
  'prisma\ar\badges.ts',
  'prisma\ar\neutral-fix.ts',
  # LAST, and after the Arabic passes: it indexes whatever text is in the database,
  # so running it earlier would embed English rows that get translated right after.
  # Without this step semantic search queries an empty table and the AI coach answers
  # with no grounding in our content at all. Skips itself (exit 0) if there is no key.
  'prisma\embed.ts'
)

Push-Location $Root
try {
  foreach ($s in $scripts) {
    $full = Join-Path $Root $s
    if (-not (Test-Path $full)) { Write-Host ("    skip (missing): " + $s) -ForegroundColor DarkGray; continue }
    Step ("Seeding " + $s)
    & $node $tsx $full
    if ($LASTEXITCODE -ne 0) { Die ($s + ' failed.') }
  }

  Step 'Arabic coverage report'
  & $node $tsx (Join-Path $Root 'prisma\ar\coverage.ts')
}
finally { Pop-Location }

Ok ''
Write-Host "==> Seeding complete." -ForegroundColor Green
Write-Host "    Next: restart the API so it picks up fresh data caches:" -ForegroundColor Gray
Write-Host "      Restart-Service pulse-api" -ForegroundColor Gray
