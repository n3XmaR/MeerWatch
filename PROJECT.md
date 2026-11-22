# NeoPheme

Personal cybersecurity news dashboard. n8n collects news on a schedule, rule-based scoring ranks it, and a static web dashboard (GitHub Pages) displays it. AI and a chat assistant are optional later additions.

- **Name:** Pheme (Greek goddess of rumor/fame/news) + Neo (new).
- **Identity:** cyber look, cyan/purple on dark blue, Greek laurel + winged-eye motif.
- **Goal:** the project is educational. I build, the assistant guides and explains WHY.

## Environment

- OS: Windows. RAM is limited (Docker/WSL capped at 2GB via `C:\Users\zxamm\.wslconfig`).
- Repo: `C:\Dev\NeoPheme` (outside OneDrive on purpose). GitHub: `n3XmaR/NeoPheme` (PUBLIC).
- n8n runs in Docker (`n8n/docker-compose.yml` + `n8n/.env`), http://localhost:5678, timezone Asia/Amman.
- Telegram is blocked in Jordan, so no Telegram bot. Output is a website.

## Key Decisions

- Automation: n8n in Docker locally first; a VPS is optional later.
- No AI for now: category/importance/summary come from rules in a Code node. Columns `category`, `importance`, `summary` are kept so AI (Gemini free, maybe Claude Haiku) can be added later.
- No webhooks/API for data: n8n commits `data.json` to the GitHub repo (separate `data` branch, fine-grained GitHub token stored only in n8n Credentials). The dashboard on GitHub Pages reads that static file. n8n is never exposed to the internet. A token inside front-end JS is not secret, so we avoid it.
- Dashboard "Refresh" button: calls a local n8n webhook on `http://localhost:5678` (works only from my own machine, no token needed). Revisit with Cloudflare Access if n8n moves to a VPS.
- Schedule runs several times a day (e.g. 07:00, 13:00, 19:00); dedupe makes extra runs free.
- Language: dashboard UI and summaries in English only (LTR). If a chat assistant is added later it replies in the user's language (Arabic or English), technical terms in English.
- Storage: n8n Data Table `neopheme_items` as a short rolling window. The collection filter keeps 3 days (by `published_at`); cleanup deletes rows older than 4 days (by `createdAt`) so the table always remembers an item longer than the filter can return it. No permanent archive.
- Insert into the Data Table happens AFTER scoring (so every stored row has category/importance/summary).
- Scoring must rely on the source text only, always keep the original link, and score spam/low-quality items low.

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
- Adding a source: copy a Fetch + Normalize pair, change URL and `source`, increase Merge inputs. Always verify the feed URL opens in a browser.
- Ideas for later: The Record, Schneier on Security, SANS ISC, Google Project Zero, Microsoft MSRC, more YouTube channels, NVD.

## Phases

| # | Phase | Status |
|---|---|---|
| 0 | Setup (repo, VS Code, Docker) | done |
| 1 | n8n basics | done |
| 2 | Collection (8 sources, normalize, merge, filter, dedupe) | done |
| 3 | Storage + cross-day dedupe (Data Table, 3-day window) | done |
| 4 | Scoring WITHOUT AI (Code node: category, importance 1-10, short summary) | next |
| 5 | Schedule (several runs/day) + error handling (Continue on Fail) + Cleanup before Read | |
| 6 | Export `data.json` to GitHub (n8n GitHub node, token in n8n Credentials) | |
| 7 | Dashboard (HTML/CSS/JS, NeoPheme identity) reads data.json, GitHub Pages, local Refresh button | |
| 8 | Optional: AI scoring/summaries + chat | |
| 9 | Optional: move n8n to a VPS (HTTPS, Cloudflare Access, backups) | |
| 10 | Improvements (more sources, tighter GitHub topics, weekly digest) | |

## Workflow Files

- `workflows/01-collection.json`: Phase 2 archive (8 sources -> Merge -> Keep Last 48h -> Dedupe by ID -> Sort). Superseded by 02-storage.json.
- `workflows/02-storage.json`: Phase 3 workflow (adds KEV Last 3 Days, Keep Last 3 Days, Read Stored Items, Find New Items, Store New Items, Cleanup Old Rows).
- Docs: `docs/phase-3.md`.

## Open Tasks

- Phase 5: order the flow as Cleanup Old Rows -> Read Stored Items (not in parallel); Store after scoring.
- Verify Cleanup deletes genuinely old rows (check on 2026-11-26).
- Review n8n 3.0 Migration Report; pin the n8n image version in docker-compose before deploy.
- Tighten GitHub source topics (spam/fake stars).

## Working Style

- One chat per phase. This main chat holds decisions and the plan.
- Guide in medium-sized steps (about 3 related steps per reply), explain WHY briefly.
- Reply in Arabic (Jordanian dialect OK), keep technical terms in English.
- At the end of each phase, summarize: what we built, decisions, problems and fixes, files to save, what the next phase needs.

## Security Rules

- Never commit `.env`, API keys, GitHub tokens, or `N8N_ENCRYPTION_KEY`. The repo is PUBLIC.
- Check workflow JSON for `credentials`/tokens before every commit.
- Never run or download repos from GitHub results without reviewing them first.