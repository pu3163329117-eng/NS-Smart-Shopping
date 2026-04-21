# Smart JA Release-Ready Checklist

## 1. Environment And Secrets
- `NODE_ENV=production`
- `JWT_SECRET` is strong random (`>= 32` chars, not placeholder)
- `CORS_ALLOW_ORIGINS` is set to real domains
- `ENABLE_SWAGGER=false`
- `ALLOW_DEV_ADMIN_BYPASS=false`
- `EXPOSE_DEBUG_SMS_CODE=false`
- `ENABLE_WALLET_TOPUP` matches business policy for this release

## 2. Deploy And Health
1. Start stack:
```bash
docker compose --env-file .env.fullstack -f docker-compose.fullstack.yml up -d --build
```
2. Confirm containers:
```bash
docker compose -f docker-compose.fullstack.yml ps
```
3. Confirm API probe endpoints:
```bash
curl -f http://localhost:8080/api/healthz
curl -f http://localhost:8080/api/readyz
curl -f http://localhost:8080/api/health
```

## 3. Smoke Tests (Must Pass)
1. Probe + headers smoke:
```bash
npm run release:smoke
```
2. Full business flow smoke:
```bash
powershell -ExecutionPolicy Bypass -File .\scripts\release_smoke_check.ps1 -RunBusinessFlow
```
3. High-risk API regression:
```bash
npm run regression:highrisk
```
4. Rate-limit regression:
```bash
npm run regression:ratelimit
```
5. Latency baseline:
```bash
npm run api:baseline -- -Requests 50
```

## 4. Go/No-Go Gates
- `release:smoke` passes
- `RunBusinessFlow` passes
- `regression:highrisk` passes
- `regression:ratelimit` passes
- `api:baseline` has `success == requests` and no major outliers
- No `5xx` spike in backend logs during smoke

## 5. Post-Deploy 30-Min Watch
- Watch backend logs:
```bash
docker compose -f docker-compose.fullstack.yml logs backend --tail 200 -f
```
- Verify no repeated startup failures, DB errors, auth errors, or upload failures
- Confirm key user paths: login, market browse, order flow, review flow
