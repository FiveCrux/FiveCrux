import { Suspense } from "react";
import { PropsClient } from "./props-client";

// ISR: regenerate the server-rendered shell at most once per minute, so the
// props catalog + ads are baked into the HTML and paint on first load (no
// client-side "load-in" delay). Mirrors the home/scripts pattern.
export const revalidate = 60;

// Server-side, ISR-cached fetches hitting the same public endpoints the client
// used, so the data shapes stay identical (no transform drift).
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
  const [initialProps, initialAds] = await Promise.all([
    getJson("/api/props", "props"),
    getJson("/api/ads/props", "ads"),
  ]);

  return (
    <Suspense fallback={null}>
      <PropsClient initialProps={initialProps} initialAds={initialAds} />
    </Suspense>
  );
}
