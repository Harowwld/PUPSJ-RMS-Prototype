$ErrorActionPreference = 'Stop'

# Ensure base path
Set-Location 'c:\Users\Harold\Website\PUPSJ-RMS-Prototype'

# Tailwind CDN bundle (JS that builds styles in-browser)
$tailDir = 'assets/vendor/tailwindcss'
New-Item -ItemType Directory -Force -Path $tailDir | Out-Null
Invoke-WebRequest -Uri 'https://cdn.tailwindcss.com' -OutFile (Join-Path $tailDir 'tailwindcss.min.js')

# Phosphor icon fonts (weights used across the prototype)
$phDir = 'assets/vendor/phosphor'
$weights = 'bold','fill','duotone','thin','light'
foreach ($w in $weights) {
  $dir = Join-Path $phDir $w
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $title = (Get-Culture).TextInfo.ToTitleCase($w)
  Invoke-WebRequest -Uri "https://unpkg.com/@phosphor-icons/web@2.1.1/src/$w/style.css" -OutFile (Join-Path $dir 'style.css')
  Invoke-WebRequest -Uri "https://unpkg.com/@phosphor-icons/web@2.1.1/src/$w/Phosphor-$title.woff2" -OutFile (Join-Path $dir "Phosphor-$title.woff2")
  Invoke-WebRequest -Uri "https://unpkg.com/@phosphor-icons/web@2.1.1/src/$w/Phosphor-$title.woff" -OutFile (Join-Path $dir "Phosphor-$title.woff")
}

# Google Font: Inter (self-hosted)
$fontDir = 'assets/fonts/inter'
New-Item -ItemType Directory -Force -Path $fontDir | Out-Null
$google = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
Invoke-WebRequest -Uri $google -OutFile (Join-Path $fontDir 'inter.css')

# Download referenced font files and rewrite URLs to local paths
$css = Get-Content (Join-Path $fontDir 'inter.css') -Raw
$pattern = 'https://[^)\\"'']+'
$cssLinks = [regex]::Matches($css, $pattern)
foreach ($m in $cssLinks) {
  $uri = $m.Value
  $file = Split-Path $uri -Leaf
  Invoke-WebRequest -Uri $uri -OutFile (Join-Path $fontDir $file)
  $css = $css -replace [regex]::Escape($uri), "./$file"
}
Set-Content -Path (Join-Path $fontDir 'inter.css') -Value $css -Encoding UTF8
