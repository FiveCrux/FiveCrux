"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession, signIn, signOut } from "next-auth/react"
import { ShoppingCart, ChevronDown, Menu, X, ArrowRight } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/componentss/ui/avatar"
import { getSessionUserProfilePicture } from "@/lib/user-utils"
import { categoryIcon } from "@/lib/category-icons"

type Cat = {
  id: number
  name: string
  slug: string
  icon?: string | null
  appliesTo?: string
}

const NAV: { name: string; link: string; mega?: boolean }[] = [
  { name: "Home", link: "/" },
  { name: "Scripts", link: "/scripts", mega: true },
  { name: "Props", link: "/props" },
  { name: "Giveaways", link: "/giveaways" },
  { name: "Advertise", link: "/advertise" },
]

export default function NavbarComponent() {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  const [cartCount, setCartCount] = useState<number>(0)
  const [scrolled, setScrolled] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cats, setCats] = useState<Cat[]>([])
  const megaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // ── categories for the Scripts mega-menu (lazy + once) ─────────────
  // Don't fetch on every page mount — only the first time the user actually
  // opens the mega-menu or the mobile menu. The route is CDN-cached (60s) so
  // repeat opens are free.
  const catsLoaded = useRef(false)
  const loadCats = () => {
    if (catsLoaded.current) return
    catsLoaded.current = true
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((d) => setCats(Array.isArray(d?.categories) ? d.categories : []))
      .catch(() => {
        catsLoaded.current = false // allow a retry on next open
      })
  }

  // categories usable from "Scripts" (scripts + both) — props has its own tab
  const scriptCats = cats.filter((c) => c.appliesTo !== "props").slice(0, 8)

  const openMega = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current)
    loadCats()
    setMegaOpen(true)
  }
  const closeMega = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current)
    megaTimer.current = setTimeout(() => setMegaOpen(false), 120)
  }

  const isActive = (link: string) =>
    link === "/" ? pathname === "/" : pathname.startsWith(link)

  // ── logo (brand mark — preserved) ──────────────────────────────────
  const Logo = ({ onClick }: { onClick?: () => void }) => (
    <Link
      href="/"
      onClick={onClick}
      className="relative z-20 flex items-center gap-1 text-sm font-normal"
    >
      <Image src="/CF.svg" alt="FiveCrux" width={42} height={42} priority />
      <span className="text-2xl font-extrabold tracking-tight text-orange-500">Five</span>
      <span className="text-2xl font-extrabold tracking-tight text-yellow-400">Crux</span>
    </Link>
  )

  return (
    <>
      {/* spacer offsets the fixed bar so content never hides behind it */}
      <div aria-hidden className="h-[68px]" />

      <header
        className={`fixed inset-x-0 top-0 z-[60] border-b transition-colors duration-300 ${
          scrolled || megaOpen
            ? "border-white/[0.08] bg-[#0a0a0a]/95 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md"
            : "border-white/[0.05] bg-[#0a0a0a]/80 backdrop-blur"
        }`}
        onMouseLeave={closeMega}
      >
        <div className="flex h-[68px] w-full items-center gap-7 px-2.5">
          <Logo />

          {/* desktop nav */}
          <nav className="hidden items-center gap-6 lg:flex">
            {NAV.map((item) =>
              item.mega ? (
                <div
                  key={item.name}
                  className="flex h-[68px] items-center"
                  onMouseEnter={openMega}
                >
                  <Link
                    href={item.link}
                    className={`group relative flex h-[68px] items-center gap-1 text-sm font-medium transition-colors ${
                      isActive(item.link) || megaOpen ? "text-white" : "text-white/70 hover:text-white"
                    }`}
                  >
                    {item.name}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        megaOpen ? "rotate-180 text-orange-400" : ""
                      }`}
                    />
                    {(isActive(item.link) || megaOpen) && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-orange-500"
                      />
                    )}
                  </Link>
                </div>
              ) : (
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
              )
            )}
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

            {status === "authenticated" ? (
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
              onClick={() => {
                if (!mobileOpen) loadCats()
                setMobileOpen((v) => !v)
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-white lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ── MEGA-MENU: browse Scripts by category ───────────────────── */}
        <AnimatePresence>
          {megaOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="absolute inset-x-0 top-full hidden border-b border-white/[0.08] bg-[#0c0c0d] shadow-[0_24px_50px_rgba(0,0,0,0.55)] lg:block"
              onMouseEnter={openMega}
              onMouseLeave={closeMega}
            >
              <div className="w-full px-2.5 py-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
                    Browse by category
                  </span>
                  <Link
                    href="/scripts"
                    onClick={closeMega}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 transition hover:text-orange-300"
                  >
                    All scripts <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {scriptCats.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                    {scriptCats.map((c) => {
                      const Icon = categoryIcon(c.icon)
                      return (
                        <Link
                          key={c.id}
                          href={`/scripts?category=${encodeURIComponent(c.slug)}`}
                          onClick={closeMega}
                          className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 transition-all hover:border-orange-500/40 hover:bg-white/[0.04]"
                        >
                          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-400 transition group-hover:bg-orange-500/20">
                            <Icon className="h-[18px] w-[18px]" />
                          </span>
                          <span className="truncate text-sm font-semibold text-white/90 group-hover:text-white">
                            {c.name}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <Link
                    href="/scripts"
                    onClick={closeMega}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white/85 transition hover:border-orange-500/40"
                  >
                    Browse all scripts <ArrowRight className="h-4 w-4 text-orange-400" />
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                {NAV.map((item) => (
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

              {scriptCats.length > 0 && (
                <div className="mt-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
                    Categories
                  </span>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {scriptCats.map((c) => (
                      <Link
                        key={c.id}
                        href={`/scripts?category=${encodeURIComponent(c.slug)}`}
                        onClick={() => setMobileOpen(false)}
                        className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white/80"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2.5">
                {status === "authenticated" ? (
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
