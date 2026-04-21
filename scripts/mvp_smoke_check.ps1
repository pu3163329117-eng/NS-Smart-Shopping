param(
  [string]$BaseUrl = "http://localhost:3005/api",
  [string]$Phone = "13800138000",
  [string]$Code = "123456",
  [double]$TopupAmount = 2000,
  [double]$ProductPrice = 199,
  [switch]$KeepArtifacts
)

$ErrorActionPreference = "Stop"

function Step($msg) {
  Write-Host "[MVP-Smoke] $msg" -ForegroundColor Cyan
}

function Ok($msg) {
  Write-Host "[PASS] $msg" -ForegroundColor Green
}

function Fail($msg) {
  Write-Host "[FAIL] $msg" -ForegroundColor Red
}

try {
  Step "Login with code account"
  $loginBody = @{ phone = $Phone; code = $Code } | ConvertTo-Json
  $login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login-with-code" -ContentType "application/json" -Body $loginBody
  $token = $login.token
  if (-not $token) { throw "Login succeeded but token missing" }
  $headers = @{ Authorization = "Bearer $token" }
  Ok "Login OK (userId=$($login.user.id))"

  Step "Top up wallet in dev mode"
  $topupBody = @{ amount = $TopupAmount } | ConvertTo-Json
  $topup = Invoke-RestMethod -Method Post -Uri "$BaseUrl/user/wallet/topup" -Headers $headers -ContentType "application/json" -Body $topupBody
  Ok "Topup OK (balance=$($topup.wallet.balance))"

  Step "Publish product from AI endpoint"
  $title = "MVP Smoke Product $(Get-Date -Format 'yyyyMMddHHmmss')"
  $publishBody = @{
    serviceData = @{
      title = $title
      description = "Smoke-test published from mvp_smoke_check.ps1"
      price = $ProductPrice
      tags = @("mvp", "smoke", "ns-matrix")
      type = "custom"
    }
  } | ConvertTo-Json -Depth 8
  $pub = Invoke-RestMethod -Method Post -Uri "$BaseUrl/ai/publish" -Headers $headers -ContentType "application/json" -Body $publishBody
  $serviceId = $pub.service.id
  if (-not $serviceId) { throw "Publish succeeded but service id missing" }
  Ok "Publish OK (serviceId=$serviceId)"

  Step "Verify market visibility"
  $market = Invoke-RestMethod -Method Get -Uri "$BaseUrl/market/services?limit=120" -Headers $headers
  $visible = @($market.data | Where-Object { $_.id -eq $serviceId }).Count -gt 0
  if (-not $visible) { throw "Published service not found in market list" }
  Ok "Market visibility OK"

  Step "Create order"
  $orderBody = @{
    items = @(
      @{
        serviceId = $serviceId
        quantity = 1
      }
    )
    total = $ProductPrice
  } | ConvertTo-Json -Depth 8
  $order = Invoke-RestMethod -Method Post -Uri "$BaseUrl/orders" -Headers $headers -ContentType "application/json" -Body $orderBody
  $orderId = $order.id
  if (-not $orderId) { throw "Order created but order id missing" }
  Ok "Order created (orderId=$orderId)"

  Step "Verify order appears in my orders"
  $myOrders = Invoke-RestMethod -Method Get -Uri "$BaseUrl/user/orders" -Headers $headers
  $inMyOrders = @($myOrders | Where-Object { $_.id -eq $orderId }).Count -gt 0
  if (-not $inMyOrders) { throw "Order not found in /user/orders" }
  Ok "Order query OK"

  Step "Move order shipped -> completed"
  $shipBody = @{ status = "shipped" } | ConvertTo-Json
  $shipped = Invoke-RestMethod -Method Put -Uri "$BaseUrl/orders/$orderId/status" -Headers $headers -ContentType "application/json" -Body $shipBody
  if ($shipped.status -ne "shipped") { throw "Expected shipped, got $($shipped.status)" }
  $confirmed = Invoke-RestMethod -Method Post -Uri "$BaseUrl/orders/$orderId/confirm" -Headers $headers -ContentType "application/json" -Body "{}"
  if ($confirmed.status -ne "completed") { throw "Expected completed, got $($confirmed.status)" }
  Ok "Order status flow OK"

  Step "Create review"
  $reviewBody = @{
    orderId = $orderId
    rating = 5
    content = "MVP smoke test review from script."
    images = @()
  } | ConvertTo-Json -Depth 4
  $review = Invoke-RestMethod -Method Post -Uri "$BaseUrl/market/services/$serviceId/reviews" -Headers $headers -ContentType "application/json" -Body $reviewBody
  if (-not $review.id) { throw "Review created but review id missing" }
  Ok "Review flow OK (reviewId=$($review.id))"

  if (-not $KeepArtifacts) {
    Step "Cleanup smoke product artifact"
    try {
      Invoke-RestMethod -Method Delete -Uri "$BaseUrl/maker/services/$serviceId" -Headers $headers | Out-Null
      Ok "Cleanup OK (service removed from market)"
    } catch {
      Write-Host "[WARN] Cleanup failed, serviceId=$serviceId still exists. $_" -ForegroundColor Yellow
    }
  } else {
    Write-Host "[INFO] KeepArtifacts is enabled, skipping cleanup." -ForegroundColor Yellow
  }

  Step "Read wallet summary"
  $walletSummary = Invoke-RestMethod -Method Get -Uri "$BaseUrl/user/wallet/summary" -Headers $headers
  Ok "Wallet summary OK (balance=$($walletSummary.balance))"

  Write-Host "`n[MVP-Smoke] ALL CHECKS PASSED" -ForegroundColor Green
  exit 0
} catch {
  Fail $_.Exception.Message
  if ($_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message -ForegroundColor DarkRed
  }
  exit 1
}
