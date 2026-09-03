# Jira Ticket Creator

Paste context about a task, get an AI-drafted Jira ticket (title, description, acceptance criteria), review/edit it, and create it directly in the **active sprint** of your Jira project — capped at a configurable number of creations per day (default 10).

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS, shadcn/ui
- Prisma 7 + Postgres (e.g. Vercel Postgres / Neon) — chosen over SQLite because serverless hosts like Vercel don't have a persistent filesystem, which SQLite needs
- Google Gemini (`gemini-flash-lite-latest`, free tier) for ticket drafting
- Jira Cloud REST + Agile APIs for ticket creation

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get a Jira API token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens and create a token.
2. Note your Jira site URL (e.g. `https://your-domain.atlassian.net`), the email address of the account that owns the token, your project key (e.g. `PROJ`), and your board's numeric ID (visible in the board URL: `.../boards/<BOARD_ID>`).
3. The board must have an **active sprint** — the app will refuse to create tickets otherwise (by design, to avoid orphaning issues in the backlog).

### 3. Get a Gemini API key (free)

Create one at https://aistudio.google.com/apikey — no billing required for the free tier.

### 4. Configure environment

```bash
cp .env.example .env
```

Fill in `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`, `JIRA_BOARD_ID`, `GEMINI_API_KEY`, `DATABASE_URL`. `JIRA_DEFAULT_ISSUE_TYPE` and the issue types offered in the UI (Task/Story/Bug) must exactly match issue type names configured on your Jira project — check your project's issue type scheme if ticket creation fails with an unexpected-field error.

### 5. Set up the database

Provision a Postgres database — the easiest options are [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (provision from your Vercel project's Storage tab; it auto-injects connection-string env vars) or [Neon](https://neon.tech) directly (free tier). Copy the **pooled** connection string (Vercel calls it `POSTGRES_PRISMA_URL`) into `DATABASE_URL` in `.env`.

Then apply the schema:

```bash
npx prisma migrate dev --name init
```

Prisma Client is regenerated automatically on install (`postinstall` script) and by `migrate dev`; if you ever change `prisma/schema.prisma` without running a migrate command, re-run `npx prisma generate` manually.

### 6. Run it

```bash
npm run dev
```

Open http://localhost:3000.

## How it works

1. **Draft** (`POST /api/tickets/draft`) — sends your context to Gemini, gets back a structured `{title, description, acceptanceCriteria}`. This step is free/unlimited and never touches Jira or the daily quota.
2. **Review** — edit any field in the UI before creating.
3. **Create** (`POST /api/tickets`) — atomically reserves one of today's quota slots, resolves the board's active sprint, creates the Jira issue, then moves it into that sprint. If Jira creation fails partway, the reserved slot is released (marked `FAILED`) so it doesn't count against the daily limit.

## Daily limit

Enforced server-side (`DAILY_TICKET_LIMIT` in `.env`, default 10) against **created** tickets only — drafting is unlimited. The day boundary is **UTC midnight**, not the browser's local timezone; the quota badge shows the exact reset time. The limit check and the DB insert happen inside a single transaction, so concurrent requests can't both slip through at the last slot.

## Known limitations / things to check against your Jira instance

- **Acceptance criteria checklist**: the description is built as Atlassian Document Format with a `taskList` node, which renders as an interactive checklist on most Jira Cloud sites. If your instance rejects it, edit `draftToAdf` in `src/lib/adf.ts` to use a `bulletList` with `"[ ] "`-prefixed text instead.
- **Issue type names** are matched by exact string (`Task`/`Story`/`Bug`) — rename them in `src/lib/types.ts` and the `TicketForm` component if your project uses different names.
- Single-team internal tool: no user accounts/auth layer, no CI, no automated tests — deliberately out of scope for this size of project.
- `npm audit` flags high-severity issues in Prisma's *MySQL* driver dependency chain — this project doesn't use MySQL at all (Postgres only), so it's not exploitable here; it's a known upstream advisory in an unused code path pulled in by the Prisma CLI's own tooling.
- **Gemini free-tier rate limits**: `gemini-flash-lite-latest` is used specifically because the plain `gemini-flash-latest`/`gemini-*-flash` models are capped at just 5 requests/minute per project on the free tier, shared across everyone using the same `GEMINI_API_KEY`. `generateTicketDraft` (`src/lib/llm.ts`) retries transient `429`/`503` responses a couple of times before failing, but a sustained burst of drafts from multiple people at once can still hit the wall — if that happens in practice, either add a short client-side debounce or move to a paid Gemini tier / Claude API.
- **Pooled vs. direct DB connections**: `DATABASE_URL` is used for both the running app and `prisma migrate`/`generate`. A pooled (PgBouncer) connection is required for the app in serverless — a fresh unpooled connection per invocation would exhaust the database's connection limit under load. If a future migration ever fails against the pooled connection (rare, but possible with some DDL), temporarily point `DATABASE_URL` at the provider's non-pooling connection string just for that one `prisma migrate deploy` run.

## Deploying to Vercel

1. Push the repo to GitHub (already done if you're reading this from there) and import it into Vercel.
2. In the Vercel project, add a Postgres database (Storage tab → Create Database) — this auto-injects `POSTGRES_PRISMA_URL` and related env vars into the project.
3. In Project Settings → Environment Variables, set `DATABASE_URL` to the value of the auto-injected pooled connection string (`POSTGRES_PRISMA_URL`), plus all the `JIRA_*`, `GEMINI_API_KEY`, and `DAILY_TICKET_LIMIT` variables from `.env.example`.
4. Run `npx prisma migrate deploy` once against that database (from your machine, with `DATABASE_URL` in your local `.env` pointed at the same Postgres instance) to create the `Ticket` table before the first deploy.
5. Deploy. The `postinstall` script (`prisma generate`) regenerates the Prisma Client automatically during Vercel's build — no manual step needed there.
