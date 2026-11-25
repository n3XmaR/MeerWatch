# MeerWatch

A personal cybersecurity news dashboard. Every morning an [n8n](https://n8n.io) workflow collects security news, research and newly exploited vulnerabilities, ranks them by importance with simple rules, and publishes a static dashboard.

**Live site:** https://n3xmar.github.io/MeerWatch/

## What it does

- Collects from 9 public sources: BleepingComputer, The Hacker News, Krebs on Security, SecurityWeek, CISA KEV, Cisco Talos, PortSwigger Research, SANS ISC and Kitploit.
- Keeps a rolling 3-day window and passes only new items on (cross-day deduplication).
- Scores each item from 1 to 10 and assigns a category using keyword rules. There is no AI involved, so the scoring is transparent and easy to tune.
- Publishes a `data.json` file that the dashboard reads.
- The dashboard lets you search, filter by category, source and importance, save or hide stories, and groups the same story reported by several outlets.

## How it works

```
n8n (Docker, daily 07:00)  ->  collect + normalize + dedupe + score  ->  n8n Data Table (3-day window)
n8n (daily 07:15)          ->  build data.json  ->  GitHub (gh-pages branch)
Static dashboard (HTML/CSS/JS on GitHub Pages)  ->  reads data.json
```

- `dashboard/`: the front-end. Plain HTML, CSS and JavaScript, no build step and no third-party requests.
- `workflows/`: exported n8n workflows (the highest number is the current one).
- `docs/`: notes for each build phase, including decisions and problems.
- `PROJECT.md`: the full project context.

## Notes

- Importance scores and categories are rule-based. Treat them as a guide, not a verdict.
- Feed content is untrusted: the dashboard builds all DOM with `textContent`, never `innerHTML`, and only allows `http(s)` links.
- No secrets live in this repo. The n8n credentials and encryption key stay local.

## Run the dashboard locally

```
cd dashboard
python -m http.server 8000
```

Open http://localhost:8000. On localhost it reads the live `data.json` from the published site.