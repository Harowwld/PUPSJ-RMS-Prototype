param(
  [Parameter(Mandatory = $true)][string]$AppRoot,
  [string]$DockerCli = "docker.exe",
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

Push-Location $AppRoot
try {
  $bindings = @(& $DockerCli compose port app 3000)
  if ($LASTEXITCODE -ne 0) {
    throw "Could not read the app's published Docker port. Open Docker Desktop and run docker compose ps from $AppRoot."
  }
} finally {
  Pop-Location
}

$publishedPorts = @()
foreach ($binding in $bindings) {
  if ($binding.Trim() -match ':(\d+)\s*$') {
    $port = 0
    if ([int]::TryParse($Matches[1], [ref]$port) -and $port -ge 1 -and $port -le 65535) {
      if ($publishedPorts -notcontains $port) { $publishedPorts += $port }
    }
  }
}
if ($publishedPorts.Count -eq 0) {
  throw "Docker did not report a valid published port for app port 3000. Check APP_PORT in $AppRoot\.env and the app ports in docker-compose.yml, then restart the app."
}

$candidateUrls = @(
  foreach ($port in $publishedPorts) { "http://127.0.0.1:$port/" }
  foreach ($port in $publishedPorts) { "http://[::1]:$port/" }
)
$url = $null
$reachable = $false
$lastErrors = @{}
for ($attempt = 1; $attempt -le 5; $attempt++) {
  foreach ($candidateUrl in $candidateUrls) {
    $response = $null
    try {
      $request = [System.Net.HttpWebRequest]::Create($candidateUrl)
      $request.Proxy = $null
      $request.AllowAutoRedirect = $false
      $request.Timeout = 5000
      $request.ReadWriteTimeout = 5000
      $response = $request.GetResponse()
      $statusCode = [int]$response.StatusCode
      if ($statusCode -ge 300 -and $statusCode -lt 400) {
        throw "The configured address $candidateUrl redirected (HTTP $statusCode). Check the app's redirect configuration before opening this address."
      }
      if ($statusCode -lt 200 -or $statusCode -ge 300) {
        throw "The configured address $candidateUrl returned HTTP $statusCode instead of a successful response."
      }
      $url = $candidateUrl
      $reachable = $true
      break
    } catch {
      $lastErrors[$candidateUrl] = $_.Exception.Message
      if ($_.Exception.Response) { $_.Exception.Response.Close() }
    } finally {
      if ($response) { $response.Close() }
    }
  }
  if ($reachable) { break }
  if ($attempt -lt 5) { Start-Sleep -Seconds 2 }
}
if (-not $reachable) {
  $failures = @(
    foreach ($candidateUrl in $candidateUrls) {
      $family = "IPv4"
      if ($candidateUrl.Contains("[::1]")) { $family = "IPv6" }
      "${family} ${candidateUrl}: $($lastErrors[$candidateUrl])"
    }
  ) -join "`n"
  throw "Docker publishes app port 3000 on Windows port(s) $($publishedPorts -join ', '), but direct Windows HTTP checks failed for all addresses. From $AppRoot, run docker compose ps and docker compose logs --tail 50 app; check Docker Desktop port forwarding and whether the host exposes IPv4 or IPv6 loopback. Last errors:`n$failures"
}

if ($OpenBrowser) {
  Write-Host "Opening PUPSJ RMS at $url"
  Start-Process $url
}
Write-Output $url
