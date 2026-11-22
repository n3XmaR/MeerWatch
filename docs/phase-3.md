# Phase 3: Storage and Cross-Day Dedupe

## Goal
Store collected items in an n8n Data Table as a short rolling window (3 days) and pass only NEW items to later steps (AI layer). No permanent archive.

## What was built
- `KEV Last 3 Days` filter right after the CISA KEV normalize step (about 1790 items reduced to about 4 before the Merge).
- `Keep Last 48h` replaced by `Keep Last 3 Days` so every source uses the same window.
- Data Table `neopheme_items` with columns: `item_id`, `title`, `url`, `source`, `type`, `content` (String) and `published_at` (Date).
- `Read Stored Items` (Data table: Get row(s)) reads the table in parallel with collection. "Always Output Data" is on so an empty table does not stop the branch.
- `Find New Items` (Compare Datasets): Input A = collected items (`id`), Input B = stored rows (`item_id`). Only the "In A only" output continues.
- `Store New Items` (Data table: Insert row) saves the new items.
- `Cleanup Old Rows` (Data table: Delete row(s)) deletes rows where `createdAt` is older than 4 days.

## Flow
```
Manual Trigger -> 8 sources -> Normalize -> Merge -> Keep Last 3 Days
  -> Dedupe by ID -> Sort Newest First -> Find New Items -> Store New Items
Read Stored Items -> Find New Items (Input B)
Cleanup Old Rows (separate branch from the trigger)
```

## Decisions and why
- **Data Table instead of SQLite:** available in my n8n version, simpler, and no external DB access is needed.
- **`item_id` instead of `id`:** n8n adds its own internal `id`, `createdAt` and `updatedAt` columns, so a custom `id` column would clash.
- **3-day filter:** a safety net if the workflow is down for a day, and CISA `dateAdded` has no time component.
- **Cleanup by `createdAt` with 4 days:** an item only enters the table after passing the 3-day filter, so 4 days after insertion it is guaranteed to be older than the filter window and will never be re-collected. Rule: retention in the table must be longer than the filter window. Deleting by `published_at` could remove an item while the filter still lets it through, so it would look "new" again and be sent to the AI twice.

## Problems and fixes
- Picked the `Clear a data table` action by mistake (it wipes the whole table). Fix: use the ROW ACTIONS section, not TABLE ACTIONS.
- This n8n version has no separate Resource/Operation fields for the Data table node; everything is a single Actions list.
- The Delete condition has no "is before" for dates. Use **Less Than** instead.
- Stale numbers in node output came from an old execution. Fix: run the whole workflow instead of a single step.

## Tests
1. Empty table: all 61 items came out of "In A only" and were stored.
2. Second run: "In A only" = 0, Insert did not run, table stayed at 61 (cross-day dedupe works).
3. Cleanup with `days: 4` deleted 0 rows; with `days: 0` it deleted everything. Restored to 4 afterwards.

## Files
- `workflows/02-storage.json`
- `docs/phase-3.md`

## Next
- Phase 4: AI layer (category, importance 1-10, English summary) between `Find New Items` and `Store New Items`, plus AI columns in the table.
- Run `Cleanup Old Rows` after `Store New Items` instead of in parallel.
- Review the n8n 3.0 Migration Report.