$ErrorActionPreference = "Stop"
trap {
  Write-Host "Installation stopped: $_" -ForegroundColor Red
  if ($_.InvocationInfo.ScriptLineNumber) { Write-Host "Installer line: $($_.InvocationInfo.ScriptLineNumber)" -ForegroundColor Red }
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
. (Join-Path $PSScriptRoot "PUPSJRMSInstallLocation.ps1")
$installRoot = Select-PUPSJInstallRoot -SourceRoot $sourceRoot
$appRoot = Join-Path $installRoot "app"
$hotFolder = Join-Path $installRoot "hot-folder"
$desktop = [Environment]::GetFolderPath("CommonDesktopDirectory")

Write-Host "Installing PUPSJ RMS to $installRoot"

. (Join-Path $PSScriptRoot "PUPSJRMSDocker.ps1")
$dockerPaths = Get-PUPSJDockerPaths
if (-not $dockerPaths.Desktop) {
  if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop was not found, and winget is unavailable. Install or update 'App Installer' from Microsoft Store, then run this installer again."
  }
  Write-Host "Installing Docker Desktop. Windows may ask you to approve the installation."
  winget install --id Docker.DockerDesktop --exact --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw "Docker Desktop installation failed (winget exit code $LASTEXITCODE)." }
  $dockerPaths = Get-PUPSJDockerPaths
}
if (-not $dockerPaths.Desktop) {
  throw "Docker Desktop executable was not found after installation in its registered location or standard folders. Restart Windows and rerun this installer; if it is still missing, repair Docker Desktop."
}
$dockerDesktop = $dockerPaths.Desktop
$dockerCli = $dockerPaths.Cli
if (-not $dockerCli -or -not (Test-Path -LiteralPath $dockerCli -PathType Leaf)) {
  throw "Docker Desktop was found at '$dockerDesktop', but its Docker CLI was not found. Repair Docker Desktop and rerun this installer."
}
$env:Path = "$(Split-Path $dockerCli);$env:Path"
Start-PUPSJDockerDesktop $dockerDesktop

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

. (Join-Path $appRoot "installer\windows\PUPSJRMSEmail.ps1")
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

  Copy-Item (Join-Path $appRoot ".env.example") $envPath
  $values = @{
    POSTGRES_PASSWORD = $dbPassword
    JWT_SECRET = $jwt
    DEFAULT_STAFF_PASSWORD = $staffPassword
    HOT_FOLDER_INGEST_TOKEN = $ingestToken
    HOT_FOLDER_HOST_PATH = ($hotFolder -replace "\\", "/")
  }
  Set-PUPSJEnv $envPath $values
  Protect-PUPSJEnv $envPath
}

Save-PUPSJInstallRoot -InstallRoot $installRoot
$emailSetup = Invoke-PUPSJEmailWizard $envPath
. (Join-Path $appRoot 'installer\windows\PUPSJRMSExternalBackup.ps1')
Initialize-PUPSJExternalBackup $appRoot

Push-Location $appRoot
try {
  Write-Host "Building and starting PUPSJ RMS. The first build can take several minutes."
  & $dockerCli compose up -d --build --wait
  if ($LASTEXITCODE -ne 0) { throw "Docker Compose could not build or start the application." }

  & $dockerCli compose exec -T app node scripts/secure-installed-accounts.mjs
  if ($LASTEXITCODE -ne 0) { throw "Could not secure the initial staff accounts." }
  if ($emailSetup.Changed) { Invoke-PUPSJEmailTest $dockerCli }
} finally {
  Pop-Location
}

$urlHelper = Join-Path $appRoot "installer\windows\Get-PUPSJRMSUrl.ps1"
$appUrl = & $urlHelper -AppRoot $appRoot -DockerCli $dockerCli

$startFile = Join-Path $installRoot "Start PUPSJ RMS.cmd"
$stopFile = Join-Path $installRoot "Stop PUPSJ RMS.cmd"
@"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\installer\windows\Start-PUPSJRMS.ps1" -AppRoot "%~dp0app"
if errorlevel 1 exit /b 1
"@ | Set-Content -Path $startFile -Encoding ascii
@"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\installer\windows\Start-PUPSJRMS.ps1" -AppRoot "%~dp0app" -Stop
pause
"@ | Set-Content -Path $stopFile -Encoding ascii

$shell = New-Object -ComObject WScript.Shell
foreach ($shortcut in @(
  @{ Name = "PUPSJ RMS.lnk"; Target = $startFile; Description = "Start PUPSJ RMS" },
  @{ Name = "Stop PUPSJ RMS.lnk"; Target = $stopFile; Description = "Stop PUPSJ RMS" },
  @{ Name = "Configure Email.lnk"; Target = (Join-Path $appRoot "installer\windows\Configure-PUPSJRMSEmail.bat"); Description = "Configure PUPSJ RMS email" }
)) {
  $link = $shell.CreateShortcut((Join-Path $desktop $shortcut.Name))
  $link.TargetPath = $shortcut.Target
  $link.WorkingDirectory = $installRoot
  $link.Description = $shortcut.Description
  $link.Save()
}

Write-Host ""
Write-Host "PUPSJ RMS is installed and responding at $appUrl"
Write-Host "Initial SuperAdmin login: superadmin@pup.local"
Write-Host "The password is the one you chose during setup. Keep it private."
Write-Host "Start, Stop, and Configure Email shortcuts were added to the Public Desktop."
Read-Host "Installation complete. Press Enter to close"
