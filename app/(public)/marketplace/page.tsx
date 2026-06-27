import { MarketplaceClient } from "./marketplace-client";

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
