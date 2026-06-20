import type { Metadata } from "next";
import { GiveawayDetailClient } from "./giveaway-detail-client";

// ISR: regenerate the server-rendered shell at most once per minute.
export const revalidate = 60;

// Server-side, ISR-cached fetch against the same public detail endpoint the
// client already used, so the data shape is identical (no transform drift).
async function getGiveaway(id: string) {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/giveaways/${id}`, {
      next: { revalidate: 60 },
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getGiveaway(id);

  if (!data || data.error || (!data.id && !data.title)) {
    return {
      title: "Giveaway | FiveCrux",
      description: "Enter free FiveM giveaways on the FiveCrux marketplace.",
    };
  }

  const title = `${data.title} | FiveCrux`;
  const description =
    (data.description as string | undefined)?.slice(0, 160) ||
    "Enter this FiveM giveaway on the FiveCrux marketplace.";
  const cover =
    data.coverImage ||
    (Array.isArray(data.images) && data.images[0]) ||
    undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getGiveaway(id);
  const initialData =
    data && !data.error && (data.id || data.title) ? data : null;

  return <GiveawayDetailClient initialData={initialData} id={id} />;
}
