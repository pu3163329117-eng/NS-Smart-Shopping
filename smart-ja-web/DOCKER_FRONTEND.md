# Frontend Docker Packaging

## 1) Build image directly

```bash
cd smart-ja-web
docker build -f Dockerfile.frontend -t smart-ja-web-frontend:latest .
```

If your backend is not same-origin, inject API endpoint at build time:

```bash
docker build -f Dockerfile.frontend \
  --build-arg VITE_API_URL=https://api.example.com/api \
  -t smart-ja-web-frontend:latest .
```

## 2) Run container

```bash
docker run -d --name smart-ja-web-frontend -p 8080:80 smart-ja-web-frontend:latest
```

Open: `http://localhost:8080`

## 3) Use Compose

```bash
cd smart-ja-web
docker compose -f docker-compose.frontend.yml up -d --build
```

With custom API base and port:

```bash
set VITE_API_URL=https://api.example.com/api
set FRONTEND_PORT=8090
docker compose -f docker-compose.frontend.yml up -d --build
```

## 4) Fullstack local integration (frontend + backend + db)

This stack runs all 3 services on one Docker network and routes frontend `/api` to backend container directly.

```bash
cd smart-ja-web
docker compose -f docker-compose.fullstack.yml up -d --build
```

Endpoints:
- Frontend: `http://localhost:8080`
- Through frontend proxy: `http://localhost:8080/api/...`

Shutdown:

```bash
docker compose -f docker-compose.fullstack.yml down
```

## 5) Production-style env and release commands

```bash
cd smart-ja-web
cp .env.fullstack.example .env.fullstack
```

Then start with explicit env file:

```bash
docker compose --env-file .env.fullstack -f docker-compose.fullstack.yml up -d --build
```

Detailed release/healthcheck/rollback command list:

- See `DEPLOY_FULLSTACK.md`
