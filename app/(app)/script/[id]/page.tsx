import type { Metadata } from "next";
import { ScriptDetailClient } from "./script-detail-client";
import { safeJsonLd } from "@/lib/json-ld";
import { formatPrice } from "@/lib/format-price";

// ISR: regenerate the server-rendered shell at most once per minute.
export const revalidate = 60;

// Server-side, ISR-cached fetch. Hits the same public detail endpoint the
// client already used, so the data shape stays identical (no transform drift).
async function getScript(id: string) {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/scripts/${id}`, {
      next: { revalidate: 60 },
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Decode entities the stored copy was escaped with, then flatten to one line.
 *
 *  Listing text arrives already HTML-escaped, and putting it in a meta tag
 *  escapes it a second time — which is why descriptions were reaching search
 *  results reading "Male &amp;amp; Female". Decoding first means the tag holds
 *  the real characters and is escaped exactly once.
 */
function plainText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A meta description that is this listing's, and no other's.
 *
 *  It used to be the seller's description verbatim. Sellers reuse one blurb
 *  across a whole range — 29 weapon listings shared a single sentence, another
 *  16 shared "Package Contain: 2 Tshirts" — so 45 pages went out with identical
 *  descriptions, which is what Bing's Site Scan flagged.
 *
 *  Leading with the listing's own facts (name, category, framework, price)
 *  makes every page distinct even when the seller's copy is not, and puts the
 *  words a buyer searches for at the front where they are read.
 */
function listingDescription(data: any): string {
  const name = plainText(data.title);
  const frameworks = Array.isArray(data.framework) ? data.framework.filter(Boolean) : [];
  // The shared formatter, so a listing's price reads the same in search results
  // as it does on the page. Hand-rolling it here produced "EUR4.99".
  const price = data.price != null && data.price !== "" ? formatPrice(data.price, data.currencySymbol, data.currency) : "";

  const facts = [
    name && `${name} — FiveM ${plainText(data.category) || "asset"}`,
    frameworks.length ? `for ${frameworks.join(", ")}` : "",
    data.seller_name ? `by ${plainText(data.seller_name)}` : "",
    price ? `· ${price}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sellerCopy = plainText(data.description);
  const full = sellerCopy ? `${facts}. ${sellerCopy}` : `${facts}. Instant download on FiveCrux.`;

  // Cut on a word boundary rather than mid-word, which reads as truncation.
  if (full.length <= 160) return full;
  const cut = full.slice(0, 160);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:—-]+$/, "") + "…";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getScript(id);

  if (!data || data.error) {
    return {
      title: "Asset | FiveCrux",
      description: "Browse premium FiveM assets on the FiveCrux marketplace.",
    };
  }

  const title = `${data.title} | FiveCrux`;
  const description = listingDescription(data);
  const cover = data.cover_image || (data.images && data.images[0]) || undefined;

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
  const data = await getScript(id);
  const initialData = data && !data.error ? data : null;

  const jsonLd = initialData
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: initialData.title,
        description: initialData.description,
        image:
          initialData.cover_image ||
          (Array.isArray(initialData.images) && initialData.images[0]) ||
          undefined,
        offers: {
          "@type": "Offer",
          price: Number(initialData.price) || 0,
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
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
      )}
      <ScriptDetailClient initialData={initialData} id={id} />
    </>
  );
}
