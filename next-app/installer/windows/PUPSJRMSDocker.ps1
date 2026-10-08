function Get-PUPSJDockerPaths {
  $cli = (Get-Command docker.exe -ErrorAction SilentlyContinue).Source
  $roots = @()
  if ($cli) { $roots += Split-Path (Split-Path (Split-Path $cli)) }
  foreach ($hive in @('HKCU:\Software', 'HKLM:\Software', 'HKLM:\Software\WOW6432Node')) {
    $appPath = Get-ItemProperty "$hive\Microsoft\Windows\CurrentVersion\App Paths\Docker Desktop.exe" -ErrorAction SilentlyContinue
    if ($appPath.'(default)') { $roots += Split-Path ([Environment]::ExpandEnvironmentVariables($appPath.'(default)').Trim('"')) }
    $entries = Get-ItemProperty "$hive\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue
    foreach ($entry in $entries) {
      if ($entry.DisplayName -eq 'Docker Desktop' -and $entry.InstallLocation) {
        $roots += [Environment]::ExpandEnvironmentVariables($entry.InstallLocation).Trim('"')
      }
    }
  }
  if ($env:ProgramFiles) { $roots += Join-Path $env:ProgramFiles 'Docker\Docker' }
  if ($env:LOCALAPPDATA) { $roots += Join-Path $env:LOCALAPPDATA 'Docker' }
  foreach ($root in ($roots | Select-Object -Unique)) {
    try { $desktop = Join-Path $root 'Docker Desktop.exe' }
    catch { continue }
    if (Test-Path -LiteralPath $desktop -PathType Leaf -ErrorAction SilentlyContinue) {
      $desktopCli = Join-Path $root 'resources\bin\docker.exe'
      if (Test-Path -LiteralPath $desktopCli -PathType Leaf -ErrorAction SilentlyContinue) { $cli = $desktopCli }
      return @{ Desktop = $desktop; Cli = $cli }
    }
  }
  return @{ Desktop = $null; Cli = $cli }
}

function Start-PUPSJDockerDesktop([string]$desktopPath) {
  Write-Host "Starting Docker Desktop from $desktopPath"
  try { Start-Process -FilePath $desktopPath }
  catch { throw "Could not start Docker Desktop at '$desktopPath': $($_.Exception.Message) Restart Windows and repair Docker Desktop if it still cannot open." }
}
