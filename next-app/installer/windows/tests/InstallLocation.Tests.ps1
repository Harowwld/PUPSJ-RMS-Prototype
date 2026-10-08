$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../PUPSJRMSInstallLocation.ps1')
function Assert($condition, $message) { if (-not $condition) { throw $message } }
function Assert-Throws($action, $pattern) {
  $failure = $null
  try { & $action | Out-Null } catch { $failure = $_.Exception.Message }
  Assert ($failure -and $failure -like $pattern) "Expected '$pattern', received '$failure'"
}
$fixture = Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString())
New-Item -ItemType Directory $fixture | Out-Null
New-PSDrive -Name R -PSProvider FileSystem -Root $fixture | Out-Null
$previousProgramData = $env:ProgramData
$env:ProgramData = 'R:\ProgramData'
$script:registered = $null
$script:registryExists = $false
$script:registryError = $false
$script:registryWriteError = $false
$script:promptCalls = 0
$script:chosen = 'R:\Apps with spaces\PUPSJ-RMS'
function Test-Path($LiteralPath, $PathType, $ErrorAction) {
  if ($LiteralPath -eq 'HKLM:\SOFTWARE\PUPSJ-RMS') {
    if ($script:registryError) { throw 'Access denied' }
    return $script:registryExists
  }
  if ($PathType) { return Microsoft.PowerShell.Management\Test-Path -LiteralPath $LiteralPath -PathType $PathType }
  return Microsoft.PowerShell.Management\Test-Path -LiteralPath $LiteralPath
}
function Get-ItemProperty($LiteralPath, $ErrorAction) { return @{InstallRoot=$script:registered} }
function Read-Host($Prompt) { $script:promptCalls++; return $script:chosen }
function New-ItemProperty($LiteralPath, $Name, $Value, $PropertyType, [switch]$Force, $ErrorAction) {
  if ($script:registryWriteError) { throw 'Access denied' }
  $script:registered = $Value
}
function New-Item {
  param($Path, $ItemType, [switch]$Force, $ErrorAction)
  if ($Path -eq 'HKLM:\SOFTWARE\PUPSJ-RMS') { $script:registryExists = $true; return }
  Microsoft.PowerShell.Management\New-Item -Path $Path -ItemType $ItemType -Force:$Force
}
function New-RecognizedApp($Root) {
  foreach ($marker in @('package.json', 'src/lib/staffRepo.js', 'installer/windows/Install-PUPSJRMS.ps1')) {
    $file = Join-Path (Join-Path $Root 'app') $marker
    New-Item -ItemType Directory -Force (Split-Path $file) | Out-Null
    New-Item -ItemType File $file | Out-Null
  }
}
try {
  Assert ((ConvertTo-PUPSJInstallPath 'r:/Apps/old/../PUPSJ-RMS/') -eq 'R:\Apps\PUPSJ-RMS') 'Path normalization failed'
  foreach ($bad in @('R:\', '..\PUPSJ-RMS', '\\server\share\RMS', 'R:\bad?folder', 'R:\NUL', 'R:\folder.')) {
    Assert-Throws { ConvertTo-PUPSJInstallPath $bad } '*'
  }
  $selected = Select-PUPSJInstallRoot 'R:\source'
  Assert ($selected -eq $script:chosen -and $script:promptCalls -eq 1) 'Custom drive with spaces was not selected'
  Assert-Throws { Assert-PUPSJInstallRoot 'R:\source\installed' 'R:\source' } '*must be separate*'
  Assert-Throws { Assert-PUPSJInstallRoot 'R:\Apps' 'R:\Apps\source' } '*must be separate*'
  Assert-Throws { Assert-PUPSJInstallRoot 'Z:\missing\RMS' 'R:\source' } '*drive*unavailable*'
  New-Item -ItemType Directory -Force 'R:\unknown\app' | Out-Null
  New-Item -ItemType File 'R:\unknown\app\keep-me.txt' | Out-Null
  Assert-Throws { Assert-PUPSJInstallRoot 'R:\unknown' 'R:\source' } '*will not overwrite*'
  Assert (Test-Path -LiteralPath 'R:\unknown\app\keep-me.txt') 'Unrecognized destination was modified'
  Assert-Throws { Save-PUPSJInstallRoot $selected } '*before its app*'
  New-RecognizedApp $selected
  New-Item -ItemType File (Join-Path $selected 'app/.env') | Out-Null
  Save-PUPSJInstallRoot $selected
  $script:chosen = 'R:\wrong-new-path'
  Assert ((Select-PUPSJInstallRoot 'R:\source') -eq $selected) 'Registered installation was not reused'
  Assert ($script:promptCalls -eq 1) 'Existing installation prompted for a new location'
  Assert ((Get-PUPSJInstalledRoot) -eq $selected) 'Email reconfiguration could not find custom installation'
  $script:registryWriteError = $true
  Assert-Throws { Save-PUPSJInstallRoot $selected } '*Cannot save*Administrator*'
  Assert ((Get-PUPSJInstalledRoot) -eq $selected) 'Failed registration discarded the saved location'
  Assert (Test-Path -LiteralPath (Join-Path $selected 'app/.env')) 'Failed registration discarded the existing environment'
  $script:registryWriteError = $false
  $script:registered = 'R:\missing-drive-folder'
  Assert ((Select-PUPSJInstallRoot 'R:\source') -eq $script:registered) 'Repair discarded registered location'
  $script:registryExists = $false
  New-RecognizedApp 'R:\ProgramData\PUPSJ-RMS'
  New-Item -ItemType File 'R:\ProgramData\PUPSJ-RMS\app\.env' | Out-Null
  Assert ((Select-PUPSJInstallRoot 'R:\source') -eq 'R:\ProgramData\PUPSJ-RMS') 'Legacy installation was not reused'
  Assert ($script:promptCalls -eq 1) 'Legacy installation prompted for a new location'
  $script:registryError = $true
  Assert-Throws { Get-PUPSJInstalledRoot } '*Cannot read*Administrator*'
  Write-Host 'PASS: installation paths, custom volume, safe copy boundaries, registration, legacy reuse, repair, and registry errors'
} finally {
  $env:ProgramData = $previousProgramData
  Remove-PSDrive R
  Remove-Item -Recurse -Force $fixture
}
