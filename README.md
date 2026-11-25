# MeerWatch

A personal cybersecurity news dashboard. It collects security news and research every morning, ranks it, and shows it on a simple website.

**Live site:** https://n3xmar.github.io/MeerWatch/

![MeerWatch dashboard](docs/screenshot.png)

## How it works

Sources -> n8n -> scoring rules -> data.json -> dashboard

1. An n8n workflow runs every morning and reads RSS feeds and the CISA KEV list: BleepingComputer, The Hacker News, Krebs on Security, SecurityWeek, Cisco Talos, PortSwigger Research, SANS ISC, CISA KEV and Kitploit.
2. It removes duplicates and keeps the last 3 days.
3. A rule-based Code node gives each item a category and an importance score from 1 to 10. There is no AI in the scoring.
4. The workflow writes the result to `data.json` on the `gh-pages` branch.
5. The dashboard (plain HTML, CSS and JavaScript) reads that file and displays it.

## Features

- Search, plus filters by category, source and type
- Minimum importance filter and sorting
- Top threats section for the most important stories
- Save or hide stories (stored in your browser only)
- Groups the same story reported by several outlets

## Repository

- `dashboard/` - the website
- `workflows/06-meerwatch.json` - the n8n workflow
- `n8n/` - Docker setup for running n8n locally

## Run it yourself

Start n8n with Docker from the `n8n/` folder, open http://localhost:5678 and import `workflows/06-meerwatch.json`. Create your own GitHub token (fine-grained, Contents read/write on your repo) and point the export node at your repository.

## About this project

I built the n8n workflow to learn automation. The dashboard code was written with AI assistance.