$ErrorActionPreference = 'Stop'
trap {
  Write-Host "Email configuration stopped: $_" -ForegroundColor Red
  Read-Host 'Press Enter to close'
  exit 1
}
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$($MyInvocation.MyCommand.Path)`"")
  exit
}
$appRoot = Join-Path $env:ProgramData 'PUPSJ-RMS\app'
$envPath = Join-Path $appRoot '.env'
if (-not (Test-Path $envPath)) { throw 'PUPSJ RMS is not installed. Run Install-PUPSJRMS.bat first.' }
. (Join-Path $PSScriptRoot 'PUPSJRMSEmail.ps1')
$result = Invoke-PUPSJEmailWizard $envPath
if ($result.Changed) {
  $dockerCli = (Get-Command docker.exe -ErrorAction SilentlyContinue).Source
  if (-not $dockerCli) { $dockerCli = Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin\docker.exe' }
  if (-not (Test-Path $dockerCli)) { throw 'Settings were saved, but Docker was not found. Install Docker Desktop, then rerun Configure Email.' }
  & $dockerCli info *> $null
  if ($LASTEXITCODE -ne 0) {
    $desktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (-not (Test-Path $desktop)) { throw 'Settings were saved. Open Docker Desktop, then rerun Configure Email.' }
    Start-Process $desktop
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
      & $dockerCli info *> $null
      if ($LASTEXITCODE -eq 0) { $ready = $true; break }
      Write-Host 'Waiting for Docker Desktop...'
      Start-Sleep -Seconds 5
    }
    if (-not $ready) { throw 'Settings were saved, but Docker Desktop is not ready. Complete its prompts, then rerun Configure Email.' }
  }
  Push-Location $appRoot
  try {
    Write-Host 'Ensuring the database is ready...'
    & $dockerCli compose up -d --wait postgres
    if ($LASTEXITCODE -ne 0) { throw 'Settings were saved, but the database could not start. Open Docker Desktop and start PUPSJ RMS, then rerun Configure Email.' }
    Write-Host 'Applying email settings to the app container...'
    & $dockerCli compose up -d --no-deps --force-recreate --wait app
    if ($LASTEXITCODE -ne 0) { throw 'Settings were saved, but the app could not restart. Start PUPSJ RMS first. If the app image is missing, rerun the installer to build it.' }
    Invoke-PUPSJEmailTest $dockerCli
  } finally { Pop-Location }
}
Read-Host 'Email setup complete. Press Enter to close'
