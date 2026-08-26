import { GiveawaysClient } from "./giveaways-client";
import type { Metadata } from "next";
import { pageTitle, pageOpenGraph } from "@/lib/seo";

/* Deliberately not chasing "fivem giveaway" — Bing records 0 impressions for it
   in this market. The title is for people who already know the page exists. */
const TITLE = pageTitle("FiveM Asset Giveaways");
const DESCRIPTION =
  "Live giveaways from FiveM creators — scripts, MLOs, vehicles and more. See the prizes, the entry requirements and when each one ends.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...pageOpenGraph(TITLE, DESCRIPTION, "/giveaways"),
};

// ISR: bake the public giveaways + ads into the HTML so the grid paints on
// first load (no client-side load-in). User-specific entries still load
// client-side inside the client component.
export const revalidate = 60;

async function getJson(path: string, key?: string): Promise<any[]> {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${base}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (key && Array.isArray(data?.[key])) return data[key];
    return [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const [initialGiveaways, initialAds] = await Promise.all([
    getJson("/api/giveaways"),
    getJson("/api/promotions/giveaways", "ads"),
  ]);

  return (
    <GiveawaysClient initialGiveaways={initialGiveaways} initialAds={initialAds} />
  );
}
