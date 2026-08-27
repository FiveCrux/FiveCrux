# FiveCrux SEO / Bing — what was built, and how to check it yourself

Nothing here asks you to take my word for it. Every row has something you can
run or open. Anything marked **YOURS** is not mine to do.

Fastest overall check:

```bash
npm run seo:report
```

It exits `0` when clean and non-zero when not, so it also works as a deploy gate.

---

## 1. The canonical host

**What was wrong.** Every public URL was built from `NEXTAUTH_URL` — an
authentication variable. In production it ends in a slash and the code added
another, so all 161 sitemap URLs came out as `https://www.fivecrux.com//scripts`.
Each one 308-redirects, so Bing and Google were handed 161 redirects, not 161
pages. The fallback was `https://fivecrux.com` — the apex, which serves nothing.

**Where.** `lib/seo.ts` — one origin, a slash-collapsing `canonicalUrl()`, and
`NEXTAUTH_URL` deliberately not consulted.

**Check it.**
```bash
curl -s https://www.fivecrux.com/sitemap.xml | grep -c 'com//'    # expect 0
curl -s https://www.fivecrux.com/sitemap.xml | grep -c '<loc>'    # expect ~168
```

---

## 2. Bing was watching a hostname that serves nothing

**What was wrong.** The verified Bing property was `https://fivecrux.com/` — the
dead apex. Nothing this site did could ever appear there. It also had **zero**
sitemaps submitted, so Bing had never been given the catalogue at all.

**What I did in your Bing account** (these are real changes, listed so you can
audit them):

- Added `https://www.fivecrux.com/` as a property and verified it.
- Adding www **replaced** the old apex entry — it is no longer in the list. It
  pointed at a host that answers nothing, so nothing was lost, but it is gone.
- Submitted `https://www.fivecrux.com/sitemap.xml`.
- Submitted the URL list to IndexNow several times while testing.

**Check it.** Bing Webmaster → the site picker should show
`www.fivecrux.com`, verified. Sitemaps → one entry, status Success, 169 urls.
Or from the terminal, the `bing` section of `npm run seo:report`.

**The ownership token** is committed in `lib/seo.ts`, not held in an env var. It
proves nothing on its own — it only matches a value Bing already holds — and
Bing has to read it off the public page. Committing it means verification
survives a deploy with no dashboard step, which is precisely how the wrong host
came to be the verified one.

```bash
curl -s https://www.fivecrux.com/ | grep msvalidate
```

---

## 3. The sitemap

- Static routes claimed `lastModified: new Date()` — "changed today", on every
  rebuild. A crawler that checks twice learns the field is noise. Now a fixed
  date; listings carry their real `updatedAt`.
- Category pages were missing entirely — the pages most likely to rank for
  things like "fivem maps" were never offered to a crawler.
- `/marketplace` is deliberately absent (see §6).

**Where.** `app/sitemap.ts`

---

## 4. robots.txt

Only `/admin` and `/api` were disallowed, so `/profile`, `/cart` and
`/edit-products` were burning crawl budget. Now driven by the same
`NOINDEX_PREFIXES` list the app uses, declares `host`, and names eleven AI
crawlers explicitly — which grants nothing `*` does not already, so it reads as
an opt-in signal rather than a permission change.

```bash
curl -s https://www.fivecrux.com/robots.txt
```

---

## 5. Titles — chosen from Bing's own keyword data

Only the two detail routes had their own metadata. `/scripts`, `/giveaways`,
`/advertise`, `/marketplace` and **every** category page inherited the
homepage's title — the strongest signal a page has, spent saying nothing about
the page.

The category names are not what we call things internally. They come from Bing's
Keyword API for this market (US, 90 days):

| term | impressions | vs |
|---|---|---|
| `fivem cars` | 2296 | `fivem vehicles` 408 — **5.6x** |
| `fivem scripts` | 2082 | `fivem assets` 250 |
| `fivem mlo` + `mlos` | 1329 | `fivem maps` 81 — **16x** |
| `fivem peds` | 586 | |
| `fivem eup` | 212 | `fivem clothing` 165 |
| `fivem giveaway` | **0** | not worth chasing |
| `fivem marketplace` | **0** | not worth chasing |

So Maps became "FiveM MLOs & Maps", Vehicles "FiveM Cars & Vehicles", Clothing
"FiveM Clothing & EUP". The plain word stays — nobody should have to guess what
a page is — with the term people actually type beside it.

**Re-run the numbers yourself** (needs `BING_API_KEY` in `.env.local`):

```bash
KEY=$(sed -n 's/^BING_API_KEY=//p' .env.local | tr -d '"\r')
curl -s -G "https://ssl.bing.com/webmaster/api.svc/json/GetKeyword" \
  --data-urlencode "apikey=$KEY" --data-urlencode "q=fivem cars" \
  --data-urlencode "country=us" --data-urlencode "language=en-US" \
  --data-urlencode "startDate=2026-05-29" --data-urlencode "endDate=2026-08-27"
```

**Check the titles.**
```bash
for p in /scripts /giveaways /advertise /category/maps /category/vehicles /category/clothing; do
  printf "%-24s " "$p"
  curl -s "https://www.fivecrux.com$p" | grep -oE '<title[^>]*>[^<]*' | sed 's/<title[^>]*>//'
done
```

---

## 6. /marketplace and /scripts were the same page

Both render the same `/api/scripts` catalogue in different layouts — one set of
content on two URLs, which a search engine resolves by picking one arbitrarily.
`/scripts` is the one that can rank, so `/marketplace` now canonicals to it and
is dropped from the sitemap (a sitemap must not ask a crawler to index a page
the site itself points away from). The page is unchanged and stays in the nav.

```bash
curl -s https://www.fivecrux.com/marketplace | grep canonical
# expect: href="https://www.fivecrux.com/scripts"
```

---

## 7. Canonical tags, Open Graph, structured data

There were no canonical tags anywhere, which with a live www/apex split is how
duplicate content starts. The only structured data was per-product; nothing tied
the brand together as an entity. Added: canonical, `metadataBase`, per-page Open
Graph, and Organization + WebSite JSON-LD with a SearchAction.

`metadataBase` also stops Next resolving social previews against the Vercel
preview alias instead of the real domain.

```bash
curl -s https://www.fivecrux.com/ | grep -oE 'rel="canonical"[^>]*|"@type":"(Organization|WebSite)"'
```

---

## 8. Found by AI, not just by search

- `/llms.txt` — what the site is, when to reach for it, **when not to**.
- `/AGENTS.md` — the read-only endpoints, and the things an assistant must get
  right: listings belong to creators not to FiveCrux; quote the listing's own
  currency; never tell someone they won a giveaway.

`AGENTS.md` needed a forced `git add` — `.gitignore` excludes `*.md`, which
would have kept a public asset out of the deploy.

```bash
curl -s https://www.fivecrux.com/llms.txt | head -5
curl -s https://www.fivecrux.com/AGENTS.md | head -5
```

---

## 9. IndexNow

Nothing told search engines when something changed. A new marketplace has almost
no crawl budget — Bing decides how often to return based on how often it found
something new, which is a slow loop from zero.

Key file, submitter, and a daily Vercel cron at 04:00 UTC. Sitemap-driven, so
there is one list of what is public rather than two.

**200 and 202 are not the same, and this matters.** Tested against the live API
with a deliberately wrong key: it returns **202**, not an error.

| code | meaning |
|---|---|
| **200** | the key was fetched and checked. Genuinely done. |
| **202** | queued — key **not** checked yet. A wrong key lands here too, and nothing ever tells you it failed. |
| **422** | rejected: wrong host, or a url not on this host. |

So the code reports which it got, and the report fails on anything but 200.

```bash
curl -s "https://www.fivecrux.com/api/indexnow?secret=<CRON_SECRET>"
# expect: {"success":true,"submittedUrls":168,"status":200,"keyValidated":true}
```

---

## 10. The measurement tool

`lib/bing.ts` wraps Bing's Webmaster API; `scripts/seo-report.mjs` prints what
Bing holds plus what the live site serves. Read-only — it changes nothing on the
site or in the Bing account, apart from the one-URL IndexNow handshake, which is
a URL already in the sitemap.

It found every SEO item in this list.

A transient Bing 5xx is retried three times before the section is reported as
unavailable, and a Bing outage is never counted against the site — otherwise the
exit code would be useless as a gate.

```bash
npm run seo:report
```

---

## Still open

| | |
|---|---|
| **YOURS** — `fivecrux.com` (no www) serves nothing. DNS points at a parking IP. Anyone typing it without `www` gets nothing. It should redirect to `www.fivecrux.com`. | not fixable from the repo |
| **YOURS** — Bing → **Site Scan** says "No scans initiated". It is free, and it looks from Bing's crawler's side rather than from outside like my report does. There is no API for it; it is a dashboard button. Send me whatever it finds. | one click |
| Search Performance / AI Performance are empty and will be for a while. The property was on a dead host until yesterday and the sitemap had never been submitted, so Bing has no history to show. Not a fault. | wait |
| No Google Search Console. Needs a Google service account. | say the word |

---

## Files

Created: `lib/seo.ts`, `lib/bing.ts`, `lib/indexnow.ts`,
`app/api/indexnow/route.ts`, `scripts/seo-report.mjs`, `public/llms.txt`,
`public/AGENTS.md`, `public/0dcb8ed3c6433c9cb2dfcbead081743f.txt`, `vercel.json`

Changed: `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, `package.json`,
`app/(app)/scripts/page.tsx`, `app/(app)/giveaways/page.tsx`,
`app/(app)/advertise/page.tsx`, `app/(public)/marketplace/page.tsx`,
`app/(public)/category/[slug]/page.tsx`

Commits: `5affa1f`, `2c071f0`, `8b5c656`, `562e082`, `6467bf2`, `4d6d406`

```bash
git log --oneline 3c554ac..HEAD
git show 5affa1f --stat
```
