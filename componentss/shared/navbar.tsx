"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession, signIn, signOut } from "next-auth/react"
import { ShoppingCart, Menu, X } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/componentss/ui/avatar"
import { getSessionUserProfilePicture } from "@/lib/user-utils"
import { useNavData } from "@/componentss/shared/nav-data-context"

// Product types that sit in the nav AFTER the (dynamic) script categories.
const STATIC_NAV: { name: string; link: string }[] = [
  { name: "Props", link: "/props" },
  { name: "Giveaways", link: "/giveaways" },
]

function mapCategories(list: any[]) {
  return list
    .filter((c: any) => c.isActive)
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((c: any) => ({ name: c.name, link: `/scripts?category=${encodeURIComponent(c.slug)}` }))
}

export default function NavbarComponent() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  // Server-fetched once per route-group layout — skips the client round-trip
  // (and the visible "categories pop in late" flash) on every page load.
  const { categories: serverCategories } = useNavData()

  const [cartCount, setCartCount] = useState<number>(0)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // ── browse categories, promoted to top-level nav links (no dropdown) ──
  // Dynamic (admin-managed) — add/rename a category and it appears here.
  const [cats, setCats] = useState<{ name: string; link: string }[]>(() =>
    Array.isArray(serverCategories) ? mapCategories(serverCategories) : []
  )
  useEffect(() => {
    // Layout already server-fetched these — no client round-trip needed.
    if (Array.isArray(serverCategories)) return
    let alive = true
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((d) => {
        if (!alive) return
        const list = Array.isArray(d?.categories) ? d.categories : []
        setCats(mapCategories(list))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [serverCategories])

  // Categories first, then a catch-all "Other" for scripts whose category
  // isn't one of the active DB categories, then the fixed product types.
  const navItems = [...cats, { name: "Other", link: "/scripts?category=other" }, ...STATIC_NAV]

  const userRoles = (session?.user as any)?.roles || []
  const hasAdminAccess = ["admin", "founder", "moderator"].some((r) => userRoles.includes(r))

  // ── cart count (unchanged behaviour) ───────────────────────────────
  const fetchCartCount = async () => {
    try {
      const response = await fetch("/api/cart")
      if (!response.ok) return setCartCount(0)
      const data = await response.json()
      const count = Array.isArray(data.items)
        ? data.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0)
        : 0
      setCartCount(count)
    } catch {
      setCartCount(0)
    }
  }

  useEffect(() => {
    if (status === "authenticated") fetchCartCount()
    else setCartCount(0)
  }, [status])

  useEffect(() => {
    const onCartUpdated = () => {
      if (status === "authenticated") fetchCartCount()
    }
    window.addEventListener("cartUpdated", onCartUpdated)
    return () => window.removeEventListener("cartUpdated", onCartUpdated)
  }, [status])

  // ── scroll → solidify bar ──────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const isActive = (link: string) =>
    link === "/" ? pathname === "/" : pathname.startsWith(link)

  // ── logo (brand mark — preserved) ──────────────────────────────────
  const Logo = ({ onClick }: { onClick?: () => void }) => (
    <Link
      href="/"
      onClick={onClick}
      aria-label="FiveCrux home"
      className="relative z-20 flex items-center"
    >
      <Image src="/fivecrux-logo.png" alt="FiveCrux" width={142} height={34} priority />
    </Link>
  )

  return (
    <>
      {/* spacer offsets the fixed bar so content never hides behind it */}
      <div aria-hidden className="h-[68px]" />

      <header
        className={`fixed inset-x-0 top-0 z-[60] border-b transition-colors duration-300 ${
          scrolled
            ? "border-white/[0.08] bg-[#0a0a0a]/95 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md"
            : "border-white/[0.05] bg-[#0a0a0a]/80 backdrop-blur"
        }`}
      >
        <div className="flex h-[68px] w-full items-center gap-7 px-2.5">
          <Logo />

          {/* desktop nav */}
          <nav className="hidden items-center gap-5 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.link}
                className={`relative flex h-[68px] items-center text-sm font-medium transition-colors ${
                  isActive(item.link) ? "text-white" : "text-white/70 hover:text-white"
                }`}
              >
                {item.name}
                {isActive(item.link) && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-orange-500"
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* right cluster */}
          <div className="ml-auto flex items-center gap-2.5">
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-neutral-300 transition-all duration-200 hover:border-orange-500/40 hover:text-orange-400"
            >
              <ShoppingCart className="h-[18px] w-[18px]" />
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-black">
                  {cartCount}
                </span>
              )}
            </Link>

            {status === "loading" ? (
              <div className="hidden h-9 w-[84px] animate-pulse rounded-xl bg-white/[0.05] sm:block" />
            ) : status === "authenticated" ? (
              <div className="hidden items-center gap-2.5 sm:flex">
                {hasAdminAccess && (
                  <Link
                    href="/admin"
                    className="inline-flex h-9 items-center rounded-xl border border-white/[0.08] px-3.5 text-sm font-semibold text-white transition hover:border-white/20"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="inline-flex h-9 items-center rounded-xl border border-white/[0.08] px-3.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:text-white"
                >
                  Logout
                </button>
                <Link href="/profile" className="transition-transform duration-200 hover:-translate-y-0.5">
                  <Avatar className="h-9 w-9 ring-1 ring-orange-500/30 transition-all duration-200 hover:ring-orange-500/60">
                    <AvatarImage
                      src={String(getSessionUserProfilePicture(session) || "")}
                      alt={String(session?.user?.name || "User")}
                    />
                    <AvatarFallback className="bg-neutral-800 text-xs text-white">
                      {String(session?.user?.name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            ) : (
              <button
                onClick={() => signIn("discord")}
                className="hidden h-9 items-center rounded-xl bg-orange-500 px-4 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-orange-400 sm:inline-flex"
              >
                Login
              </button>
            )}

            {/* mobile toggle */}
            <button
              aria-label="Menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-white lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE menu ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-0 top-[68px] z-[60] border-b border-white/[0.08] bg-[#0a0a0a] px-5 pb-6 pt-2 lg:hidden"
            >
              <nav className="flex flex-col">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.link}
                    onClick={() => setMobileOpen(false)}
                    className={`border-b border-white/[0.05] py-3.5 text-base font-semibold ${
                      isActive(item.link) ? "text-orange-400" : "text-white/85"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>

              <div className="mt-5 flex flex-col gap-2.5">
                {status === "loading" ? (
                  <div className="h-11 w-full animate-pulse rounded-xl bg-white/[0.05]" />
                ) : status === "authenticated" ? (
                  <>
                    <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
                      <Avatar className="h-10 w-10 ring-1 ring-orange-500/30">
                        <AvatarImage
                          src={String(getSessionUserProfilePicture(session) || "")}
                          alt={String(session?.user?.name || "User")}
                        />
                        <AvatarFallback className="bg-neutral-800 text-sm text-white">
                          {String(session?.user?.name || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-200">{session?.user?.name}</p>
                        <p className="truncate text-sm text-neutral-400">{session?.user?.email}</p>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl border border-white/[0.08] py-2.5 text-center text-sm font-semibold text-white"
                    >
                      Profile
                    </Link>
                    {hasAdminAccess && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-xl border border-white/[0.08] py-2.5 text-center text-sm font-semibold text-white"
                      >
                        Admin
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        signOut()
                        setMobileOpen(false)
                      }}
                      className="rounded-xl bg-orange-500 py-2.5 text-center text-sm font-bold text-black"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      signIn("discord")
                      setMobileOpen(false)
                    }}
                    className="rounded-xl bg-orange-500 py-3 text-center text-sm font-bold text-black"
                  >
                    Login with Discord
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
