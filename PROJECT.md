# MeerWatch

Personal cybersecurity news dashboard (formerly "NeoPheme", renamed 2026-11-24). n8n collects news every morning, rule-based scoring ranks it, and a static web dashboard (GitHub Pages) displays it. AI and a chat assistant are optional later additions.

- **Name:** MeerWatch. Tagline: "Always on watch."
- **Identity:** dark charcoal with amber accents. The logo is still the winged eye with laurel, and the hero has a Greek key (meander) border. These come from the old Pheme theme and were kept on purpose.
- **Goal:** the project is educational for the n8n/automation side. I build the n8n parts, the assistant guides and explains WHY.
- **Purpose:** stay current on important news, research and NEW tools from well-known vendors/platforms, so I don't learn about notable tools late.
- **Status (2026-11-25):** the project is feature-complete and running. What is left is small maintenance (see Open Tasks). Phase 8 (AI) is optional and undecided; Phase 9 (VPS) is skipped for now.

## Environment

- OS: Windows. RAM is limited (Docker/WSL capped at 2GB via `C:\Users\zxamm\.wslconfig`).
- Repo: `C:\Dev\MeerWatch` (outside OneDrive on purpose). GitHub: `n3XmaR/MeerWatch` (currently PUBLIC).
- gh-pages worktree: `C:\Dev\MeerWatch-pages` (separate folder for the `gh-pages` branch; never `git checkout gh-pages` inside `C:\Dev\MeerWatch`). The internal folder `.git/worktrees/NeoPheme-pages` keeps the old name; this is harmless.
- n8n runs in Docker (`n8n/docker-compose.yml` + `n8n/.env`), http://localhost:5678, timezone Asia/Amman.
- The PC must be ON, with Docker Desktop running, at 07:00 and 07:15 (sleep stops the schedule like shutdown does). Docker Desktop should start with Windows. Compose has `restart: unless-stopped`, so do NOT press Stop on the container by hand; quit Docker Desktop itself instead.
- Telegram is blocked in Jordan, so no Telegram bot. Output is a website.
- Everything important lives in files (repo + this PROJECT.md + docs/phase-*.md), so any chat or account can resume from them.
- The Claude assistant in chat has NO push access to the repo (the Claude GitHub App is not installed). I commit and push myself; the assistant gives files and commands.

## Key Decisions

- Automation: n8n in Docker locally first; a VPS is optional later. Missed runs are not replayed: if the PC/Docker was off at 07:00, run Collection then Export manually, in that order.
- **Schedule Triggers run the PUBLISHED version of the workflow.** After ANY edit press **Publish** and check that the button says "Published". A manual Execute uses the editor version, so it can succeed while the schedule still runs old code. This happened on 2026-11-24: the 07:00 run wrote `data.json` as a bare array and the dashboard showed "unexpected format" until the workflow was published.
- The Export trigger sets Hour = 7 and **Minute = 15 explicitly** (before, the minute was missing and Export ran at 07:00, about 45 seconds after Collection).
- To test the schedule: set both triggers a few minutes ahead, Publish, wait, check Executions (no hand icon) and the data.json format, then set them back to 07:00 / 07:15 and Publish AGAIN.
- No AI for now: category/importance/summary come from rules in a Code node. AI (Gemini free, maybe Claude Haiku) can be added later using the same columns.
- One workflow, two independent chains: Schedule 07:00 (collection: Cleanup -> Read Stored -> 9 sources -> Merge -> filter -> dedupe -> Find New Items -> Score Items -> Store) and Schedule 07:15 (export: Read For Export -> Build data.json -> GitHub `Edit a file`). The export reads the table, so it runs even on days with no new items and the 3-day window keeps moving. The workflow is still named "NeoPheme - Collection" in n8n (renaming it is optional).
- Hosting: GitHub Pages from the orphan branch `gh-pages` (root). n8n commits ONLY `data.json` there; `main` stays clean. The dashboard is published to the same branch root by manually copying changed files from `dashboard/` through a git worktree (no GitHub Action), never deleting `data.json`. GitHub Pages is free only while the repo is PUBLIC.
- GitHub token: fine-grained, repo-only, Contents read/write, stored only in n8n Credentials, expires about 2027-02-21. The n8n GitHub node `Edit a file` now has repository `MeerWatch` set explicitly (verified in `workflows/06-meerwatch.json`).
- Public data URL: https://n3xmar.github.io/MeerWatch/data.json
- Live site: https://n3xmar.github.io/MeerWatch/ (the old `.../NeoPheme/` URL is dead; GitHub Pages does not redirect).
- No webhooks/API: the dashboard reads the static file by relative path (no CORS). n8n is never exposed to the internet. Tokens in front-end JS are not secret, so none are used there.
- Dashboard front-end: I do NOT want to learn front-end now. The assistant writes the complete dashboard files (dashboard/ on main); I only review, give feedback, and commit. Small tweaks (like hero size) are done by editing a few CSS variables.
- Schedule: once a day. No dashboard refresh button.
- Language: dashboard UI and summaries in English only (LTR). If a chat assistant is added later it replies in the user's language (Arabic or English), technical terms in English.
- Storage: n8n Data Table `neopheme_items` as a short rolling window. Collection filter keeps 3 days (by `published_at`); Cleanup deletes rows older than 4 days (by `createdAt`) so the table always remembers an item longer than the filter can return it. No permanent archive.
- Legacy names kept on purpose (do not rename): the Data Table `neopheme_items` (nodes reference it by ID) and the localStorage key `neopheme.v1` (renaming would wipe every browser's saved/hidden stories; localStorage is tied to the origin `n3xmar.github.io`, so it survived the repo rename). The key `neopheme.theme` is no longer used, since there is no theme switcher.
- Scoring: one Code node "Score Items" between Find New Items ("In A only") and Store New Items. All rules live in a CONFIG object at the top (base score per source, per-source cap, boosts, penalties, recency, categories). Scoring only runs on new items. Categories are fixed: Exploit/Zero-day, Malware/Ransomware, Breach/Incident, Vulnerability, Research, Tool, Policy/Other. CISA KEV is always Exploit/Zero-day. Items with `type: 'tool'` are always category `Tool` (checked before the keyword rules, so a tool named "...loader" is not tagged Malware). Promos get importance 1.
- Per-source cap: `CONFIG.maxBySource` limits the final importance of a source (currently `Kitploit: 6`), because Kitploit publishes everything and its descriptions contain boost words (RCE, backdoor, CVE) that would otherwise push random tools into "High" (8+). A truly important tool story should arrive from another source (CISA KEV, news) and score high there.
- Error handling: source Fetch nodes use Continue (using error output, unconnected), so a failed source does NOT stop the run and gives no alert; open the execution to see it. Read For Export and the GitHub node use Stop Workflow (never publish a partial file). Read For Export uses Return All (default limit 50 truncates silently).
- Duplicate grouping (the same story in several outlets) is done client-side in the dashboard (same CVE id, or title word overlap; tunable with `GROUP_SIMILARITY` and `GROUP_MIN_SHARED_WORDS` in `CONFIG`; shown as "Also reported by"). A score boost for stories seen in 2+ sources and server-side grouping in n8n are deferred (Phase 10, optional).
- Reddit is not a source (RSS ended 2026-11-13). **GitHub tool discovery is dropped** (decided 2026-11-25): Kitploit is the tool source and is good enough.
- Never disable nodes (a disabled node still passes items through); delete them instead.
- "Read Stored Items" uses Always Output Data + Execute Once; on an empty table it returns one empty item (expected, harmless).
- The dashboard "Sources" stat counts sources that have items inside the 3-day window, not the 9 configured sources, so it can be lower than 9 (e.g. PortSwigger posts rarely).

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

- The file MUST be an object like this. A bare array `[...]` makes the dashboard show "The data file has an unexpected format". Check after any workflow change: `git -C C:\Dev\MeerWatch-pages show HEAD:data.json | Select-Object -First 3` must start with `{` and show `generated_at`.
- Items are sorted by importance desc, then published_at desc, but the dashboard must sort explicitly. Only the last 3 days (by published_at) are included. Rows with empty item_id are dropped.
- Feed text is untrusted: render with textContent, not innerHTML. Use `summary` for cards.
- Fetch with a cache-busting query (Pages CDN can serve an old copy for ~10 minutes). Empty `items` means "no items in the last 3 days"; a failed fetch needs a clear error state with retry.
- Data Table columns: item_id, title, url, source, type, published_at, content, category (String), importance (Number), summary (String), plus n8n's id, createdAt, updatedAt.
- Verified 2026-11-24 after the rename: https://n3xmar.github.io/MeerWatch/data.json returned count 56 with a current `generated_at`. Verified 2026-11-25: a test schedule (07:30/07:31, published) wrote the correct object format.

## Dashboard

- Source: `dashboard/` on main (`index.html`, `css/style.css`, `js/app.js`, `assets/meerwatch.webp`). Plain HTML/CSS/JS, no build step. Details: `docs/phase-7.md`.
- Look: ONE theme, amber on charcoal (the old Neon, Calm and Light themes and the theme switcher were removed).
  - Palette is the `:root` block at the top of `style.css`: `--bg-deep #121317`, `--bg-panel #1a1c21`, `--bg-panel-2 #23262d`, `--border #2f333c`, main accent amber `#f59e0b`, light amber `#fbbf24`, orange `#fb923c` for critical (9-10), `--text #ececf0`, `--text-muted #9a9fab`, danger `#f43f5e`.
  - Legacy variable names: `--cyan` and `--purple` both hold amber, `--magenta` holds orange. The names are misleading but harmless; do not rename them without updating every rule that uses them.
  - Importance levels: 1-3 muted, 4-6 muted (`mid`), 7-8 amber (`high`), 9-10 orange with glow (`crit`).
  - Category chip colors: `CONFIG.CATEGORY_COLORS` in `app.js`.
- Hero: image `assets/meerwatch.webp` (decorative, `alt=""`), inline SVG logo (winged eye + laurel, amber), title `Meer<span>Watch</span>`, tagline "Always on watch.", and "Last updated: ... | n items". If the image fails to load, a CSS gradient shows. Size: `--hero-height` (`clamp(300px, 30vw, 470px)`) and `--hero-focus` (`50% 0%`) in `:root`; phones (max-width 640px) use 360px and `50% 10%`.
- Features: save (star) and hide (X) buttons with a "Restore hidden items" button, All/New/Saved view, NEW tag, day headings (when sorted by date), duplicate grouping ("Also reported by"), Top threats (3, only when no filter is active), search, category/source/type filters, minimum importance, sort, URL hash for filters (`q`, `cat`, `src`, `type`, `min`, `sort`, `view`).
- Saved/hidden/seen state lives in localStorage of each browser only (key `neopheme.v1`): not shared between devices, lost if site data is cleared or in a private window. Saved items keep a small snapshot because they leave data.json after 3 days and stay in Saved until un-starred or hidden.
- Published by copying changed files from `dashboard/` to the root of `gh-pages` via the git worktree at `C:\Dev\MeerWatch-pages`. Never delete `data.json` there. Add files by name, never `git add .`. Before each deploy: `git -C C:\Dev\MeerWatch-pages pull` (n8n commits to that branch daily). Full steps are in `docs/phase-7.md`.
- Local test: run `python -m http.server 8000` INSIDE `C:\Dev\MeerWatch\dashboard` (not the repo root, and NOT `MeerWatch-pages`, which is the published copy). On localhost it reads the live data.json from GitHub Pages (`CONFIG.DATA_URL_LOCAL_TEST`, already updated to the MeerWatch URL). Hard-refresh with Ctrl+Shift+R.
- Image is WebP. Do not commit original PNG files (the repo is public and history is permanent).
- Settings live in the `CONFIG` object at the top of `app.js`.
- The stale banner text in `index.html` says "36 hours" in plain text. If `CONFIG.STALE_HOURS` changes, edit that text too.

## Sources (9 Merge inputs)

- news (RSS): BleepingComputer, The Hacker News, Krebs on Security, SecurityWeek
- vuln: CISA KEV (HTTP + Split Out; `dateAdded` has no time so T00:00Z; filtered to last 3 days BEFORE the Merge)
- research (RSS): Cisco Talos, PortSwigger Research, SANS ISC (Stormcast filtered out)
- tool: Kitploit (added 2026-11-23). Not an RSS Read node: `Fetch KitPloit` (HTTP Request) -> `XML` (XML to JSON, Property Name `data`) -> `Split Out` (field `rss.channel.item`, about 50 items) -> `Normalize Kitploit` (Code) -> Merge input 9.
  - Because it is HTTP + XML, there is no `isoDate` or `contentSnippet`; the code uses raw `title`, `link`, `pubDate`, `description`. `description` contains an `<img>` plus `<p>`, so the code strips tags first, then decodes entities (order matters).
  - `id` = `link` (`guid` is parsed as an object, do not use it).
  - Items whose title ends with "Updated!" are skipped (updates of old tools, not new ones).
  - Title prefix: `New tool: <name>` for `/en/tools/` links, `Release: <name>` for `/en/posts/` links. Type is always `tool`.
  - Scoring: base 3, cap 6, category always `Tool`. Expect importance 3-4 for most items. About 40% of the items are tools, which is accepted.
- Removed: YouTube, Dark Reading, old GitHub query. Not available: Reddit.
- Candidates, unverified (open the feed in a browser first): Microsoft MSRC, Google Project Zero, Schneier.
- Adding a source: copy a Fetch + Normalize pair, change URL and `source`, add a Merge input, add its base score in the Score Items CONFIG (`baseBySource`, and `maxBySource` if it needs a cap). The `source` string must match the key in CONFIG exactly, otherwise it silently gets `defaultBase`.

## Phases

| # | Phase | Status |
|---|---|---|
| 0 | Setup (repo, VS Code, Docker) | done |
| 1 | n8n basics | done |
| 2 | Collection | done |
| 2b | More sources (Talos, PortSwigger, SANS) | done |
| 2c | Kitploit tool source (HTTP + XML, cap 6) | done 2026-11-23, verified live 2026-11-24 |
| 3 | Storage + cross-day dedupe | done |
| 4 | Scoring without AI | done |
| 5 | Schedule + error handling | done; correct scheduled run verified 2026-11-25 (after the Publish fix) |
| 6 | Export data.json to GitHub (gh-pages) | done |
| 7 | Dashboard (assistant writes it fully), published on GitHub Pages | done |
| 7b | Rebrand NeoPheme -> MeerWatch (name, amber/charcoal theme, new hero, repo rename, n8n repo, workflow 06, docs) | done 2026-11-25 |
| 8 | Optional: AI scoring/summaries + chat | not decided |
| 9 | Optional: move n8n to a VPS (HTTPS, Cloudflare Access, backups) | skipped for now |
| 10 | Small improvements only (KEV end-of-day, pin n8n version, watch Kitploit noise). GitHub tool discovery dropped. | optional |

## Workflow Files

- `workflows/06-meerwatch.json`: CURRENT (exported 2026-11-25; GitHub node repository `MeerWatch`, Export trigger minute 15). Re-export it (same name) after any change to the live workflow, run the security scan, then commit.
- `workflows/05-kitploit.json`: superseded (still has repository `NeoPheme` and no Export minute).
- `workflows/01-collection.json`, `02-storage.json`, `02b-sources.json`, `03-scoring.json`, `04-schedule-export.json`: superseded, historical, do not edit.
- Docs: `docs/phase-2b.md`, `docs/phase-3.md`, `docs/phase-4.md`, `docs/phase-5-6.md`, `docs/phase-7.md`.
- `data.json` lives on branch `gh-pages`, written by n8n. Never hand-edit it.

## Next Phase

Nothing is required. Optional small items (Phase 10), in this order:
1. Set KEV `published_at` to end of day (`T23:59:59Z`) so KEV items do not expire earlier than news.
2. Pin the n8n image version in `docker-compose.yml` and review the n8n 3.0 Migration Report (Settings > Migration Report).
3. Watch Kitploit noise for a few days; add a vendor allowlist or lower the cap if the dashboard feels crowded with tools.
4. Later, only if wanted: server-side duplicate grouping and a score boost for stories in 2+ sources, a longer window for high-importance items, weekly digest.

Phase 8 (AI) only if I decide I want it. It adds API keys, cost and failure modes, and the project is already presentable without it. If chosen: summaries and classification for high-importance items only, written into the same columns.

## Open Tasks

Closed on 2026-11-25: n8n `Edit a file` repository set to `MeerWatch`; `workflows/06-meerwatch.json` exported and committed; docs `phase-5-6.md` and `phase-7.md` updated; git history checked for secrets (no tokens, no `.env`, `N8N_ENCRYPTION_KEY` appears only as a variable name); triggers restored to 07:00 / 07:15 and published.

Still open:
- Commit the updated `PROJECT.md` and `README.md` (add by name).
- Check the old hero image is gone: `git ls-files dashboard/assets` and `git -C C:\Dev\MeerWatch-pages ls-files assets`. If `pheme.webp` is still there, `git rm` it in both places (it stays in history, which is fine).
- Check tomorrow morning (2026-11-26) after 07:15: Executions show two separate scheduled runs (07:00 and 07:15, no hand icon), `data.json` starts with `{`, and the site shows the new "Last updated".
- Verify Cleanup around 2026-11-28 (the table was cleared on 2026-11-23, so no row is older than 4 days before then).
- Confirm Workflow Settings: timezone = Asia/Amman and executions are saved.
- Add `.gitignore` (`n8n/`) on gh-pages (inside `C:\Dev\MeerWatch-pages`, add by name, push).
- Back up `N8N_ENCRYPTION_KEY` (value in `n8n/.env`) outside the repo, e.g. in a password manager. Without it, saved n8n credentials cannot be decrypted if the Docker volume is lost.
- Pin the n8n version in `n8n/docker-compose.yml` (tag instead of `latest`; the current version is under n8n Settings > About), then `docker compose up -d`. Review the n8n 3.0 Migration Report.
- Renew the GitHub token before about 2027-02-21 (set a calendar reminder) and make sure it still covers the repo.
- Optional: rename the n8n workflow and the credential ("GitHub - NeoPheme export"); a logo that matches the new name (the winged eye + laurel belongs to the old Pheme identity).
- Optional before sharing the project publicly (e.g. a LinkedIn post): read the README as a stranger would and open the live site on a phone.
- Known scoring misses: Cisco Expressway-type items tagged Breach/Incident; scores saturate at 10 on busy days; optional per-item try/catch in Score Items.
- Test scoring on real CISA KEV, PortSwigger and Talos items when they appear.
- Dashboard limitations (optional later): stats ignore filters and hidden stories, no `hashchange` listener, grouping is title-word based, saved/hidden state is per browser (no sync; an Export/Import JSON button would be the simplest fix).

## Gotchas learned

- Edit workflow -> Publish. Manual Execute does not prove the schedule works.
- Run git commands and security scans from `C:\Dev\MeerWatch` (repo root), not from inside `dashboard\` (paths like `dashboard/index.html` fail there).
- `python -m http.server` must run inside `C:\Dev\MeerWatch\dashboard`.
- Never `git add .`; add files by name. `data.json` must never show as modified in the pages worktree.
- A source showing no items in the dashboard is not always broken. Check the Fetch node in the last execution (Fetch nodes use Continue, so failures are silent).
- Pages CDN can serve an old copy for up to about 10 minutes; hard-refresh with Ctrl+Shift+R.

## Working Style

- One chat per phase (or two small related phases). This main chat holds decisions and the plan.
- Guide in medium-sized steps (about 3 related steps per reply), explain WHY briefly. Exception: front-end, the assistant writes the full files.
- Reply in Arabic (Jordanian dialect OK), keep technical terms in English. No insults either way.
- At the end of each phase, summarize: what we built, decisions, problems and fixes, files to save, what the next phase needs.
- To resume in a new chat or account: attach `PROJECT.md` and the relevant `docs/phase-*.md`, say which Open Task or phase to continue, and (if useful) attach the live `dashboard/` files and `workflows/06-meerwatch.json`.

## Security Rules

- Never commit `.env`, API keys, GitHub tokens, or `N8N_ENCRYPTION_KEY`. The repo is PUBLIC.
- Run all scans from `C:\Dev\MeerWatch` (not from inside `dashboard\`). Before every commit run:
  `Select-String -Path workflows\*.json -Pattern 'credentials','token','Authorization','Bearer','apiKey','password','secret','ghp_','github_pat_'`
  Known false positives: `password` inside the `1password` regex (jsCode line) and the GitHub node's `"credentials": {` reference (id + name only). Then `git status`, and add files by name.
- For dashboard commits also run:
  `Select-String -Path dashboard\js\*.js,dashboard\index.html -Pattern 'token','ghp_','github_pat_','apiKey','Bearer','secret'`
  Known false positives: `tokens` in `app.js` (title words for duplicate grouping, 3 lines). Anything else is a problem.
- History check (done clean on 2026-11-25; repeat before making anything public): `git log --all --oneline -G"ghp_[A-Za-z0-9]{30,}"`, `-G"github_pat_[A-Za-z0-9_]{20,}"`, `-G"N8N_ENCRYPTION_KEY\s*[=:]\s*[A-Za-z0-9]{16,}"` and `git log --all --oneline -- "*.env"` must all return nothing. If a real token ever appears, revoke it on GitHub first: deleting it from history is not enough.
- Never `git add .` on any branch. On gh-pages work only in `C:\Dev\MeerWatch-pages`.
- Never run or download repos from GitHub results without reviewing them first.