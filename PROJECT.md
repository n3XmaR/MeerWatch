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
- No AI for now: category/importance/summary come from rules in a Code node. AI (Gemini free, maybe Claude Haiku) can be added later using the same columns.
- No webhooks/API for data: n8n commits `data.json` to GitHub (fine-grained GitHub token stored only in n8n Credentials). The dashboard reads that static file. n8n is never exposed to the internet. A token inside front-end JS is not secret, so we avoid it.
- Hosting: GitHub Pages is free only while the repo is PUBLIC (a private repo needs a paid plan). If the repo goes private again, use a separate public dashboard repo or Cloudflare Pages / Netlify. Branch layout (e.g. `gh-pages` branch holding the dashboard + data.json) is decided in Phase 6.
- Schedule: once a day at 07:00. If the PC was off, press Execute manually (dedupe prevents duplicates). No dashboard refresh button.
- Language: dashboard UI and summaries in English only (LTR). If a chat assistant is added later it replies in the user's language (Arabic or English), technical terms in English.
- Storage: n8n Data Table `neopheme_items` as a short rolling window. The collection filter keeps 3 days (by `published_at`); cleanup deletes rows older than 4 days (by `createdAt`) so the table always remembers an item longer than the filter can return it. No permanent archive.
- Scoring: one Code node "Score Items" between Find New Items ("In A only") and Store New Items. All rules live in a CONFIG object at the top of the node (base score per source, boosts, penalties, recency, categories). Scoring only runs on new items, so each item is scored once and every stored row has category/importance/summary.
- Categories are fixed: Exploit/Zero-day, Malware/Ransomware, Breach/Incident, Vulnerability, Research, Tool, Policy/Other. CISA KEV is always Exploit/Zero-day. Promos get importance 1 (no Promo category).
- Cross-source duplicate boost/grouping is deferred (needs cross-item comparison).
- Reddit is not a source (RSS ended 2026-11-13; public API closing March 2027).
- GitHub tool discovery is deferred to Phase 10 (needs a trusted-org allowlist or `releases.atom` feeds, a longer window, ~8-day retention for tools). The old `topic:security` query was removed (spam and fake stars).
- Never disable nodes (a disabled node still passes items through); delete them instead.
- "Read Stored Items" uses Always Output Data, so on an empty table it returns one empty item. That is expected and harmless; exports must ignore rows with empty `item_id`.

## Normalized Item Schema

```json
{
  "id": "unique id (the link/URL)",
  "title": "...",
  "url": "...",
  "source": "BleepingComputer",
  "type": "news | vuln | tool | video | research",
  "published_at": "ISO 8601 (UTC)",
  "content": "snippet/description (max ~500 chars)",
  "category": "one of the 7 fixed categories",
  "importance": 1,
  "summary": "cleaned first ~200 chars of content (may end with …)"
}
```

> `category`, `importance`, `summary` are added by the Score Items node. `type` values currently produced: news, vuln, research.
> Data Table columns: item_id, title, url, source, type, published_at, content, category (String), importance (Number), summary (String), plus n8n's internal id, createdAt, updatedAt. The item `id` is stored as `item_id`.

## Sources (8 Merge inputs)

- news (RSS): BleepingComputer, The Hacker News, Krebs on Security, SecurityWeek
- vuln: CISA KEV (HTTP + Split Out; `dateAdded` has no time so T00:00Z; filtered to last 3 days BEFORE the Merge)
- research (RSS): Cisco Talos, PortSwigger Research, SANS ISC (Stormcast podcast entries filtered out)
- Removed: YouTube (John Hammond), Dark Reading (overlap), old GitHub query.
- Not available: Reddit.
- Candidates, unverified (open the feed in a browser and read the content first): Microsoft MSRC, Google Project Zero, Schneier, GitHub releases.atom feeds for known tools.
- Adding a source: copy a Fetch + Normalize pair, change URL and `source`, add a Merge input, and add its base score in the CONFIG of Score Items. A source with 0 items after the 3-day filter can be legitimate.

## Phases

| # | Phase | Status |
|---|---|---|
| 0 | Setup (repo, VS Code, Docker) | done |
| 1 | n8n basics | done |
| 2 | Collection (normalize, merge, filter, dedupe) | done |
| 2b | More sources: research/vendor blogs (Talos, PortSwigger, SANS) | done |
| 3 | Storage + cross-day dedupe (Data Table, 3-day window) | done |
| 4 | Scoring WITHOUT AI (category, importance 1-10, summary) | done |
| 5 | Schedule (daily 07:00) + error handling (Continue on Fail) + Cleanup before Read | next |
| 6 | Export `data.json` to GitHub (n8n GitHub node, token in n8n Credentials) | |
| 7 | Dashboard (HTML/CSS/JS, NeoPheme identity) reads data.json, GitHub Pages | |
| 8 | Optional: AI scoring/summaries + chat | |
| 9 | Optional: move n8n to a VPS (HTTPS, Cloudflare Access, backups) | |
| 10 | Improvements (GitHub tool discovery via allowlist/releases.atom, more sources, duplicate grouping, weekly digest) | |

Phases 5 and 6 can share one chat (5 is short and 6 depends on it).

## Workflow Files

- `workflows/01-collection.json`: Phase 2 archive. Superseded.
- `workflows/02-storage.json`: Phase 3 workflow. Superseded.
- `workflows/02b-sources.json`: Phase 2b workflow. Superseded.
- `workflows/03-scoring.json`: Phase 4 workflow (Score Items node). Current.
- Docs: `docs/phase-3.md`, `docs/phase-2b.md`, `docs/phase-4.md`.

## Phase 5/6 Notes (from Phase 4)

- Wire Cleanup Old Rows -> Read Stored Items sequentially (not parallel).
- Continue On Fail on each source Fetch node (and on Store New Items / the future GitHub export node).
- Optional hardening: per-item try/catch in Score Items with fallback `category: 'Policy/Other'`, `importance: 4`, `summary: ''`.
- Recency boost depends on run time (a later manual run gives fewer +1 boosts).
- Export from the stored table after Cleanup: map `item_id` -> `id`, drop internal columns, ignore empty `item_id`, filter to the last 3 days by `published_at`, do not rely on row order (dashboard sorts by importance desc, then published_at desc).

## Open Tasks

- Before every push: credentials scan (expected false positive: `password` inside the `1password` regex), commit only named files.
- Verify Cleanup deletes genuinely old rows (check on 2026-11-26).
- Test scoring on real CISA KEV, PortSwigger and Talos items when they appear.
- Known scoring misses: Cisco Expressway-type items tagged Breach/Incident (idea: add `exploiting a (critical )?flaw` to the Exploit rule); scores saturate at 10 on busy days.
- Review n8n 3.0 Migration Report; pin the n8n image version in docker-compose before deploy.
- Phase 6-7: confirm hosting/branch layout.
- Optional sources (Schneier, MSRC, Project Zero): verify first.
- Back up `N8N_ENCRYPTION_KEY` outside the repo.

## Working Style

- One chat per phase (or two small related phases). This main chat holds decisions and the plan.
- Guide in medium-sized steps (about 3 related steps per reply), explain WHY briefly.
- Reply in Arabic (Jordanian dialect OK), keep technical terms in English.
- At the end of each phase, summarize: what we built, decisions, problems and fixes, files to save, what the next phase needs.
- Exception: Phase 7 (Dashboard front-end). I do NOT want to learn front-end now. The assistant writes the complete dashboard files (index.html, style.css, app.js in dashboard/); I only review, give feedback, and commit.

## Security Rules

- Never commit `.env`, API keys, GitHub tokens, or `N8N_ENCRYPTION_KEY`. The repo is PUBLIC.
- Before every commit run, in `C:\Dev\NeoPheme`:
  `Select-String -Path workflows\*.json -Pattern 'credentials','token','Authorization','Bearer','apiKey','password','secret'` and check any hit is a known false positive, then `git status`.
- Never run or download repos from GitHub results without reviewing them first.