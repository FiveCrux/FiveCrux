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

const BADGE_STYLES: Record<BadgeVariant, { label: string; style: React.CSSProperties }> = {
  new: {
    label: "New",
    style: {
      background: "rgba(29,158,117,0.18)",
      color: "#1d9e75",
      border: "1px solid rgba(29,158,117,0.28)",
    },
  },
  sale: {
    label: "Sale",
    style: {
      background: "rgba(232,64,64,0.18)",
      color: "#e84040",
      border: "1px solid rgba(232,64,64,0.28)",
    },
  },
  standalone: {
    label: "Standalone",
    style: {
      background: "rgba(255,255,255,0.07)",
      color: "rgba(255,255,255,0.45)",
      border: "1px solid rgba(255,255,255,0.1)",
    },
  },
  featured: {
    label: "Featured",
    style: {
      background: "rgba(234,179,8,0.18)",
      color: "#ca8a04",
      border: "1px solid rgba(234,179,8,0.28)",
    },
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
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      <div style={{ display: "flex", gap: "2px" }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = rating >= star;
          const half = !filled && rating >= star - 0.5;
          return (
            <svg
              key={star}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill={filled ? "#f97316" : half ? "url(#halfGrad)" : "none"}
              stroke={filled || half ? "#f97316" : "rgba(255,255,255,0.2)"}
              strokeWidth="1.8"
              style={{ flexShrink: 0 }}
            >
              {half && (
                <defs>
                  <linearGradient id="halfGrad">
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              )}
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          );
        })}
      </div>
      <span
        style={{
          fontSize: "10px",
          color: "rgba(255,255,255,0.3)",
          fontWeight: 500,
          letterSpacing: "0.01em",
        }}
      >
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
      stroke={filled ? "#f97316" : "rgba(255,255,255,0.4)"}
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
      style={{ flexShrink: 0 }}
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
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#16161a",
        borderRadius: "14px",
        border: hovered
          ? "1px solid rgba(249,115,22,0.25)"
          : "1px solid rgba(255,255,255,0.07)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition:
          "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow: hovered
          ? "0 16px 48px rgba(0,0,0,0.55)"
          : "0 4px 24px rgba(0,0,0,0.35)",
        width: "100%",
        overflow: "hidden",
        cursor: "default",
        position: "relative",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* ── Image Section ──────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 10",
          background: "#111113",
          overflow: "hidden",
        }}
      >
        {/* Product image */}
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          style={{
            objectFit: "cover",
            transform: hovered ? "scale(1.04)" : "scale(1)",
            transition: "transform 0.35s ease",
          }}
        />

        {/* Vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(10,10,12,0.18) 0%, transparent 40%, rgba(10,10,12,0.45) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Custom image overlay (e.g. "Ended" stamp) */}
        {imageOverlay}

        {/* Top-left: badge pill */}
        {badgeConfig && resolvedBadgeLabel && (
          <span
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              padding: "3px 8px",
              borderRadius: "99px",
              lineHeight: 1,
              zIndex: 10,
              ...badgeConfig.style,
            }}
          >
            {resolvedBadgeLabel}
          </span>
        )}

        {/* Top-right: wishlist button */}
        <button
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={handleWishlist}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            background: "rgba(13,13,15,0.8)",
            border: wishlisted
              ? "1px solid rgba(249,115,22,0.35)"
              : "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "border-color 0.2s ease, opacity 0.2s ease",
            backdropFilter: "blur(6px)",
            opacity: hovered ? 1 : 0.65,
            zIndex: 10,
          }}
        >
          <HeartIcon filled={wishlisted} />
        </button>

        {/* Bottom overlay: "View details" slide-up */}
        <div
          role="button"
          tabIndex={0}
          onClick={onViewDetails}
          onKeyDown={(e) => e.key === "Enter" && onViewDetails?.()}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "rgba(10,10,12,0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "10px 0",
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateY(0)" : "translateY(4px)",
            transition: "opacity 0.22s ease, transform 0.22s ease",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
            zIndex: 11,
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              userSelect: "none",
            }}
          >
            View details 👁
          </span>
        </div>
      </div>

      {/* ── Card Body ─────────────────────────────────────────── */}
      <div style={{ padding: "14px 15px 15px" }}>

        {/* Framework / category tags */}
        {tags.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "5px",
              marginBottom: "8px",
            }}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "rgba(255,255,255,0.35)",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "3px 7px",
                  borderRadius: "5px",
                  lineHeight: 1.4,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#f0f0f2",
            margin: "0 0 10px",
            lineHeight: 1.4,
            letterSpacing: "-0.01em",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </h3>

        {/* Author row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            marginBottom: "9px",
          }}
        >
          {/* Avatar */}
          {authorImage ? (
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <img
                src={authorImage}
                alt={author}

                sizes="18px"
                style={{ objectFit: "cover" }}
              />
            </div>
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "7px",
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              {authorInitials.slice(0, 2)}
            </div>
          )}

          {/* Username */}
          <span
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.3)",
              fontWeight: 500,
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {author}
          </span>

          {/* Verified */}
          {verified && <VerifiedBadge />}
        </div>

        {/* Star rating */}
        <div style={{ marginBottom: "11px" }}>
          <StarRating rating={rating} count={reviewCount} label={reviewLabel} />
        </div>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background: "rgba(255,255,255,0.05)",
            margin: "0 0 12px",
          }}
        />

        {/* Bottom row: price + action */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          {/* Price */}
          <span
            style={{
              fontSize: "17px",
              fontWeight: 700,
              color: "#f97316",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {price}
          </span>

          {/* Action button */}
          {customAction ?? (
            <button
              onClick={handleAddToCart}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#f97316",
                background: cartPressed
                  ? "rgba(249,115,22,0.18)"
                  : "rgba(249,115,22,0.1)",
                border: "1px solid rgba(249,115,22,0.25)",
                borderRadius: "7px",
                padding: "6px 12px",
                cursor: "pointer",
                letterSpacing: "0.02em",
                transition: "background 0.15s ease, transform 0.15s ease",
                transform: cartPressed ? "scale(0.97)" : "scale(1)",
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              Add to cart
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
