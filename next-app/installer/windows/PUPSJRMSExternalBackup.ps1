function Get-PUPSJExternalDrives {
  foreach ($volume in @(Get-CimInstance Win32_LogicalDisk -ErrorAction Stop)) {
    if ($volume.DeviceID -eq $env:SystemDrive -or $volume.DriveType -notin @(2, 3)) { continue }
    $external = $volume.DriveType -eq 2
    if (-not $external) {
      try {
        $disk = Get-Partition -DriveLetter $volume.DeviceID.Substring(0, 1) -ErrorAction Stop | Get-Disk -ErrorAction Stop
        $external = $disk.BusType -in @('USB', 'SD', 'MMC', '1394') -and -not $disk.IsBoot -and -not $disk.IsSystem
      } catch { continue }
    }
    if ($external) { $volume.DeviceID + '\' }
  }
}

function Initialize-PUPSJExternalBackup([string]$AppRoot) {
  $overridePath = Join-Path $AppRoot 'docker-compose.external-backup.yml'
  $env:COMPOSE_FILE = 'docker-compose.yml'
  $env:COMPOSE_PATH_SEPARATOR = ';'
  if (Test-Path -LiteralPath $overridePath) { Remove-Item -LiteralPath $overridePath }
  try {
    $externalDrives = @(Get-PUPSJExternalDrives)
    $settings = Read-PUPSJEnv (Join-Path $AppRoot '.env')
    $backupPath = $settings.EXTERNAL_BACKUP_HOST_PATH
    if ($backupPath) {
      $backupPath = [IO.Path]::GetFullPath($backupPath)
      $driveRoot = [IO.Path]::GetPathRoot($backupPath)
      if ($driveRoot -notin $externalDrives) {
        Write-Host 'The configured external backup drive is disconnected or is not a removable/USB drive. Local backups remain available.' -ForegroundColor Yellow
        return
      }
    } elseif ($externalDrives.Count -eq 1) {
      $backupPath = Join-Path $externalDrives[0] 'PUPSJ-RMS-Backups'
    } else {
      $reason = if ($externalDrives.Count -eq 0) { 'No external backup drive is connected.' } else { 'Multiple external drives are connected. Set EXTERNAL_BACKUP_HOST_PATH in app\.env to choose the backup folder.' }
      Write-Host "$reason Local backups remain available." -ForegroundColor Yellow
      return
    }
    New-Item -ItemType Directory -Force -Path $backupPath | Out-Null
    $probe = Join-Path $backupPath ('.pupsj-write-test-' + [guid]::NewGuid().ToString())
    try { [IO.File]::WriteAllText($probe, '') } finally { if (Test-Path -LiteralPath $probe) { Remove-Item -LiteralPath $probe -Force } }
    $configuration = @{ services = @{ app = @{
      environment = @{ EXTERNAL_BACKUP_PATH = '/backups/external'; EXTERNAL_BACKUP_REQUIRE_MOUNT = 'true' }
      volumes = @(@{ type = 'bind'; source = $backupPath.Replace('\', '/'); target = '/backups/external'; bind = @{ create_host_path = $false } })
    } } }
    [IO.File]::WriteAllText($overridePath, ($configuration | ConvertTo-Json -Depth 8), (New-Object Text.UTF8Encoding($false)))
    $env:COMPOSE_FILE = 'docker-compose.yml;docker-compose.external-backup.yml'
    Write-Host "External backups configured at $backupPath"
  } catch {
    Write-Host "External backup configuration could not complete: $_. Local backups remain available." -ForegroundColor Yellow
  }
}
