$ErrorActionPreference = "Stop"
trap {
  Write-Host "Installation stopped: $_" -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function New-RandomHex([int]$byteCount) {
  $bytes = New-Object byte[] $byteCount
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes) }
  finally { $generator.Dispose() }
  return ([BitConverter]::ToString($bytes) -replace "-", "").ToLowerInvariant()
}

if (-not (Test-IsAdministrator)) {
  $scriptPath = $MyInvocation.MyCommand.Path
  Start-Process powershell.exe -Verb RunAs -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$scriptPath`""
  )
  exit
}

$sourceRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$installRoot = Join-Path $env:ProgramData "PUPSJ-RMS"
$appRoot = Join-Path $installRoot "app"
$hotFolder = Join-Path $installRoot "hot-folder"
$desktop = [Environment]::GetFolderPath("CommonDesktopDirectory")

Write-Host "Installing PUPSJ RMS to $installRoot"

if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
  throw "Windows Package Manager (winget) was not found. Install or update 'App Installer' from Microsoft Store, then run this installer again."
}

if (-not (Get-Command docker.exe -ErrorAction SilentlyContinue)) {
  Write-Host "Installing Docker Desktop. Windows may ask you to approve the installation."
  winget install --id Docker.DockerDesktop --exact --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw "Docker Desktop installation failed (winget exit code $LASTEXITCODE)." }
}

$dockerCli = (Get-Command docker.exe -ErrorAction SilentlyContinue).Source
if (-not $dockerCli) {
  $dockerCli = Join-Path $env:ProgramFiles "Docker\Docker\resources\bin\docker.exe"
  if (-not (Test-Path $dockerCli)) { throw "Docker Desktop installed, but its Docker CLI was not found. Restart Windows and rerun this installer." }
  $env:Path = "$(Split-Path $dockerCli);$env:Path"
}

$dockerDesktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
if (Test-Path $dockerDesktop) {
  Start-Process $dockerDesktop
} else {
  Start-Process "Docker Desktop"
}

$engineReady = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  & $dockerCli info *> $null
  if ($LASTEXITCODE -eq 0) { $engineReady = $true; break }
  Write-Host "Waiting for Docker Desktop to start... ($($attempt + 1)/60)"
  Start-Sleep -Seconds 5
}
if (-not $engineReady) {
  throw "Docker Desktop did not become ready. Open Docker Desktop, complete any first-run prompts, restart Windows if requested, then run Install-PUPSJRMS.bat again."
}

New-Item -ItemType Directory -Force -Path $installRoot, $hotFolder | Out-Null
& robocopy $sourceRoot $appRoot /MIR /XD node_modules .next .local .git /XF .env
if ($LASTEXITCODE -ge 8) { throw "Copying application files failed (robocopy exit code $LASTEXITCODE)." }

# Allow standard Windows users to place scanned files in the inbound folder.
& icacls $hotFolder /grant "*S-1-5-32-545:(OI)(CI)M" /T | Out-Null

$envPath = Join-Path $appRoot ".env"
if (-not (Test-Path $envPath)) {
  $jwt = New-RandomHex 32
  $dbPassword = New-RandomHex 24
  $ingestToken = New-RandomHex 32
  $securePassword = Read-Host "Choose the initial staff password (at least 12 letters or numbers)" -AsSecureString
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  try { $staffPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
  if ($staffPassword -notmatch '^[A-Za-z0-9]{12,}$') {
    throw "Use at least 12 letters or numbers for the initial staff password, then run the installer again."
  }

  $envContent = Get-Content (Join-Path $appRoot ".env.example")
  $values = @{
    POSTGRES_PASSWORD = $dbPassword
    JWT_SECRET = $jwt
    DEFAULT_STAFF_PASSWORD = $staffPassword
    HOT_FOLDER_INGEST_TOKEN = $ingestToken
    HOT_FOLDER_HOST_PATH = ($hotFolder -replace "\\", "/")
  }
  foreach ($key in $values.Keys) {
    $pattern = "^" + [Regex]::Escape($key) + "=.*$"
    $replacement = "$key=$($values[$key])"
    $envContent = $envContent -replace $pattern, $replacement
  }
  $envContent | Set-Content -Path $envPath -Encoding utf8
  $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  & icacls $envPath /inheritance:r /grant:r "${currentUser}:(R,W)" "*S-1-5-32-544:(F)" "*S-1-5-18:(F)" | Out-Null
}

Push-Location $appRoot
try {
  Write-Host "Building and starting PUPSJ RMS. The first build can take several minutes."
  & $dockerCli compose up -d --build --wait
  if ($LASTEXITCODE -ne 0) { throw "Docker Compose could not build or start the application." }

  & $dockerCli compose exec -T app node scripts/secure-installed-accounts.mjs
  if ($LASTEXITCODE -ne 0) { throw "Could not secure the initial staff accounts." }
} finally {
  Pop-Location
}

$startFile = Join-Path $installRoot "Start PUPSJ RMS.cmd"
$stopFile = Join-Path $installRoot "Stop PUPSJ RMS.cmd"
@"
@echo off
start "" "$dockerDesktop"
for /l %%i in (1,1,60) do (
  "$dockerCli" info >nul 2>&1 && goto :engine_ready
  timeout /t 5 /nobreak >nul
)
echo Docker Desktop did not start. Open it, resolve any prompts, then try again.
pause
exit /b 1
:engine_ready
cd /d "$appRoot"
"$dockerCli" compose up -d --wait
if errorlevel 1 (pause & exit /b 1)
start "" http://localhost:3000
"@ | Set-Content -Path $startFile -Encoding ascii
@"
@echo off
cd /d "$appRoot"
"$dockerCli" compose down
pause
"@ | Set-Content -Path $stopFile -Encoding ascii

$shell = New-Object -ComObject WScript.Shell
foreach ($shortcut in @(
  @{ Name = "PUPSJ RMS.lnk"; Target = $startFile; Description = "Start PUPSJ RMS" },
  @{ Name = "Stop PUPSJ RMS.lnk"; Target = $stopFile; Description = "Stop PUPSJ RMS" }
)) {
  $link = $shell.CreateShortcut((Join-Path $desktop $shortcut.Name))
  $link.TargetPath = $shortcut.Target
  $link.WorkingDirectory = $installRoot
  $link.Description = $shortcut.Description
  $link.Save()
}

Write-Host ""
Write-Host "PUPSJ RMS is installed and running at http://localhost:3000"
Write-Host "Initial SuperAdmin login: superadmin@pup.local"
Write-Host "The password is the one you chose during setup. Keep it private."
Write-Host "Start and Stop shortcuts were added to the Public Desktop."
Read-Host "Installation complete. Press Enter to close"
