import type { Metadata } from "next";
import { PropDetailClient } from "./prop-detail-client";

// ISR: regenerate the server-rendered shell at most once per minute.
export const revalidate = 60;

// Server-side, ISR-cached fetch against the same public detail endpoint the
// client already used, so the data shape is identical (no transform drift).
async function getProp(id: string) {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/props/${id}`, {
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
  const data = await getProp(id);

  if (!data || data.error) {
    return {
      title: "Prop | FiveCrux",
      description: "Browse premium FiveM props on the FiveCrux marketplace.",
    };
  }

  const title = `${data.name} | FiveCrux`;
  const description =
    (data.description as string | undefined)?.slice(0, 160) ||
    "Premium FiveM prop on the FiveCrux marketplace.";
  const cover =
    (Array.isArray(data.images) && data.images[0]) || undefined;

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
  const data = await getProp(id);
  const initialData = data && !data.error ? data : null;

  const jsonLd = initialData
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: initialData.name,
        description: initialData.description,
        image:
          (Array.isArray(initialData.images) && initialData.images[0]) ||
          undefined,
        offers: {
          "@type": "Offer",
          price:
            Number(initialData.discountedPrice ?? initialData.price) || 0,
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PropDetailClient initialData={initialData} id={id} />
    </>
  );
}
