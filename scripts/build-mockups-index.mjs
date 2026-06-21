// Generates mockups/index.html — a single browseable parent page that lists
// every mockup, grouped by folder, with live search. Re-run whenever you add
// or remove mockups:
//
//   node scripts/build-mockups-index.mjs
//
// Then open mockups/index.html in a browser (double-click, or `npx serve mockups`).
import { readdirSync, statSync, writeFileSync } from "fs";
import { join, relative, posix } from "path";

const ROOT = "mockups";
const OUT = join(ROOT, "index.html");

/** Recursively collect every .html file under mockups/, except the generated index. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

const files = walk(ROOT)
  .map((f) => relative(ROOT, f).split("\\").join("/"))
  .filter((rel) => rel !== "index.html")
  .sort();

// Group by top-level folder (files at root go under "· root").
const groups = new Map();
for (const rel of files) {
  const slash = rel.indexOf("/");
  const group = slash === -1 ? "· root" : rel.slice(0, slash);
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group).push(rel);
}

const groupKeys = [...groups.keys()].sort((a, b) => {
  if (a === "· root") return -1;
  if (b === "· root") return 1;
  return a.localeCompare(b);
});

const prettyName = (rel) => {
  const base = rel.split("/").pop().replace(/\.html$/, "");
  return base.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const navHtml = groupKeys
  .map(
    (g) =>
      `<a class="navlink" href="#${esc(g.replace(/[^a-z0-9]+/gi, "-"))}">${esc(g)} <span>${groups.get(g).length}</span></a>`
  )
  .join("\n");

const sectionsHtml = groupKeys
  .map((g) => {
    const id = esc(g.replace(/[^a-z0-9]+/gi, "-"));
    const cards = groups
      .get(g)
      .map((rel) => {
        const sub = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
        return `<a class="card" data-name="${esc(rel.toLowerCase())}" href="${esc(rel)}" target="_blank" rel="noopener">
        <div class="card-name">${esc(prettyName(rel))}</div>
        <div class="card-path">${esc(sub || rel)}</div>
      </a>`;
      })
      .join("\n");
    return `<section class="group" id="${id}" data-group="${esc(g.toLowerCase())}">
      <h2>${esc(g)} <span class="count">${groups.get(g).length}</span></h2>
      <div class="grid">${cards}</div>
    </section>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>FiveCrux — Mockups</title>
<style>
  :root { --bg:#0a0a0a; --panel:#121214; --line:rgba(255,255,255,.08); --muted:#8a8a92; --accent:#f97316; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:#fff; font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
  a { color:inherit; text-decoration:none; }
  header { position:sticky; top:0; z-index:10; background:rgba(10,10,10,.85); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); padding:18px 24px; }
  .title { font-size:20px; font-weight:800; letter-spacing:-.02em; }
  .title b { color:var(--accent); }
  .sub { color:var(--muted); font-size:13px; margin-top:2px; }
  .search { margin-top:14px; width:100%; max-width:520px; background:var(--panel); border:1px solid var(--line); color:#fff; border-radius:12px; padding:11px 14px; font-size:14px; outline:none; }
  .search:focus { border-color:var(--accent); }
  .layout { display:grid; grid-template-columns:220px 1fr; gap:0; }
  nav { position:sticky; top:118px; align-self:start; height:calc(100vh - 118px); overflow:auto; padding:18px 12px; border-right:1px solid var(--line); }
  .navlink { display:flex; justify-content:space-between; align-items:center; padding:7px 12px; border-radius:9px; color:var(--muted); font-size:13px; font-weight:600; }
  .navlink:hover { background:rgba(255,255,255,.04); color:#fff; }
  .navlink span { background:rgba(255,255,255,.07); border-radius:999px; padding:1px 8px; font-size:11px; }
  main { padding:24px; }
  .group { margin-bottom:38px; scroll-margin-top:130px; }
  .group h2 { font-size:15px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:#fff; margin:0 0 14px; display:flex; gap:10px; align-items:center; }
  .group h2 .count { color:var(--muted); font-size:12px; font-weight:600; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px; transition:.15s; }
  .card:hover { border-color:var(--accent); transform:translateY(-2px); }
  .card-name { font-weight:700; font-size:14px; }
  .card-path { color:var(--muted); font-size:11px; margin-top:4px; font-family:ui-monospace,monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .empty { color:var(--muted); padding:40px 0; text-align:center; display:none; }
  @media (max-width:820px){ .layout{ grid-template-columns:1fr; } nav{ display:none; } }
</style>
</head>
<body>
  <header>
    <div class="title"><b>FiveCrux</b> · Mockups</div>
    <div class="sub">${files.length} mockups across ${groupKeys.length} groups · click any card to open</div>
    <input id="q" class="search" type="search" placeholder="Search mockups by name or path…" autocomplete="off" />
  </header>
  <div class="layout">
    <nav>${navHtml}</nav>
    <main>
      ${sectionsHtml}
      <div class="empty" id="empty">No mockups match your search.</div>
    </main>
  </div>
<script>
  const q = document.getElementById('q');
  const cards = [...document.querySelectorAll('.card')];
  const groups = [...document.querySelectorAll('.group')];
  const empty = document.getElementById('empty');
  q.addEventListener('input', () => {
    const term = q.value.trim().toLowerCase();
    let any = false;
    for (const c of cards) {
      const hit = !term || c.dataset.name.includes(term);
      c.style.display = hit ? '' : 'none';
      if (hit) any = true;
    }
    for (const g of groups) {
      const visible = [...g.querySelectorAll('.card')].some((c) => c.style.display !== 'none');
      g.style.display = visible ? '' : 'none';
    }
    empty.style.display = any ? 'none' : 'block';
  });
</script>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(`✓ Wrote ${OUT} — ${files.length} mockups in ${groupKeys.length} groups.`);
console.log("  Open it: double-click mockups/index.html (or run: npx serve mockups)");
