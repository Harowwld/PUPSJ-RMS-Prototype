function ConvertTo-PUPSJInstallPath([string]$Path) {
  $expanded = [Environment]::ExpandEnvironmentVariables($Path.Trim().Trim('"')) -replace '/', '\'
  if ($expanded -notmatch '^[A-Za-z]:\\' -or $expanded.Substring(2) -match '[<>:"|?*\x00-\x1f]') {
    throw 'Choose an absolute folder on a local drive, such as D:\PUPSJ-RMS. Network paths and relative paths are not supported.'
  }
  $segments = New-Object 'System.Collections.Generic.List[string]'
  foreach ($segment in ($expanded.Substring(3) -split '\\')) {
    if (-not $segment -or $segment -eq '.') { continue }
    if ($segment -eq '..') {
      if ($segments.Count -eq 0) { throw 'The installation path goes above its drive root.' }
      $segments.RemoveAt($segments.Count - 1)
    } else {
      if ($segment.EndsWith('.') -or $segment.EndsWith(' ') -or $segment -match '^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)') {
        throw "The installation path contains an invalid Windows folder name: $segment"
      }
      $segments.Add($segment)
    }
  }
  if ($segments.Count -eq 0) { throw 'Choose a dedicated folder, such as D:\PUPSJ-RMS, rather than the drive root.' }
  return $expanded.Substring(0, 1).ToUpperInvariant() + ':\' + ($segments -join '\')
}

function Get-PUPSJInstalledRoot {
  $registryPath = 'HKLM:\SOFTWARE\PUPSJ-RMS'
  try {
    if (Test-Path -LiteralPath $registryPath -ErrorAction Stop) {
      $registration = Get-ItemProperty -LiteralPath $registryPath -ErrorAction Stop
      if (-not $registration.InstallRoot) { throw 'The InstallRoot value is missing.' }
      return ConvertTo-PUPSJInstallPath $registration.InstallRoot
    }
  } catch {
    throw "Cannot read the PUPSJ RMS installation location from $registryPath. Run as Administrator or repair that registry entry. $($_.Exception.Message)"
  }
  return ConvertTo-PUPSJInstallPath (Join-Path $env:ProgramData 'PUPSJ-RMS')
}

function Assert-PUPSJInstallRoot([string]$InstallRoot, [string]$SourceRoot) {
  $root = ConvertTo-PUPSJInstallPath $InstallRoot
  $source = ConvertTo-PUPSJInstallPath $SourceRoot
  try { $drive = Get-PSDrive -Name $root.Substring(0, 1) -PSProvider FileSystem -ErrorAction Stop }
  catch { throw "The installation drive for '$root' is unavailable. Connect that drive and retry; the installer will keep your chosen location." }
  if ($drive.DisplayRoot -like '\\*' -or $drive.Root -like '\\*') {
    throw 'Choose a local drive for PUPSJ RMS, rather than a mapped network drive.'
  }
  if ($root.Equals($source, [StringComparison]::OrdinalIgnoreCase) -or
      $root.StartsWith($source + '\', [StringComparison]::OrdinalIgnoreCase) -or
      $source.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'The installation folder and extracted source folder must be separate and must not contain each other. Choose another installation folder.'
  }
  foreach ($path in @($root, $source, (Join-Path $root 'app'))) {
    $ancestor = $path
    while ($ancestor -and $ancestor -notmatch '^[A-Za-z]:\\?$') {
      if (Test-Path -LiteralPath $ancestor) {
        $item = Get-Item -LiteralPath $ancestor -Force -ErrorAction Stop
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Choose folders without junctions or symbolic links: $ancestor" }
        if (-not $item.PSIsContainer) { throw "The path is a file rather than a folder: $ancestor" }
      }
      $ancestor = Split-Path $ancestor -Parent
    }
  }
  $appRoot = Join-Path $root 'app'
  if (Test-Path -LiteralPath $appRoot) {
    foreach ($marker in @('package.json', 'src\lib\staffRepo.js', 'installer\windows\Install-PUPSJRMS.ps1')) {
      if (-not (Test-Path -LiteralPath (Join-Path $appRoot $marker) -PathType Leaf)) {
        throw "The existing '$appRoot' folder is not a recognized PUPSJ RMS installation. Choose a different folder; the installer will not overwrite it."
      }
    }
  }
  return $root
}

function Select-PUPSJInstallRoot([string]$SourceRoot) {
  $previous = Get-PUPSJInstalledRoot
  if ((Test-Path -LiteralPath 'HKLM:\SOFTWARE\PUPSJ-RMS' -ErrorAction Stop) -or
      (Test-Path -LiteralPath (Join-Path $previous 'app\.env') -PathType Leaf)) {
    Write-Host "Using the existing installation location: $previous"
    return Assert-PUPSJInstallRoot $previous $SourceRoot
  }
  Write-Host 'Choose a PUPSJ RMS installation folder on a local drive. This also holds the scanner hot-folder.'
  $selected = Read-Host "Installation folder (Enter for $previous)"
  if ([string]::IsNullOrWhiteSpace($selected)) { $selected = $previous }
  return Assert-PUPSJInstallRoot $selected $SourceRoot
}

function Save-PUPSJInstallRoot([string]$InstallRoot) {
  $root = ConvertTo-PUPSJInstallPath $InstallRoot
  if (-not (Test-Path -LiteralPath (Join-Path $root 'app\.env') -PathType Leaf)) {
    throw 'Cannot register the installation before its app\.env file exists.'
  }
  try {
    $registryPath = 'HKLM:\SOFTWARE\PUPSJ-RMS'
    New-Item -Path $registryPath -Force -ErrorAction Stop | Out-Null
    New-ItemProperty -LiteralPath $registryPath -Name InstallRoot -Value $root -PropertyType String -Force -ErrorAction Stop | Out-Null
  } catch {
    throw "Cannot save the installation location '$root'. Run as Administrator and retry before starting Docker. $($_.Exception.Message)"
  }
}
