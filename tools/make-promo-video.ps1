# Builds marketing-video\pulse-promo.mp4 from the generated cards:
# 9:16 (1080x1920), blurred-fill background, fade in/out per slide, 3s each,
# silent audio track omitted — add your voiceover/music in CapCut/Canva.
#
#   powershell -File tools\make-promo-video.ps1
#
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$cards = Join-Path $root 'marketing-cards'
$out = Join-Path $root 'marketing-video'
$tmp = Join-Path $out 'clips'
New-Item -ItemType Directory -Force $out | Out-Null
New-Item -ItemType Directory -Force $tmp | Out-Null

# Story order: hook -> features -> social -> CTA
$slides = @(
  '08-app-home', '04-voice-logging', '20-muscle-map', '15-meal-plan',
  '18-group-live', '07-challenges', '17-leagues', '14-guest'
)

$i = 0
$list = @()
foreach ($s in $slides) {
  $img = Join-Path $cards "$s.png"
  if (-not (Test-Path $img)) { Write-Host "skip missing $s"; continue }
  $clip = Join-Path $tmp ("{0:d2}.mp4" -f $i)
  ffmpeg -y -loglevel error -loop 1 -t 3 -i "$img" -filter_complex `
    "[0]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:4[bg];[0]scale=1000:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,fade=t=in:st=0:d=0.35,fade=t=out:st=2.65:d=0.35,format=yuv420p" `
    -r 25 -c:v libx264 -preset fast -crf 20 "$clip"
  $list += "file '$($clip -replace '\\','/')'"
  $i += 1
}

$listFile = Join-Path $tmp 'list.txt'
Set-Content -Path $listFile -Value $list -Encoding ascii
$final = Join-Path $out 'pulse-promo.mp4'
ffmpeg -y -loglevel error -f concat -safe 0 -i "$listFile" -c copy "$final"

$size = [math]::Round((Get-Item $final).Length / 1MB, 1)
Write-Host "Created $final ($size MB, $($i*3)s, 1080x1920). Add voiceover/music and post."
