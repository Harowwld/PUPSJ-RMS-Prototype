$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../PUPSJRMSEmail.ps1')
. (Join-Path $PSScriptRoot '../PUPSJRMSExternalBackup.ps1')
function Assert($condition, $message) { if (-not $condition) { throw $message } }
foreach ($scriptFile in Get-ChildItem (Join-Path $PSScriptRoot '..') -Filter '*.ps1') {
  $tokens = $null
  $parseErrors = $null
  [void][Management.Automation.Language.Parser]::ParseFile($scriptFile.FullName, [ref]$tokens, [ref]$parseErrors)
  Assert ($parseErrors.Count -eq 0) "PowerShell syntax failed in $($scriptFile.Name): $parseErrors"
}

$previousSystemDrive = $env:SystemDrive
$env:SystemDrive = 'C:'
function Get-CimInstance {
  @(
    @{ DeviceID = 'C:'; DriveType = 3 },
    @{ DeviceID = 'D:'; DriveType = 3 },
    @{ DeviceID = 'E:'; DriveType = 3 },
    @{ DeviceID = 'F:'; DriveType = 2 },
    @{ DeviceID = 'G:'; DriveType = 4 }
  )
}
function Get-Partition($DriveLetter) { $DriveLetter }
function Get-Disk {
  process { @{ BusType = $(if ($_ -eq 'E') { 'USB' } else { 'SATA' }); IsBoot = $false; IsSystem = $false } }
}
try {
  $drives = @(Get-PUPSJExternalDrives)
  Assert ($drives.Count -eq 2 -and 'E:\' -in $drives -and 'F:\' -in $drives) 'Only USB/removable drives should qualify; exclude internal and network drives.'
} finally { $env:SystemDrive = $previousSystemDrive }

$fixture = Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString())
$appRoot = Join-Path $fixture 'app'
$driveRoot = Join-Path $fixture 'usb'
New-Item -ItemType Directory -Force $appRoot, $driveRoot | Out-Null
$envPath = Join-Path $appRoot '.env'
[IO.File]::WriteAllText($envPath, "JWT_SECRET=unchanged`nEXTERNAL_BACKUP_HOST_PATH=`n")
$originalEnv = [IO.File]::ReadAllText($envPath)
function Get-PUPSJExternalDrives { $script:availableDrives }
try {
  $script:availableDrives = @($driveRoot)
  Initialize-PUPSJExternalBackup $appRoot
  $overridePath = Join-Path $appRoot 'docker-compose.external-backup.yml'
  $configuration = Get-Content -LiteralPath $overridePath -Raw | ConvertFrom-Json
  Assert ($configuration.services.app.environment.EXTERNAL_BACKUP_PATH -eq '/backups/external') 'Mount must expose the dedicated external backup path.'
  Assert ($configuration.services.app.environment.EXTERNAL_BACKUP_REQUIRE_MOUNT -eq 'true') 'Docker must require a real mount.'
  Assert ($configuration.services.app.volumes[0].bind.create_host_path -eq $false) 'Compose must not create a missing drive path.'
  Assert ($env:COMPOSE_FILE -eq 'docker-compose.yml;docker-compose.external-backup.yml') 'Connected drive must activate the override.'
  Assert ([IO.File]::ReadAllText($envPath) -eq $originalEnv) 'Automatic setup must preserve existing settings and secrets.'

  $script:availableDrives = @()
  Initialize-PUPSJExternalBackup $appRoot
  Assert (-not (Test-Path -LiteralPath $overridePath)) 'An unplugged drive must remove the stale override.'
  Assert ($env:COMPOSE_FILE -eq 'docker-compose.yml') 'An unplugged drive must allow local-only startup.'

  $script:availableDrives = @($driveRoot, (Join-Path $fixture 'other'))
  Initialize-PUPSJExternalBackup $appRoot
  Assert (-not (Test-Path -LiteralPath $overridePath)) 'Multiple drives must not select one arbitrarily.'

  Set-PUPSJEnv $envPath @{ EXTERNAL_BACKUP_HOST_PATH = (Join-Path $appRoot 'internal-backup') }
  $script:availableDrives = @($driveRoot)
  Initialize-PUPSJExternalBackup $appRoot
  Assert (-not (Test-Path -LiteralPath $overridePath)) 'A configured internal path must not qualify as external storage.'
  Set-PUPSJEnv $envPath @{ EXTERNAL_BACKUP_HOST_PATH = (Join-Path $driveRoot 'PUPSJ-RMS-Backups') }
  $script:availableDrives = @()
  Initialize-PUPSJExternalBackup $appRoot
  Assert (-not (Test-Path -LiteralPath $overridePath)) 'An unavailable configured drive must allow local-only startup.'
  Write-Host 'PASS: external drive detection, binding, disconnect, ambiguity, internal-path rejection, and settings preservation'
} finally { Remove-Item -LiteralPath $fixture -Recurse -Force }
