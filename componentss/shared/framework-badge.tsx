import { Database, Box, Zap, Puzzle, Layers, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type FrameworkMeta = { label: string; icon: LucideIcon; color: string; bg: string; ring: string }

// One accent per framework so cards read at a glance instead of every tag
// being the same flat gray chip. New/unlisted frameworks (admin can add any
// slug) fall back to a neutral treatment below.
const FRAMEWORK_META: Record<string, FrameworkMeta> = {
  qbcore: { label: "QBCore", icon: Database, color: "text-pink-400", bg: "bg-pink-500/15", ring: "ring-pink-500/25" },
  qbox: { label: "Qbox", icon: Box, color: "text-amber-400", bg: "bg-amber-500/15", ring: "ring-amber-500/25" },
  esx: { label: "ESX", icon: Zap, color: "text-red-400", bg: "bg-red-500/15", ring: "ring-red-500/25" },
  ox: { label: "OX", icon: Layers, color: "text-sky-400", bg: "bg-sky-500/15", ring: "ring-sky-500/25" },
  vrp: { label: "VRP", icon: Layers, color: "text-purple-400", bg: "bg-purple-500/15", ring: "ring-purple-500/25" },
  standalone: { label: "Standalone", icon: Puzzle, color: "text-emerald-400", bg: "bg-emerald-500/15", ring: "ring-emerald-500/25" },
}

const FALLBACK_META: FrameworkMeta = {
  label: "",
  icon: Puzzle,
  color: "text-white/60",
  bg: "bg-white/[0.08]",
  ring: "ring-white/15",
}

export function getFrameworkMeta(framework: string): FrameworkMeta {
  const key = framework?.trim().toLowerCase()
  const meta = FRAMEWORK_META[key]
  if (meta) return meta
  return { ...FALLBACK_META, label: framework }
}

// Icon + label pill for a single framework tag (ESX/QBCore/Qbox/etc), used on
// every script/product card in place of the old flat gray uppercase chip.
export function FrameworkBadge({
  framework,
  size = "sm",
  className,
}: {
  framework: string
  size?: "sm" | "md"
  className?: string
}) {
  const meta = getFrameworkMeta(framework)
  const Icon = meta.icon
  const isMd = size === "md"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] font-bold text-white/75",
        isMd ? "gap-2 py-1 pl-1.5 pr-3.5 text-[11px]" : "gap-1.5 py-0.5 pl-1 pr-2.5 text-[10px]",
        className
      )}
    >
      <span
        className={cn(
          "grid place-items-center rounded-full ring-1",
          isMd ? "h-5 w-5" : "h-4 w-4",
          meta.bg,
          meta.ring
        )}
      >
        <Icon className={cn(isMd ? "h-3 w-3" : "h-2.5 w-2.5", meta.color)} />
      </span>
      {meta.label}
    </span>
  )
}
