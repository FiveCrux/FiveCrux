"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Package, Plus, Minus } from "lucide-react"
import { toast } from "sonner"

import { MAX_CART_QUANTITY, slotsForCartLine } from "@/lib/slot-count"

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
  if (metadata?.packageType === "featured-scripts") return "Featured Asset Package"
  return item.itemType ? String(item.itemType).toUpperCase() : "ITEM"
}

export default function CartItemRow({ item }: CartItemRowProps) {
  const [isRemoving, setIsRemoving] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  // Held locally so the line total and slot count move the moment the button is
  // pressed. router.refresh() then replaces it with the server's answer.
  const [quantity, setQuantityState] = useState(item.quantity)
  const busy = isRemoving || isUpdating
  const router = useRouter()
  const metadata = parseMetadata(item.metadata) as any
  const packageLabel = getPackageLabel(item)

  const metadataLines: string[] = []
  if (metadata?.durationLabel) {
    metadataLines.push(metadata.durationLabel)
  }
  // Shown times the quantity, because that is what the purchase actually
  // grants — two Premium packs are six slots, not three.
  const totalSlots = metadata?.slotsPerMonth
    ? slotsForCartLine({ ...metadata, quantity })
    : 0
  if (totalSlots > 0) {
    metadataLines.push(`${totalSlots} slot${totalSlots > 1 ? "s" : ""}`)
  }

  // Compact sub-label shown under the title (type/framework label).
  const subLabel = metadataLines.length > 0 ? metadataLines.join(" · ") : packageLabel

  const setQuantity = async (next: number) => {
    if (next < 1 || next > MAX_CART_QUANTITY || next === quantity) return
    const previous = quantity
    setQuantityState(next)
    setIsUpdating(true)

    try {
      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId: item.id, quantity: next }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "Unable to update quantity")
      }

      // Take the server's number, not ours — this state is seeded from a prop
      // and React will not re-seed it when the refresh brings a new value, so
      // anything the server decided differently would stick around unnoticed.
      if (Number.isInteger(data?.quantity)) setQuantityState(data.quantity)

      window.dispatchEvent(new CustomEvent("cartUpdated"))
      router.refresh()
    } catch (error) {
      // Put the number back rather than leaving the row showing a quantity the
      // cart does not actually hold — the total beside it would be a lie.
      setQuantityState(previous)
      toast.error(error instanceof Error ? error.message : "Failed to update quantity")
    } finally {
      setIsUpdating(false)
    }
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

  // The row wraps on its OWN width, not the viewport's. The controls are
  // fixed-width and were squeezing the title block to nothing — at 390px the
  // pack name vanished entirely, and at 1280px with the ad rails present the
  // content column is narrow enough that names truncated to "Ad Slot…".
  // Giving the title a real flex-basis lets the controls wrap underneath
  // whenever they cannot fit, at any viewport.
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3 px-5 py-3.5 transition hover:bg-white/[0.015]">
      {/* Thumbnail — icon placeholder (cart items carry no image URL) */}
      <div className="grid h-12 w-16 flex-none place-items-center rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-400/5 ring-1 ring-orange-500/25">
        <Package className="h-5 w-5 text-orange-500" />
      </div>

      <div className="min-w-0 grow basis-56">
        <h3 className="truncate text-sm font-bold tracking-tight text-white">{item.title}</h3>
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-orange-300/70">{subLabel}</p>
      </div>

      <div className="ml-auto flex items-center justify-end gap-3.5">
        <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03]">
          <button
            type="button"
            onClick={() => setQuantity(quantity - 1)}
            disabled={busy || quantity <= 1}
            aria-label="Decrease quantity"
            className="grid h-7 w-7 place-items-center rounded-l-lg text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-xs font-semibold tabular-nums text-white/80">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            disabled={busy || quantity >= MAX_CART_QUANTITY}
            aria-label="Increase quantity"
            title={quantity >= MAX_CART_QUANTITY ? `Maximum ${MAX_CART_QUANTITY}` : undefined}
            className="grid h-7 w-7 place-items-center rounded-r-lg text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="w-16 text-right text-sm font-bold tabular-nums text-white">
          €{(Number(item.price) * quantity).toFixed(2)}
        </div>

        <button
          type="button"
          onClick={removeItem}
          disabled={busy}
          aria-label="Remove item"
          title={isRemoving ? "Removing…" : "Remove item"}
          className="grid h-7 w-7 flex-none place-items-center rounded-lg text-white/55 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
