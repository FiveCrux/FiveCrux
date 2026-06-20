import { ScriptsClient } from "./scripts-client";

// ISR: regenerate the server-rendered shell at most once per minute.
export const revalidate = 60;

// Server-side, ISR-cached fetch of the first listing page, hitting the same
// public endpoint the client used so the data shape stays identical.
async function getScripts() {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/scripts?limit=24`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.scripts || data || [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const initialScripts = await getScripts();
  return <ScriptsClient initialScripts={initialScripts} />;
}
