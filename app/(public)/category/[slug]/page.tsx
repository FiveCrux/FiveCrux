import type { Metadata } from "next"

import { CategoryClient } from "./category-client"
import { pageTitle, pageOpenGraph, categorySeo } from "@/lib/seo"

// ISR: bake the category's scripts + the category list into the HTML so the
// grid paints on first load — mirrors the scripts/props/marketplace pattern.
export const revalidate = 60

async function getJson(path: string, key: string): Promise<any[]> {
  try {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const res = await fetch(`${base}${path}`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.[key]) ? data[key] : []
  } catch {
    return []
  }
}

/* Every category page used to inherit the homepage's title, so /category/maps,
   /category/vehicles and the rest were all indexed under one identical
   <title> — the strongest signal a page has, spent saying nothing about the
   page. These are the highest-intent URLs on the site. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { title, description } = categorySeo(slug)
  const full = pageTitle(title)
  return {
    title: full,
    description,
    ...pageOpenGraph(full, description, `/category/${slug}`),
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [initialScripts, initialCategories] = await Promise.all([
    getJson("/api/scripts?status=all", "scripts"),
    getJson("/api/categories", "categories"),
  ])

  return <CategoryClient initialScripts={initialScripts} initialCategories={initialCategories} slug={slug} />
}
