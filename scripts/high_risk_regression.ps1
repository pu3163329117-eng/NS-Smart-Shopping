param(
  [string]$ApiBaseUrl = "http://localhost:8080/api",
  [string]$Phone = "13800138000",
  [string]$Code = "123456"
)

$ErrorActionPreference = "Stop"

function Step([string]$Message) {
  Write-Host "[HighRisk-Regression] $Message" -ForegroundColor Cyan
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

  $requestId = [Guid]::NewGuid().ToString()
  $finalHeaders = @{}
  foreach ($key in $Headers.Keys) {
    $finalHeaders[$key] = $Headers[$key]
  }
  $finalHeaders["X-Request-Id"] = $requestId

  try {
    $invokeParams = @{
      Method = $Method
      Uri = $Uri
      Headers = $finalHeaders
      TimeoutSec = 20
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
      RequestId = $requestId
    }
  } catch [System.Net.WebException] {
    $rawResp = $_.Exception.Response
    if (-not $rawResp) { throw }

    return @{
      StatusCode = [int]$rawResp.StatusCode
      Headers = $rawResp.Headers
      Body = (Read-ResponseBody -Response $rawResp)
      RequestId = $requestId
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

function Assert-RequestIdEcho($Result, [string]$Label) {
  $echoed = $Result.Headers["X-Request-Id"]
  if (-not $echoed) {
    throw "$Label missing X-Request-Id response header"
  }
}

function Invoke-MultipartUpload {
  param(
    [string]$Uri,
    [string]$Token,
    [byte[]]$Bytes,
    [string]$FileName,
    [string]$MimeType
  )

  $request = [System.Net.HttpWebRequest]::Create($Uri)
  $request.Method = "POST"
  $request.Headers.Add("Authorization", "Bearer $Token")
  $request.Timeout = 20000
  $request.ReadWriteTimeout = 20000

  $boundary = "----SmartJA" + [Guid]::NewGuid().ToString("N")
  $request.ContentType = "multipart/form-data; boundary=$boundary"

  $headerText = "--$boundary`r`nContent-Disposition: form-data; name=`"file`"; filename=`"$FileName`"`r`nContent-Type: $MimeType`r`n`r`n"
  $footerText = "`r`n--$boundary--`r`n"
  $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($headerText)
  $footerBytes = [System.Text.Encoding]::UTF8.GetBytes($footerText)

  $request.ContentLength = $headerBytes.Length + $Bytes.Length + $footerBytes.Length
  $stream = $request.GetRequestStream()
  try {
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    $stream.Write($Bytes, 0, $Bytes.Length)
    $stream.Write($footerBytes, 0, $footerBytes.Length)
  } finally {
    $stream.Dispose()
  }

  try {
    $resp = $request.GetResponse()
    return @{
      StatusCode = [int]([System.Net.HttpWebResponse]$resp).StatusCode
      Headers = $resp.Headers
      Body = (Read-ResponseBody -Response $resp)
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

try {
  $base = $ApiBaseUrl.TrimEnd('/')

  Step "Unauthorized access to /user/profile should be blocked"
  $unauthProfile = Invoke-Api -Method "GET" -Uri "$base/user/profile"
  Assert-Status -Result $unauthProfile -Expected 401 -Label "GET /user/profile without token"
  Assert-RequestIdEcho -Result $unauthProfile -Label "GET /user/profile without token"
  Ok "Unauthorized profile access correctly blocked"

  Step "Login with code test account"
  $loginBody = @{ phone = $Phone; code = $Code } | ConvertTo-Json
  $login = Invoke-Api -Method "POST" -Uri "$base/auth/login-with-code" -Body $loginBody
  Assert-Status -Result $login -Expected 200 -Label "POST /auth/login-with-code"
  Assert-RequestIdEcho -Result $login -Label "POST /auth/login-with-code"
  $loginJson = Parse-Json -Text $login.Body
  $token = $loginJson.token
  if (-not $token) {
    throw "Login succeeded but token is missing"
  }
  Ok "Login succeeded and token received"

  Step "Invalid token must be forbidden"
  $invalidHeaders = @{ Authorization = "Bearer invalid-token" }
  $invalidTokenProfile = Invoke-Api -Method "GET" -Uri "$base/user/profile" -Headers $invalidHeaders
  Assert-Status -Result $invalidTokenProfile -Expected 403 -Label "GET /user/profile with invalid token"
  Ok "Invalid token is rejected"

  Step "Valid token can access profile"
  $authHeaders = @{ Authorization = "Bearer $token" }
  $profile = Invoke-Api -Method "GET" -Uri "$base/user/profile" -Headers $authHeaders
  Assert-Status -Result $profile -Expected 200 -Label "GET /user/profile with valid token"
  $profileJson = Parse-Json -Text $profile.Body
  if (-not $profileJson.id) {
    throw "Profile response missing id"
  }
  Ok "Authorized profile access works"

  Step "Non-admin user must not access admin stats"
  $adminStats = Invoke-Api -Method "GET" -Uri "$base/admin/stats" -Headers $authHeaders
  Assert-Status -Result $adminStats -Expected 403 -Label "GET /admin/stats for non-admin"
  Ok "Admin boundary works for non-admin token"

  Step "AI quota endpoint requires auth and returns data"
  $quotaUnauth = Invoke-Api -Method "GET" -Uri "$base/ai/quota"
  Assert-Status -Result $quotaUnauth -Expected 401 -Label "GET /ai/quota without token"
  $quota = Invoke-Api -Method "GET" -Uri "$base/ai/quota" -Headers $authHeaders
  Assert-Status -Result $quota -Expected 200 -Label "GET /ai/quota with token"
  $quotaJson = Parse-Json -Text $quota.Body
  if ($null -eq $quotaJson.remaining) {
    throw "Quota response missing remaining"
  }
  Ok "AI quota auth and data checks passed"

  Step "Upload endpoint should reject invalid file type"
  $txtBytes = [System.Text.Encoding]::UTF8.GetBytes("hello-smart-ja")
  $invalidUpload = Invoke-MultipartUpload -Uri "$base/upload" -Token $token -Bytes $txtBytes -FileName "invalid.txt" -MimeType "text/plain"
  Assert-Status -Result $invalidUpload -Expected 400 -Label "POST /upload with text/plain"
  Ok "Upload invalid MIME guard works"

  Step "Upload endpoint should accept image/png"
  $pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgQhM1l8AAAAASUVORK5CYII="
  $pngBytes = [Convert]::FromBase64String($pngBase64)
  $validUpload = Invoke-MultipartUpload -Uri "$base/upload" -Token $token -Bytes $pngBytes -FileName "dot.png" -MimeType "image/png"
  Assert-Status -Result $validUpload -Expected 200 -Label "POST /upload with image/png"
  $uploadJson = Parse-Json -Text $validUpload.Body
  if (-not $uploadJson.url) {
    throw "Valid upload response missing url"
  }
  Ok "Upload valid image works"

  Step "AI chat endpoint should fail gracefully when model key/service is unavailable"
  $chatBody = @{
    messages = @(
      @{ role = "user"; content = "ping" }
    )
    stream = $false
  } | ConvertTo-Json -Depth 5
  $chat = Invoke-Api -Method "POST" -Uri "$base/ai/chat" -Headers $authHeaders -Body $chatBody
  if (@(200, 500, 402) -notcontains $chat.StatusCode) {
    throw "POST /ai/chat returned unexpected status $($chat.StatusCode), body=$($chat.Body)"
  }
  Ok "AI chat failure/success path responds without crashing (status=$($chat.StatusCode))"

  Write-Host "`n[HighRisk-Regression] ALL CHECKS PASSED" -ForegroundColor Green
  exit 0
} catch {
  Fail $_.Exception.Message
  if ($_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message -ForegroundColor DarkRed
  }
  exit 1
}
