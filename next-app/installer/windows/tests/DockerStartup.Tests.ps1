$ErrorActionPreference = 'Stop'
$installer = Get-Content (Join-Path $PSScriptRoot '../Install-PUPSJRMS.ps1') -Raw
$start = $installer.IndexOf('. (Join-Path $PSScriptRoot "PUPSJRMSDocker.ps1")')
$start = $installer.IndexOf("`n", $start) + 1
$end = $installer.IndexOf('$engineReady = $false', $start)
$startup = [scriptblock]::Create($installer.Substring($start, $end - $start))
$helperRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
function Assert($condition, $message) { if (-not $condition) { throw $message } }
function Test-Case($name, $cliExists, $desktopExists, $custom, $registration, $hasWinget, $installWorks, $launchWorks = $true) {
  $fixture = Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString())
  New-Item -ItemType Directory $fixture | Out-Null
  New-PSDrive -Name D -PSProvider FileSystem -Root $fixture | Out-Null
  $env:ProgramFiles = Join-Path $fixture 'ProgramFiles'
  $env:LOCALAPPDATA = Join-Path $fixture 'AppData'
  $root = Join-Path $env:ProgramFiles 'Docker/Docker'
  if ($custom) { $root = 'D:\Apps with spaces\Docker' }
  $script:testCli = Join-Path $root 'resources/bin/docker.exe'
  $script:testDesktop = Join-Path $root 'Docker Desktop.exe'
  $script:registered = $registration
  $script:wingetAvailable = $hasWinget
  $script:installWorks = $installWorks
  $script:launchWorks = $launchWorks
  $script:installs = 0
  $script:started = $null
  New-Item -ItemType Directory -Force (Split-Path $script:testCli) | Out-Null
  if ($cliExists) { New-Item -ItemType File $script:testCli | Out-Null }
  if ($desktopExists) { New-Item -ItemType File $script:testDesktop | Out-Null }
  function Get-Command($Name, $ErrorAction) {
    if ($Name -eq 'winget.exe' -and $script:wingetAvailable) { return @{Source='winget.exe'} }
    if ($Name -eq 'docker.exe' -and $script:registered -eq 'none' -and (Test-Path $script:testCli)) { return @{Source=$script:testCli} }
  }
  function Get-ItemProperty($Path, $ErrorAction) {
    if ($script:registered -eq 'stale' -and $Path -like '*App Paths*') { return @{'(default)'='E:\Old Docker\Docker Desktop.exe'} }
    if ($script:registered -eq 'stale' -and $Path -like '*Uninstall*') { return @{DisplayName='Docker Desktop';InstallLocation=(Split-Path $script:testDesktop)} }
    if ($script:registered -eq 'app' -and $Path -like '*App Paths*') { return @{'(default)'=$script:testDesktop} }
    if ($script:registered -eq 'uninstall' -and $Path -like '*Uninstall*') { return @{DisplayName='Docker Desktop';InstallLocation=(Split-Path $script:testDesktop)} }
  }
  function winget {
    $script:installs++
    if ($script:installWorks) { New-Item -ItemType File -Force $script:testCli, $script:testDesktop | Out-Null }
    $global:LASTEXITCODE = 0
  }
  function Start-Process($FilePath) {
    if (-not (Test-Path -LiteralPath $FilePath) -or -not $script:launchWorks) { throw 'The system cannot find the file specified.' }
    $script:started = $FilePath
  }
  $failure = $null
  try { . (Join-Path $helperRoot 'PUPSJRMSDocker.ps1'); . $startup } catch { $failure = $_.Exception.Message }
  try {
    if (-not $hasWinget -and -not $desktopExists) {
      Assert ($failure -match 'Docker Desktop was not found, and winget is unavailable') "$name needs package manager advice: $failure"
    } elseif (-not $launchWorks) {
      Assert ($failure -like "*Could not start Docker Desktop at '$script:testDesktop'*repair Docker Desktop*") "$name needs explicit path and repair advice: $failure"
    } elseif (-not $installWorks -and -not $desktopExists) {
      Assert ($failure -match 'Docker Desktop executable was not found after installation') "$name needs actionable missing executable error: $failure"
    } else {
      Assert (-not $failure) "$name failed: $failure"
      Assert ($script:started -eq $script:testDesktop) "$name launched wrong executable"
    }
    $expected = if ($desktopExists -or -not $hasWinget) {0} else {1}
    Assert ($script:installs -eq $expected) "$name installed $script:installs times, expected $expected"
    Write-Host "PASS: $name"
  } finally { Remove-PSDrive D; Remove-Item -Recurse -Force $fixture }
}
Test-Case 'CLI alone installs Desktop' $true $false $false 'none' $true $true
Test-Case 'Fresh install' $false $false $false 'none' $true $true
Test-Case 'Custom drive and spaces from CLI, no winget' $true $true $true 'none' $false $true
Test-Case 'Custom drive App Paths without PATH or winget' $true $true $true 'app' $false $true
Test-Case 'Custom drive uninstall registry without PATH or winget' $true $true $true 'uninstall' $false $true
Test-Case 'Standard existing Desktop, no winget' $true $true $false 'none' $false $true
Test-Case 'Missing Desktop after installation' $true $false $false 'none' $true $false
Test-Case 'Broken Desktop launch reports path and repair' $true $true $true 'none' $false $true $false
Test-Case 'Missing Desktop and winget has actionable error' $true $false $false 'none' $false $false
Test-Case 'Unplugged registered drive does not hide valid Desktop' $true $true $true 'stale' $false $true
