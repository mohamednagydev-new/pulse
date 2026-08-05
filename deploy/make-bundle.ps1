# Run this ON YOUR DEV MACHINE (F:\FIT_IT) to produce a clean zip to copy to the server.
# It excludes everything that must be rebuilt/created on the server (node_modules, builds,
# the local database, uploads, logs, and your DEV .env with dev secrets).
#
#   powershell -File F:\FIT_IT\deploy\make-bundle.ps1
#
# Result: F:\pulse-bundle.zip  ->  copy to the server, extract to C:\pulse, then follow DEPLOY.md from step 5.

$ErrorActionPreference = 'Stop'
$src   = 'F:\FIT_IT'
$stage = Join-Path $env:TEMP 'pulse-bundle'
$out   = 'F:\pulse-bundle.zip'

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }

# Copy source only; skip artifacts + secrets + local data.
robocopy $src $stage /E `
  /XD node_modules dist dev-dist uploads backups logs .git .vscode e2e-shots `
  /XF *.db *.db-journal *.db-wal *.db-shm *.log .env client_secret_*.json `
  | Out-Null

if (Test-Path $out) { Remove-Item $out -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $out -Force
Remove-Item $stage -Recurse -Force

$size = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host "Created $out ($size MB). Copy it to the server and extract to C:\pulse." -ForegroundColor Green
