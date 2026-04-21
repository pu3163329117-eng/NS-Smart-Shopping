param(
  [string]$ApiBaseUrl = "http://localhost:8080/api",
  [string]$Phone = "13800138000",
  [string]$Code = "123456",
  [switch]$KeepArtifacts
)

$ErrorActionPreference = "Stop"

function Step([string]$Message) {
  Write-Host "[AI-Publish-Regression] $Message" -ForegroundColor Cyan
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
    [string]$ContentType = "application/json",
    [string]$Body = ""
  )

  try {
    $invokeParams = @{
      Method = $Method
      Uri = $Uri
      Headers = $Headers
      TimeoutSec = 30
    }
    if ($Body -ne "") {
      $invokeParams["ContentType"] = $ContentType
      $invokeParams["Body"] = $Body
    }

    $resp = Invoke-WebRequest @invokeParams
    return @{
      StatusCode = [int]$resp.StatusCode
      Headers = $resp.Headers
      Body = $resp.Content
    }
  } catch [System.Net.WebException] {
    $rawResp = $_.Exception.Response
    if (-not $rawResp) { throw }

    return @{
      StatusCode = [int]$rawResp.StatusCode
      Headers = $rawResp.Headers
      Body = (Read-ResponseBody -Response $rawResp)
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

function Assert-Status($Result, [int]$Expected, [string]$Label) {
  if ($Result.StatusCode -ne $Expected) {
    throw "$Label status expected $Expected, got $($Result.StatusCode), body=$($Result.Body)"
  }
}

try {
  $base = $ApiBaseUrl.TrimEnd('/')
  $serviceId = $null

  Step "Unauthenticated publish must be blocked"
  $unauthPublishBody = @{
    serviceData = @{
      title = "unauth-check"
      description = "should fail"
      price = 1
      type = "custom"
    }
  } | ConvertTo-Json -Depth 6
  $unauthPublish = Invoke-Api -Method "POST" -Uri "$base/ai/publish" -Body $unauthPublishBody
  Assert-Status -Result $unauthPublish -Expected 401 -Label "POST /ai/publish without token"
  Ok "Unauthorized publish correctly blocked"

  Step "Login with test account"
  $loginBody = @{ phone = $Phone; code = $Code } | ConvertTo-Json
  $login = Invoke-Api -Method "POST" -Uri "$base/auth/login-with-code" -Body $loginBody
  Assert-Status -Result $login -Expected 200 -Label "POST /auth/login-with-code"
  $loginJson = Parse-Json -Text $login.Body
  $token = $loginJson.token
  if (-not $token) {
    throw "Login succeeded but token missing"
  }
  $authHeaders = @{ Authorization = "Bearer $token" }
  Ok "Login succeeded"

  Step "Publish AI incubated project"
  $title = "AI Publish Regression $(Get-Date -Format 'yyyyMMddHHmmss')"
  $publishBody = @{
    serviceData = @{
      title = $title
      description = "Regression check for /ai/publish endpoint."
      price = 199
      type = "custom"
      tags = @("regression", "ai-publish")
      coverUrl = "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80"
    }
  } | ConvertTo-Json -Depth 8

  $publish = Invoke-Api -Method "POST" -Uri "$base/ai/publish" -Headers $authHeaders -Body $publishBody
  Assert-Status -Result $publish -Expected 200 -Label "POST /ai/publish with token"

  $publishJson = Parse-Json -Text $publish.Body
  if (-not $publishJson.success) {
    throw "Publish response missing success=true. body=$($publish.Body)"
  }
  if (-not $publishJson.service.id) {
    throw "Publish response missing service.id"
  }
  if (@($publishJson.skus).Count -lt 2) {
    throw "Publish response missing launch SKUs"
  }
  $serviceId = "$($publishJson.service.id)"
  Ok "Publish succeeded (serviceId=$serviceId)"

  Step "Verify published service is retrievable from market detail API"
  $serviceDetail = Invoke-Api -Method "GET" -Uri "$base/market/services/$serviceId" -Headers $authHeaders
  Assert-Status -Result $serviceDetail -Expected 200 -Label "GET /market/services/:id"
  $serviceDetailJson = Parse-Json -Text $serviceDetail.Body
  if ("$($serviceDetailJson.id)" -ne $serviceId) {
    throw "Market detail id mismatch. expected=$serviceId actual=$($serviceDetailJson.id)"
  }
  Ok "Published service is visible in market detail"

  if (-not $KeepArtifacts -and $serviceId) {
    Step "Cleanup published artifact from maker endpoint"
    $cleanup = Invoke-Api -Method "DELETE" -Uri "$base/maker/services/$serviceId" -Headers $authHeaders
    if (@(200, 204) -contains $cleanup.StatusCode) {
      Ok "Cleanup succeeded"
    } else {
      Write-Host "[WARN] Cleanup returned status=$($cleanup.StatusCode). serviceId=$serviceId" -ForegroundColor Yellow
    }
  } elseif ($KeepArtifacts) {
    Write-Host "[INFO] KeepArtifacts enabled, skipping cleanup." -ForegroundColor Yellow
  }

  Write-Host "`n[AI-Publish-Regression] ALL CHECKS PASSED" -ForegroundColor Green
  exit 0
} catch {
  Fail $_.Exception.Message
  if ($_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message -ForegroundColor DarkRed
  }
  exit 1
}
