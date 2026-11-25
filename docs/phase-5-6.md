# Phase 5-6: Schedule + Export

## What we built
- One workflow (named "NeoPheme - Collection" in n8n; renaming it is optional) with two unconnected chains:
  - Schedule Trigger 07:00 (Asia/Amman): Cleanup Old Rows -> Read Stored Items -> sources -> score -> store.
  - Schedule Trigger 07:15 (hour 7, minute 15 set explicitly): Read For Export -> Build data.json -> GitHub (`Edit a file`, repository `MeerWatch`) on branch gh-pages.
- Published (active). Missed runs are not replayed; run Collection then Export manually.
- Scheduled triggers run the PUBLISHED version of the workflow, not the editor version (see Problems and fixes).
- data.json is live at https://n3xmar.github.io/MeerWatch/data.json (renamed from NeoPheme on 2026-11-24)

## Decisions
- Export is a separate chain so it runs even when Store New Items does not (dedupe day), and the 3-day window keeps moving.
- Branch layout B: n8n commits only data.json to the orphan branch gh-pages; main stays clean. Pages source: gh-pages / root.
- Fine-grained token: MeerWatch repo only (the repo was renamed from NeoPheme; the token kept working), Contents read/write, 90-day expiry. Stored only in n8n Credentials.
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

- **Scheduled run used an old workflow version (2026-11-24).** The 07:00 run wrote `data.json` as a bare array `[...]` and the dashboard showed "unexpected format". A manual Execute used the editor version (object with `generated_at`, `count`, `items`), so it worked, but the Schedule Triggers kept running the older published version. Fix: press **Publish** after every edit. Verified on 2026-11-25 with a test schedule (07:30/07:31) that wrote the correct format; the triggers were then set back to 07:00 and 07:15 and published again.
- **Export trigger had no minute set**, so "Export 07:15" actually ran at 07:00, about 45 seconds after Collection. Fix: Trigger at Minute = 15.
- Check the file format after any workflow change: `git -C C:\Dev\MeerWatch-pages show HEAD:data.json | Select-Object -First 3` must start with `{` and show `generated_at`.

## Open tasks
- Verify the first scheduled run after the 07:00 / 07:15 times were restored (2026-11-26 morning).
- Renew the GitHub token before expiry (~2027-02-21).
- Add .gitignore (n8n/) on gh-pages.
- Back up N8N_ENCRYPTION_KEY outside the repo.
- Idea: longer window for high-importance items (Phase 10).