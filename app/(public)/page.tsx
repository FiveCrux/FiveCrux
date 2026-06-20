import { HomeClient } from "./home-client";

// ISR: regenerate the server-rendered shell at most once per minute.
export const revalidate = 60;

// Server-side, ISR-cached fetch of the active featured scripts, hitting the same
// public endpoint the client used so the data shape stays identical.
async function getFeatured() {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/featured-scripts?status=active`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.featuredScripts) ? data.featuredScripts : [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const initialFeatured = await getFeatured();
  return <HomeClient initialFeatured={initialFeatured} />;
}
