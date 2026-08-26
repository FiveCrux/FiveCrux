import type { MetadataRoute } from "next";

import { SITE_URL, NOINDEX_PREFIXES } from "@/lib/seo";

/* /api is robots-only: those are routes, not pages, so they never need to be in
   the noindex list a page would use. */
const DISALLOW = [...NOINDEX_PREFIXES, "/api"];

/* Named AI crawlers, each given exactly the "*" rule.
   This grants nothing "*" does not already grant — a crawler with no group of
   its own falls back to "*" — so these lines are an explicit opt-in signal
   rather than a permission change. Two kinds are listed: crawlers whose
   operators document being named (GPTBot, ClaudeBot, PerplexityBot, CCBot),
   and the *-Extended tokens that exist ONLY as an AI-training control, where
   appearing here with Allow is what says "yes, train on this". */
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    // Names the canonical hostname, so the apex and www are not read as two sites.
    host: new URL(SITE_URL).host,
  };
}
