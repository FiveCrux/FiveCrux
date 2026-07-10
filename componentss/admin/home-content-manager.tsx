"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Save, Plus, Trash2 } from "lucide-react"
import type { HomeContent } from "@/lib/site-content"

const inputClass =
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-orange-500/50 focus:outline-none"
const labelClass = "mb-1.5 block text-xs font-medium text-white/50"

function Field({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {textarea ? (
        <textarea className={`${inputClass} min-h-[70px] resize-y`} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-orange-400">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

// Admin → "Home Content": editable copy for the home page hero promo / why-choose-us /
// ecosystem / FAQ sections. Icons and layout stay fixed in code — only text is editable
// here, backed by the `site_content` table (falls back to the hardcoded defaults).
export default function HomeContentManager() {
  const [content, setContent] = useState<HomeContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/site-content?key=home")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setContent(d?.content ?? null))
      .catch(() => setContent(null))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!content) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "home", content }),
      })
      if (!res.ok) throw new Error()
      const d = await res.json()
      setContent(d.content)
      toast.success("Home page content saved")
    } catch {
      toast.error("Couldn't save — try again")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    )
  }
  if (!content) {
    return <p className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-sm text-white/50">Couldn&apos;t load home page content.</p>
  }

  const update = <K extends keyof HomeContent>(section: K, patch: Partial<HomeContent[K]>) => {
    setContent((c) => (c ? { ...c, [section]: { ...c[section], ...patch } } : c))
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Home page content</h2>
          <p className="mt-1 text-sm text-white/50">Edit the marketing copy shown on the home page — live after saving.</p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </button>
      </div>

      <div className="space-y-5">
        {/* Hero promo */}
        <Section title="Hero — Featured promo slide">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Badge" value={content.heroPromo.badge} onChange={(v) => update("heroPromo", { badge: v })} />
            <Field label="Price text" value={content.heroPromo.priceText} onChange={(v) => update("heroPromo", { priceText: v })} />
            <Field label="Headline" value={content.heroPromo.headline} onChange={(v) => update("heroPromo", { headline: v })} />
            <Field label="Headline accent word" value={content.heroPromo.headlineAccent} onChange={(v) => update("heroPromo", { headlineAccent: v })} />
          </div>
          <Field label="Subtext" textarea value={content.heroPromo.subtext} onChange={(v) => update("heroPromo", { subtext: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary CTA label" value={content.heroPromo.ctaPrimary} onChange={(v) => update("heroPromo", { ctaPrimary: v })} />
            <Field label="Secondary CTA label" value={content.heroPromo.ctaSecondary} onChange={(v) => update("heroPromo", { ctaSecondary: v })} />
          </div>
          <div>
            <label className={labelClass}>Tier pills (comma-separated)</label>
            <input
              className={inputClass}
              value={content.heroPromo.tiers.join(", ")}
              onChange={(e) => update("heroPromo", { tiers: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
            />
          </div>
        </Section>

        {/* Why choose us */}
        <Section title="Why Choose FiveCrux">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Eyebrow" value={content.whyChooseUs.eyebrow} onChange={(v) => update("whyChooseUs", { eyebrow: v })} />
            <Field label="Tagline (large tile)" value={content.whyChooseUs.tagline} onChange={(v) => update("whyChooseUs", { tagline: v })} />
          </div>
          <Field label="Heading" value={content.whyChooseUs.heading} onChange={(v) => update("whyChooseUs", { heading: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            {content.whyChooseUs.features.map((f, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] p-3">
                <Field
                  label={`Card ${i + 1} title`}
                  value={f.title}
                  onChange={(v) => {
                    const features = [...content.whyChooseUs.features]
                    features[i] = { ...features[i], title: v }
                    update("whyChooseUs", { features })
                  }}
                />
                <div className="mt-3">
                  <Field
                    label="Description"
                    textarea
                    value={f.description}
                    onChange={(v) => {
                      const features = [...content.whyChooseUs.features]
                      features[i] = { ...features[i], description: v }
                      update("whyChooseUs", { features })
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Ecosystem */}
        <Section title="Crux Ecosystem">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Eyebrow" value={content.ecosystem.eyebrow} onChange={(v) => update("ecosystem", { eyebrow: v })} />
            <Field label="Heading" value={content.ecosystem.heading} onChange={(v) => update("ecosystem", { heading: v })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {content.ecosystem.cards.map((c, i) => (
              <div key={i} className="space-y-3 rounded-xl border border-white/[0.06] p-3">
                <Field
                  label="Label"
                  value={c.label}
                  onChange={(v) => {
                    const cards = [...content.ecosystem.cards]
                    cards[i] = { ...cards[i], label: v }
                    update("ecosystem", { cards })
                  }}
                />
                <Field
                  label="Title"
                  value={c.title}
                  onChange={(v) => {
                    const cards = [...content.ecosystem.cards]
                    cards[i] = { ...cards[i], title: v }
                    update("ecosystem", { cards })
                  }}
                />
                <Field
                  label="Description"
                  textarea
                  value={c.description}
                  onChange={(v) => {
                    const cards = [...content.ecosystem.cards]
                    cards[i] = { ...cards[i], description: v }
                    update("ecosystem", { cards })
                  }}
                />
                <Field
                  label="Link text"
                  value={c.linkText}
                  onChange={(v) => {
                    const cards = [...content.ecosystem.cards]
                    cards[i] = { ...cards[i], linkText: v }
                    update("ecosystem", { cards })
                  }}
                />
                <Field
                  label="URL"
                  value={c.url}
                  onChange={(v) => {
                    const cards = [...content.ecosystem.cards]
                    cards[i] = { ...cards[i], url: v }
                    update("ecosystem", { cards })
                  }}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section title="FAQ">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Eyebrow" value={content.faq.eyebrow} onChange={(v) => update("faq", { eyebrow: v })} />
            <Field label="Heading" value={content.faq.heading} onChange={(v) => update("faq", { heading: v })} />
          </div>
          <Field label="Intro text" textarea value={content.faq.intro} onChange={(v) => update("faq", { intro: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact card title" value={content.faq.contactTitle} onChange={(v) => update("faq", { contactTitle: v })} />
            <Field label="Contact card text" value={content.faq.contactText} onChange={(v) => update("faq", { contactText: v })} />
          </div>

          <div className="space-y-3">
            {content.faq.items.map((item, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/40">Question {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => update("faq", { items: content.faq.items.filter((_, idx) => idx !== i) })}
                    className="rounded-lg p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Field
                  label="Question"
                  value={item.q}
                  onChange={(v) => {
                    const items = [...content.faq.items]
                    items[i] = { ...items[i], q: v }
                    update("faq", { items })
                  }}
                />
                <div className="mt-3">
                  <Field
                    label="Answer"
                    textarea
                    value={item.a}
                    onChange={(v) => {
                      const items = [...content.faq.items]
                      items[i] = { ...items[i], a: v }
                      update("faq", { items })
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => update("faq", { items: [...content.faq.items, { q: "", a: "" }] })}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/[0.07]"
          >
            <Plus className="h-4 w-4" /> Add question
          </button>
        </Section>
      </div>
    </div>
  )
}
