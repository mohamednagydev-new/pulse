<#
  PULSE one-shot installer for Windows Server + IIS.
  Run in an ELEVATED (Administrator) PowerShell, after you have:
    1. copied the project to the server (e.g. C:\pulse)
    2. created <root>\.env
    3. installed Node 20, ffmpeg, and NSSM (see DEPLOY.md "Install the runtimes and tools")

  Usage (defaults shown):
    powershell -ExecutionPolicy Bypass -File C:\pulse\deploy\install.ps1 -Nssm C:\nssm\nssm.exe

  If the project lives under the web root instead:
    powershell -ExecutionPolicy Bypass -File C:\inetpub\wwwroot\pulse\deploy\install.ps1 -Root C:\inetpub\wwwroot\pulse -Nssm C:\nssm\nssm.exe

  Idempotent: re-run any time to rebuild + restart (recreates the service, reuses the IIS site).
#>
[CmdletBinding()]
param(
  [string]$Root        = 'C:\pulse',
  [string]$HostName    = 'pulse.geddo.online',
  [string]$NodeExe     = "$env:ProgramFiles\nodejs\node.exe",
  [string]$Nssm        = '',
  [string]$SiteName    = 'pulse',
  [string]$ServiceName = 'pulse-api',
  [int]   $Port        = 80
)

$ErrorActionPreference = 'Stop'

function Step($m) { Write-Host ""; Write-Host ("==> " + $m) -ForegroundColor Cyan }
function Ok($m)   { Write-Host ("    " + $m) -ForegroundColor Green }
function Die($m)  { Write-Host ("ERROR: " + $m) -ForegroundColor Red; exit 1 }

# --- Preconditions ------------------------------------------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) { Die 'Run this in an elevated (Administrator) PowerShell.' }

if (-not (Test-Path (Join-Path $Root 'package.json'))) { Die ("No package.json in " + $Root + ". Copy the project there first.") }
if (-not (Test-Path (Join-Path $Root '.env')))         { Die ("No .env in " + $Root + ". Create it first (see DEPLOY.md).") }
if (-not (Test-Path $NodeExe))                          { Die ("node.exe not found at " + $NodeExe + ". Install Node 20 or pass -NodeExe.") }

$nodeDir = Split-Path $NodeExe
$npm     = Join-Path $nodeDir 'npm.cmd'
if (-not (Test-Path $npm)) { Die ("npm.cmd not found next to node (" + $nodeDir + ").") }

# Locate nssm.exe if not supplied
if (-not $Nssm) {
  $cmd = Get-Command nssm -ErrorAction SilentlyContinue
  if ($cmd) { $Nssm = $cmd.Source }
  else {
    foreach ($p in @("$env:ProgramData\chocolatey\bin\nssm.exe", 'C:\nssm\nssm.exe', 'C:\nssm\win64\nssm.exe', "$Root\nssm.exe")) {
      if (Test-Path $p) { $Nssm = $p; break }
    }
  }
}
if (-not $Nssm -or -not (Test-Path $Nssm)) { Die 'nssm.exe not found. Download from https://nssm.cc/download, unzip, and pass -Nssm C:\path\to\nssm.exe' }
Ok ("Using node: " + $NodeExe)
Ok ("Using nssm: " + $Nssm)

# Run nssm without letting its stderr chatter (e.g. "service has not been started")
# become a terminating error under ErrorActionPreference=Stop: temporarily relax the
# preference, swallow all output, and judge success by the exit code alone.
function NssmRun {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$NssmArgs)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try { $null = & $Nssm @NssmArgs 2>&1 } catch {}
  $ErrorActionPreference = $prev
  return $LASTEXITCODE
}

# --- Build --------------------------------------------------------------------
# Stop the API first (if it exists) so npm can replace files the running node has open.
NssmRun stop $ServiceName | Out-Null

Push-Location $Root
try {
  Step 'Installing dependencies (npm ci)'
  if (Test-Path (Join-Path $Root 'package-lock.json')) { & $npm ci } else { & $npm install }
  if ($LASTEXITCODE -ne 0) { Die 'npm install failed.' }

  Step 'Generating Prisma client (prisma generate)'
  & (Join-Path $Root 'node_modules\.bin\prisma.cmd') generate
  if ($LASTEXITCODE -ne 0) { Die 'prisma generate failed.' }

  Step 'Applying database migrations (prisma migrate deploy)'
  & (Join-Path $Root 'node_modules\.bin\prisma.cmd') migrate deploy
  if ($LASTEXITCODE -ne 0) { Die 'prisma migrate deploy failed.' }

  Step 'Building API + web (npm run build)'
  & $npm run build
  if ($LASTEXITCODE -ne 0) { Die 'npm run build failed.' }

  Step 'Copying IIS web.config into the built site'
  $dist = Join-Path $Root 'apps\web\dist'
  if (-not (Test-Path $dist)) { Die ("Build output missing: " + $dist) }
  Copy-Item (Join-Path $Root 'deploy\iis\web.config') (Join-Path $dist 'web.config') -Force
  Ok 'web.config in place.'
}
finally { Pop-Location }

# --- API service (NSSM) -------------------------------------------------------
Step ('Installing Windows service ' + $ServiceName)
New-Item -ItemType Directory -Force (Join-Path $Root 'logs') | Out-Null

# Remove any existing service so settings are clean, then reinstall.
NssmRun stop $ServiceName | Out-Null
NssmRun remove $ServiceName confirm | Out-Null

if ((NssmRun install $ServiceName $NodeExe 'dist\index.js') -ne 0) { Die 'nssm install failed.' }
NssmRun set $ServiceName AppDirectory        (Join-Path $Root 'apps\api') | Out-Null
NssmRun set $ServiceName AppEnvironmentExtra 'NODE_ENV=production' | Out-Null
NssmRun set $ServiceName AppStdout           (Join-Path $Root 'logs\api.out.log') | Out-Null
NssmRun set $ServiceName AppStderr           (Join-Path $Root 'logs\api.err.log') | Out-Null
NssmRun set $ServiceName AppExit Default Restart | Out-Null
NssmRun set $ServiceName Start SERVICE_AUTO_START | Out-Null
if ((NssmRun start $ServiceName) -ne 0) { Write-Host '    nssm start reported an issue - checking health below anyway.' -ForegroundColor Yellow }
Ok ('Service ' + $ServiceName + ' started (logs in ' + $Root + '\logs).')

# --- IIS site -----------------------------------------------------------------
Step ('Configuring IIS site ' + $SiteName)
Import-Module WebAdministration

if (-not (Test-Path ("IIS:\AppPools\" + $SiteName))) {
  New-WebAppPool -Name $SiteName | Out-Null
}
Set-ItemProperty ("IIS:\AppPools\" + $SiteName) -Name managedRuntimeVersion -Value ''   # No Managed Code

$dist = Join-Path $Root 'apps\web\dist'
if (Test-Path ("IIS:\Sites\" + $SiteName)) {
  Set-ItemProperty ("IIS:\Sites\" + $SiteName) -Name physicalPath -Value $dist
  Ok ('Site ' + $SiteName + ' already exists; physical path refreshed.')
} else {
  New-Website -Name $SiteName -PhysicalPath $dist -ApplicationPool $SiteName -HostHeader $HostName -Port $Port | Out-Null
  Ok ('Site ' + $SiteName + ' created on port ' + $Port + ' for host ' + $HostName + '.')
}

# --- Verify -------------------------------------------------------------------
Step 'Verifying the API responds locally'
Start-Sleep -Seconds 2
try {
  $h = Invoke-RestMethod -Uri 'http://localhost:4000/api/health' -TimeoutSec 5
  if ($h.ok) { Ok 'API health OK.' } else { Write-Host '    API responded but health not ok.' -ForegroundColor Yellow }
} catch {
  Write-Host ('    Could not reach http://localhost:4000/api/health yet. Check ' + $Root + '\logs\api.err.log') -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Done.' -ForegroundColor Green
Write-Host 'Next, finish these two outside the script:' -ForegroundColor Green
Write-Host ('  1. HTTPS : run win-acme (wacs.exe), pick the ' + $SiteName + ' site; it installs a free cert and the 443 binding.')
Write-Host ('  2. OAuth : add https://' + $HostName + ' and https://' + $HostName + '/api/auth/google/callback in Google Cloud Console.')
Write-Host ('  3. Test  : open https://' + $HostName)
