// What search engines actually see, and what Bing actually holds.
//
// Read-only: it fetches public URLs and calls Bing's read endpoints. It changes
// nothing, on the site or in the Bing account.
//
//   node --env-file=.env.local scripts/seo-report.mjs
//   node --env-file=.env.local scripts/seo-report.mjs https://staging.example.com

const SITE = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || "https://www.fivecrux.com")
  .trim()
  .replace(/\/+$/, "");

const BASE = "https://ssl.bing.com/webmaster/api.svc/json";
const KEY = (process.env.BING_API_KEY || "").trim();
const INDEXNOW_KEY = "0dcb8ed3c6433c9cb2dfcbead081743f";

const ok = (s) => `\x1b[32m${s}\x1b[0m`;
const bad = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

let problems = 0;
const flag = (msg) => {
  problems++;
  console.log(`  ${bad("!")} ${msg}`);
};

const bingDate = (v) => {
  const ms = /\/Date\((\d+)/.exec(String(v ?? ""))?.[1];
  return ms ? new Date(Number(ms)).toISOString().slice(0, 16).replace("T", " ") : "—";
};

async function bing(endpoint, params = {}) {
  if (!KEY) throw new Error("BING_API_KEY is not set");
  const url = new URL(`${BASE}/${endpoint}`);
  url.searchParams.set("apikey", KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`${endpoint}: HTTP ${res.status}`);
  const body = JSON.parse(text);
  if (body?.ErrorCode) throw new Error(`${endpoint}: ${body.Message}`);
  return body.d;
}

async function head(url) {
  try {
    const res = await fetch(url, { redirect: "manual" });
    return { status: res.status, location: res.headers.get("location") };
  } catch {
    return { status: 0, location: null };
  }
}

console.log(`\n▶ SEO report — ${SITE}\n`);

// ---------------------------------------------------------------------------
// Which hostname actually serves. The apex answering nothing while the sitemap
// and Bing both point at it is invisible from inside the app, and makes every
// canonical URL a dead link.
// ---------------------------------------------------------------------------
console.log("hostnames");
{
  const host = new URL(SITE).host;
  const apex = host.replace(/^www\./, "");
  for (const h of [...new Set([host, apex, `www.${apex}`])]) {
    const r = await head(`https://${h}/`);
    const label = r.status === 0 ? bad("no response") : r.status === 200 ? ok("200") : `${r.status}${r.location ? ` -> ${r.location}` : ""}`;
    console.log(`  ${h.padEnd(24)} ${label}`);
    if (h === new URL(SITE).host && r.status !== 200) flag(`the canonical host ${h} does not return 200`);
  }
}

// ---------------------------------------------------------------------------
console.log("\nfiles");
for (const path of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/AGENTS.md"]) {
  const r = await head(`${SITE}${path}`);
  console.log(`  ${path.padEnd(24)} ${r.status === 200 ? ok("200") : bad(String(r.status))}`);
  if (r.status !== 200) flag(`${path} is not served`);
}

// ---------------------------------------------------------------------------
console.log("\nsitemap");
let sitemapUrls = [];
{
  const res = await fetch(`${SITE}/sitemap.xml`);
  const xml = await res.text();
  sitemapUrls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  console.log(`  ${sitemapUrls.length} urls`);

  const malformed = sitemapUrls.filter((u) => /(?<!:)\/\//.test(u.replace(/^https?:\/\//, "")));
  if (malformed.length) flag(`${malformed.length} urls contain a double slash, e.g. ${malformed[0]}`);

  const offHost = sitemapUrls.filter((u) => !u.startsWith(SITE));
  if (offHost.length) flag(`${offHost.length} urls are not on ${SITE}, e.g. ${offHost[0]}`);

  // A sample, rather than all of them: enough to catch a systemic redirect or
  // 404 without hammering the site on every run.
  const sample = sitemapUrls.slice(0, 8);
  const results = await Promise.all(sample.map((u) => head(u)));
  const notOk = results.filter((r) => r.status !== 200).length;
  console.log(`  sampled ${sample.length}: ${notOk === 0 ? ok("all 200") : bad(`${notOk} not 200`)}`);
  if (notOk) flag(`${notOk} of ${sample.length} sampled sitemap urls do not return 200`);
}

// ---------------------------------------------------------------------------
console.log("\non-page");
{
  const html = await (await fetch(SITE)).text();
  const checks = [
    ["canonical", /<link[^>]+rel="canonical"[^>]*>/i],
    ["msvalidate.01", /<meta[^>]+name="msvalidate\.01"[^>]*>/i],
    ["og:title", /<meta[^>]+property="og:title"[^>]*>/i],
    ["Organization schema", /"@type":"Organization"/],
    ["WebSite schema", /"@type":"WebSite"/],
  ];
  for (const [label, re] of checks) {
    const found = re.test(html);
    console.log(`  ${label.padEnd(24)} ${found ? ok("present") : bad("missing")}`);
    if (!found) flag(`${label} missing from the homepage`);
  }
}

// ---------------------------------------------------------------------------
// IndexNow gives no dashboard and no callback, so "did it actually go through"
// is not otherwise answerable. Submitting ONE url that is already in the
// sitemap is a real handshake, costs nothing, and separates the outcomes:
//   200 key fetched and checked  |  202 queued, key NOT checked yet
//   422 rejected                 |  403 key file unreachable
// A wrong key also returns 202, so 202 on its own proves nothing.
// ---------------------------------------------------------------------------
console.log("\nindexnow");
{
  const keyFile = `${SITE}/${INDEXNOW_KEY}.txt`;
  const kf = await fetch(keyFile).then((r) => r.text()).catch(() => "");
  const keyOk = kf.trim() === INDEXNOW_KEY;
  console.log(`  key file                 ${keyOk ? ok("serves the right key") : bad("wrong or missing")}`);
  if (!keyOk) flag(`${keyFile} does not serve the key — IndexNow can never validate`);

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE).host,
      key: INDEXNOW_KEY,
      keyLocation: keyFile,
      urlList: [sitemapUrls[0] ?? SITE],
    }),
  }).catch(() => null);

  const code = res?.status ?? 0;
  const verdict =
    code === 200 ? ok("200 — key validated")
    : code === 202 ? `${bad("202")} — queued, key not yet checked`
    : bad(`${code} — rejected`);
  console.log(`  handshake                ${verdict}`);
  if (code !== 200) flag(`IndexNow returned ${code}, not 200 — submissions are not confirmed valid`);
}

// ---------------------------------------------------------------------------
console.log("\nbing");
if (!KEY) {
  console.log(`  ${dim("BING_API_KEY not set — skipping")}`);
} else {
  const sites = await bing("GetUserSites");
  const canonicalHost = new URL(SITE).host;
  const match = sites.find((s) => new URL(s.Url).host === canonicalHost);

  for (const s of sites) {
    const mine = new URL(s.Url).host.endsWith(canonicalHost.replace(/^www\./, ""));
    if (!mine) continue;
    console.log(`  property ${s.Url.padEnd(32)} ${s.IsVerified ? ok("verified") : bad("unverified")}`);
  }
  if (!match) {
    flag(`Bing has no property for ${canonicalHost} — the verified one is a different hostname`);
  }

  const target = (match ?? sites[0])?.Url;
  if (target) {
    const feeds = await bing("GetFeeds", { siteUrl: target });
    console.log(`  sitemaps submitted: ${feeds.length}`);
    for (const f of feeds) {
      console.log(`    ${f.Status === "Success" ? ok(f.Status) : bad(f.Status)} ${String(f.UrlCount).padStart(4)} urls  crawled ${bingDate(f.LastCrawled)}  ${f.Url}`);
    }
    const extra = feeds.filter((f) => !f.Url.startsWith(SITE));
    if (extra.length) flag(`${extra.length} sitemap(s) submitted for a non-canonical hostname`);

    const quota = await bing("GetUrlSubmissionQuota", { siteUrl: target });
    console.log(`  url submission quota: ${quota.DailyQuota}/day, ${quota.MonthlyQuota}/month`);

    for (const [label, endpoint] of [
      ["traffic", "GetRankAndTrafficStats"],
      ["queries", "GetQueryStats"],
      ["crawl stats", "GetCrawlStats"],
      ["crawl issues", "GetCrawlIssues"],
    ]) {
      const rows = await bing(endpoint, { siteUrl: target });
      console.log(`  ${label.padEnd(24)} ${rows.length ? ok(`${rows.length} rows`) : dim("no data yet")}`);
    }
  }
}

console.log(
  problems === 0
    ? `\n${ok("No problems found.")}\n`
    : `\n${bad(`${problems} problem${problems === 1 ? "" : "s"} found.`)}\n`
);
process.exit(problems === 0 ? 0 : 1);
