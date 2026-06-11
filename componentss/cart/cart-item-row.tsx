"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
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
    <div className="grid grid-cols-12 gap-4 rounded-3xl bg-[#111111]/60 p-5 shadow-sm shadow-black/20 transition hover:bg-[#1a1a1a]">
      <div className="col-span-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-orange-300">
            {packageLabel}
          </span>
          {metadata?.packageType && (
            <span className="rounded-full bg-slate-800/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-300">
              {metadata.packageType === "ads"
                ? "Advertise"
                : metadata.packageType === "featured-scripts"
                ? "Featured"
                : metadata.packageType}
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-white">{item.title}</h3>

        {metadataLines.length > 0 ? (
          <p className="text-sm text-gray-400">{metadataLines.join(" · ")}</p>
        ) : metadata ? (
          <p className="text-sm text-gray-400">{JSON.stringify(metadata)}</p>
        ) : null}

        <button
          type="button"
          onClick={removeItem}
          disabled={isRemoving}
          className="inline-flex items-center gap-2 rounded-full border border-gray-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-orange-500 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          {isRemoving ? "Removing…" : "Remove item"}
        </button>
      </div>

      <div className="col-span-2 flex items-center justify-end text-right text-gray-200">
        {item.quantity}
      </div>
      <div className="col-span-2 flex items-center justify-end text-right text-gray-200">
        €{Number(item.price).toFixed(2)}
      </div>
      <div className="col-span-2 flex items-center justify-end text-right font-semibold text-white">
        €{(Number(item.price) * item.quantity).toFixed(2)}
      </div>
    </div>
  )
}
