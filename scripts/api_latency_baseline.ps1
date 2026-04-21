param(
  [string]$Url = "http://localhost:8080/api/healthz",
  [int]$Requests = 60,
  [int]$TimeoutSec = 10
)

$ErrorActionPreference = "Stop"

function Percentile([double[]]$Values, [double]$P) {
  if (-not $Values -or $Values.Count -eq 0) { return 0 }
  $sorted = $Values | Sort-Object
  $rank = [Math]::Ceiling(($P / 100.0) * $sorted.Count)
  $index = [Math]::Max(0, [Math]::Min($sorted.Count - 1, $rank - 1))
  return [Math]::Round($sorted[$index], 2)
}

if ($Requests -lt 1) {
  throw "Requests must be >= 1"
}

$durations = New-Object System.Collections.Generic.List[Double]
$failures = 0

Write-Host "[API-Baseline] Target URL: $Url" -ForegroundColor Cyan
Write-Host "[API-Baseline] Total Requests: $Requests" -ForegroundColor Cyan

for ($i = 1; $i -le $Requests; $i++) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec $TimeoutSec
    if ($resp.StatusCode -lt 200 -or $resp.StatusCode -ge 300) {
      $failures++
      Write-Host "[WARN] Request $i returned status $($resp.StatusCode)" -ForegroundColor Yellow
      continue
    }
  } catch {
    $failures++
    Write-Host "[WARN] Request $i failed: $($_.Exception.Message)" -ForegroundColor Yellow
    continue
  } finally {
    $sw.Stop()
  }

  $durations.Add([Math]::Round($sw.Elapsed.TotalMilliseconds, 2))
}

$success = $durations.Count
if ($success -eq 0) {
  Write-Host "[FAIL] No successful requests. failures=$failures" -ForegroundColor Red
  exit 1
}

$avg = [Math]::Round((($durations | Measure-Object -Average).Average), 2)
$min = [Math]::Round((($durations | Measure-Object -Minimum).Minimum), 2)
$max = [Math]::Round((($durations | Measure-Object -Maximum).Maximum), 2)
$p50 = Percentile -Values $durations.ToArray() -P 50
$p95 = Percentile -Values $durations.ToArray() -P 95
$p99 = Percentile -Values $durations.ToArray() -P 99

Write-Host "`n[API-Baseline] Result" -ForegroundColor Green
Write-Host "success=$success failures=$failures"
Write-Host "min_ms=$min p50_ms=$p50 avg_ms=$avg p95_ms=$p95 p99_ms=$p99 max_ms=$max"

exit 0
