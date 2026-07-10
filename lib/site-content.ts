import { eq } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { siteContent } from "@/lib/db/schema"

// The home page's current copy, hardcoded — this is BOTH the shape the admin
// editor works with AND the fallback used until an admin saves a row (or if
// the migration hasn't been run yet), so the page never breaks.
export const DEFAULT_HOME_CONTENT = {
  heroPromo: {
    badge: "Premium Placement",
    headline: "Put your script in the",
    headlineAccent: "spotlight",
    subtext:
      "Right here on the homepage — the first thing thousands of FiveM server owners see every day. Grab a Featured slot and get discovered first.",
    tiers: ["Starter", "Premium", "Executive"],
    priceText: "from €20 / week",
    ctaPrimary: "Get Featured",
    ctaSecondary: "See all plans",
  },
  whyChooseUs: {
    eyebrow: "Why Choose Us",
    heading: "Why Choose FiveCrux?",
    tagline: "Powered by real developers",
    features: [
      { title: "Community Driven", description: "Built by experienced FiveM developers, trusted and improved by the community." },
      { title: "Premium Quality", description: "Only top-tier scripts that meet our quality standards make it onto FiveCrux." },
      { title: "Security Verified", description: "Every resource is manually reviewed before it goes live." },
      { title: "Maximum Reach", description: "Get discovered by thousands of FiveM server owners worldwide." },
    ],
  },
  ecosystem: {
    eyebrow: "Our Services",
    heading: "Powered by the Crux Ecosystem",
    cards: [
      { label: "Gaming Platform", title: "GameCrux", description: "Discover, play, and enjoy a curated selection of exciting minigames.", linkText: "Visit GameCrux", url: "https://www.gamecrux.io/" },
      { label: "FiveM Marketplace", title: "Crux Studio", description: "Premium FiveM assets crafted with passion and attention to detail.", linkText: "Visit Crux Studio", url: "https://crux.tebex.io/" },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    heading: "Frequently Asked Questions",
    intro: "Still have questions? Everything you need to know about publishing, payouts, and growing on FiveCrux is right here.",
    contactTitle: "Can't find an answer?",
    contactText: "Reach out to our support team anytime.",
    items: [
      { q: "How does publishing a script work?", a: "Submit your script through the developer panel. Each submission goes through a quality, security, and compatibility review before being published." },
      { q: "How do I get paid?", a: "Payments are handled through Tebex — money from your sales goes directly to your connected Tebex account." },
      { q: "Is there any publishing fee?", a: "There is no upfront fee to publish. You can optionally pay for featured slots and ads for extra reach." },
      { q: "Can I host giveaways on FiveCrux?", a: "Yes. Developers can create and publish giveaways to promote their scripts and reach a wider FiveM audience." },
    ],
  },
}

export type HomeContent = typeof DEFAULT_HOME_CONTENT

function deepMerge<T>(base: T, override: any): T {
  if (Array.isArray(base)) return (Array.isArray(override) ? override : base) as any
  if (base && typeof base === "object") {
    const out: any = { ...base }
    if (override && typeof override === "object") {
      for (const k of Object.keys(base as any)) {
        out[k] = deepMerge((base as any)[k], override[k])
      }
    }
    return out
  }
  return override !== undefined ? override : base
}

// Reads the 'home' row and merges it over the defaults, field by field, so a
// partial save (or a save from an older shape) never loses a whole section.
// Falls back to pure defaults on any DB error (e.g. migration not run yet).
export async function getHomeContent(): Promise<HomeContent> {
  try {
    const row = await db.query.siteContent.findFirst({ where: eq(siteContent.key, "home") })
    if (!row?.value) return DEFAULT_HOME_CONTENT
    return deepMerge(DEFAULT_HOME_CONTENT, row.value)
  } catch {
    return DEFAULT_HOME_CONTENT
  }
}

export async function saveHomeContent(value: HomeContent): Promise<void> {
  await db
    .insert(siteContent)
    .values({ key: "home", value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteContent.key,
      set: { value, updatedAt: new Date() },
    })
}
