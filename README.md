# Jira Ticket Creator

Paste context about a task, get an AI-drafted Jira ticket (title, description, acceptance criteria), review/edit it, and create it directly in the **active sprint** of your Jira project — capped at a configurable number of creations per day (default 10).

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS, shadcn/ui
- Prisma 7 + SQLite (file-based, no external DB needed)
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

Fill in `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`, `JIRA_BOARD_ID`, `GEMINI_API_KEY`. `JIRA_DEFAULT_ISSUE_TYPE` and the issue types offered in the UI (Task/Story/Bug) must exactly match issue type names configured on your Jira project — check your project's issue type scheme if ticket creation fails with an unexpected-field error.

### 5. Set up the database

```bash
npx prisma migrate dev
```

This creates `dev.db` (SQLite) and applies the schema. Prisma Client is regenerated automatically; if you ever change `prisma/schema.prisma`, re-run `npx prisma generate`.

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
- `npm audit` flags high-severity issues in Prisma's *MySQL* driver dependency chain — this project only uses the SQLite driver, so it's not exploitable here; it's a known upstream advisory in an unused code path.
- **Gemini free-tier rate limits**: `gemini-flash-lite-latest` is used specifically because the plain `gemini-flash-latest`/`gemini-*-flash` models are capped at just 5 requests/minute per project on the free tier, shared across everyone using the same `GEMINI_API_KEY`. `generateTicketDraft` (`src/lib/llm.ts`) retries transient `429`/`503` responses a couple of times before failing, but a sustained burst of drafts from multiple people at once can still hit the wall — if that happens in practice, either add a short client-side debounce or move to a paid Gemini tier / Claude API.

## Deploying beyond localhost

SQLite is a single file on disk — it works well on a single persistent server/VM/container, but **not** on typical serverless hosts (e.g. Vercel) where the filesystem isn't persistent across invocations. For serverless deployment, swap the datasource for a hosted SQLite-compatible option (e.g. Turso/LibSQL via `@prisma/adapter-libsql`, see `.agents/skills/prisma-database-setup/references/sqlite.md`) or a managed Postgres, and update `prisma7.config.ts` and `src/lib/prisma.ts` accordingly.
