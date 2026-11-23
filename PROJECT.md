# NeoPheme

Personal cybersecurity news dashboard. n8n collects news every morning, rule-based scoring ranks it, and a static web dashboard (GitHub Pages) displays it. AI and a chat assistant are optional later additions.

- **Name:** Pheme (Greek goddess of rumor/fame/news) + Neo (new).
- **Identity:** cyber look, cyan/purple on dark blue, Greek laurel + winged-eye motif.
- **Goal:** the project is educational for the n8n/automation side. I build the n8n parts, the assistant guides and explains WHY.
- **Purpose:** stay current on important news, research and NEW tools from well-known vendors/platforms, so I don't learn about notable tools late.

## Environment

- OS: Windows. RAM is limited (Docker/WSL capped at 2GB via `C:\Users\zxamm\.wslconfig`).
- Repo: `C:\Dev\NeoPheme` (outside OneDrive on purpose). GitHub: `n3XmaR/NeoPheme` (currently PUBLIC).
- gh-pages worktree: `C:\Dev\NeoPheme-pages` (separate folder for the `gh-pages` branch; never `git checkout gh-pages` inside `C:\Dev\NeoPheme`).
- n8n runs in Docker (`n8n/docker-compose.yml` + `n8n/.env`), http://localhost:5678, timezone Asia/Amman.
- Telegram is blocked in Jordan, so no Telegram bot. Output is a website.
- Everything important lives in files (repo + this PROJECT.md + docs/phase-*.md), so any chat or account can resume from them.

## Key Decisions

- Automation: n8n in Docker locally first; a VPS is optional later. Missed runs are not replayed: if the PC/Docker was off at 07:00, run Collection then Export manually, in that order.
- No AI for now: category/importance/summary come from rules in a Code node. AI (Gemini free, maybe Claude Haiku) can be added later using the same columns.
- One workflow "NeoPheme - Collection", two independent chains: Schedule 07:00 (collection: Cleanup -> Read Stored -> 8 sources -> Merge -> filter -> dedupe -> Find New Items -> Score Items -> Store) and Schedule 07:15 (export: Read For Export -> Build data.json -> GitHub). The export reads the table, so it runs even on days with no new items and the 3-day window keeps moving.
- Hosting: GitHub Pages from the orphan branch `gh-pages` (root). n8n commits ONLY `data.json` there; `main` stays clean. The dashboard is published to the same branch root by manually copying changed files from `dashboard/` through a git worktree (no GitHub Action), never deleting `data.json`. GitHub Pages is free only while the repo is PUBLIC.
- GitHub token: fine-grained, `NeoPheme` only, Contents read/write, stored only in n8n Credentials, expires about 2027-02-21.
- Public data URL: https://n3xmar.github.io/NeoPheme/data.json
- Live site: https://n3xmar.github.io/NeoPheme/
- No webhooks/API: the dashboard reads the static file by relative path (no CORS). n8n is never exposed to the internet. Tokens in front-end JS are not secret, so none are used there.
- Dashboard front-end: I do NOT want to learn front-end now. The assistant writes the complete dashboard files (dashboard/ on main); I only review, give feedback, and commit. Small tweaks (like hero size) are done by editing a few CSS variables.
- Schedule: once a day. No dashboard refresh button.
- Language: dashboard UI and summaries in English only (LTR). If a chat assistant is added later it replies in the user's language (Arabic or English), technical terms in English.
- Storage: n8n Data Table `neopheme_items` as a short rolling window. Collection filter keeps 3 days (by `published_at`); Cleanup deletes rows older than 4 days (by `createdAt`) so the table always remembers an item longer than the filter can return it. No permanent archive.
- Scoring: one Code node "Score Items" between Find New Items ("In A only") and Store New Items. All rules live in a CONFIG object at the top (base score per source, boosts, penalties, recency, categories). Scoring only runs on new items. Categories are fixed: Exploit/Zero-day, Malware/Ransomware, Breach/Incident, Vulnerability, Research, Tool, Policy/Other. CISA KEV is always Exploit/Zero-day. Promos get importance 1.
- Error handling: source Fetch nodes use Continue (using error output, unconnected). Read For Export and the GitHub node use Stop Workflow (never publish a partial file). Read For Export uses Return All (default limit 50 truncates silently).
- Duplicate grouping (the same story in several outlets) is done client-side in the dashboard (same CVE id, or title word overlap; tunable with `GROUP_SIMILARITY` and `GROUP_MIN_SHARED_WORDS` in `CONFIG`; shown as "Also reported by"). A score boost for stories seen in 2+ sources and server-side grouping in n8n are still deferred to Phase 10.
- Reddit is not a source (RSS ended 2026-11-13). GitHub tool discovery is deferred to Phase 10 (allowlist or releases.atom feeds, longer window).
- Never disable nodes (a disabled node still passes items through); delete them instead.
- "Read Stored Items" uses Always Output Data + Execute Once; on an empty table it returns one empty item (expected, harmless).

## data.json (published on gh-pages)

```json
{
  "generated_at": "2026-11-24T04:15:00.000Z",
  "count": 38,
  "items": [
    {
      "id": "https://... (the item URL)",
      "title": "...",
      "url": "...",
      "source": "BleepingComputer",
      "type": "news | vuln | research | tool | video",
      "published_at": "ISO 8601 UTC (.000Z)",
      "content": "snippet (may contain newlines and [...])",
      "category": "Exploit/Zero-day | Malware/Ransomware | Breach/Incident | Vulnerability | Research | Tool | Policy/Other",
      "importance": 1,
      "summary": "cleaned ~200 chars, may end with …"
    }
  ]
}
```

- Items are sorted by importance desc, then published_at desc, but the dashboard must sort explicitly. Only the last 3 days (by published_at) are included. Rows with empty item_id are dropped.
- Feed text is untrusted: render with textContent, not innerHTML. Use `summary` for cards.
- Fetch with a cache-busting query (Pages CDN can serve an old copy for ~10 minutes). Empty `items` means "no items in the last 3 days"; a failed fetch needs a clear error state with retry.
- Data Table columns: item_id, title, url, source, type, published_at, content, category (String), importance (Number), summary (String), plus n8n's id, createdAt, updatedAt.

## Dashboard

- Source: `dashboard/` on main (`index.html`, `css/style.css`, `js/app.js`, `assets/pheme.webp`). Plain HTML/CSS/JS, no build step. Details: `docs/phase-7.md`.
- v2 features: three themes (Neon default, Calm, Light), save (star) and hide (X) buttons with a restore button, All/New/Saved view, NEW tag, day headings (when sorted by date), and duplicate grouping ("Also reported by"). Saved/hidden/seen/theme live in localStorage of each browser only (keys `neopheme.v1`, `neopheme.theme`). Details: `docs/phase-7.md`.
- Hero size: two variables at the top of `style.css` `:root`: `--hero-height` (currently `clamp(300px, 30vw, 470px)`) and `--hero-focus` (`50% 0%`, keeps the head and wings visible). Phones (max-width 640px) override them in a media query.
- Published by copying changed files from `dashboard/` to the root of `gh-pages` via the git worktree at `C:\Dev\NeoPheme-pages`. Never delete `data.json` there. Add files by name, never `git add .`. Before each deploy: `git -C C:\Dev\NeoPheme-pages pull` (n8n commits to that branch daily). Full steps are in `docs/phase-7.md`.
- Local test: run `python -m http.server 8000` INSIDE `C:\Dev\NeoPheme\dashboard` (not the repo root, and NOT `NeoPheme-pages`, which is the published copy). On localhost it reads the live data.json from GitHub Pages. Hard-refresh with Ctrl+Shift+R.
- Image is WebP (about 0.2MB). Do not commit the original 2.3MB PNG (the repo is public and history is permanent).
- Settings live in the `CONFIG` object at the top of `app.js`; colors are CSS variables on `:root` in `style.css`.
- The stale banner text in `index.html` says "36 hours" in plain text. If `CONFIG.STALE_HOURS` changes, edit that text too.

## Sources (8 Merge inputs)

- news (RSS): BleepingComputer, The Hacker News, Krebs on Security, SecurityWeek
- vuln: CISA KEV (HTTP + Split Out; `dateAdded` has no time so T00:00Z; filtered to last 3 days BEFORE the Merge)
- research (RSS): Cisco Talos, PortSwigger Research, SANS ISC (Stormcast filtered out)
- Removed: YouTube, Dark Reading, old GitHub query. Not available: Reddit.
- Candidates, unverified (open the feed in a browser first): Microsoft MSRC, Google Project Zero, Schneier, GitHub releases.atom feeds.
- Adding a source: copy a Fetch + Normalize pair, change URL and `source`, add a Merge input, add its base score in the Score Items CONFIG.

## Phases

| # | Phase | Status |
|---|---|---|
| 0 | Setup (repo, VS Code, Docker) | done |
| 1 | n8n basics | done |
| 2 | Collection | done |
| 2b | More sources (Talos, PortSwigger, SANS) | done |
| 3 | Storage + cross-day dedupe | done |
| 4 | Scoring without AI | done |
| 5 | Schedule + error handling | done (verify first scheduled run 2026-11-24) |
| 6 | Export data.json to GitHub (gh-pages) | done |
| 7 | Dashboard (assistant writes it fully), published on GitHub Pages | done, v2 published 2026-11-23 (verify live site) |
| 8 | Optional: AI scoring/summaries + chat | |
| 9 | Optional: move n8n to a VPS (HTTPS, Cloudflare Access, backups) | |
| 10 | Improvements (GitHub tool discovery, more sources, server-side duplicate grouping and score boost, longer window for high-importance items, weekly digest) | |

## Workflow Files

- `workflows/04-schedule-export.json`: Phase 5-6 workflow. Current.
- `workflows/01-collection.json`, `02-storage.json`, `02b-sources.json`, `03-scoring.json`: Superseded.
- Docs: `docs/phase-2b.md`, `docs/phase-3.md`, `docs/phase-4.md`, `docs/phase-5-6.md`, `docs/phase-7.md`.
- `data.json` lives on branch `gh-pages`, written by n8n. Never hand-edit it.

## Open Tasks

- Verify the live site after the v2 publish: no 404s in DevTools Network, `data.json` loaded from its own origin, filters, themes, save/hide/restore, mobile look.
- Verify the first scheduled runs on 2026-11-24 (Executions + commit `data 2026-11-24` on gh-pages, and that `generated_at` updates on the live dashboard).
- Verify Cleanup around 2026-11-28 (the table was cleared on 2026-11-23, so no row is older than 4 days before then).
- Renew the GitHub token before about 2027-02-21.
- Confirm Workflow timezone = Asia/Amman and executions are saved.
- Idea: set KEV `published_at` to end of day (T23:59:59Z) so KEV items do not expire earlier than news.
- Known scoring misses: Cisco Expressway-type items tagged Breach/Incident; scores saturate at 10 on busy days; optional per-item try/catch in Score Items.
- Test scoring on real CISA KEV, PortSwigger and Talos items when they appear.
- Review n8n 3.0 Migration Report; pin the n8n image version in docker-compose.
- Back up `N8N_ENCRYPTION_KEY` outside the repo.
- Add `.gitignore` (n8n/) on gh-pages.
- Dashboard limitations (optional later): stats ignore filters and hidden stories, no `hashchange` listener, grouping is title-word based, saved/hidden state is per browser (no sync).

## Working Style

- One chat per phase (or two small related phases). This main chat holds decisions and the plan.
- Guide in medium-sized steps (about 3 related steps per reply), explain WHY briefly. Exception: Phase 7 front-end, the assistant writes the full files.
- Reply in Arabic (Jordanian dialect OK), keep technical terms in English.
- At the end of each phase, summarize: what we built, decisions, problems and fixes, files to save, what the next phase needs.

## Security Rules

- Never commit `.env`, API keys, GitHub tokens, or `N8N_ENCRYPTION_KEY`. The repo is PUBLIC.
- Run all scans from `C:\Dev\NeoPheme` (not from inside `dashboard\`). Before every commit run:
  `Select-String -Path workflows\*.json -Pattern 'credentials','token','Authorization','Bearer','apiKey','password','secret','ghp_','github_pat_'`
  Known false positives: `password` inside the `1password` regex (jsCode line) and the GitHub node's `"credentials": {` reference (id + name only). Then `git status`, and add files by name.
- For dashboard commits also run:
  `Select-String -Path dashboard\js\*.js,dashboard\index.html -Pattern 'token','ghp_','github_pat_','apiKey','Bearer','secret'`
  Known false positives: `tokens` in `app.js` (title words for duplicate grouping, 3 lines). Anything else is a problem.
- Never `git add .` on any branch. On gh-pages work only in `C:\Dev\NeoPheme-pages`.
- Never run or download repos from GitHub results without reviewing them first.