import { MarketplaceClient } from "./marketplace-client";
import type { Metadata } from "next";
import { pageTitle, canonicalUrl, SITE_NAME } from "@/lib/seo";

const TITLE = pageTitle("Browse the FiveM Marketplace");
const DESCRIPTION =
  "Scripts, MLOs, cars, EUP and peds from independent FiveM creators, all in one catalogue.";

/* This page renders the SAME /api/scripts catalogue as /scripts, in a different
   layout — two URLs, one set of content, which search engines resolve by
   picking one arbitrarily. The canonical points at /scripts because that is the
   page that can actually rank: "fivem scripts" draws 2082 Bing impressions in
   this market against 0 for "fivem marketplace". The page itself is unchanged
   and stays linked in the nav; this only says which URL the ranking belongs to. */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: canonicalUrl("/scripts") },
  openGraph: {
    type: "website",
    url: canonicalUrl("/scripts"),
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// ISR: bake the catalog into the HTML so the grid paints on first load.
export const revalidate = 60;

async function getScripts(): Promise<any[]> {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/scripts?status=all`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.scripts) ? data.scripts : [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const initialScripts = await getScripts();
  return <MarketplaceClient initialScripts={initialScripts} />;
}
