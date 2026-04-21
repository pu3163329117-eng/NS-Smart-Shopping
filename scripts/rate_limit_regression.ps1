param(
  [string]$ApiBaseUrl = "http://localhost:8080/api",
  [string]$Phone = "13800138000",
  [string]$Code = "123456"
)

$ErrorActionPreference = "Stop"

function Step([string]$Message) {
  Write-Host "[RateLimit-Regression] $Message" -ForegroundColor Cyan
}

function Ok([string]$Message) {
  Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Fail([string]$Message) {
  Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Read-ResponseBody([System.Net.WebResponse]$Response) {
  if (-not $Response) { return "" }
  $stream = $Response.GetResponseStream()
  if (-not $stream) { return "" }
  $reader = New-Object System.IO.StreamReader($stream)
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
    $stream.Dispose()
  }
}

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [hashtable]$Headers = @{},
    [string]$Body = "",
    [string]$ContentType = "application/json"
  )

  try {
    $invokeParams = @{
      Method = $Method
      Uri = $Uri
      Headers = $Headers
      TimeoutSec = 20
    }
    if ($Body -ne "") {
      $invokeParams["Body"] = $Body
      $invokeParams["ContentType"] = $ContentType
    }

    $resp = Invoke-WebRequest @invokeParams
    return @{
      StatusCode = [int]$resp.StatusCode
      Body = $resp.Content
      Headers = $resp.Headers
    }
  } catch [System.Net.WebException] {
    $rawResp = $_.Exception.Response
    if (-not $rawResp) { throw }
    return @{
      StatusCode = [int]$rawResp.StatusCode
      Body = (Read-ResponseBody -Response $rawResp)
      Headers = $rawResp.Headers
    }
  }
}

function Parse-Json([string]$Text) {
  if (-not $Text) { return $null }
  try {
    return ($Text | ConvertFrom-Json)
  } catch {
    return $null
  }
}

try {
  $base = $ApiBaseUrl.TrimEnd('/')

  Step "Check /auth/send-code limiter (1 request/min per IP)"
  $randomPhone = "13" + (Get-Random -Minimum 100000000 -Maximum 999999999)
  $sendBody = @{ phone = $randomPhone } | ConvertTo-Json

  $sendResults = @()
  for ($i = 1; $i -le 2; $i++) {
    $sendResults += Invoke-Api -Method "POST" -Uri "$base/auth/send-code" -Body $sendBody
  }

  $sendCodes = @($sendResults | ForEach-Object { $_.StatusCode })
  if ($sendCodes -contains 429) {
    Ok "/auth/send-code limiter triggered as expected (statuses=$($sendCodes -join ','))"
  } else {
    throw "/auth/send-code limiter did not trigger (statuses=$($sendCodes -join ','))"
  }

  Step "Login for /ai/chat limiter checks"
  $loginBody = @{ phone = $Phone; code = $Code } | ConvertTo-Json
  $login = Invoke-Api -Method "POST" -Uri "$base/auth/login-with-code" -Body $loginBody
  if ($login.StatusCode -ne 200) {
    throw "Login failed before AI limiter checks: status=$($login.StatusCode), body=$($login.Body)"
  }
  $loginJson = Parse-Json -Text $login.Body
  $token = $loginJson.token
  if (-not $token) {
    throw "Login succeeded but token missing"
  }
  $authHeaders = @{ Authorization = "Bearer $token" }
  Ok "AI limiter auth token acquired"

  Step "Check /ai/chat burst limiter (3 requests / 30s)"
  $chatBody = @{
    messages = @(
      @{ role = "user"; content = "rate-limit-check" }
    )
    stream = $false
  } | ConvertTo-Json -Depth 5

  $chatStatuses = @()
  for ($i = 1; $i -le 4; $i++) {
    $chatRes = Invoke-Api -Method "POST" -Uri "$base/ai/chat" -Headers $authHeaders -Body $chatBody
    $chatStatuses += $chatRes.StatusCode
  }

  if ($chatStatuses -contains 429) {
    Ok "/ai/chat burst limiter triggered as expected (statuses=$($chatStatuses -join ','))"
  } else {
    throw "/ai/chat burst limiter did not trigger (statuses=$($chatStatuses -join ','))"
  }

  Write-Host "`n[RateLimit-Regression] ALL CHECKS PASSED" -ForegroundColor Green
  exit 0
} catch {
  Fail $_.Exception.Message
  if ($_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message -ForegroundColor DarkRed
  }
  exit 1
}
