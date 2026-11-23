# Phase 5-6: Schedule + Export

## What we built
- One workflow "NeoPheme - Collection" with two unconnected chains:
  - Schedule Trigger 07:00 (Asia/Amman): Cleanup Old Rows -> Read Stored Items -> sources -> score -> store.
  - Schedule Trigger 07:15: Read For Export -> Build data.json -> GitHub (Edit file) on branch gh-pages.
- Published (active). Missed runs are not replayed; run Collection then Export manually.
- data.json is live at https://n3xmar.github.io/NeoPheme/data.json

## Decisions
- Export is a separate chain so it runs even when Store New Items does not (dedupe day), and the 3-day window keeps moving.
- Branch layout B: n8n commits only data.json to the orphan branch gh-pages; main stays clean. Pages source: gh-pages / root.
- Fine-grained token: NeoPheme repo only, Contents read/write, 90-day expiry. Stored only in n8n Credentials.
- Fetch nodes: On Error = Continue (using error output), error output unconnected.
- Cleanup: Always Output Data. Read Stored Items: Always Output Data + Execute Once.
- Read For Export and GitHub node: Stop Workflow on error (never publish a partial file).
- Read For Export uses Return All (default limit 50 would silently truncate).
- Build data.json: skips empty item_id, filters last 3 days by published_at (rolling, to the minute), item_id -> id, sorts by importance then date.

## Problems and fixes
- PowerShell 5.1 has no utf8NoBOM: wrote data.json with [System.IO.File]::WriteAllText + UTF8Encoding($false).
- On the orphan branch the main .gitignore disappears, so n8n/ (with .env) showed as untracked. Only `git add data.json` was used.
- GitHub Edit creates a commit on every run even with identical content (accepted, separate branch).
- Invoke-RestMethod | Measure-Object showed Count 1; use $data = Invoke-RestMethod ...; $data.Count (38).

## Open tasks
- Verify the first scheduled runs on 2026-11-24 (Executions + new commit on gh-pages).
- Renew the GitHub token before expiry (~2027-02-21).
- Add .gitignore (n8n/) on gh-pages.
- Back up N8N_ENCRYPTION_KEY outside the repo.
- Idea: longer window for high-importance items (Phase 10).