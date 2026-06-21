# FiveCrux — Tech Debt (deferred, NOT blocking launch)

> Recorded for later. The app works as-is; these are cleanliness / hardening /
> scale items to tackle in dedicated sprints AFTER go-live. Each is reversible
> and isolated. DB migrations are run by the human (per CLAUDE.md).

---

## 1. 🗂️ Merge the `pending_/approved_/rejected_` triples → one table + `status`  (BIGGEST)

**Problem:** every content type has 3 near-identical tables distinguished only by
status. 12 tables that should be 4.
- `pending_scripts` + `approved_scripts` + `rejected_scripts` → `scripts(status)`
- same for `props`, `giveaways`, `ads`
- Saves 8 tables; approve/reject becomes a status UPDATE (no row-move); queries simplify.

**Why deferred:** it's the LIVE prod schema with real data; refactor = risky migration
+ touches every query. Works fine today. No user-facing benefit.

**Safe staged plan (per entity, one at a time — scripts → props → giveaways → ads):**
1. **Migration A (additive, human runs):** create unified `X` table (all columns +
   `status` enum + status-specific cols nullable); backfill:
   ```sql
   INSERT INTO scripts SELECT *, 'pending'  FROM pending_scripts;
   INSERT INTO scripts SELECT *, 'approved' FROM approved_scripts;
   INSERT INTO scripts SELECT *, 'rejected' FROM rejected_scripts;
   ```
   Keep the old 3 tables (backup / rollback).
2. **Code cutover** (centralized in `lib/database-new.ts`): create→insert(status:'pending');
   getX→where status='approved'; approve/reject→UPDATE status; getById→one table.
3. **Test on a prod-mirror** (PGlite copy) — submit/approve/reject/list parity.
4. **Deploy + verify** (old tables remain as backup).
5. **Migration B (later):** `DROP` the old triples after confidence.

---

## 2. 🔑 App-generated integer PKs → DB identity/sequence
`genId()` / `generateNumericId()` = `floor(Date.now()/1000)+random` (collision-prone
under load). Used on userAdSlots, orders, orderItems, giveawayPrizeWinners, etc.
- Short-term: retry-on-conflict.
- Long-term: DB identity/sequence PKs (migration, human runs).

## 3. 🖼️ `<img>` → `next/image`
`@next/next/no-img-element` is disabled in `.eslintrc.json` (image-heavy dynamic
app). Migrating to `next/image` (with the configured remote hosts) improves LCP /
bandwidth. A deliberate perf pass — not urgent. (Discord avatar hosts already added.)

## 4. ♻️ Data duplication
- **Winner data in 2 places:** `giveaway_prizes.winnerName/winnerEmail` (deprecated)
  + `giveaway_prize_winners` table. Drop the deprecated scalar fields once all reads
  use the table.
- **`featured_scripts` denormalizes script fields** (scriptTitle/scriptPrice…). Fine
  as a snapshot, but a join to the unified `scripts` table would remove the copy.

## 5. 💳 Deferred money/correctness fixes (from `docs/fix-spec.md`)
Already documented + reasoned there. Re-listed for one place:
- **I1** move coupon redemption to payment-time (currently at checkout; refund restores,
  but abandoned checkouts still consume → needs a cleanup job).
- **I2** assert/reconcile FiveCrux coupon vs the actual Tebex charge.
- **I7** enforce `perUserLimit` / `couponApplicationRule` (today: one-redemption-ever).
- **I9** refresh JWT roles mid-session (middleware-layer staleness only).
- **M1** founder/admin "auto-approve" routes to pending (message misleading) — product call.
- **M9** `rejectGiveaway` orphans child rows. **M11** currency symbol hardcoded €.

## 6. 🛒 Tebex basket authentication
Live store requires "User must login before adding packages" (422 on add-package).
Either turn the store setting OFF, or implement the basket-auth flow
(`getBasketAuthUrl` → user authenticates → then add packages). Needed before a real
checkout completes.

## 7. 📊 Time-windowed "trending" needs an events table
Cumulative `view_count`/`click_count` (when added) power all-time Most-Viewed/Popular,
but **"trending this week"** needs timestamped events (or rolling counters). Add an
`item_events` table when trending-by-window is wanted; swap counters to Redis/KV at
high traffic (keep the `lib/tracking.ts` abstraction so call sites don't change).

## 8. 🏷️ Dynamic categories (if not yet built)
Category chips are hardcoded in multiple places (home-client vs scripts-client) and
inconsistent. Plan: a `categories` table (name, slug, icon, applies_to, is_active,
show_on_home, home_order) + admin CRUD + `/api/categories`, read by home / scripts
filter / submit form / category page. (1 clean table — not part of the triple debt.)

---

## Suggested order (post-launch)
1. Dynamic categories (#8) — small, high UX value.
2. View/click tracking + trending (#7).
3. Money/coupon hardening (#5), basket-auth (#6).
4. The big triple-table refactor (#1) — dedicated sprint, entity-by-entity.
5. PK hardening (#2), img→next/image (#3), dedup (#4) — opportunistic.
