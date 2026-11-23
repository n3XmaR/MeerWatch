# Phase 7: Dashboard

## What we built

**File tree** (source folder `dashboard/` in the repo, on `main`):

```
dashboard/
├── index.html      page structure, inline SVG favicon, inline SVG logo, loads css/style.css and js/app.js
├── css/style.css   palette (CSS variables on :root), layout, cards, hero, themes, states, responsive rules
├── js/app.js       CONFIG, data loading, normalization, filtering, sorting, grouping, rendering, URL hash
└── assets/pheme.webp   mascot image (placed manually by me, not generated)
```

Published to the root of `gh-pages` (v2, 2026-11-23): https://n3xmar.github.io/NeoPheme/

**Features implemented (v1)**
- **Hero:** mascot image, dark gradient overlay, inline SVG logo (winged eye + laurel), "NeoPheme" title, tagline ("Pheme heard it first."), and "Last updated: <local time> | <n> items". CSS gradient fallback if the image fails.
- **Meander (Greek key) border:** CSS data-URI SVG under the hero and above the footer.
- **Stats strip:** total items, high-importance count (importance >= 8), top category with its count, number of sources. Computed on all items, not on the filtered view.
- **Top threats:** the 3 highest-importance items as larger cards. Shown only when no filter is active.
- **Controls:** text search (title + summary, 150 ms debounce), category / source / type dropdowns (built from the data, with counts), minimum importance buttons (All / 5+ / 7+ / 9+), sort (Importance, Newest, Oldest), Reset filters, and "Showing X of Y items".
- **Cards:** importance badge, category chip (color per category), title as link, summary, source, type label, relative time with exact local time in the tooltip.
- **States:** loading skeletons, error + Retry, empty (3-day window message), no matches, stale warning banner.
- **Accessibility:** skip link, labelled controls, `aria-pressed` on toggle buttons, `aria-live` on count and updated line, focus-visible outlines, `prefers-reduced-motion`, semantic HTML.
- **Footer:** credit line plus a note that scoring is rule-based.

**Features added in v2** (read from the code in `app.js`)
- **Themes:** the "Theme: ..." button at the top right of the hero cycles Neon (default), Calm and Light. The theme is set as `data-theme` on `<html>` and saved in `localStorage` (`CONFIG.THEME_KEY`).
  - Calm: no glows or text shadows, softer purple/magenta, slightly desaturated hero image.
  - Light: light page and panels. The hero stays dark in every theme, so its text keeps light colors.
- **Saved stories (star button):** saves a story for later. A saved story keeps a small snapshot (title, url, source, type, category, importance, date, summary), because it leaves `data.json` after 3 days. The "Saved" view reads these snapshots.
- **Hide stories (X button):** hides a story. "Restore hidden items (n)" brings all hidden stories back. Hiding also removes the story from Saved. Hidden entries are deleted automatically once the item is no longer in `data.json`.
- **View buttons (All / New / Saved):** a new control (`#f-view`, hash key `view`). "New" shows stories first seen by this browser during the current visit.
- **NEW tag:** an item is NEW if this browser first saw it after the start of the current "visit". A visit ends after `SESSION_GAP_HOURS` (6) away, and then the baseline moves to the last visit time. On the very first visit nothing is NEW.
- **Duplicate grouping:** the same story from different sources is merged into one card with "Also reported by: <source links>". Two items match if they share a CVE id, or share at least `GROUP_MIN_SHARED_WORDS` (3) title words and the word overlap is at least `GROUP_SIMILARITY` (0.5). Details: only items from different sources match, each item is compared with a group's main item only (no chain merging), and a group has at most one item per source. The main item is the one with the highest importance, then the newest.
- **Top threats now only shows when no filter is active, and those cards are removed from the main grid**, so they no longer repeat.
- **Day headings** ("Today", "Yesterday", weekday) are shown only when sorting by Newest or Oldest.
- **Count line:** "Showing X stories (Y items)", so it shows the effect of grouping.
- **Hero is shorter and shows the whole head**, see "Hero size" below.

## Decisions

**Design and where to change it**
- **Colors:** the `:root` block at the top of `style.css`. Theme overrides are at the end of the file (`:root[data-theme="calm"]` and `:root[data-theme="light"]`).
- **Hero size (2 variables in `:root`):**
  - `--hero-height: clamp(300px, 30vw, 470px)` : min, preferred (30% of screen width), max.
  - `--hero-focus: 50% 0%` : which part of the image is shown. 0% = top of the image (head, wings, laurel crown), so any cropping happens at the bottom.
  - Phones (max-width 640px) override both: `--hero-height: 360px`, `--hero-focus: 50% 10%`, and `.hero__content` gets extra top padding for the theme button.
- **CONFIG keys in `app.js`:** `DATA_URL`, `DATA_URL_LOCAL_TEST`, `STALE_HOURS`, `HIGH_IMPORTANCE` (8), `TOP_THREATS` (3), `DEFAULT_SORT`, `STORAGE_KEY` (`neopheme.v1`), `THEME_KEY` (`neopheme.theme`), `SESSION_GAP_HOURS` (6), `GROUP_DUPLICATES` (true), `GROUP_MIN_SHARED_WORDS` (3), `GROUP_SIMILARITY` (0.5, higher = stricter), `IMPORTANCE_LEVELS`, `CATEGORY_COLORS`, `NEUTRAL_COLOR`, `TYPE_LABELS`. Also `THEMES` and `STOP_WORDS` as constants below CONFIG.
- **Importance levels:** `IMPORTANCE_LEVELS` maps score to a level name (1-3 low, 4-6 mid, 7-8 high, 9-10 crit). The colors for each level live in `style.css` (`.card[data-level=...]`).
- **Category chip colors:** `CONFIG.CATEGORY_COLORS`.
- The overlay on the hero is light at the top and dark only near the bottom, so the head is not dimmed and the text stays readable.

**Security**
- No `innerHTML` or `insertAdjacentHTML` with feed data. DOM is built with `createElement` and `textContent` (helper `h()`).
- Links are validated with `new URL()`; only `http:` and `https:` are accepted (`safeUrl()`). Links use `target="_blank"` and `rel="noopener noreferrer"`.
- Cards use `summary` only, never `content`.
- No tokens, keys, analytics or third-party requests. The only network request is `data.json`.
- `localStorage` holds only my own choices and feed titles/summaries (saved snapshots, hidden ids, seen times, theme). Saved snapshots go through `normalizeItem` again and are rendered with `textContent`. Storage access is wrapped in try/catch, so blocked storage just means nothing is remembered.
- The localStorage data is per browser and per site: `localhost:8000` and the live site do not share it, and nothing syncs between devices.
- Security scan: `Select-String` for `token` matches `app.js` lines about `tokens` (title words used for duplicate grouping). These are false positives, not secrets.

**How data is loaded**
- `CONFIG.DATA_URL = "data.json"` (relative) in production. On localhost, 127.0.0.1 or file:// it reads `https://n3xmar.github.io/NeoPheme/data.json`.
- Every fetch appends `?t=Date.now()` and uses `cache: "no-store"`.
- The load fails with an error if the response is not OK or `items` is not an array.
- Stale threshold: `CONFIG.STALE_HOURS = 36`. The banner text in `index.html` says "36 hours" in plain text, so edit both together.

**URL hash / filter state**
- Filters are written to the hash with `history.replaceState`: `q`, `cat`, `src`, `type`, `min`, `sort`, `view`. Defaults are omitted.
- The hash is read once in `init()`. There is no `hashchange` listener.
- Invalid hash values are ignored (`min` accepts only 5, 7, 9; `view` only all, new, saved).

**Bad data handling (`normalizeItem`)**
- Items that are not objects or have an empty title are skipped.
- `importance` is rounded and clamped to 1-10 (missing = 1). Invalid `published_at` becomes null ("unknown time", sorts as 0).
- Missing `source` = "Unknown", `category` = "Uncategorized", `type` = "other". Unknown category/type uses the neutral color and raw text.
- Sorting is always done in JS (importance desc then date desc by default).

## Problems and fixes

- **Server started from the wrong folder.** `python -m http.server` was run inside `C:\Dev\NeoPheme-pages` (the published copy), so local changes did not show. Fix: run it inside `C:\Dev\NeoPheme\dashboard` and hard-refresh (`Ctrl+Shift+R`).
- **Hero size edits had no effect.** `style.css` had a "v2 additions" block at the end with a second `.hero { min-height: clamp(180px, 26vh, 250px) }` that overrode the earlier rule. Fix: merged everything into one clean `style.css` with a single hero rule driven by `--hero-height` and `--hero-focus`.
- **Hero was too short and cut the head.** Fixed with `--hero-height: clamp(300px, 30vw, 470px)` and `--hero-focus: 50% 0%`.
- **Security scan ran from the wrong folder** (`dashboard\dashboard` not found). Run it from `C:\Dev\NeoPheme`.
- The tagline "Pheme heard it first." is in the live page.

## Deployment facts (how to publish)

1. In `C:\Dev\NeoPheme`: run the security scan, `git status`, `git add` the changed dashboard files by name, commit, push to `main`.
2. `git -C C:\Dev\NeoPheme-pages pull` (n8n commits `data.json` there daily).
3. `Copy-Item` each changed file by name into `C:\Dev\NeoPheme-pages` (`index.html`, `css\style.css`, `js\app.js`, `assets\pheme.webp`).
4. `git -C C:\Dev\NeoPheme-pages status`: only those files may show as modified, never `data.json`.
5. `git -C C:\Dev\NeoPheme-pages add <files by name>`, commit, push.
6. Wait up to about 10 minutes (Pages CDN), then hard-refresh the live site. Check DevTools Network for 404s.

Rules: never `git add .`, never delete `data.json`, all paths relative (no leading `/`), no build step.

## Open tasks

- Verify the live site after publishing: no 404s, `data.json` loaded from its own origin, filters, themes, save/hide/restore, mobile layout.
- Verify the first scheduled n8n runs on 2026-11-24, and that `generated_at` updates and the stale banner behaves correctly.
- Known limitations:
  - Stats (total, high importance, top category, sources) ignore filters and hidden stories, and count items, not grouped stories.
  - Search is a simple substring match on title and summary.
  - No pagination (fine for about 40 items).
  - Relative times are computed at render and do not update live.
  - No auto-refresh (by design, once-a-day data).
  - No `hashchange` listener.
  - Grouping is title-word based, so it can miss or wrongly merge items. Tune `GROUP_SIMILARITY` and `GROUP_MIN_SHARED_WORDS`.
  - Saved, hidden and NEW state live only in this browser's localStorage (no sync, lost if site data is cleared).
  - The "video" type has a label but no source produces it.
- Phase 10 ideas that affect the UI: server-side duplicate grouping and a score boost in n8n, longer window for high-importance items, weekly digest.