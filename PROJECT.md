# NeoPheme

Personal cybersecurity news dashboard. n8n collects news every morning, rule-based scoring ranks it, and a static web dashboard displays it. AI and a chat assistant are optional later additions.

- **Name:** Pheme (Greek goddess of rumor/fame/news) + Neo (new).
- **Identity:** cyber look, cyan/purple on dark blue, Greek laurel + winged-eye motif.
- **Goal:** the project is educational. I build, the assistant guides and explains WHY.
- **Purpose:** stay current on important news, research and NEW tools from well-known vendors/platforms, so I don't learn about notable tools late.

## Environment

- OS: Windows. RAM is limited (Docker/WSL capped at 2GB via `C:\Users\zxamm\.wslconfig`).
- Repo: `C:\Dev\NeoPheme` (outside OneDrive on purpose). GitHub: `n3XmaR/NeoPheme` (currently PUBLIC).
- n8n runs in Docker (`n8n/docker-compose.yml` + `n8n/.env`), http://localhost:5678, timezone Asia/Amman.
- Telegram is blocked in Jordan, so no Telegram bot. Output is a website.
- Everything important lives in files (repo + this PROJECT.md + docs/phase-*.md), so any chat or account can resume from them.

## Key Decisions

- Automation: n8n in Docker locally first; a VPS is optional later.
- No AI for now: category/importance/summary come from rules in a Code node. Columns `category`, `importance`, `summary` are kept so AI (Gemini free, maybe Claude Haiku) can be added later.
- No webhooks/API for data: n8n commits `data.json` to GitHub (separate `data` branch or dashboard repo; fine-grained GitHub token stored only in n8n Credentials). The dashboard reads that static file. n8n is never exposed to the internet. A token inside front-end JS is not secret, so we avoid it.
- Hosting: GitHub Pages on a PRIVATE repo needs a paid plan. Use a separate PUBLIC repo for the dashboard + data.json (main repo stays private), or Cloudflare Pages / Netlify.
- Schedule: once a day at 07:00. If the PC was off, press Execute manually (dedupe prevents duplicates). No dashboard refresh button.
- Language: dashboard UI and summaries in English only (LTR). If a chat assistant is added later it replies in the user's language (Arabic or English), technical terms in English.
- Storage: n8n Data Table `neopheme_items` as a short rolling window. The collection filter keeps 3 days (by `published_at`); cleanup deletes rows older than 4 days (by `createdAt`) so the table always remembers an item longer than the filter can return it. No permanent archive.
- Insert into the Data Table happens AFTER scoring (every stored row has category/importance/summary). Scoring node goes between Find New Items and Store New Items.
- Scoring relies on the source text only, always keeps the original link, and scores spam/low-quality items low.
- Reddit is not a source (RSS ended 2026-11-13; public API closing March 2027).
- GitHub tool discovery is deferred to Phase 10 (needs a trusted-org allowlist or `releases.atom` feeds, a longer window, ~8-day retention for tools). The old `topic:security` query was removed (spam and fake stars).
- Never disable nodes (a disabled node still passes items through); delete them instead.

## Normalized Item Schema

```json
{
  "id": "unique id (the link/URL)",
  "title": "...",
  "url": "...",
  "source": "BleepingComputer",
  "type": "news | vuln | tool | video | research",
  "published_at": "ISO 8601",
  "content": "snippet/description (max ~500 chars)"
}
```

> `type` values currently produced: news, vuln, research. (tool, video stay in the schema for later.)
> In the Data Table the `id` field is stored as `item_id`, because n8n adds its own internal `id`, `createdAt` and `updatedAt` columns.

## Sources (8 Merge inputs)

- news (RSS): BleepingComputer, The Hacker News, Krebs on Security, SecurityWeek
- vuln: CISA KEV (HTTP + Split Out; `dateAdded` has no time so T00:00Z; filtered to last 3 days BEFORE the Merge)
- research (RSS): Cisco Talos, PortSwigger Research, SANS ISC (Stormcast podcast entries filtered out)
- Removed: YouTube (John Hammond), Dark Reading (overlap), old GitHub query.
- Not available: Reddit.
- Candidates, unverified (open the feed in a browser and read the content first): Microsoft MSRC, Google Project Zero, Schneier, GitHub releases.atom feeds for known tools.
- Adding a source: copy a Fetch + Normalize pair, change URL and `source`, increase Merge inputs. A source with 0 items after the 3-day filter can be legitimate.

## Phases

| # | Phase | Status |
|---|---|---|
| 0 | Setup (repo, VS Code, Docker) | done |
| 1 | n8n basics | done |
| 2 | Collection (normalize, merge, filter, dedupe) | done |
| 2b | More sources: research/vendor blogs (Talos, PortSwigger, SANS) | done |
| 3 | Storage + cross-day dedupe (Data Table, 3-day window) | done |
| 4 | Scoring WITHOUT AI (Code node: category, importance 1-10, short summary) | next |
| 5 | Schedule (daily 07:00) + error handling (Continue on Fail) + Cleanup before Read | |
| 6 | Export `data.json` to GitHub (n8n GitHub node, token in n8n Credentials) | |
| 7 | Dashboard (HTML/CSS/JS, NeoPheme identity) reads data.json, public hosting | |
| 8 | Optional: AI scoring/summaries + chat | |
| 9 | Optional: move n8n to a VPS (HTTPS, Cloudflare Access, backups) | |
| 10 | Improvements (GitHub tool discovery via allowlist/releases.atom, more sources, weekly digest) | |

## Workflow Files

- `workflows/01-collection.json`: Phase 2 archive. Superseded.
- `workflows/02-storage.json`: Phase 3 workflow (Data Table, Find New Items, Cleanup).
- `workflows/02b-sources.json`: Phase 2b workflow (8 sources). Current.
- Docs: `docs/phase-3.md`, `docs/phase-2b.md`.

## Open Tasks

- Before pushing 02b: run the credentials scan (see Security Rules), commit only named files.
- Phase 4: scoring hints are in `docs/phase-2b.md` section 6 (KEV baseline high, PortSwigger boost, Talos newsletter low, SANS guest diary low, keyword boosts/penalties, recency boost). Check SANS `content` for leftover escape junk.
- Phase 5: wire Cleanup Old Rows -> Read Stored Items (not parallel); Store after scoring.
- Verify Cleanup deletes genuinely old rows (check on 2026-11-26).
- Review n8n 3.0 Migration Report; pin the n8n image version in docker-compose before deploy.
- Phase 6-7: decide hosting (separate public dashboard repo vs Cloudflare Pages/Netlify).
- Optional sources (Schneier, MSRC, Project Zero): verify first.
- Back up `N8N_ENCRYPTION_KEY` outside the repo.

## Working Style

- One chat per phase. This main chat holds decisions and the plan.
- Guide in medium-sized steps (about 3 related steps per reply), explain WHY briefly.
- Reply in Arabic (Jordanian dialect OK), keep technical terms in English.
- At the end of each phase, summarize: what we built, decisions, problems and fixes, files to save, what the next phase needs.

## Security Rules

- Never commit `.env`, API keys, GitHub tokens, or `N8N_ENCRYPTION_KEY`.
- Before every commit run, in `C:\Dev\NeoPheme`:
  `Select-String -Path workflows\*.json -Pattern 'credentials','token','Authorization','Bearer','apiKey','password','secret'` (must return nothing), then `git status`.
- Never run or download repos from GitHub results without reviewing them first.