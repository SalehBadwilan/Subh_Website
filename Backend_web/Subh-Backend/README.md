# Subh Backend

Backend service for **Subh**, built as a **Modular Monolith** using **Node.js + Express + Sequelize**.

This repository currently contains **only the Day-1 scaffold**: project structure, server boot, database connection, a demo model, health + data + AI-key endpoints. Business modules (orders, payments, inventory, full AI features) are intentionally **not** included yet.

---

## Architecture: Modular Monolith

A single deployable Express app composed of independent feature modules. Each module owns its own models, services, and routes, and is registered in `src/app.js`.

> **Canonical schema file**: [`schema.sql`](./schema.sql) — one self-contained PostgreSQL/Supabase file with all 33 tables, foreign keys, indexes, enums and check constraints. Use it directly in Supabase SQL Editor or `psql -f schema.sql`.

```
src/
├── config/                  # environment, database, logger
│   ├── env.js               # single source of truth for process.env
│   ├── database.js          # Sequelize instance + connection test
│   └── logger.js
├── modules/                 # feature modules (one folder per future module)
│   └── demo/                # demo module — proves the wiring works
│       ├── models/TestItem.js
│       ├── services/testItemService.js
│       ├── routes/testItemRoutes.js
│       └── index.js         # module barrel: exposes routes + models
├── routes/                  # cross-cutting routes
│   ├── healthRoutes.js      # GET /api/health
│   └── aiDemoRoutes.js      # GET /api/ai-status
├── app.js                   # express app composition + bootApp()
└── server.js                # HTTP entrypoint (listen)
```

---

## Tech stack

| Concern        | Choice                                   |
|----------------|------------------------------------------|
| Runtime        | Node.js ≥ 20                             |
| HTTP framework | Express                                  |
| ORM            | Sequelize                                |
| DB (default)   | SQLite (zero local setup)                |
| DB (later)     | PostgreSQL via `DB_DIALECT=postgres`     |
| Config         | `dotenv` + a single `config/env.js`      |
| Security       | `helmet`, `cors`, env-only secrets       |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or newer (tested on v24)

---

## Getting started (local)

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and edit if needed
cp .env.example .env
#   - On Windows PowerShell: Copy-Item .env.example .env
#   - Optionally set AI_API_KEY in .env

# 3. Start the server (uses SQLite by default, so no DB server required)
npm start
#   or, for auto-reload on file change:
npm run dev
```

The server boots on `http://localhost:3000`.

On startup it will:
1. validate environment variables,
2. connect to the database,
3. sync the demo table (`test_items`).

---

## Endpoints

| Method | Path             | Description                                                              |
|--------|------------------|--------------------------------------------------------------------------|
| GET    | `/`              | Service info + list of endpoints                                         |
| GET    | `/api/health`    | Server status + real-time database connection status                     |
| GET    | `/api/test-data` | Rows from the demo `TestItem` table                                      |
| GET    | `/api/ai-status` | Confirms whether `AI_API_KEY` is configured (masked, never the raw key)  |

### Example

```bash
curl http://localhost:3000/api/health
```

---

## Environment variables

All configuration lives in `.env` (never committed). See `.env.example`:

| Variable       | Required | Default            | Notes                                            |
|----------------|----------|--------------------|--------------------------------------------------|
| `NODE_ENV`     | no       | `development`      |                                                  |
| `PORT`         | no       | `3000`             |                                                  |
| `DB_DIALECT`   | no       | `sqlite`           | `sqlite` \| `postgres` \| `mysql`                |
| `DB_STORAGE`   | no       | `./data/subh.sqlite` | SQLite file path                               |
| `DB_HOST`      | no       | `localhost`        | for postgres/mysql                               |
| `DB_PORT`      | no       | `5432`             | for postgres/mysql                               |
| `DB_NAME`      | no       | `subh_dev`         | for postgres/mysql                               |
| `DB_USER`      | *        | —                  | required when `DB_DIALECT` ≠ `sqlite`            |
| `DB_PASSWORD`  | *        | —                  | required when `DB_DIALECT` ≠ `sqlite`            |
| `AI_API_KEY`   | no       | —                  | read from env only; never logged in full         |
| `AI_PROVIDER`  | no       | `openai`           |                                                  |

---

## Security notes

- **`AI_API_KEY` is read exclusively from environment variables** via `src/config/env.js`. It is never written to disk and never returned in full by any endpoint — `/api/ai-status` returns only a masked preview.
- `.env` is gitignored. Use `.env.example` as the template.
- `helmet` and `cors` are enabled on every route.

---

## What is intentionally NOT here (yet)

Per the Day-1 scope, the following are out of scope and not started:

- Orders / checkout flow
- Payments
- Inventory
- Full AI features (only the key-binding proof exists today)
- Auth
- Tests

Each of these will become its own module under `src/modules/` in later iterations.
