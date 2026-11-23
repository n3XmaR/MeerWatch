# Phase 4: Rule-based Scoring (no AI)

## What we built
One Code node, `Score Items`, placed between `Find New Items` (In A only) and `Store New Items`.
It adds three fields to each new item: `category`, `importance` (1-10), `summary` (cleaned, max ~200 chars).
Data Table `neopheme_items` got 3 new columns: `category` (String), `importance` (Number), `summary` (String).
`Store New Items` maps them with `{{ $json.category }}`, `{{ $json.importance }}`, `{{ $json.summary }}`.

Flow: Merge All Sources -> Keep Last 3 Days -> Dedupe by ID -> Sort Newest First -> Find New Items -> Score Items -> Store New Items.

## How the score works
1. Start from a base score per source (KEV/PortSwigger 7, Talos/Krebs 5, others 4).
2. Add keyword boosts (zero-day +3, actively exploited +3, RCE +2, CVSS 9+ +1, breach +1, etc.).
3. Subtract penalties (sponsored/webinar -3, password-manager promos -3, CVSS < 5 -2, physical access -2, etc.).
4. +1 if published within 24h.
5. Clamp to 1-10.

Everything editable lives in the `CONFIG` object at the top of the node.

## Categories
Exploit/Zero-day, Malware/Ransomware, Breach/Incident, Vulnerability, Research, Tool, Policy/Other.
First matching rule wins (order matters). CISA KEV is always Exploit/Zero-day.
Default by type when nothing matches: vuln -> Vulnerability, research -> Research, news -> Policy/Other.

## Tuning process
Ran the node on the real 43 items from the last run and reviewed the output. Three rounds:
- Round 1: scores clustered at 4-6. Big exploited flaws (Cisco, KEV roundup) were too low.
- Round 2: widened range (1-10). Promo (NordPass) dropped to 1. Some items saturated at 10.
- Round 3: lowered CVSS boost, removed the generic "exploit" boost, added `hack` to Breach, added `active exploitation` to Exploit.

## Problems and fixes
- Compare Datasets showed items under "Different" instead of "In A only" because the stored rows already existed. For testing, Score Items was temporarily fed from Sort Newest First, then reconnected.
- Table `release` keyword made every Windows update a "Tool". Removed.
- SecurityWeek summaries ended with "The post ... appeared first on ...". Stripped in `cleanText`.
- Credentials scan matched `password` only inside the `1password` penalty regex (false positive).

## Known limitations
- Rules do not understand context (e.g. Cisco Expressway exploitation is tagged Breach/Incident, not Exploit).
- Several items can saturate at 10 on busy days.
- Not yet tested on real PortSwigger, Talos and CISA KEV items (none were in the test batch).
- "CVE in 2+ sources" boost not implemented (needs cross-item comparison).
- Summary cuts at 200 chars with an ellipsis.

## Next
Phase 5: schedule (07:00), Continue on Fail, wire Cleanup Old Rows -> Read Stored Items.