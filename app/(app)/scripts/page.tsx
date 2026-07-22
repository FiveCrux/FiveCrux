import { ScriptsClient } from "./scripts-client";

// ISR: regenerate the server-rendered shell at most once per minute.
export const revalidate = 60;

// Server-side, ISR-cached fetches hitting the same public endpoints the client
// used so the data shapes stay identical (no transform drift).
async function getJson(path: string, key: string): Promise<any[]> {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${base}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.[key]) ? data[key] : Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const [initialScripts, initialFeatured, initialCategories] = await Promise.all([
    getJson("/api/scripts?limit=100", "scripts"),
    getJson("/api/featured-scripts?status=active", "featuredScripts"),
    getJson("/api/categories", "categories"),
  ]);

  return (
    <ScriptsClient
      initialScripts={initialScripts}
      initialFeatured={initialFeatured}
      initialCategories={initialCategories}
    />
  );
}
