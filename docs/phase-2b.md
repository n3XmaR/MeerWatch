# Phase 2b: More sources

## What we built
Added research/vendor sources (type `research`): Cisco Talos, PortSwigger Research,
SANS ISC. Each is a Fetch (RSS Read) + Normalize (Code) pair feeding Merge All Sources.
Final source list (8): BleepingComputer, The Hacker News, Krebs, SecurityWeek,
CISA KEV, Cisco Talos, PortSwigger Research, SANS ISC.

## Decisions
- Reddit dropped: Reddit ended RSS support on 2026-11-13 and there is no
  replacement for non-moderator use. r/netsec feeds returned 404.
- GitHub topic search deferred to Phase 10: results are noisy (fake-star/lure
  repos), and a 3-day window conflicts with a star threshold (real repos need
  about a week to gather stars). Possible later: a trusted-org allowlist, or
  `releases.atom` for tools we already know.
- YouTube and Dark Reading removed (low value / overlap).
- Keep Merge manageable: capped at about 10 inputs; rarely-posting sources could
  later share a small second Merge.

## Per-source notes
- PortSwigger Research: `/research/rss`. `guid` is a slug, so `id` uses `link`.
  Posts rarely (1-3 per month). `/blog/rss` is marketing, `/daily-swig/rss`
  returns HTML: both skipped.
- Cisco Talos: `/rss/`. Full article in content:encoded, so content is cut to 500 chars.
- SANS ISC: some `description` fields are double-escaped; we use clean content
  and filter "ISC Stormcast" podcast entries. Date tag stripped from titles.

## Problems and fixes
- Feed URLs verified only from third-party pages were wrong or stale (Reddit,
  MSRC blog feed returns a "Content Not Found" item). Always open the feed in a
  browser and check the content, not only the status code.
- 404 means the URL is gone; 403/429 usually means blocked by User-Agent/rate limit.
- A source that posts rarely can legitimately return 0 items after the 3-day filter.
  Temporarily widening the filter proved the Talos pipeline works.
- Normalize guards against bad dates (filter instead of letting one item crash the node).

## Files
- `workflows/02b-sources.json`

## Next
Phase 4: rule-based scoring (category, importance 1-10, short summary).