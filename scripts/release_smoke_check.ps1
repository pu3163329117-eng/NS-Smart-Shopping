param(
  [string]$ApiBaseUrl = "http://localhost:8080/api",
  [string]$AllowedOrigin = "",
  [switch]$RunBusinessFlow,
  [switch]$ExpectStrictTransportSecurity
)

$ErrorActionPreference = "Stop"

function Step([string]$Message) {
  Write-Host "[Release-Smoke] $Message" -ForegroundColor Cyan
}

function Ok([string]$Message) {
  Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Fail([string]$Message) {
  Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Assert-HeaderEquals($Headers, [string]$HeaderName, [string]$ExpectedValue) {
  $actual = $Headers[$HeaderName]
  if (-not $actual) {
    throw "Missing response header: $HeaderName"
  }

  $actualValues = @()
  foreach ($item in ("$actual" -split ",")) {
    $trimmed = $item.Trim()
    if ($trimmed) {
      $actualValues += $trimmed
    }
  }

  if ($actualValues -notcontains $ExpectedValue) {
    throw "Header $HeaderName mismatch. expected includes '$ExpectedValue' actual=$actual"
  }
}

function Assert-HeaderPresent($Headers, [string]$HeaderName) {
  $actual = $Headers[$HeaderName]
  if (-not $actual) {
    throw "Missing response header: $HeaderName"
  }
}

function Invoke-JsonGet([string]$Url) {
  $resp = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 10
  $obj = $resp.Content | ConvertFrom-Json
  return @{
    Response = $resp
    Json = $obj
  }
}

try {
  $normalizedApiBase = $ApiBaseUrl.TrimEnd('/')
  $authProbeUrl = if ($normalizedApiBase -match '/api$') {
    "$normalizedApiBase/auth/login"
  } else {
    "$normalizedApiBase/api/auth/login"
  }

  Step "Check liveness endpoint /healthz"
  $healthz = Invoke-JsonGet "$normalizedApiBase/healthz"
  if ($healthz.Response.StatusCode -ne 200) {
    throw "/healthz returned HTTP $($healthz.Response.StatusCode)"
  }
  if ($healthz.Json.status -ne "ok") {
    throw "/healthz status expected ok, got $($healthz.Json.status)"
  }
  Ok "/healthz is healthy"

  Step "Check readiness endpoint /readyz"
  $readyz = Invoke-JsonGet "$normalizedApiBase/readyz"
  if ($readyz.Response.StatusCode -ne 200) {
    throw "/readyz returned HTTP $($readyz.Response.StatusCode)"
  }
  if ($readyz.Json.status -ne "ok") {
    throw "/readyz status expected ok, got $($readyz.Json.status)"
  }
  if ($readyz.Json.db -ne "up") {
    throw "/readyz db expected up, got $($readyz.Json.db)"
  }
  Ok "/readyz is healthy and DB is ready"

  Step "Check backward-compatible health endpoint /health"
  $health = Invoke-JsonGet "$normalizedApiBase/health"
  if ($health.Response.StatusCode -ne 200) {
    throw "/health returned HTTP $($health.Response.StatusCode)"
  }
  if ($health.Json.status -ne "ok") {
    throw "/health status expected ok, got $($health.Json.status)"
  }
  Ok "/health remains compatible"

  Step "Verify security and observability headers"
  $headers = $healthz.Response.Headers
  Assert-HeaderEquals -Headers $headers -HeaderName "X-Content-Type-Options" -ExpectedValue "nosniff"
  Assert-HeaderEquals -Headers $headers -HeaderName "X-Frame-Options" -ExpectedValue "SAMEORIGIN"
  Assert-HeaderEquals -Headers $headers -HeaderName "Referrer-Policy" -ExpectedValue "strict-origin-when-cross-origin"
  Assert-HeaderPresent -Headers $headers -HeaderName "X-Request-Id"
  if ($ExpectStrictTransportSecurity) {
    Assert-HeaderPresent -Headers $headers -HeaderName "Strict-Transport-Security"
  }
  Ok "Headers are present and correct"

  if ($AllowedOrigin) {
    Step "Verify CORS preflight for AllowedOrigin=$AllowedOrigin"
    $corsHeaders = @{
      Origin = $AllowedOrigin
      "Access-Control-Request-Method" = "POST"
      "Access-Control-Request-Headers" = "content-type,authorization"
    }
    $preflight = Invoke-WebRequest -Uri $authProbeUrl -Method Options -Headers $corsHeaders -TimeoutSec 10
    $allowOrigin = $preflight.Headers["Access-Control-Allow-Origin"]
    if (-not $allowOrigin) {
      throw "CORS preflight missing Access-Control-Allow-Origin"
    }
    if ($allowOrigin -ne $AllowedOrigin) {
      throw "Access-Control-Allow-Origin mismatch. expected=$AllowedOrigin actual=$allowOrigin"
    }
    Ok "CORS preflight passed"
  }

  if ($RunBusinessFlow) {
    Step "Run existing business smoke flow (MVP full path)"
    $mvpScript = Join-Path $PSScriptRoot "mvp_smoke_check.ps1"
    $mvpBaseUrl = if ($normalizedApiBase -match '/api$') { $normalizedApiBase } else { "$normalizedApiBase/api" }
    & powershell -ExecutionPolicy Bypass -File $mvpScript -BaseUrl $mvpBaseUrl
    if ($LASTEXITCODE -ne 0) {
      throw "mvp_smoke_check.ps1 failed with exit code $LASTEXITCODE"
    }
    Ok "Business flow smoke passed"
  }

  Write-Host "`n[Release-Smoke] ALL CHECKS PASSED" -ForegroundColor Green
  exit 0
} catch {
  Fail $_.Exception.Message
  if ($_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message -ForegroundColor DarkRed
  }
  exit 1
}
