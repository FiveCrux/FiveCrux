import type { MetadataRoute } from "next";

import { canonicalUrl } from "@/lib/seo";
import { getScripts, getGiveaways, getCategories } from "@/lib/database-new";

// Regenerate at most once per hour.
export const revalidate = 3600;

/* A page whose copy only moves on a deploy has no "last changed" signal this
   route can read. Every static entry used to claim `new Date()`, so the whole
   sitemap said "changed today" on every rebuild — a crawler that checks twice
   learns the field is noise and stops reading it. A fixed date is honest:
   constant until someone changes the page and bumps this by hand. */
const FALLBACK_LASTMOD = new Date("2026-08-27T00:00:00Z");

const STATIC_ROUTES: {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}[] = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/scripts", changeFrequency: "daily", priority: 0.9 },
  { path: "/marketplace", changeFrequency: "daily", priority: 0.8 },
  { path: "/giveaways", changeFrequency: "daily", priority: 0.7 },
  { path: "/advertise", changeFrequency: "monthly", priority: 0.4 },
  // PROPS-DISABLED 2026-08-17: props switched off. Restore by uncommenting.
  // { path: "/props", changeFrequency: "daily", priority: 0.7 },
];

function toDate(value: unknown): Date {
  if (!value) return FALLBACK_LASTMOD;
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? FALLBACK_LASTMOD : d;
}

/** Newest lastModified in a set, so a category's date tracks its contents. */
function newestOf(dates: Date[]): Date {
  return dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : FALLBACK_LASTMOD;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: canonicalUrl(r.path),
    lastModified: FALLBACK_LASTMOD,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  try {
    const [scripts, giveaways, categories] = await Promise.all([
      getScripts({ status: "approved", limit: 1000 }),
      getGiveaways({ status: "active", limit: 1000 }),
      getCategories().catch(() => []),
    ]);

    const scriptEntries: MetadataRoute.Sitemap = (scripts || []).map((s: any) => ({
      url: canonicalUrl(`/script/${s.id}`),
      lastModified: toDate(s.updatedAt ?? s.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    // Category pages were missing entirely, so the pages most likely to rank
    // for "fivem maps" and the like were never offered to a crawler.
    const categoryEntries: MetadataRoute.Sitemap = (categories || [])
      .filter((c: any) => c?.slug && c?.isActive !== false)
      .map((c: any) => {
        const inCategory = (scripts || []).filter((s: any) => s.category === c.slug);
        return {
          url: canonicalUrl(`/category/${c.slug}`),
          lastModified: newestOf(inCategory.map((s: any) => toDate(s.updatedAt ?? s.createdAt))),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        };
      });

    const giveawayEntries: MetadataRoute.Sitemap = (giveaways || []).map((g: any) => ({
      url: canonicalUrl(`/giveaway/${g.id}`),
      lastModified: toDate(g.updatedAt ?? g.createdAt),
      changeFrequency: "daily" as const,
      priority: 0.5,
    }));

    return [...staticEntries, ...categoryEntries, ...scriptEntries, ...giveawayEntries];
  } catch {
    // A database problem must not take the whole sitemap down with it.
    return staticEntries;
  }
}
