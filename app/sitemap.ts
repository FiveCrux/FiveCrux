import type { MetadataRoute } from "next";
import { getScripts, getApprovedProps, getGiveaways } from "@/lib/database-new";

// Regenerate the sitemap at most once per hour.
export const revalidate = 3600;

const base = process.env.NEXTAUTH_URL || "https://fivecrux.com";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${base}/`, lastModified: new Date() },
  { url: `${base}/scripts`, lastModified: new Date() },
  { url: `${base}/props`, lastModified: new Date() },
  { url: `${base}/giveaways`, lastModified: new Date() },
  { url: `${base}/advertise`, lastModified: new Date() },
];

function toDate(value: unknown): Date {
  if (!value) return new Date();
  const d = new Date(value as string | number | Date);
  return isNaN(d.getTime()) ? new Date() : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [scripts, props, giveaways] = await Promise.all([
      getScripts({ status: "approved", limit: 1000 }),
      getApprovedProps(1000),
      getGiveaways({ status: "active", limit: 1000 }),
    ]);

    const scriptUrls: MetadataRoute.Sitemap = (scripts || []).map((s: any) => ({
      url: `${base}/script/${s.id}`,
      lastModified: toDate(s.updatedAt ?? s.createdAt),
    }));

    const propUrls: MetadataRoute.Sitemap = (props || []).map((p: any) => ({
      url: `${base}/prop/${p.id}`,
      lastModified: toDate(p.updatedAt ?? p.createdAt),
    }));

    const giveawayUrls: MetadataRoute.Sitemap = (giveaways || []).map((g: any) => ({
      url: `${base}/giveaway/${g.id}`,
      lastModified: toDate(g.updatedAt ?? g.createdAt),
    }));

    return [...STATIC_ROUTES, ...scriptUrls, ...propUrls, ...giveawayUrls];
  } catch {
    // If any DB query fails, still expose the static routes.
    return STATIC_ROUTES;
  }
}
