/* NeoPheme dashboard. Plain JS, no libraries.
   Security: data.json is untrusted. We never use innerHTML with it;
   all DOM is built with createElement + textContent. */
"use strict";

/* ========= CONFIG: change settings here ========= */
const CONFIG = {
  // Used on GitHub Pages (relative path, same folder as index.html).
  DATA_URL: "data.json",
  // Used for local testing (localhost, 127.0.0.1, or file://).
  DATA_URL_LOCAL_TEST: "https://n3xmar.github.io/NeoPheme/data.json",
  STALE_HOURS: 36,          // show "may be stale" warning after this many hours
  HIGH_IMPORTANCE: 8,       // "high importance" threshold for the stats strip
  TOP_THREATS: 3,           // how many items in the "Top threats" section
  DEFAULT_SORT: "importance",
  // Importance level -> CSS data-level (colors live in style.css).
  IMPORTANCE_LEVELS: [
    { max: 3, level: "low" },
    { max: 6, level: "mid" },
    { max: 8, level: "high" },
    { max: 10, level: "crit" },
  ],
  // One color per category. Unknown categories use NEUTRAL_COLOR.
  CATEGORY_COLORS: {
    "Exploit/Zero-day": "#f43f5e",
    "Malware/Ransomware": "#fb923c",
    "Breach/Incident": "#fbbf24",
    "Vulnerability": "#d946ef",
    "Research": "#22d3ee",
    "Tool": "#5eead4",
    "Policy/Other": "#8fa3c8",
  },
  NEUTRAL_COLOR: "#8fa3c8",
  TYPE_LABELS: { news: "News", vuln: "Vulnerability", research: "Research", tool: "Tool", video: "Video" },
};

/* ========= State ========= */
let allItems = [];
const filters = { q: "", cat: "", src: "", type: "", min: 0, sort: CONFIG.DEFAULT_SORT };
const $ = (id) => document.getElementById(id);

/* ========= Small helpers ========= */
// Create an element safely: text goes through textContent only.
function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Return the URL string only if it is http(s); otherwise null.
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
  if (s < 0) return "just now";
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const hr = Math.floor(m / 60);
  if (hr < 24) return hr + "h ago";
  return Math.floor(hr / 24) + "d ago";
}

/* ========= Load and normalize ========= */
async function loadData() {
  const base = isLocalTest() ? CONFIG.DATA_URL_LOCAL_TEST : CONFIG.DATA_URL;
  const url = base + "?t=" + Date.now(); // cache-busting
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Server returned " + res.status + ".");
  const json = await res.json();
  if (!json || typeof json !== "object" || !Array.isArray(json.items)) {
    throw new Error("The data file has an unexpected format.");
  }
  return json;
}

// Turn one raw item into a safe item, or null if unusable.
function normalizeItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) return null;
  let imp = Number(raw.importance);
  imp = Number.isFinite(imp) ? Math.min(10, Math.max(1, Math.round(imp))) : 1;
  const d = raw.published_at ? new Date(raw.published_at) : new Date(NaN);
  return {
    title,
    url: safeUrl(raw.url) || safeUrl(raw.id),
    source: typeof raw.source === "string" && raw.source.trim() ? raw.source.trim() : "Unknown",
    type: typeof raw.type === "string" && raw.type.trim() ? raw.type.trim() : "other",
    category: typeof raw.category === "string" && raw.category.trim() ? raw.category.trim() : "Uncategorized",
    importance: imp,
    date: isNaN(d.getTime()) ? null : d,
    summary: typeof raw.summary === "string" ? raw.summary.trim() : "",
  };
}

/* ========= Filtering and sorting ========= */
function sortItems(items, mode) {
  const t = (i) => (i.date ? i.date.getTime() : 0);
  const copy = items.slice();
  if (mode === "newest") copy.sort((a, b) => t(b) - t(a) || b.importance - a.importance);
  else if (mode === "oldest") copy.sort((a, b) => t(a) - t(b) || b.importance - a.importance);
  else copy.sort((a, b) => b.importance - a.importance || t(b) - t(a));
  return copy;
}

function applyFilters() {
  const q = filters.q.trim().toLowerCase();
  const out = allItems.filter((i) =>
    (!q || i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q)) &&
    (!filters.cat || i.category === filters.cat) &&
    (!filters.src || i.source === filters.src) &&
    (!filters.type || i.type === filters.type) &&
    i.importance >= filters.min
  );
  return sortItems(out, filters.sort);
}

function filtersAreDefault() {
  return !filters.q && !filters.cat && !filters.src && !filters.type && filters.min === 0 && filters.sort === CONFIG.DEFAULT_SORT;
}

/* ========= Rendering ========= */
function buildCard(item, isTop) {
  const card = h("article", "card" + (isTop ? " card--top" : ""));
  card.dataset.level = levelOf(item.importance);
  card.style.setProperty("--chip", CONFIG.CATEGORY_COLORS[item.category] || CONFIG.NEUTRAL_COLOR);

  const head = h("div", "card__head");
  const badge = h("span", "badge", String(item.importance));
  badge.setAttribute("aria-label", "Importance " + item.importance + " out of 10");
  head.append(badge, h("span", "chip", item.category));

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

function renderTop() {
  const section = $("top-section");
  const grid = $("top-grid");
  grid.replaceChildren();
  // Only show when no filters are active, so it never contradicts them.
  const top = sortItems(allItems, "importance").slice(0, CONFIG.TOP_THREATS);
  if (!filtersAreDefault() || !top.length) { section.hidden = true; return; }
  section.hidden = false;
  top.forEach((i) => grid.append(buildCard(i, true)));
}

function renderResults() {
  const items = applyFilters();
  const grid = $("results");
  grid.replaceChildren(...items.map((i) => buildCard(i, false)));
  $("count").textContent = "Showing " + items.length + " of " + allItems.length + " items";
  $("no-results").hidden = items.length > 0;
}

function render() {
  renderTop();
  renderResults();
  syncHash();
}

// Fill a <select> with "All" + unique values (with counts), built from the data.
function fillSelect(id, label, values, labeler) {
  const sel = $(id);
  const counts = {};
  values.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  sel.replaceChildren(new Option("All " + label, ""));
  Object.keys(counts).sort().forEach((v) => sel.append(new Option((labeler ? labeler(v) : v) + " (" + counts[v] + ")", v)));
}

/* ========= URL hash (filters survive refresh and can be shared) ========= */
function syncHash() {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.cat) p.set("cat", filters.cat);
  if (filters.src) p.set("src", filters.src);
  if (filters.type) p.set("type", filters.type);
  if (filters.min) p.set("min", filters.min);
  if (filters.sort !== CONFIG.DEFAULT_SORT) p.set("sort", filters.sort);
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
}

// Push the filters object into the form controls.
function syncControls() {
  $("f-search").value = filters.q;
  $("f-sort").value = filters.sort;
  ["cat", "src", "type"].forEach((k) => {
    const sel = $("f-" + k);
    sel.value = filters[k];
    if (sel.value !== filters[k]) filters[k] = ""; // value not in data: ignore
  });
  document.querySelectorAll("#f-min button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.min) === filters.min)));
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
    timer = setTimeout(() => { filters.q = e.target.value; render(); }, 150); // small debounce
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
  $("reset-btn").addEventListener("click", () => {
    Object.assign(filters, { q: "", cat: "", src: "", type: "", min: 0, sort: CONFIG.DEFAULT_SORT });
    syncControls();
    render();
  });
  $("retry-btn").addEventListener("click", init);
}

document.addEventListener("DOMContentLoaded", () => {
  // Skeleton placeholders
  const sk = $("loading");
  for (let i = 0; i < 6; i++) sk.append(h("div", "skeleton"));
  // If the mascot image is missing, remove it so the CSS gradient shows.
  const img = document.querySelector(".hero__img");
  if (img.complete && img.naturalWidth === 0) img.remove();
  img.addEventListener("error", () => img.remove());
  bindEvents();
  init();
});