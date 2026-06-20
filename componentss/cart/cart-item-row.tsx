"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Package } from "lucide-react"
import { toast } from "sonner"

interface CartItemRowProps {
  item: {
    id: number | string
    itemType: string
    title: string
    price: number | string
    quantity: number
    metadata?: unknown
  }
}

const parseMetadata = (metadata: unknown) => {
  if (!metadata) return null
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata)
    } catch {
      return null
    }
  }
  return metadata
}

const getPackageLabel = (item: CartItemRowProps["item"]) => {
  const metadata = parseMetadata(item.metadata) as any
  if (metadata?.packageType === "ads") return "Ad Package"
  if (metadata?.packageType === "featured-scripts") return "Featured Script Package"
  return item.itemType ? String(item.itemType).toUpperCase() : "ITEM"
}

export default function CartItemRow({ item }: CartItemRowProps) {
  const [isRemoving, setIsRemoving] = useState(false)
  const router = useRouter()
  const metadata = parseMetadata(item.metadata) as any
  const packageLabel = getPackageLabel(item)

  const metadataLines: string[] = []
  if (metadata?.durationLabel) {
    metadataLines.push(metadata.durationLabel)
  }
  if (metadata?.slotsPerMonth) {
    metadataLines.push(`${metadata.slotsPerMonth} slot${metadata.slotsPerMonth > 1 ? "s" : ""}`)
  }

  // Compact sub-label shown under the title (type/framework label).
  const subLabel = metadataLines.length > 0 ? metadataLines.join(" · ") : packageLabel

  const removeItem = async () => {
    setIsRemoving(true)

    try {
      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cartItemId: item.id }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Unable to remove item")
      }

      toast.success("Item removed from cart")
      window.dispatchEvent(new CustomEvent("cartUpdated"))
      router.refresh()
    } catch (error) {
      console.error("Remove cart item error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to remove item")
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-white/[0.015]">
      {/* Thumbnail — icon placeholder (cart items carry no image URL) */}
      <div className="grid h-12 w-16 flex-none place-items-center rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-400/5 ring-1 ring-orange-500/25">
        <Package className="h-5 w-5 text-orange-500" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold tracking-tight text-white">{item.title}</h3>
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-orange-300/70">{subLabel}</p>
      </div>

      {/* Quantity — read-only stepper styling (qty is not mutable in current logic) */}
      <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03]">
        <span className="w-9 text-center text-xs font-semibold tabular-nums text-white/80">
          {item.quantity}
        </span>
      </div>

      <div className="w-16 text-right text-sm font-bold tabular-nums text-white">
        €{(Number(item.price) * item.quantity).toFixed(2)}
      </div>

      <button
        type="button"
        onClick={removeItem}
        disabled={isRemoving}
        aria-label="Remove item"
        title={isRemoving ? "Removing…" : "Remove item"}
        className="grid h-7 w-7 flex-none place-items-center rounded-lg text-white/55 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
