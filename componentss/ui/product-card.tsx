"use client";

import { useState } from "react";
import Image from "next/image";
import type { ReactNode } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BadgeVariant = "new" | "sale" | "standalone" | "featured";

export interface ProductCardProps {
  /** Product image URL */
  image: string;
  /** Alt text for the image */
  imageAlt?: string;
  /** Badge shown top-left of image (optional) */
  badge?: BadgeVariant;
  /** Custom badge label override */
  badgeLabel?: string;
  /** Additional overlay rendered on top of the image (e.g. "Ended" overlay) */
  imageOverlay?: ReactNode;
  /** Framework / category tag pills shown above the title */
  tags?: string[];
  /** Product title */
  title: string;
  /** Author display name */
  author: string;
  /** Author image URL (takes priority over initials) */
  authorImage?: string | null;
  /** Author initials for avatar fallback (max 2 chars) */
  authorInitials?: string;
  /** Whether the author has a verified badge */
  verified?: boolean;
  /** Rating value 0–5 (shows stars when > 0) */
  rating?: number;
  /** Total review/entry count */
  reviewCount?: number;
  /** Review/count label override, e.g. "entries" instead of default */
  reviewLabel?: string;
  /** Price string, e.g. "$24.99" or "Free" */
  price: string;
  /** Whether the item is already wishlisted */
  wishlisted?: boolean;
  /** Replace the default "Add to cart" button entirely */
  customAction?: ReactNode;
  /** "Add to cart" callback (used when customAction is not set) */
  onAddToCart?: () => void;
  /** Wishlist toggle callback */
  onWishlist?: (wishlisted: boolean) => void;
  /** "View details" overlay click callback */
  onViewDetails?: () => void;
  /** Additional CSS class on the root article */
  className?: string;
}

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<BadgeVariant, { label: string; className: string }> = {
  new: {
    label: "New",
    className:
      "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  },
  sale: {
    label: "Sale",
    className: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  },
  standalone: {
    label: "Standalone",
    className: "bg-white/[0.06] text-white/55 border border-white/10",
  },
  featured: {
    label: "Featured",
    className:
      "bg-orange-500/15 text-orange-300 border border-orange-500/30",
  },
};

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({
  rating,
  count,
  label = "",
}: {
  rating: number;
  count: number;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = rating >= star;
          const half = !filled && rating >= star - 0.5;
          return (
            <svg
              key={star}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill={filled ? "#facc15" : half ? "url(#halfGrad)" : "none"}
              stroke={filled || half ? "#facc15" : "rgba(255,255,255,0.2)"}
              strokeWidth="1.8"
              className="flex-shrink-0"
            >
              {half && (
                <defs>
                  <linearGradient id="halfGrad">
                    <stop offset="50%" stopColor="#facc15" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              )}
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          );
        })}
      </div>
      <span className="text-[10px] font-medium tracking-[0.01em] text-white/55">
        ({count.toLocaleString()}{label ? ` ${label}` : ""})
      </span>
    </div>
  );
}

// ─── Heart icon ───────────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "#f97316" : "none"}
      stroke={filled ? "#f97316" : "rgba(255,255,255,0.5)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// ─── Verified checkmark ───────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Verified"
      className="flex-shrink-0"
    >
      <circle cx="12" cy="12" r="10" fill="#1d9e75" />
      <polyline
        points="8 12 11 15 16 9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductCard({
  image,
  imageAlt = "Product image",
  badge,
  badgeLabel,
  imageOverlay,
  tags = [],
  title,
  author,
  authorImage,
  authorInitials = "?",
  verified = false,
  rating = 0,
  reviewCount = 0,
  reviewLabel,
  price,
  wishlisted: initialWishlisted = false,
  customAction,
  onAddToCart,
  onWishlist,
  onViewDetails,
  className,
}: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [cartPressed, setCartPressed] = useState(false);

  function handleWishlist(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !wishlisted;
    setWishlisted(next);
    onWishlist?.(next);
  }

  function handleAddToCart() {
    setCartPressed(true);
    setTimeout(() => setCartPressed(false), 180);
    onAddToCart?.();
  }

  const badgeConfig = badge ? BADGE_STYLES[badge] : null;
  const resolvedBadgeLabel = badgeLabel ?? badgeConfig?.label;

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md transition-all duration-200 hover:-translate-y-1.5 hover:border-orange-500/40 hover:shadow-[0_16px_48px_rgba(0,0,0,0.55)] ${className ?? ""}`}
    >
      {/* ── Image Section ──────────────────────────────────────── */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#111113]">
        {/* Product image */}
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

        {/* Custom image overlay (e.g. "Ended" stamp) */}
        {imageOverlay}

        {/* Top-left: badge pill */}
        {badgeConfig && resolvedBadgeLabel && (
          <span
            className={`absolute left-2.5 top-2.5 z-10 rounded-full px-2 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-[0.04em] ${badgeConfig.className}`}
          >
            {resolvedBadgeLabel}
          </span>
        )}

        {/* Top-right: wishlist button */}
        <button
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={handleWishlist}
          className={`absolute right-2.5 top-2.5 z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#0d0d0f]/80 backdrop-blur-md transition-all duration-200 ${
            wishlisted ? "border border-orange-500/40" : "border border-white/10"
          } ${hovered ? "opacity-100" : "opacity-65"}`}
        >
          <HeartIcon filled={wishlisted} />
        </button>

        {/* Bottom overlay: "View details" slide-up */}
        <div
          role="button"
          tabIndex={0}
          onClick={onViewDetails}
          onKeyDown={(e) => e.key === "Enter" && onViewDetails?.()}
          className={`absolute inset-x-0 bottom-0 z-[11] flex cursor-pointer items-center justify-center gap-1.5 bg-[#0a0a0c]/90 py-2.5 backdrop-blur-sm transition-all duration-200 ${
            hovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          }`}
        >
          <span className="select-none text-[11px] font-semibold uppercase tracking-[0.04em] text-white/85">
            View details 👁
          </span>
        </div>
      </div>

      {/* ── Card Body ─────────────────────────────────────────── */}
      <div className="p-3.5">
        {/* Framework / category tags */}
        {tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-white/10 bg-white/[0.06] px-[7px] py-[3px] text-[10px] font-semibold uppercase leading-snug tracking-[0.04em] text-white/55"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="mb-2.5 line-clamp-2 text-[13px] font-semibold leading-snug tracking-[-0.01em] text-white">
          {title}
        </h3>

        {/* Author row */}
        <div className="mb-2.5 flex items-center gap-1.5">
          {/* Avatar */}
          {authorImage ? (
            <div className="relative h-[18px] w-[18px] flex-shrink-0 overflow-hidden rounded-full">
              <img
                src={authorImage}
                alt={author}
                sizes="18px"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div
              aria-hidden="true"
              className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-yellow-400 text-[7px] font-bold uppercase tracking-[0.02em] text-black"
            >
              {authorInitials.slice(0, 2)}
            </div>
          )}

          {/* Username */}
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-white/55">
            {author}
          </span>

          {/* Verified */}
          {verified && <VerifiedBadge />}
        </div>

        {/* Star rating */}
        <div className="mb-3">
          <StarRating rating={rating} count={reviewCount} label={reviewLabel} />
        </div>

        {/* Divider */}
        <div className="mb-3 h-px bg-white/10" />

        {/* Bottom row: price + action */}
        <div className="flex items-center justify-between gap-2">
          {/* Price */}
          <span className="flex-shrink-0 text-[17px] font-extrabold leading-none tracking-[-0.02em] text-orange-400">
            {price}
          </span>

          {/* Action button */}
          {customAction ?? (
            <button
              onClick={handleAddToCart}
              className={`whitespace-nowrap rounded-lg border border-orange-500/30 px-3 py-1.5 text-[11px] font-semibold leading-[1.2] tracking-[0.02em] text-orange-400 transition-all duration-150 ${
                cartPressed
                  ? "scale-[0.97] bg-orange-500/20"
                  : "scale-100 bg-orange-500/10 hover:bg-orange-500/20"
              }`}
            >
              Add to cart
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
