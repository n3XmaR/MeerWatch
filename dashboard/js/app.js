/* MeerWatch dashboard. Plain JS, no libraries.
   Security: data.json is untrusted. We never use innerHTML with it;
   all DOM is built with createElement + textContent. */
"use strict";

/* ========= CONFIG: change settings here ========= */
const CONFIG = {
  DATA_URL: "data.json",
  DATA_URL_LOCAL_TEST: "https://n3xmar.github.io/MeerWatch/data.json",
  STALE_HOURS: 36,
  HIGH_IMPORTANCE: 8,
  TOP_THREATS: 3,
  DEFAULT_SORT: "importance",
  STORAGE_KEY: "neopheme.v1",       // saved / dismissed / seen (this browser only)
  SESSION_GAP_HOURS: 6,             // a "visit" ends after this many hours away
  GROUP_DUPLICATES: true,           // merge the same story from different sources
  GROUP_MIN_SHARED_WORDS: 3,        // title match: at least this many shared words...
  GROUP_SIMILARITY: 0.5,            // ...and at least this word overlap (0-1). Raise = stricter.
  IMPORTANCE_LEVELS: [
    { max: 3, level: "low" },
    { max: 6, level: "mid" },
    { max: 8, level: "high" },
    { max: 10, level: "crit" },
  ],
  CATEGORY_COLORS: {
    "Exploit/Zero-day": "#f43f5e",
    "Malware/Ransomware": "#fb923c",
    "Breach/Incident": "#fbbf24",
    "Vulnerability": "#f59e0b",
    "Research": "#94a3b8",
    "Tool": "#a8a29e",
    "Policy/Other": "#9a9fab",
  },
  NEUTRAL_COLOR: "#9a9fab",
  TYPE_LABELS: { news: "News", vuln: "Vulnerability", research: "Research", tool: "Tool", video: "Video" },
};
const STOP_WORDS = new Set(["the", "and", "for", "with", "from", "that", "this", "are", "has", "have", "its", "into", "over", "new", "via", "after", "how", "why", "what", "says", "said", "about", "more", "than", "can", "now", "will", "your", "you", "not", "but", "out"]);

/* ========= State ========= */
let allItems = [];
let store = { seen: {}, saved: {}, dismissed: {}, last: 0, baseline: 0 };
const filters = { q: "", cat: "", src: "", type: "", min: 0, sort: CONFIG.DEFAULT_SORT, view: "all" };
const $ = (id) => document.getElementById(id);

/* ========= Small helpers ========= */
function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function safeUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch (e) {
    return null;
  }
}

function isLocalTest() {
  return location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
}

function levelOf(importance) {
  for (const l of CONFIG.IMPORTANCE_LEVELS) if (importance <= l.max) return l.level;
  return "crit";
}

function relativeTime(date) {
  if (!date) return "unknown time";
  const s = Math.round((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const hr = Math.floor(m / 60);
  if (hr < 24) return hr + "h ago";
  return Math.floor(hr / 24) + "d ago";
}

function dayLabel(date) {
  if (!date) return "Unknown date";
  const startOf = (x) => { const c = new Date(x); c.setHours(0, 0, 0, 0); return c.getTime(); };
  const diff = Math.round((startOf(Date.now()) - startOf(date)) / 864e5);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

/* ========= Local storage (saved / dismissed / seen) ========= */
function loadStore() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || {}; } catch (e) { s = {}; }
  for (const k of ["seen", "saved", "dismissed"]) if (!s[k] || typeof s[k] !== "object") s[k] = {};
  s.last = Number(s.last) || 0;
  s.baseline = Number(s.baseline) || 0;
  return s;
}
function saveStore() {
  try { localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(store)); } catch (e) { /* storage blocked: ignore */ }
}

// Mark items as new if this browser first saw them after the start of the current "visit".
function updateSeen(items) {
  const now = Date.now();
  const first = !store.last;
  if (first) store.baseline = now;
  else if (now - store.last > CONFIG.SESSION_GAP_HOURS * 36e5) store.baseline = store.last;
  store.last = now;
  const seen = {};
  items.forEach((i) => {
    seen[i.key] = store.seen[i.key] || now;
    i.isNew = seen[i.key] > store.baseline;
  });
  store.seen = seen;
  const keys = new Set(items.map((i) => i.key));
  Object.keys(store.dismissed).forEach((k) => { if (!keys.has(k)) delete store.dismissed[k]; });
  saveStore();
}

// Saved items keep a small snapshot, because they leave data.json after 3 days.
function snapshot(i) {
  return { id: i.key, title: i.title, url: i.url || "", source: i.source, type: i.type, category: i.category,
    importance: i.importance, published_at: i.date ? i.date.toISOString() : "", summary: i.summary };
}

/* ========= Load and normalize ========= */
async function loadData() {
  const base = isLocalTest() ? CONFIG.DATA_URL_LOCAL_TEST : CONFIG.DATA_URL;
  const res = await fetch(base + "?t=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("Server returned " + res.status + ".");
  const json = await res.json();
  if (!json || typeof json !== "object" || !Array.isArray(json.items)) {
    throw new Error("The data file has an unexpected format.");
  }
  return json;
}

const str = (v) => (typeof v === "string" ? v.trim() : "");

function normalizeItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = str(raw.title);
  if (!title) return null;
  let imp = Number(raw.importance);
  imp = Number.isFinite(imp) ? Math.min(10, Math.max(1, Math.round(imp))) : 1;
  const d = raw.published_at ? new Date(raw.published_at) : new Date(NaN);
  const summary = str(raw.summary);
  return {
    key: str(raw.id) || str(raw.url) || title,
    title,
    url: safeUrl(raw.url) || safeUrl(raw.id),
    source: str(raw.source) || "Unknown",
    type: str(raw.type) || "other",
    category: str(raw.category) || "Uncategorized",
    importance: imp,
    date: isNaN(d.getTime()) ? null : d,
    summary,
    isNew: false,
    cves: new Set((title + " " + summary).toUpperCase().match(/CVE-\d{4}-\d{4,7}/g) || []),
    tokens: new Set(title.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 2 && !STOP_WORDS.has(w))),
  };
}

/* ========= Duplicate grouping ========= */
function sameStory(a, b) {
  if (a.source === b.source) return false;
  for (const c of a.cves) if (b.cves.has(c)) return true;
  let shared = 0;
  a.tokens.forEach((w) => { if (b.tokens.has(w)) shared++; });
  const union = a.tokens.size + b.tokens.size - shared;
  return shared >= CONFIG.GROUP_MIN_SHARED_WORDS && union > 0 && shared / union >= CONFIG.GROUP_SIMILARITY;
}

// Each group = { main, others }. Main = highest importance (then newest).
// A new item is compared with each group's main item only (no chain merging).
function groupItems(items) {
  const groups = [];
  for (const it of sortItems(items, "importance")) {
    const g = CONFIG.GROUP_DUPLICATES
      ? groups.find((x) => sameStory(x.main, it) && !x.others.some((o) => o.source === it.source))
      : null;
    if (g) g.others.push(it); else groups.push({ main: it, others: [] });
  }
  return groups;
}
const membersOf = (g) => [g.main, ...g.others];

/* ========= Filtering and sorting ========= */
function sortItems(list, mode, get) {
  get = get || ((x) => x);
  const t = (x) => { const d = get(x).date; return d ? d.getTime() : 0; };
  const imp = (x) => get(x).importance;
  const copy = list.slice();
  if (mode === "newest") copy.sort((a, b) => t(b) - t(a) || imp(b) - imp(a));
  else if (mode === "oldest") copy.sort((a, b) => t(a) - t(b) || imp(b) - imp(a));
  else copy.sort((a, b) => imp(b) - imp(a) || t(b) - t(a));
  return copy;
}

function baseItems() {
  if (filters.view === "saved") return Object.values(store.saved).map(normalizeItem).filter(Boolean);
  return allItems.filter((i) => !store.dismissed[i.key]);
}

function applyFilters() {
  const q = filters.q.trim().toLowerCase();
  return baseItems().filter((i) =>
    (!q || i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q)) &&
    (!filters.cat || i.category === filters.cat) &&
    (!filters.src || i.source === filters.src) &&
    (!filters.type || i.type === filters.type) &&
    (filters.view !== "new" || i.isNew) &&
    i.importance >= filters.min
  );
}

function filtersAreDefault() {
  return !filters.q && !filters.cat && !filters.src && !filters.type && filters.min === 0 &&
    filters.sort === CONFIG.DEFAULT_SORT && filters.view === "all";
}

/* ========= Actions ========= */
function toggleSave(g) {
  const ms = membersOf(g);
  const saved = ms.some((m) => store.saved[m.key]);
  ms.forEach((m) => { if (saved) delete store.saved[m.key]; else store.saved[m.key] = snapshot(m); });
  saveStore();
  render();
}
function dismiss(g) {
  membersOf(g).forEach((m) => { store.dismissed[m.key] = true; delete store.saved[m.key]; });
  saveStore();
  render();
}

/* ========= Rendering ========= */
function iconButton(text, label, onClick, pressed) {
  const b = h("button", "icon-btn", text);
  b.type = "button";
  b.setAttribute("aria-label", label);
  b.title = label;
  if (pressed !== undefined) b.setAttribute("aria-pressed", String(pressed));
  b.addEventListener("click", onClick);
  return b;
}

function buildCard(g, isTop) {
  const item = g.main;
  const card = h("article", "card" + (isTop ? " card--top" : ""));
  card.dataset.level = levelOf(item.importance);
  card.style.setProperty("--chip", CONFIG.CATEGORY_COLORS[item.category] || CONFIG.NEUTRAL_COLOR);

  const isSaved = membersOf(g).some((m) => store.saved[m.key]);
  const head = h("div", "card__head");
  const badge = h("span", "badge", String(item.importance));
  badge.setAttribute("aria-label", "Importance " + item.importance + " out of 10");
  head.append(badge, h("span", "chip", item.category));
  if (membersOf(g).some((m) => m.isNew)) head.append(h("span", "new-tag", "NEW"));
  const actions = h("div", "card__actions");
  actions.append(
    iconButton(isSaved ? "★" : "☆", isSaved ? "Remove from saved" : "Save for later", () => toggleSave(g), isSaved),
    iconButton("✕", "Hide this story", () => dismiss(g))
  );
  head.append(actions);

  const title = h("h3", "card__title");
  if (item.url) {
    const a = h("a", "", item.title);
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    title.append(a);
  } else {
    title.textContent = item.title;
  }

  const meta = h("div", "card__meta");
  const time = h("time", "", relativeTime(item.date));
  if (item.date) {
    time.dateTime = item.date.toISOString();
    time.title = item.date.toLocaleString();
  }
  meta.append(h("span", "", item.source), h("span", "", CONFIG.TYPE_LABELS[item.type] || item.type), time);

  card.append(head, title);
  if (item.summary) card.append(h("p", "card__summary", item.summary));
  if (g.others.length) {
    const also = h("p", "card__also", "Also reported by: ");
    g.others.forEach((o, idx) => {
      if (idx) also.append(", ");
      if (o.url) {
        const a = h("a", "", o.source);
        a.href = o.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        also.append(a);
      } else {
        also.append(o.source);
      }
    });
    card.append(also);
  }
  card.append(meta);
  return card;
}

function renderStats() {
  $("stat-total").textContent = allItems.length;
  $("stat-high").textContent = allItems.filter((i) => i.importance >= CONFIG.HIGH_IMPORTANCE).length;
  $("stat-src").textContent = new Set(allItems.map((i) => i.source)).size;
  const counts = {};
  allItems.forEach((i) => (counts[i.category] = (counts[i.category] || 0) + 1));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  $("stat-cat").textContent = top ? top[0] + " (" + top[1] + ")" : "-";
}

function renderTop(topGroups) {
  const section = $("top-section");
  const grid = $("top-grid");
  grid.replaceChildren();
  section.hidden = !topGroups.length;
  topGroups.forEach((g) => grid.append(buildCard(g, true)));
}

function renderResults(rest, all) {
  const nodes = [];
  let lastDay = null;
  const byDate = filters.sort === "newest" || filters.sort === "oldest";
  rest.forEach((g) => {
    if (byDate) {
      const label = dayLabel(g.main.date);
      if (label !== lastDay) { nodes.push(h("h3", "day-title", label)); lastDay = label; }
    }
    nodes.push(buildCard(g, false));
  });
  $("results").replaceChildren(...nodes);
  const itemCount = all.reduce((n, g) => n + 1 + g.others.length, 0);
  $("count").textContent = "Showing " + all.length + " stories (" + itemCount + " items)";
  $("no-results").hidden = all.length > 0;
  const hidden = Object.keys(store.dismissed).length;
  const rb = $("restore-btn");
  rb.hidden = hidden === 0;
  rb.textContent = "Restore hidden items (" + hidden + ")";
}

function render() {
  const groups = sortItems(groupItems(applyFilters()), filters.sort, (g) => g.main);
  const showTop = filtersAreDefault(); // default sort = importance, so groups are already ranked
  renderTop(showTop ? groups.slice(0, CONFIG.TOP_THREATS) : []);
  renderResults(showTop ? groups.slice(CONFIG.TOP_THREATS) : groups, groups);
  syncHash();
}

function fillSelect(id, label, values, labeler) {
  const sel = $(id);
  const counts = {};
  values.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  sel.replaceChildren(new Option("All " + label, ""));
  Object.keys(counts).sort().forEach((v) => sel.append(new Option((labeler ? labeler(v) : v) + " (" + counts[v] + ")", v)));
}

/* ========= URL hash ========= */
function syncHash() {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.cat) p.set("cat", filters.cat);
  if (filters.src) p.set("src", filters.src);
  if (filters.type) p.set("type", filters.type);
  if (filters.min) p.set("min", filters.min);
  if (filters.sort !== CONFIG.DEFAULT_SORT) p.set("sort", filters.sort);
  if (filters.view !== "all") p.set("view", filters.view);
  const s = p.toString();
  history.replaceState(null, "", s ? "#" + s : location.pathname + location.search);
}

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  filters.q = p.get("q") || "";
  filters.cat = p.get("cat") || "";
  filters.src = p.get("src") || "";
  filters.type = p.get("type") || "";
  const min = Number(p.get("min"));
  filters.min = [5, 7, 9].includes(min) ? min : 0;
  const sort = p.get("sort");
  filters.sort = ["importance", "newest", "oldest"].includes(sort) ? sort : CONFIG.DEFAULT_SORT;
  const view = p.get("view");
  filters.view = ["all", "new", "saved"].includes(view) ? view : "all";
}

function syncControls() {
  $("f-search").value = filters.q;
  $("f-sort").value = filters.sort;
  ["cat", "src", "type"].forEach((k) => {
    const sel = $("f-" + k);
    sel.value = filters[k];
    if (sel.value !== filters[k]) filters[k] = "";
  });
  document.querySelectorAll("#f-min button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.min) === filters.min)));
  document.querySelectorAll("#f-view button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === filters.view)));
}

/* ========= Page states ========= */
function showOnly(state) {
  $("loading").hidden = state !== "loading";
  $("error-box").hidden = state !== "error";
  $("empty-box").hidden = state !== "empty";
  $("content").hidden = state !== "content";
}

function showUpdated(generatedAt, count) {
  const d = new Date(generatedAt);
  const valid = !isNaN(d.getTime());
  $("updated").textContent = "Last updated: " + (valid ? d.toLocaleString() : "unknown") + " | " + count + " items";
  const ageHours = valid ? (Date.now() - d.getTime()) / 36e5 : Infinity;
  $("stale-banner").hidden = ageHours <= CONFIG.STALE_HOURS;
}

async function init() {
  showOnly("loading");
  $("updated").textContent = "Last updated: loading…";
  try {
    const data = await loadData();
    allItems = data.items.map(normalizeItem).filter(Boolean);
    showUpdated(data.generated_at, allItems.length);
    if (!allItems.length) { showOnly("empty"); return; }

    store = loadStore();
    updateSeen(allItems);
    readHash();
    fillSelect("f-cat", "categories", allItems.map((i) => i.category));
    fillSelect("f-src", "sources", allItems.map((i) => i.source));
    fillSelect("f-type", "types", allItems.map((i) => i.type), (v) => CONFIG.TYPE_LABELS[v] || v);
    syncControls();
    renderStats();
    showOnly("content");
    render();
  } catch (err) {
    $("error-msg").textContent = (err && err.message ? err.message : "Unknown error") + " Check your connection and try again.";
    $("updated").textContent = "Last updated: unavailable";
    $("stale-banner").hidden = true;
    showOnly("error");
  }
}

/* ========= Events ========= */
function bindEvents() {
  let timer;
  $("f-search").addEventListener("input", (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { filters.q = e.target.value; render(); }, 150);
  });
  [["f-cat", "cat"], ["f-src", "src"], ["f-type", "type"], ["f-sort", "sort"]].forEach(([id, key]) =>
    $(id).addEventListener("change", (e) => { filters[key] = e.target.value; render(); })
  );
  $("f-min").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-min]");
    if (!b) return;
    filters.min = Number(b.dataset.min);
    syncControls();
    render();
  });
  $("f-view").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-view]");
    if (!b) return;
    filters.view = b.dataset.view;
    syncControls();
    render();
  });
  $("reset-btn").addEventListener("click", () => {
    Object.assign(filters, { q: "", cat: "", src: "", type: "", min: 0, sort: CONFIG.DEFAULT_SORT, view: "all" });
    syncControls();
    render();
  });
  $("restore-btn").addEventListener("click", () => { store.dismissed = {}; saveStore(); render(); });
  $("retry-btn").addEventListener("click", init);
}

document.addEventListener("DOMContentLoaded", () => {
  const sk = $("loading");
  for (let i = 0; i < 6; i++) sk.append(h("div", "skeleton"));
  const img = document.querySelector(".hero__img");
  if (img) {
    if (img.complete && img.naturalWidth === 0) img.remove();
    else img.addEventListener("error", () => img.remove());
  }
  bindEvents();
  init();
});
