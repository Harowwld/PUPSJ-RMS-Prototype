function ConvertTo-PUPSJEnvValue([string]$Value) {
  if ($Value -match '[\r\n\x00]') { throw "Configuration values must be a single line." }
  return '"' + $Value.Replace('\', '\\').Replace('"', '\"').Replace('$', '$$') + '"'
}

function Read-PUPSJEnv([string]$Path) {
  $values = @{}
  foreach ($line in [IO.File]::ReadAllLines($Path)) {
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') { continue }
    $key = $Matches[1]
    $raw = $Matches[2].Trim()
    if ($raw.StartsWith('"')) {
      $builder = New-Object Text.StringBuilder
      for ($i = 1; $i -lt $raw.Length; $i++) {
        $character = $raw[$i]
        if ($character -eq '"') { break }
        if ($character -eq '\' -and $i + 1 -lt $raw.Length) {
          $i++
          $character = $raw[$i]
          switch ($character) {
            'n' { $character = "`n" }
            'r' { $character = "`r" }
            't' { $character = "`t" }
            '\' { }
            '"' { }
            default { [void]$builder.Append('\') }
          }
        }
        [void]$builder.Append($character)
      }
      $values[$key] = $builder.ToString().Replace('$$', '$')
    } elseif ($raw.StartsWith("'")) {
      $builder = New-Object Text.StringBuilder
      for ($i = 1; $i -lt $raw.Length; $i++) {
        if ($raw[$i] -eq "'") { break }
        if ($raw[$i] -eq '\' -and $i + 1 -lt $raw.Length -and $raw[$i + 1] -eq "'") { $i++ }
        [void]$builder.Append($raw[$i])
      }
      $values[$key] = $builder.ToString()
    } else {
      $values[$key] = ($raw -replace '\s+#.*$', '').Trim()
    }
  }
  return $values
}

function Set-PUPSJEnv([string]$Path, [System.Collections.IDictionary]$Values) {
  $lines = New-Object 'System.Collections.Generic.List[string]'
  $written = @{}
  foreach ($line in [IO.File]::ReadAllLines($Path)) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=') {
      $key = $Matches[1]
      if ($Values.Contains($key)) {
        if (-not $written.ContainsKey($key)) {
          $lines.Add($key + '=' + (ConvertTo-PUPSJEnvValue ([string]$Values[$key])))
          $written[$key] = $true
        }
        continue
      }
    }
    $lines.Add($line)
  }
  foreach ($key in $Values.Keys) {
    if (-not $written.ContainsKey($key)) { $lines.Add($key + '=' + (ConvertTo-PUPSJEnvValue ([string]$Values[$key]))) }
  }
  [IO.File]::WriteAllLines($Path, $lines, (New-Object Text.UTF8Encoding($false)))
}

function Protect-PUPSJEnv([string]$Path) {
  & icacls $Path /inheritance:r /grant:r '*S-1-5-32-544:(F)' '*S-1-5-18:(F)' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not restrict access to the configuration file." }
}

function Read-PUPSJSetting([string]$Prompt, [string]$Current, [scriptblock]$Validate) {
  while ($true) {
    $label = $Prompt
    if ($Current) { $label += " [$Current]" }
    $answer = Read-Host $label
    if ([string]::IsNullOrWhiteSpace($answer)) { $answer = $Current }
    if (& $Validate $answer) { return $answer }
    Write-Host "Please enter a valid value." -ForegroundColor Yellow
  }
}

function Invoke-PUPSJEmailWizard([string]$EnvPath) {
  Write-Host ""
  Write-Host "Email setup enables password-reset links and account emails."
  $choice = Read-Host "Configure email now? Enter C to configure, or press Enter to skip"
  if ($choice -notmatch '^(?i:c|configure)$') {
    $existing = Read-PUPSJEnv $EnvPath
    if ($existing.SMTP_HOST) {
      Write-Host "Email configuration was kept unchanged."
    } else {
      Write-Host "Email recovery is unavailable until email is configured. Security-question recovery remains available for accounts with saved answers."
    }
    return [PSCustomObject]@{ Changed = $false }
  }
  $current = Read-PUPSJEnv $EnvPath
  $updates = [ordered]@{}
  $updates.SMTP_HOST = Read-PUPSJSetting 'SMTP host' $current.SMTP_HOST { param($v) $v -match '^[A-Za-z0-9][A-Za-z0-9.:-]*$' }
  $portDefault = $current.SMTP_PORT
  if (-not $portDefault) { $portDefault = '587' }
  $updates.SMTP_PORT = Read-PUPSJSetting 'SMTP port (usually 587 for STARTTLS, 465 for implicit TLS)' $portDefault {
    param($v) $port = 0; [int]::TryParse($v, [ref]$port) -and $port -ge 1 -and $port -le 65535
  }
  $secureDefault = 'false'
  if ($updates.SMTP_PORT -eq '465') { $secureDefault = 'true' }
  if ($updates.SMTP_PORT -eq $current.SMTP_PORT -and $current.SMTP_SECURE -match '^(true|false)$') { $secureDefault = $current.SMTP_SECURE }
  $updates.SMTP_SECURE = Read-PUPSJSetting 'Use implicit TLS? true/false (false allows STARTTLS)' $secureDefault { param($v) $v -cmatch '^(true|false)$' }
  $authDefault = 'Y'
  if ($current.SMTP_HOST -and -not $current.SMTP_USER) { $authDefault = 'N' }
  $auth = Read-PUPSJSetting 'Does this server require authentication? Y/N' $authDefault { param($v) $v -match '^(?i:y|n)$' }
  if ($auth -match '^(?i:y)$') {
    $updates.SMTP_USER = Read-PUPSJSetting 'SMTP username' $current.SMTP_USER { param($v) -not [string]::IsNullOrWhiteSpace($v) -and $v -notmatch '[\r\n\x00]' }
    while ($true) {
      $secret = Read-Host 'SMTP password (hidden; press Enter to keep an existing password)' -AsSecureString
      $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
      try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
      finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $secret.Dispose() }
      if (-not $password) { $password = $current.SMTP_PASSWORD }
      if ($password -and $password -notmatch '[\r\n\x00]') { break }
      Write-Host 'An SMTP password is required when authentication is enabled.' -ForegroundColor Yellow
    }
    $updates.SMTP_PASSWORD = $password
  } else {
    $updates.SMTP_USER = ''
    $updates.SMTP_PASSWORD = ''
  }
  $updates.SMTP_FROM = Read-PUPSJSetting 'Sender address (email or Name <email>)' $current.SMTP_FROM {
    param($v)
    if ($v -match '[\r\n\x00]') { return $false }
    try { $address = New-Object Net.Mail.MailAddress($v); return $address.Address.Contains('@') } catch { return $false }
  }
  Write-Host 'Use the application address recipients can open, for example http://192.168.1.20:3000. Localhost links only work on this PC.'
  $updates.APP_URL = Read-PUPSJSetting 'Application address for reset links' $current.APP_URL {
    param($v)
    $uri = $null
    [Uri]::TryCreate($v, [UriKind]::Absolute, [ref]$uri) -and $uri.Scheme -in @('http', 'https') -and $uri.Host -and -not $uri.UserInfo -and -not $uri.Query -and -not $uri.Fragment
  }
  Set-PUPSJEnv $EnvPath $updates
  Protect-PUPSJEnv $EnvPath
  $password = $null
  Write-Host 'Email configuration saved. Existing accounts and passwords are unchanged.'
  return [PSCustomObject]@{ Changed = $true }
}

function Invoke-PUPSJEmailTest([string]$DockerCli) {
  $answer = Read-Host 'Send a test email now? Enter Y, or press Enter to skip'
  if ($answer -notmatch '^(?i:y|yes)$') { return }
  $recipient = Read-PUPSJSetting 'Test recipient email' '' {
    param($v)
    if ($v -match '[\r\n\x00]') { return $false }
    try { $address = New-Object Net.Mail.MailAddress($v); return $address.Address -eq $v -and $address.Address.Contains('@') } catch { return $false }
  }
  $confirmation = Read-Host "Send one test email to ${recipient}? Enter Y to send"
  if ($confirmation -notmatch '^(?i:y|yes)$') { return }
  $previousEncoding = $OutputEncoding
  try {
    $OutputEncoding = New-Object Text.UTF8Encoding($false)
    @{ to = $recipient } | ConvertTo-Json -Compress | & $DockerCli compose exec -T app node scripts/test-smtp.mjs
    $testExitCode = $LASTEXITCODE
  } finally { $OutputEncoding = $previousEncoding }
  if ($testExitCode -ne 0) {
    Write-Host 'The test email failed. Check the settings with Configure Email and try again.' -ForegroundColor Yellow
  } else {
    Write-Host 'Check the recipient Inbox and Spam. SMTP acceptance alone does not confirm inbox delivery.'
  }
}
