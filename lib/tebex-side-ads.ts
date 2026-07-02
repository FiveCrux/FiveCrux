// Side-banner ad packages are sold by FiveCrux and managed entirely in Tebex:
// the admin creates duration packages (e.g. "Side Banner - 2 Weeks" @ €55)
// under the store's "SIDE ADVERTISEMENT" category, and the advertise UI reads
// them live from there — exactly like props read the "PROPS" category
// (lib/tebex-props.ts). Adding/renaming a package in Tebex reflects on the site
// with NO code change.
//
// NOTE: these are the Tebex DURATION packages (how long a banner runs). They are
// SEPARATE from the FiveCrux-side slot POSITION (left-top / left-bottom /
// right-top / right-bottom) which is scarce metadata enforced in the DB.
import { getCategories, type TebexPackage } from "@/lib/tebex";
import { isTebexConfigured } from "@/lib/tebex-pricing";

const SIDE_AD_CATEGORY = "side advertisement"; // matched case-insensitively against the Tebex category name

/** Parse a duration in weeks from a package name like "Side Banner - 2 Weeks". */
function parseDurationWeeks(name: string | null | undefined): number | null {
  if (!name) return null;
  const m = String(name).toLowerCase().match(/(\d+)\s*week/);
  return m ? Number(m[1]) : null;
}

/** A side-banner duration package as consumed by the advertise UI. */
export interface SideAdPackage {
  /** Tebex package id (the DURATION package to check out). */
  id: number;
  name: string;
  /** Live total price in the store currency. */
  price: number;
  currency: string;
  /** Duration in weeks parsed from the name (null if not encoded). */
  durationWeeks: number | null;
}

/** Map a Tebex package into the side-ad duration shape. */
export function mapPackageToSideAd(pkg: TebexPackage): SideAdPackage {
  const price = typeof pkg.total_price === "number" ? pkg.total_price : pkg.base_price;
  return {
    id: Number(pkg.id),
    name: pkg.name,
    price: typeof price === "number" ? price : 0,
    currency: pkg.currency,
    durationWeeks: parseDurationWeeks(pkg.name),
  };
}

/**
 * All side-banner duration packages = every package in the store's
 * "SIDE ADVERTISEMENT" category, sorted by duration. Empty array on error/none.
 */
export async function getSideAdPackages(): Promise<SideAdPackage[]> {
  if (!isTebexConfigured()) return [];
  try {
    const categories = await getCategories(undefined, true);
    const cat = categories.find((c) => (c.name || "").trim().toLowerCase() === SIDE_AD_CATEGORY);
    const packages = cat?.packages ?? [];
    return packages
      .map(mapPackageToSideAd)
      .sort((a, b) => (a.durationWeeks ?? Infinity) - (b.durationWeeks ?? Infinity));
  } catch (e) {
    console.error("getSideAdPackages error:", e);
    return [];
  }
}
