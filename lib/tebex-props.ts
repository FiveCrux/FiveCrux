// Props are sold ONLY by FiveCrux and managed entirely in Tebex: the admin
// creates a package (with the ZIP + image + price) under the store's "PROPS"
// category, and FiveCrux auto-lists it. This reader pulls that category and
// maps each package into the prop shape the storefront already consumes.
import { getCategories, type TebexPackage } from "@/lib/tebex";
import { isTebexConfigured } from "@/lib/tebex-pricing";

const PROPS_CATEGORY = "props"; // matched case-insensitively against the Tebex category name

function symbolFor(currency: string): string {
  switch ((currency || "").toUpperCase()) {
    case "EUR": return "€";
    case "USD": return "$";
    case "GBP": return "£";
    default: return currency || "$";
  }
}

/** Map a Tebex package into the prop shape used by /props + /prop/[id]. */
export function mapPackageToProp(pkg: TebexPackage) {
  const hasDiscount = typeof pkg.discount === "number" && pkg.discount > 0;
  const base = typeof pkg.base_price === "number" ? pkg.base_price : pkg.total_price;
  const now = typeof pkg.total_price === "number" ? pkg.total_price : base;
  return {
    // The prop id IS the Tebex package id — the single source of truth.
    id: String(pkg.id),
    name: pkg.name,
    description: pkg.description || "",
    price: String(base),
    discountPercentage: hasDiscount ? String(Math.round(((base - now) / base) * 100)) : "0",
    discountedPrice: hasDiscount ? String(now) : null,
    images: pkg.image ? [pkg.image] : [],
    currency: pkg.currency,
    currencySymbol: symbolFor(pkg.currency),
    // Backed by FiveCrux's own store package (store token defaults to TEBEX_PUBLIC_TOKEN).
    tebexStoreToken: null as string | null,
    tebexPackageId: String(pkg.id),
    createdBy: null as string | null,
    user: { name: "FiveCrux", username: "fivecrux" },
    createdAt: pkg.created_at,
    updatedAt: pkg.updated_at,
  };
}

export type TebexProp = ReturnType<typeof mapPackageToProp>;

/** All props = every package in the store's "PROPS" category. Empty on error/none. */
export async function listTebexProps(): Promise<TebexProp[]> {
  if (!isTebexConfigured()) return [];
  try {
    const categories = await getCategories(undefined, true);
    const propsCat = categories.find((c) => (c.name || "").trim().toLowerCase() === PROPS_CATEGORY);
    const packages = propsCat?.packages ?? [];
    return packages.map(mapPackageToProp);
  } catch (e) {
    console.error("listTebexProps error:", e);
    return [];
  }
}

/** A single prop by Tebex package id. Null if not found / not in the PROPS category. */
export async function getTebexProp(id: string | number): Promise<TebexProp | null> {
  const wanted = String(id);
  const all = await listTebexProps();
  return all.find((p) => p.id === wanted) ?? null;
}
