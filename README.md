# STR Lead Engine

Extract and classify short-term rental leads from URLs or raw text using Claude AI.

Paste a property listing URL or raw text — the app pulls out the contact info and classifies the lead as **Rent Arbitrage**, **STR Management**, or **Unassigned**. Track outreach status per lead in the table.

## Prerequisites

Install these before you start:

| Tool | Purpose | Install |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Runs PostgreSQL locally | Free for personal use |
| [Go 1.22+](https://go.dev/dl/) | Runs the backend | `brew install go` |
| [Node.js 18+](https://nodejs.org/) | Runs the frontend | `brew install node` |
| Anthropic API key | Powers lead extraction | [console.anthropic.com](https://console.anthropic.com) |

## Quickstart

### 1. Clone the repo

```bash
git clone https://github.com/yjheo27/str-leads.git
cd str-leads
```

### 2. Start the database

```bash
docker-compose up -d
```

This starts a PostgreSQL 16 instance on port 5432. The `leads` table is created automatically when the backend first runs.

### 3. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and paste your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Run the backend

```bash
cd backend
go run .
```

You should see:
```
Backend running on :8080
```

### 5. Run the frontend

Open a new terminal tab:

```bash
cd frontend
npm install
npm run dev
```

You should see:
```
VITE ready in ~120ms
➜ Local: http://localhost:5173/
```

### 6. Open the app

```
http://localhost:5173
```

## How to use it

- **Paste URL** — drop in any property listing URL (Craigslist, Zillow, Facebook Marketplace, etc.). The backend fetches the page and sends the text to Claude.
- **Paste Text** — paste a raw email, message, or listing copy directly.
- Click **Extract Lead** — Claude reads the content and returns structured contact info + a strategy classification.
- Use the **Status dropdown** in the table to track outreach: `New` → `Contacted` → `No Answer`.

## Strategy classification

| Badge | Meaning |
|---|---|
| 🟢 Rent Arbitrage | Owner wants a long-term corporate tenant who sublists on Airbnb/VRBO |
| 🔵 STR Management | Owner wants hands-off Airbnb/VRBO management |
| ⚪ Unassigned | Not enough signal to classify |

## Architecture

```
frontend/   React + TypeScript + Vite   → http://localhost:5173
backend/    Go (net/http, pgx/v5)       → http://localhost:8080
database/   PostgreSQL 16 via Docker    → localhost:5432
```

The frontend calls the backend over three endpoints:

| Method | Path | What it does |
|---|---|---|
| `POST` | `/api/leads/scrape` | Fetch URL or accept raw text, extract via Claude, save to DB |
| `GET` | `/api/leads` | Return all leads ordered by date |
| `PUT` | `/api/leads/{id}` | Update status for a single lead |

## Note on the Claude API key

The backend calls `https://api.anthropic.com/v1/messages` to extract lead data. This requires a separate API key from [console.anthropic.com](https://console.anthropic.com) — your Claude.ai subscription does not cover API access. Each extraction costs a fraction of a cent.
