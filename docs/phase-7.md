# Phase 7: Dashboard

## What we built

**File tree** (source folder `dashboard/` in the repo, on `main`):

```
dashboard/
├── index.html      page structure, inline SVG favicon, inline SVG logo, loads css/style.css and js/app.js
├── css/style.css   palette (CSS variables on :root), layout, cards, hero, states, responsive rules
├── js/app.js       CONFIG, data loading, normalization, filtering, sorting, rendering, URL hash
└── assets/pheme.webp   mascot image (placed manually by me, not generated)
```

**Features implemented**
- **Hero:** mascot image (`object-position: 50% 28%`, 50% 22% on phones), dark gradient overlay, inline SVG logo (winged eye + laurel), "NeoPheme" title, tagline, and "Last updated: <local time> | <n> items". CSS gradient fallback if the image fails.
- **Meander (Greek key) border:** CSS data-URI SVG under the hero and above the footer.
- **Stats strip:** total items, high-importance count (importance >= 8), top category with its count, number of sources. Computed on all items, not on the filtered view.
- **Top threats:** the 3 highest-importance items as larger cards. Shown only when no filter is active (default sort, empty search, no category/source/type, min = All).
- **Controls:** text search (title + summary, 150 ms debounce), category / source / type dropdowns (built dynamically from the data, with counts, sorted alphabetically), minimum importance buttons (All / 5+ / 7+ / 9+), sort (Importance, Newest, Oldest), Reset filters, and "Showing X of Y items".
- **Cards:** importance badge, category chip (color per category), title as link, summary, source, type label, relative time with exact local time in the tooltip.
- **States:**
  - Loading: 6 skeleton placeholders.
  - Error: message plus Retry button.
  - Empty: friendly message explaining the 3-day window.
  - No matches: shown when filters return nothing.
  - Stale: warning banner.
- **Accessibility:** skip link, labelled controls, `aria-pressed` on the importance buttons, `aria-live` on the count and updated line, focus-visible outlines, `prefers-reduced-motion` support, semantic HTML.
- **Footer:** credit line plus a note that scoring is rule-based.

**How data is loaded**
- `CONFIG.DATA_URL = "data.json"` (relative) is used in production.
- `CONFIG.DATA_URL_LOCAL_TEST = "https://n3xmar.github.io/NeoPheme/data.json"` is used when `location.protocol === "file:"` or the hostname is `localhost` or `127.0.0.1`.
- Every fetch appends `?t=Date.now()` and uses `cache: "no-store"`.
- The load fails with an error if the response is not OK or `items` is not an array.
- Stale threshold: `CONFIG.STALE_HOURS = 36`. The warning shows when `generated_at` is more than 36 hours old, or when it is missing or invalid.

## Decisions

**Design and where to change it**
- **Colors:** the `:root` block at the top of `style.css`, with all 12 palette variables plus fonts (system and monospace stacks) and `--radius`.
- **CONFIG keys in `app.js`:** `DATA_URL`, `DATA_URL_LOCAL_TEST`, `STALE_HOURS`, `HIGH_IMPORTANCE` (8), `TOP_THREATS` (3), `DEFAULT_SORT`, `IMPORTANCE_LEVELS`, `CATEGORY_COLORS`, `NEUTRAL_COLOR`, `TYPE_LABELS`.
- **Importance levels:**
  - `IMPORTANCE_LEVELS` only maps score to a level name: 1-3 low, 4-6 mid, 7-8 high, 9-10 crit.
  - The actual colors for those levels live in `style.css` (`.card[data-level=...]`): muted, cyan, purple, magenta with glow on crit.
- **Category chip colors:** `CONFIG.CATEGORY_COLORS`.
- **Hero crop:** `object-position` on `.hero__img`.
- The hero, mascot and logo carry the neon look. The "calmer theme" CSS override I offered later was **not** adopted; I decided to keep the original design.

**Security**
- No `innerHTML` or `insertAdjacentHTML` anywhere. All DOM is built with `createElement` and `textContent` (helper `h()`); the only attributes set from data are `href`, `datetime` and `title`.
- Links are validated with `new URL()` and only `http:` and `https:` are accepted (`safeUrl()`). The link uses `url`, falling back to `id`. If neither is valid, the title is plain text.
- Links use `target="_blank"` and `rel="noopener noreferrer"`.
- Cards use `summary` only, never `content`.
- No tokens, keys, analytics or third-party requests. The only network request is `data.json`; on localhost/file:// it goes to my own GitHub Pages site.

**URL hash / filter state**
- Filters are written to the hash with `history.replaceState` (no history entries added): `q`, `cat`, `src`, `type`, `min`, `sort`. Defaults are omitted, so an unfiltered page has no hash.
- The hash is read once in `init()` (page load and Retry). There is no `hashchange` listener.
- `min` accepts only 5, 7 or 9. A hash value for category/source/type that does not exist in the data is ignored, and an invalid sort falls back to the default.
- No localStorage.

**Bad data handling (`normalizeItem`)**
- Items that are not objects or have an empty or missing title are skipped.
- `importance`: rounded and clamped to 1-10. Non-numeric or missing becomes 1.
- `published_at`: an invalid date becomes null. The card shows "unknown time" and the item sorts as time 0.
- Missing `source` becomes "Unknown". Missing `category` becomes "Uncategorized". Missing `type` becomes "other".
- An unknown category or type is shown as the raw text with the neutral color (`NEUTRAL_COLOR`). A type missing from `TYPE_LABELS` is shown as raw text.
- Empty `summary`: the summary paragraph is omitted.
- Sorting is always done in JS. Default is importance desc, then date desc. Newest and Oldest use importance as the tiebreaker.

## Problems and fixes

- No code changes were made after the first version that I know of. I cannot see my local files, so this summary reflects the code as delivered.
- Changes discussed in the chat, none adopted:
  - I wanted a different tagline (the original sounded AI-generated). Options were offered, but I never picked one in this chat. If I edited it myself, the code differs from the delivered version in that one line in `index.html`.
  - A "calm theme" CSS override block was offered and then withdrawn. The final design is the original.
- Phase 7 is confirmed working locally (via `python -m http.server`): it loads `data.json` and shows the news correctly.

## Deployment facts the publisher needs

- **Copy to the root of `gh-pages`:** the *contents* of `dashboard/`, not the folder itself: `index.html`, `css/style.css`, `js/app.js`, `assets/pheme.webp`. Result: `https://n3xmar.github.io/NeoPheme/index.html`, `.../css/style.css`, and so on.
- **`data.json` must not be deleted.** It lives in the same root, written by n8n. Add files by name; never run `git add .` on `gh-pages`.
- **All paths are relative** (no leading `/`):
  - `css/style.css`, `js/app.js`, `assets/pheme.webp`, `data.json`.
  - The favicon and the meander pattern are inline data URIs, so they need no file or request.
- **Production fetch:** `data.json` by relative path (`DATA_URL`), same folder as `index.html`.
- **No build step and no server-side code.** It is plain HTML, CSS and JS.
- **Image:** `assets/pheme.webp`, exact name and lowercase.
  - If it is missing, the `error` handler removes the `<img>` and the CSS gradient on `.hero` shows.
  - The image has `alt=""` because it is decorative.

**To double-check before publishing**
- Confirm the tagline in `index.html` is what I want (see Problems and fixes).
- Confirm `pheme.webp` exists in `assets/` and is committed. Check the file size too, since it is a full 16:9 image.
- The image `error` listener is attached on `DOMContentLoaded`. If the file fails very quickly it could theoretically fire earlier, which leaves a broken image over the gradient. Test once by temporarily renaming the file.
- Hard-refresh after publishing. The Pages CDN can serve an old copy for about 10 minutes.
- Check the live page for 404s on `css/style.css`, `js/app.js` and `assets/pheme.webp` (DevTools Network tab), and that it loads `data.json` from its own origin, not from the absolute URL.
- `color-mix()` is used in the CSS (needs a 2023+ browser). On older browsers, the glows and tinted backgrounds just do not show.

## Open tasks

- Publish to `gh-pages` (the Phase 7 deployment step: manual copy or a deploy script that never deletes `data.json`).
- Known limitations:
  - Top threats items also appear again in the main grid when no filter is active.
  - Stats ignore the active filters.
  - Search is a simple substring match on title and summary.
  - No pagination (fine for about 40 items).
  - Relative times are computed at render and do not update live.
  - No auto-refresh (by design, once-a-day data).
  - No `hashchange` listener, so editing the hash by hand needs a reload.
  - The "video" type has a label but no source currently produces it.
- Verify the first scheduled n8n runs on 2026-11-24, and that `generated_at` updates and the stale banner behaves correctly on the live site.
- Optional later: calmer theme (less glow, cyan as the only accent), and Phase 10 ideas that affect the UI (duplicate grouping, longer window for high-importance items, weekly digest).