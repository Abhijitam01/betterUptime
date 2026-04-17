# BetterUptime

A self-hosted website uptime monitoring platform. Add URLs to watch, get alerted when they go down, track response times, manage incidents, and share public status pages — all in one monorepo.

## Architecture

```mermaid
flowchart LR
    subgraph Clients
        Browser["Browser"]
    end

    subgraph Apps
        Web["Web\nNext.js 15\n:3000"]
        API["API\nExpress + Zod\n:3001"]
        Pusher["Pusher\nScheduler"]
        Worker["Worker\nMonitor"]
    end

    subgraph Data
        PG[("PostgreSQL")]
        Redis[("Redis Stream")]
    end

    subgraph External
        Sites["Monitored URLs"]
        Resend["Resend\nEmail alerts"]
        Webhooks["Webhooks\nSlack etc."]
    end

    Browser --> Web
    Web -->|REST| API
    API --> PG
    Pusher -->|"read due sites"| PG
    Pusher -->|"enqueue"| Redis
    Redis -->|"consume"| Worker
    Worker -->|"write ticks / incidents"| PG
    Worker -->|HTTP ping| Sites
    Worker --> Resend
    Worker --> Webhooks
```

---

## How it works

1. **Pusher** runs on a 30-second tick and enqueues every website that is due for a check into a Redis stream.
2. **Worker** reads from the stream, HTTP-pings each URL, records the result (status + response time) to Postgres, opens/closes incidents on state transitions, and fires email/webhook alerts.
3. **API** exposes a REST interface for the web frontend — auth, website CRUD, history, alert settings, incidents, maintenance windows, and public status pages.
4. **Web** is the Next.js dashboard where users sign up, add sites, view uptime charts, and configure everything.

---

## Monorepo structure

```
betteruptime/
├── apps/
│   ├── api/        # Express REST API (auth, websites, incidents, alerts)
│   ├── pusher/     # Scheduler — enqueues websites into Redis stream
│   ├── worker/     # Monitor — pings URLs, records ticks, fires alerts
│   ├── tests/      # Integration test suite
│   └── web/        # Next.js dashboard (frontend)
└── packages/
    ├── store/          # Prisma client + schema (single source of database truth)
    ├── redisstream/    # Redis stream helpers (xAdd, xReadGroup, xAck)
    ├── ui/             # Shared React component library
    ├── eslint-config/  # Shared ESLint rules
    └── typescript-config/ # Shared tsconfig bases
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Bun](https://bun.sh) |
| Monorepo | [Turborepo](https://turbo.build) |
| Frontend | Next.js 15, Tailwind CSS |
| API | Express, Zod, JWT + refresh tokens |
| Database | PostgreSQL via [Prisma](https://www.prisma.io) |
| Queue | Redis streams |
| Email alerts | [Resend](https://resend.com) |
| Webhook alerts | Generic HTTP + Slack-compatible |

---

## Prerequisites

- **Bun** >= 1.2.2
- **Node** >= 18
- **PostgreSQL** running locally (or a connection string)
- **Redis** running locally

---

## Getting started

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

Each app needs a `.env` file. Start from the examples:

```bash
cp packages/store/.env.example packages/store/.env
```

Edit `packages/store/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/betteruptime
```

Create `apps/api/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/betteruptime
JWT_SECRET=your-super-secret-key
CORS_ORIGIN=http://localhost:3000
PORT=3001
```

Create `apps/worker/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/betteruptime
REDIS_URL=redis://localhost:6379
REGION_ID=us-east-1
WORKER_ID=worker-1
RESEND_API_KEY=re_...        # optional — needed for email alerts
```

Create `apps/pusher/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/betteruptime
REDIS_URL=redis://localhost:6379
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Run database migrations

```bash
cd packages/store
bunx prisma migrate deploy
```

### 4. Start everything

```bash
bun run dev
```

Turborepo starts all apps in parallel:

| Service | Default port |
|---------|-------------|
| Web dashboard | http://localhost:3000 |
| API | http://localhost:3001 |
| Pusher | — (no HTTP port) |
| Worker | — (no HTTP port) |

---

## Available scripts

Run from the repo root:

```bash
bun run dev          # start all apps in watch mode
bun run build        # production build for all apps
bun run lint         # lint all packages
bun run check-types  # typecheck all packages
bun run format       # prettier across the entire repo
```

---

## Key features

- **Uptime monitoring** — configurable check intervals (30s, 1m, 2m, 5m, 10m)
- **Response time tracking** — stored per-tick with regional tagging
- **Incident management** — auto-opened on first failure, auto-resolved on recovery
- **Keyword monitoring** — assert a string is present/absent in the response body
- **SSL certificate monitoring** — tracks expiry, alerts when < 14 days remain
- **Alert channels** — email (via Resend) and arbitrary webhooks (Slack-compatible)
- **Maintenance windows** — suppress alerts during planned downtime
- **Public status pages** — shareable `/status/:slug` pages with no login required
- **Bulk import** — import monitors from a CSV or migrate from UptimeRobot
- **JWT auth** — 15-minute access tokens with 30-day rotating refresh tokens

---

## Running tests

```bash
cd apps/tests
bun run test
```

The integration tests expect a running Postgres and API server. Set `API_URL` and `DATABASE_URL` in `apps/tests/.env` before running.
