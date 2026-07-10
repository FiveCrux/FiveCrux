import { HomeClient } from "./home-client";
import { getHomeContent } from "@/lib/site-content";

// ISR: regenerate the server-rendered shell at most once per minute. Because the
// home data (featured + categories + discovery scripts) is fetched HERE on the
// server and baked into the HTML, the page paints complete — no client-side
// "load-in" delay for the chips/rows.
export const revalidate = 60;

// One server-side, ISR-cached fetch helper. Hits the same public endpoints the
// client used, so the data shapes stay identical (no transform drift).
async function getJson(path: string, key: string): Promise<any[]> {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${base}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.[key]) ? data[key] : [];
  } catch {
    return [];
  }
}

export default async function Page() {
  // Fetch everything the home page needs in parallel, server-side.
  const [initialFeatured, initialCategories, initialScripts, content] = await Promise.all([
    getJson("/api/featured-scripts?status=active", "featuredScripts"),
    getJson("/api/categories?home=true", "categories"),
    getJson("/api/scripts", "scripts"),
    getHomeContent(),
  ]);

  return (
    <HomeClient
      initialFeatured={initialFeatured}
      initialCategories={initialCategories}
      initialScripts={initialScripts}
      content={content}
    />
  );
}
