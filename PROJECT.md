# NeoPheme

Personal cybersecurity news dashboard. n8n collects news every morning, AI ranks and summarizes it, a web dashboard displays it, and a built-in chat lets me ask follow-up questions about any item.

- **Name:** Pheme (Greek goddess of rumor/fame/news) + Neo (new).
- **Identity:** cyber look, cyan/purple on dark blue, Greek laurel + winged-eye motif.
- **Goal:** the project is educational. I build, the assistant guides and explains WHY.

## Environment

- OS: Windows. RAM is limited (Docker/WSL capped at 2GB via `C:\Users\zxamm\.wslconfig`).
- Repo: `C:\Dev\NeoPheme` (outside OneDrive on purpose). GitHub: `n3XmaR/NeoPheme`.
- n8n runs in Docker (`n8n/docker-compose.yml` + `n8n/.env`), http://localhost:5678, timezone Asia/Amman.
- Telegram is blocked in Jordan, so no Telegram bot. Output is a website.

## Key Decisions

- Automation: n8n (Docker locally, move to a VPS later).
- AI: Gemini free tier while developing; maybe Claude Haiku later (API is paid, separate from the Claude.ai plan).
- Language: dashboard UI and news summaries in English only (LTR). Chat assistant is bilingual: replies in the user's language (Arabic or English), technical terms stay in English.
- Storage: n8n Data Table `neopheme_items` as a short rolling window. The collection filter keeps 3 days (by `published_at`); cleanup deletes rows older than 4 days (by `createdAt`) so the table always remembers an item longer than the filter can return it. No permanent archive. Revisit only if we need external DB access.
- Dashboard reads data through n8n webhooks (API protected by a header token), not directly from the DB.
- AI must rely on the source only, always return the original link, and score spam/low-quality items low.
- Insert into the Data Table happens AFTER the AI step (so every stored row has AI fields). Add columns `category`, `importance`, `summary` in Phase 4.

## Normalized Item Schema

```json
{
  "id": "unique id (usually the URL)",
  "title": "...",
  "url": "...",
  "source": "BleepingComputer",
  "type": "news | vuln | tool | video",
  "published_at": "ISO 8601",
  "content": "snippet/description"
}
```

> In the Data Table the `id` field is stored as `item_id`, because n8n adds its own internal `id`, `createdAt` and `updatedAt` columns.

## Sources (Phase 2, done)

- RSS: BleepingComputer, The Hacker News, Krebs on Security, SecurityWeek, Dark Reading
- CISA KEV (HTTP + Split Out; `dateAdded` has no time, so T00:00Z; filtered to last 3 days before the Merge)
- YouTube RSS: John Hammond (Shorts filtered out)
- GitHub Search API: topic:security, created last 7 days, stars>15 (contains spam/fake-star repos, needs tighter topics later)

## Phases

| # | Phase | Status |
|---|---|---|
| 0 | Setup (repo, VS Code, Docker) | done |
| 1 | n8n basics | done |
| 2 | Collection (8 sources, normalize, merge, filter, dedupe) | done |
| 3 | Storage + cross-day dedupe (Data Table, 3-day window) | done |
| 4 | AI layer (category, importance 1-10, English summary, JSON output) | next |
| 5 | Schedule (07:00) + error handling (Continue on Fail) | MVP |
| 6 | API (webhooks + token) | |
| 7 | Dashboard (HTML/CSS/JS, NeoPheme identity) | |
| 8 | AI Agent chat (memory, search stored items, read links) | |
| 9 | Deploy (VPS, HTTPS, Cloudflare, backups) | |
| 10 | Improvements | |

## Workflow Files

- `workflows/01-collection.json`: Phase 2 archive (8 sources -> Merge -> Keep Last 48h -> Dedupe by ID -> Sort). Superseded by 02-storage.json.
- `workflows/02-storage.json`: Phase 3 workflow (adds KEV Last 3 Days, Keep Last 3 Days, Read Stored Items, Find New Items, Store New Items, Cleanup Old Rows).
- Docs: `docs/phase-3.md`.

## Open Tasks

- Phase 5: order the flow as Cleanup Old Rows -> Read Stored Items (not in parallel), and run Cleanup/Store after the AI step.
- Verify Cleanup deletes genuinely old rows (check on 2026-11-26).
- Review n8n 3.0 Migration Report; pin the n8n image version in docker-compose before deploy.
- Tighten GitHub source topics (spam/fake stars).

## Working Style

- One chat per phase. This main chat holds decisions and the plan.
- Guide in medium-sized steps (about 3 related steps per reply), explain WHY briefly.
- Reply in Arabic (Jordanian dialect OK), keep technical terms in English.
- At the end of each phase, summarize: what we built, decisions, problems and fixes, files to save, what the next phase needs.

## Security Rules

- Never commit `.env`, API keys, or `N8N_ENCRYPTION_KEY`.
- Check workflow JSON for `credentials`/tokens before every commit. The repo is PUBLIC.
- Never run or download repos from GitHub results without reviewing them first.