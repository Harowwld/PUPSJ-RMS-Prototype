$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'PUPSJRMSEmail.ps1')
function Assert-Equal($Actual, $Expected, [string]$Message) {
  if ($Actual -cne $Expected) { throw $Message }
}
$path = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid().ToString() + '.env')
try {
  $original = "# Preserve this comment`nJWT_SECRET=unchanged`nSMTP_PASSWORD=old`nSMTP_PASSWORD=duplicate`nAPP_URL=http://localhost:3000`n"
  [IO.File]::WriteAllText($path, $original)
  $password = 'p$a${HOME}$$#"''\ ending\'
  Set-PUPSJEnv $path ([ordered]@{ SMTP_PASSWORD = $password; SMTP_USER = 'a user'; SMTP_HOST = 'mail.example.com' })
  $values = Read-PUPSJEnv $path
  Assert-Equal $values.SMTP_PASSWORD $password 'Password serialization did not roundtrip.'
  Assert-Equal $values.JWT_SECRET 'unchanged' 'Unrelated settings changed.'
  Assert-Equal $values.SMTP_USER 'a user' 'Whitespace did not roundtrip.'
  $text = [IO.File]::ReadAllText($path)
  if (-not $text.Contains('# Preserve this comment')) { throw 'Comment was removed.' }
  if (([regex]::Matches($text, '(?m)^SMTP_PASSWORD=')).Count -ne 1) { throw 'Duplicate target keys remain.' }
  foreach ($value in @('a"b', "a'b", '$1${HOME}$$', '# password', ' ends ', 'slash\', 'two\\')) {
    Set-PUPSJEnv $path @{ SMTP_PASSWORD = $value }
    Assert-Equal (Read-PUPSJEnv $path).SMTP_PASSWORD $value 'Special-character roundtrip failed.'
  }
  $rejected = $false
  try { ConvertTo-PUPSJEnvValue "a`nb" | Out-Null } catch { $rejected = $true }
  if (-not $rejected) { throw 'Multiline value was accepted.' }
  function Read-Host { param($Prompt) return '' }
  $before = [IO.File]::ReadAllText($path)
  $result = Invoke-PUPSJEmailWizard $path
  if ($result.Changed) { throw 'Skip reported a change.' }
  Assert-Equal ([IO.File]::ReadAllText($path)) $before 'Skip rewrote configuration.'
  Assert-Equal (Read-PUPSJSetting 'Username' 'kept' { param($v) $v -eq 'kept' }) 'kept' 'Blank prompt did not keep current setting.'
  function Protect-PUPSJEnv { param($Path) }
  Set-PUPSJEnv $path ([ordered]@{
    SMTP_HOST = 'mail.example.com'; SMTP_PORT = '587'; SMTP_SECURE = 'false'
    SMTP_USER = 'account'; SMTP_PASSWORD = $password; SMTP_FROM = 'Office <office@example.com>'
    APP_URL = 'http://192.168.1.20:3000'; UNRELATED = 'café'
  })
  $script:answers = New-Object 'System.Collections.Generic.Queue[string]'
  foreach ($answer in @('C', '', '', '', '', '', '', '', '')) { $script:answers.Enqueue($answer) }
  function Read-Host {
    param($Prompt, [switch]$AsSecureString)
    if ($script:answers.Count -eq 0) { throw "Unexpected prompt: $Prompt" }
    $answer = $script:answers.Dequeue()
    if ($AsSecureString) {
      if ($answer) { return ConvertTo-SecureString $answer -AsPlainText -Force }
      return New-Object Security.SecureString
    }
    return $answer
  }
  $result = Invoke-PUPSJEmailWizard $path
  if (-not $result.Changed) { throw 'Configure did not report a change.' }
  Assert-Equal (Read-PUPSJEnv $path).SMTP_PASSWORD $password 'Blank password did not preserve saved password.'
  Assert-Equal (Read-PUPSJEnv $path).SMTP_USER 'account' 'Blank username did not preserve saved username.'
  Assert-Equal (Read-PUPSJEnv $path).UNRELATED 'café' 'UTF-8 unrelated value changed.'
  foreach ($answer in @('C', '', '', '', 'N', '', '')) { $script:answers.Enqueue($answer) }
  Invoke-PUPSJEmailWizard $path | Out-Null
  Assert-Equal (Read-PUPSJEnv $path).SMTP_USER '' 'No authentication did not clear username.'
  Assert-Equal (Read-PUPSJEnv $path).SMTP_PASSWORD '' 'No authentication did not clear password.'
  Write-Host 'Email configuration tests passed (serialization, preservation, duplicate keys, skip, blank prompts, multiline rejection).'
} finally {
  Remove-Item $path -ErrorAction SilentlyContinue
}
