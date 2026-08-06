# Deploying PULSE to `pulse.geddo.online` (Windows Server + IIS)

Stack = **Express + SQLite + file uploads + socket.io** (real-time) + a **Vite React PWA**.
On this box **IIS already owns ports 80/443**, so we add the pulse subdomain as a **new IIS site**
that serves the built PWA and reverse-proxies `/api`, `/media`, `/socket.io` to the **Node API on
`localhost:4000`**. The Node process runs as a Windows service via **NSSM**.

```
Browser ──HTTPS──> IIS site "pulse" (:443, host header pulse.geddo.online)
                        │  physical path = C:\pulse\apps\web\dist  (static PWA)
                        │
                        │  URL Rewrite + ARR:
                        ├─ /api/*      ─┐
                        ├─ /media/*     ├─> http://localhost:4000  (Node service via NSSM)
                        └─ /socket.io/* ─┘        └─> SQLite (prisma\prod.db) + C:\pulse\uploads
```

Everything is same-origin (the web app calls relative `/api`, `/media` and same-host sockets), so
**no per-environment rebuild** is needed.

> Run all PowerShell steps in an **elevated (Administrator)** PowerShell. Paths below assume the app
> lives at **`C:\pulse`** — change if you prefer another drive/folder.

---

## 1. DNS

At your DNS provider add one A record:

| Type | Name    | Value              | TTL  |
|------|---------|--------------------|------|
| A    | `pulse` | `<your-server-ip>` | Auto |

Verify: `Resolve-DnsName pulse.geddo.online` → your server IP.

---

## 2. Install the runtimes & tools (no winget needed)

Windows Server usually has **no `winget`**, so download these directly:

1. **Node.js 20 LTS** — https://nodejs.org/en/download → "Windows Installer (.msi) 64-bit". Run it (silent: `msiexec /i node-v20.x.x-x64.msi /qn`). **Re-open PowerShell** afterwards so PATH refreshes, then `node -v`.
2. **ffmpeg** (REQUIRED — video uploads shell out to it) — https://www.gyan.dev/ffmpeg/builds/ → "release full" zip. Unzip to **`C:\ffmpeg`** so you get `C:\ffmpeg\bin\ffmpeg.exe` and `ffprobe.exe`. (These paths go in `.env`.)
3. **NSSM** (runs Node as a Windows service) — https://nssm.cc/download → unzip; the 64-bit binary is `win64\nssm.exe`. Put it somewhere stable, e.g. **`C:\nssm\nssm.exe`**.

No Git required — you copy files (step 4).

---

## 3. Enable the IIS features we need

IIS is already installed. Add the reverse-proxy + websocket pieces:

```powershell
# WebSocket protocol (for socket.io) + static content + (dynamic) compression
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebSockets -All
Enable-WindowsOptionalFeature -Online -FeatureName IIS-StaticContent -All
```

Then install these two IIS extensions (they are **not** Windows features — download the MSIs):

1. **URL Rewrite 2.1** — https://www.iis.net/downloads/microsoft/url-rewrite
2. **Application Request Routing 3.0 (ARR)** — https://www.iis.net/downloads/microsoft/application-request-routing

After installing ARR, **enable proxy at the server level** (this is what lets rewrite rules forward to `http://localhost:4000`):

```powershell
Import-Module WebAdministration
Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter 'system.webServer/proxy' -Name 'enabled' -Value 'True'
Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter 'system.webServer/proxy' -Name 'reverseRewriteHostInResponseHeaders' -Value 'False'
```

The second line is **required for Google/Facebook sign-in**. ARR turns "reverse rewrite host in
response headers" on by default, which rewrites the host of every `Location` header coming back
through the proxy — so the API's redirect to `https://accounts.google.com/...` reaches the browser
as `https://pulse.geddo.online/o/oauth2/...` (a 404 on our own site) and OAuth dies before Google's
consent screen. The API never emits a `localhost:4000` URL (all its redirects use `WEB_ORIGIN`), so
nothing needs that rewriting.

*(GUI equivalent: IIS Manager → server node → "Application Request Routing Cache" → "Server Proxy Settings…" → tick "Enable proxy", untick "Reverse rewrite host in response headers".)*

---

## 4. Get the code to `C:\pulse` (copy-paste, no git)

You only copy the **source** — `node_modules`, the builds, the database and uploads are created on the
server in steps 5–6. Copying them would be huge and can break (platform-specific binaries), so leave
them out.

**Make a clean zip on your dev machine** (excludes all the artifact/secret folders automatically):

```powershell
powershell -File F:\FIT_IT\deploy\make-bundle.ps1
#  -> creates F:\pulse-bundle.zip
```

Then get it onto the server by whatever you already use:
- **RDP** — copy `F:\pulse-bundle.zip` and paste into the server's `C:\` (clipboard file copy works over RDP), **or**
- **File share** — `Copy-Item F:\pulse-bundle.zip \\server\c$\` , **or**
- drag it into the server through any remote-desktop / file-transfer tool.

On the **server**, extract to `C:\pulse`:

```powershell
Expand-Archive C:\pulse-bundle.zip -DestinationPath C:\pulse -Force
```

> Prefer copying the folder directly instead of a zip? Use robocopy with the same exclusions:
> ```powershell
> robocopy F:\FIT_IT \\server\c$\pulse /E /XD node_modules dist dev-dist uploads backups logs .git /XF *.db *.log .env
> ```

Do **not** copy `node_modules\`, `apps\*\dist\`, `apps\web\dev-dist\`, existing `*.db`, or your local
`uploads\` — they're built/created fresh on the server (the bundler already excludes them).

---

## 5. Production environment file

Create `C:\pulse\.env` (the app loads this single root file). **Generate fresh secrets.**

```powershell
# Strong secret generator (run twice, once per JWT secret):
[Convert]::ToHexString((1..32 | ForEach-Object {Get-Random -Max 256}))
# Fresh VAPID keys (optional, prod-only):
cd C:\pulse ; npx web-push generate-vapid-keys
```

`C:\pulse\.env`:

```dotenv
# ---- Database (SQLite) ----
DATABASE_URL="file:./prod.db"          # -> C:\pulse\prisma\prod.db

# ---- Server ----
PORT=4000
NODE_ENV=production
WEB_ORIGIN=https://pulse.geddo.online  # drives CORS, secure cookies, OAuth redirect_uri

# ---- Auth (app REFUSES to boot on the dev secret) ----
JWT_ACCESS_SECRET=<paste generated hex>
JWT_REFRESH_SECRET=<paste generated hex>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30

# ---- Media storage (persistent) ----
UPLOAD_DIR=uploads                      # -> C:\pulse\uploads
# Point these at the ffmpeg you installed (use full paths, forward slashes are fine):
FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe
FFPROBE_PATH=C:/ffmpeg/bin/ffprobe.exe

# ---- OAuth ----
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...

# ---- OpenAI — OPTIONAL, leave blank and nothing breaks ----
# Turns on: coach chat, semantic search, the calorie estimator, meal photos, the
# admin macro estimator, and a warmer rewrite of the weekly recap.
# Does NOT touch: the training plan or the meal plan. Those are rule-based so they
# stay explainable — see apps/api/src/lib/mealplan.ts and lib/coach.ts.
# Cost ceiling is per-user-per-day in apps/api/src/lib/aiBudget.ts, not here.
# seed.ps1 runs prisma/embed.ts last to build the search index; without it the coach
# has no library to stand on and says so.
OPENAI_API_KEY=...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small

# ---- Web Push (VAPID) ----
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@geddo.online
```

---

## ⚡ Fast path — one script does steps 6, 7 & 8

Once tools are installed (step 2), the project is copied (step 4), and `.env` exists (step 5), you can
run the installer instead of doing steps 6–8 by hand. It installs deps, migrates the DB, builds, copies
`web.config`, registers the NSSM service, and creates the IIS site — and is safe to re-run for updates.

```powershell
# project at C:\pulse (recommended):
powershell -ExecutionPolicy Bypass -File C:\pulse\deploy\install.ps1 -Nssm C:\nssm\nssm.exe

# if you kept the project under the web root instead:
Copy-Item C:\inetpub\wwwroot\pulse\deploy\iis\project-root-lockdown.web.config C:\inetpub\wwwroot\pulse\web.config -Force
powershell -ExecutionPolicy Bypass -File C:\inetpub\wwwroot\pulse\deploy\install.ps1 -Root C:\inetpub\wwwroot\pulse -Nssm C:\nssm\nssm.exe
```

Then finish with **HTTPS (step 9)** and **OAuth (step 10)**. The manual steps below are the same thing
spelled out, if you prefer to run them one at a time or need to debug.

---

## 6. Install, migrate, build, seed

```powershell
cd C:\pulse
npm ci                       # installs all workspaces (api + web)

npx prisma generate
npx prisma migrate deploy    # creates C:\pulse\prisma\prod.db and applies all migrations

npm run build                # api -> apps\api\dist ; web -> apps\web\dist

# IMPORTANT: vite build empties apps\web\dist, so drop the IIS config in AFTER building:
Copy-Item C:\pulse\deploy\iis\web.config C:\pulse\apps\web\dist\web.config -Force

# (Optional) demo coaches/programs:
node C:\pulse\apps\api\dist\scripts\seed-coaches.js
```

---

## 7. Run the Node API as a Windows service (NSSM)

```powershell
# Install NSSM
winget install NSSM.NSSM       # or download from https://nssm.cc/download and unzip

# Register the service (adjust node path if different)
nssm install pulse-api "C:\Program Files\nodejs\node.exe" "dist\index.js"
nssm set pulse-api AppDirectory "C:\pulse\apps\api"
nssm set pulse-api AppEnvironmentExtra "NODE_ENV=production"
nssm set pulse-api AppStdout "C:\pulse\logs\api.out.log"
nssm set pulse-api AppStderr "C:\pulse\logs\api.err.log"
nssm set pulse-api Start SERVICE_AUTO_START
New-Item -ItemType Directory -Force C:\pulse\logs | Out-Null

nssm start pulse-api
Get-Content C:\pulse\logs\api.out.log -Tail 20   # expect: "PULSE API + realtime running on http://localhost:4000"
```

Sanity check the backend directly: `curl http://localhost:4000/api/health` → `{"ok":true,...}`.

---

## 8. Create the IIS site

```powershell
Import-Module WebAdministration

# App pool (No Managed Code — IIS only serves static files + proxies; Node does the work)
New-WebAppPool -Name "pulse"
Set-ItemProperty IIS:\AppPools\pulse -Name managedRuntimeVersion -Value ""

# Site: physical path = the built PWA, bound to the pulse host header on port 80
New-Website -Name "pulse" -PhysicalPath "C:\pulse\apps\web\dist" -ApplicationPool "pulse" `
  -HostHeader "pulse.geddo.online" -Port 80
```

The `web.config` you copied in step 6 provides the reverse-proxy + SPA-fallback rules, so no further
rewrite setup is needed in the GUI.

---

## 9. HTTPS certificate

Because IIS already runs other sites, the cleanest free option is **win-acme** (Let's Encrypt for IIS):

```powershell
# Download win-acme from https://www.win-acme.com/ , unzip to C:\win-acme, then:
cd C:\win-acme
.\wacs.exe
#  -> N (new certificate) -> pick the "pulse" site / pulse.geddo.online binding
#  -> it validates over HTTP, installs the cert, adds the :443 binding, and sets auto-renewal (scheduled task).
```

If you already have a wildcard/purchased cert for `*.geddo.online`, instead just add an **https binding**
on the `pulse` site for host `pulse.geddo.online` and select that cert in IIS Manager → Bindings.

> **Cloudflare note:** if geddo.online is proxied through Cloudflare, use SSL mode **Full (strict)**.
> For win-acme HTTP validation you may need to temporarily set the `pulse` record to **DNS-only (grey
> cloud)** during issuance, then re-enable proxy.

---

## 10. Point OAuth at the new domain

**Google Cloud Console → Credentials → your OAuth client:**
- Authorized JavaScript origins: `https://pulse.geddo.online`
- Authorized redirect URIs: `https://pulse.geddo.online/api/auth/google/callback`

*(This exact callback is what `oauth.ts` builds from `WEB_ORIGIN` — verified against the code.)*
Do the same in the Facebook app settings if you use Facebook login.

---

## 11. Verify

```powershell
curl.exe -I https://pulse.geddo.online/            # 200, valid TLS
curl.exe  https://pulse.geddo.online/api/health    # {"ok":true,...}
```

In a browser at **https://pulse.geddo.online**:
- Sign up / log in (confirms the secure refresh cookie works through IIS).
- Coaches directory → featured coaches first.
- Community feed → live posts appear (confirms **socket.io through IIS/ARR** — this is the piece that
  needs the WebSocket feature + ARR proxy from step 3).
- Install as a PWA.
- Log in as **admin** and upload a test image (confirms `/media` + persistent `C:\pulse\uploads`).

---

## 12. Shipping updates later (still copy-paste)

On your dev machine rebuild the zip, copy it up, then on the server overwrite the source and rebuild.
Your `.env`, `prisma\prod.db` and `uploads\` are **not** in the bundle, so they're never overwritten.

```powershell
# --- dev machine ---
powershell -File F:\FIT_IT\deploy\make-bundle.ps1     # fresh F:\pulse-bundle.zip
# copy F:\pulse-bundle.zip to the server (RDP / share) as before

# --- server ---
nssm stop pulse-api
Expand-Archive C:\pulse-bundle.zip -DestinationPath C:\pulse -Force   # overwrites source only
cd C:\pulse
npm ci
npx prisma generate                       # always, so tsc has the typed client
npx prisma migrate deploy                 # only if the schema changed
npm run build
Copy-Item C:\pulse\deploy\iis\web.config C:\pulse\apps\web\dist\web.config -Force   # re-copy after every build!
nssm start pulse-api
# IIS static files are picked up automatically; no site restart needed.
```

### One-time content seeds (idempotent — run once on the server, safe to re-run)

```powershell
cd C:\pulse
# Egyptian-Arabic translations for all seeded content
Get-ChildItem prisma\ar\*.ts | ForEach-Object { npx tsx $_.FullName }
npx tsx prisma\translate-manual.ts
# Default TikTok reel keywords (admins manage later in /admin/reel-keywords)
npx tsx prisma\seed-reel-keywords.ts
# Badge + challenge engagement pack (17 badges, 11 challenges) + gender-neutral Arabic fix
npx tsx prisma\seed-engagement.ts
npx tsx prisma\ar\neutral-fix.ts
```

---

## 13. Back up what holds all state

Everything lives in **`C:\pulse\prisma\prod.db`** and **`C:\pulse\uploads\`**. A daily scheduled task:

```powershell
# save as C:\pulse\backup.ps1
$d = "C:\pulse\backups"; New-Item -ItemType Directory -Force $d | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd"
Copy-Item C:\pulse\prisma\prod.db "$d\prod-$stamp.db" -Force
Compress-Archive -Path C:\pulse\uploads -DestinationPath "$d\uploads-$stamp.zip" -Force
Get-ChildItem $d | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } | Remove-Item -Force
```
```powershell
# schedule it nightly at 03:00 (stop the service briefly for a clean DB copy, or use SQLite .backup)
schtasks /Create /SC DAILY /ST 03:00 /TN "PULSE Backup" /TR "powershell -File C:\pulse\backup.ps1" /RU SYSTEM
```
Copy the `backups\` folder off-box (another drive / cloud) for real safety.

---

### Gotchas specific to this setup
- **web.config gets wiped by every build** — the `Copy-Item` after `npm run build` is not optional (steps 6 & 12).
- **ffmpeg is mandatory** — video uploads shell out to it; set `FFMPEG_PATH`/`FFPROBE_PATH` to the real `.exe` paths.
- **socket.io needs the WebSocket feature + ARR proxy enabled** (step 3). Without them the feed/chat fall back to slow polling or fail.
- **Node port 4000 stays internal** — don't open it in Windows Firewall; only IIS (80/443) is public and it reaches Node over localhost.
- **App pool = "No Managed Code"** — this site never runs ASP.NET; IIS only serves files and proxies.
- **SQLite = single box.** Fine for launch; if you ever need multiple app servers, migrate the Prisma datasource to SQL Server/Postgres.
- Login secure-cookie works because the app sets `secure` from `NODE_ENV=production` (not from `req.secure`), so the internal HTTP hop to Node doesn't matter.
```
