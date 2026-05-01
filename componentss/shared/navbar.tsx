"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession, signIn, signOut } from "next-auth/react"
import { Avatar, AvatarImage, AvatarFallback } from "@/componentss/ui/avatar"
import { Button } from "@/componentss/ui/button"
import { getSessionUserProfilePicture } from "@/lib/user-utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/componentss/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/componentss/ui/accordion"
import {
  ArrowRight,
  Menu,
  ChevronDown,
  LayoutGrid,
  Upload,
  Gift,
  Megaphone,
  LogOut,
  Shield,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Nav Data ────────────────────────────────────────────────────────────────

const navItems = [
  { name: "Home", link: "/" },
  {
    name: "Marketplace",
    link: "/scripts",
    dropdown: [
      { name: "Browse Scripts", link: "/scripts", description: "Explore all available scripts", icon: LayoutGrid },
      { name: "Submit a Script", link: "/scripts/submit", description: "Share your own creation", icon: Upload },
    ],
  },
  {
    name: "Giveaways",
    link: "/giveaways",
    dropdown: [
      { name: "Active Giveaways", link: "/giveaways", description: "Enter live giveaways now", icon: Gift },
    ],
  },
  { name: "Advertise", link: "/advertise", icon: Megaphone },
]

// ─── Variants ─────────────────────────────────────────────────────────────────

const navbarVariants = {
  top: {
    background: "rgba(0,0,0,0)",
    boxShadow: "0 0 0 0 rgba(0,0,0,0)",
    borderColor: "rgba(255,255,255,0)",
  },
  scrolled: {
    background: "rgba(5,5,10,0.82)",
    boxShadow: "0 4px 32px -4px rgba(0,0,0,0.55)",
    borderColor: "rgba(255,255,255,0.07)",
  },
}

const dropdownVariants = {
  hidden: { opacity: 0, y: -6, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -4, scale: 0.97, transition: { duration: 0.13, ease: "easeIn" } },
}

const itemVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.2 } }),
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1.5 flex-shrink-0 group">
      <motion.div
        whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <Image src="/CF.svg" alt="FiveCrux logo" width={40} height={40} priority />
      </motion.div>

      <span className="flex items-baseline gap-0.5 select-none">
        <motion.span
          className="text-orange-500 text-[1.15rem] font-extrabold tracking-tight leading-none"
          animate={{ textShadow: ["0 0 6px rgba(249,115,22,0.3)", "0 0 20px rgba(249,115,22,0.75)", "0 0 6px rgba(249,115,22,0.3)"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          Five
        </motion.span>
        <motion.span
          className="text-yellow-400 text-[1.15rem] font-extrabold tracking-tight leading-none"
          animate={{ textShadow: ["0 0 6px rgba(234,179,8,0.3)", "0 0 20px rgba(234,179,8,0.75)", "0 0 6px rgba(234,179,8,0.3)"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
        >
          Crux
        </motion.span>
      </span>
    </Link>
  )
}

// ─── Desktop Dropdown Item ────────────────────────────────────────────────────

function DropdownItem({
  sub,
  index,
  onClick,
}: {
  sub: { name: string; link: string; description: string; icon: any }
  index: number
  onClick: () => void
}) {
  const Icon = sub.icon
  return (
    <motion.li custom={index} variants={itemVariants} initial="hidden" animate="visible">
      <Link
        href={sub.link}
        onClick={onClick}
        className={cn(
          "group/item flex items-start gap-3 rounded-xl p-3 transition-all duration-200",
          "hover:bg-white/[0.06] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
        )}
      >
        <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 transition-colors duration-200 group-hover/item:bg-orange-500/20 group-hover/item:text-orange-300">
          <Icon size={15} />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-neutral-100 transition-colors duration-150 group-hover/item:text-white">
            {sub.name}
          </span>
          <span className="text-[11px] leading-tight text-neutral-500 group-hover/item:text-neutral-400">
            {sub.description}
          </span>
        </span>
      </Link>
    </motion.li>
  )
}

// ─── Desktop Nav Item ─────────────────────────────────────────────────────────

function DesktopNavItem({ item, pathname }: { item: (typeof navItems)[0]; pathname: string }) {
  const [open, setOpen] = useState(false)
  const isActive = pathname === item.link || (item.link !== "/" && pathname.startsWith(item.link))

  if (!item.dropdown?.length) {
    return (
      <Link
        href={item.link}
        className={cn(
          "relative px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
          isActive ? "text-white" : "text-neutral-400 hover:text-neutral-100"
        )}
      >
        {item.name}
        {isActive && (
          <motion.span
            layoutId="nav-active-pill"
            className="absolute inset-0 rounded-lg bg-white/[0.07] border border-white/10"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </Link>
    )
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 relative",
          isActive || open ? "text-white" : "text-neutral-400 hover:text-neutral-100"
        )}
      >
        {item.name}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={13} />
        </motion.span>
        {(isActive || open) && (
          <motion.span
            layoutId="nav-active-pill"
            className="absolute inset-0 rounded-lg bg-white/[0.07] border border-white/10"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "absolute left-1/2 top-[calc(100%+10px)] -translate-x-1/2 z-50",
              "w-72 rounded-2xl p-2",
              "bg-[#0d0d12]/90 backdrop-blur-2xl",
              "border border-white/[0.08]",
              "shadow-[0_20px_60px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)]"
            )}
          >
            {/* Glow accent */}
            <div className="pointer-events-none absolute -top-px left-1/2 h-[1px] w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

            <ul className="flex flex-col gap-0.5">
              {item.dropdown.map((sub, i) => (
                <DropdownItem
                  key={sub.name}
                  sub={sub as any}
                  index={i}
                  onClick={() => setOpen(false)}
                />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Auth Buttons ─────────────────────────────────────────────────────────────

function AuthSection({ session, status }: { session: any; status: string }) {
  const userRoles = (session?.user as any)?.roles || []
  const hasAdminAccess = userRoles.includes("admin")

  if (status === "loading") {
    return <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
  }

  if (status === "authenticated") {
    return (
      <div className="flex items-center gap-2">
        {hasAdminAccess && (
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button asChild size="sm" variant="ghost" className="text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 border border-orange-500/20">
              <Link href="/admin">
                <Shield size={12} className="mr-1" />
                Admin
              </Link>
            </Button>
          </motion.div>
        )}

        <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
          <Link href="/profile">
            <Avatar className="h-8 w-8 ring-2 ring-orange-500/30 ring-offset-1 ring-offset-black transition-all duration-200 hover:ring-orange-400/60">
              <AvatarImage src={String(getSessionUserProfilePicture(session) || "")} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-yellow-500 text-black text-xs font-bold">
                {String(session?.user?.name || "U")[0]}
              </AvatarFallback>
            </Avatar>
          </Link>
        </motion.div>

        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => signOut()}
            className="text-xs text-neutral-400 hover:text-white hover:bg-white/[0.07] gap-1.5"
          >
            <LogOut size={13} />
            Logout
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
      <Button
        onClick={() => signIn("discord")}
        className={cn(
          "relative h-8 px-4 text-sm font-semibold rounded-lg overflow-hidden",
          "bg-gradient-to-r from-orange-500 to-yellow-500 text-black",
          "shadow-[0_0_20px_-4px_rgba(249,115,22,0.5)]",
          "transition-all duration-300 hover:shadow-[0_0_28px_-2px_rgba(249,115,22,0.7)]",
          "hover:from-orange-400 hover:to-yellow-400"
        )}
      >
        Login
        <ArrowRight size={14} className="ml-1.5" />
      </Button>
    </motion.div>
  )
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export default function NavbarComponent() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close mobile on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none">
      <motion.nav
        variants={navbarVariants}
        animate={scrolled ? "scrolled" : "top"}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={cn(
          "pointer-events-auto w-full flex items-center justify-between gap-4",
          "border-b border-transparent px-6 md:px-12 lg:px-20",
          "transition-[padding] duration-300",
          scrolled ? "py-2.5" : "py-4"
        )}
        style={{ backdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none" }}
      >
        {/* Logo */}
        <Logo />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navItems.map((item) => (
            <DesktopNavItem key={item.name} item={item} pathname={pathname} />
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center">
          <AuthSection session={session} status={status} />
        </div>

        {/* Mobile Hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 rounded-lg bg-white/[0.06] border border-white/10 text-white hover:bg-white/10 hover:text-white"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={mobileOpen ? "close" : "open"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center"
                >
                  {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                </motion.span>
              </AnimatePresence>
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className={cn(
              "w-[300px] sm:w-[340px] p-0",
              "bg-[#08080d]/95 backdrop-blur-2xl text-white",
              "border-l border-white/[0.08]",
              "shadow-[-20px_0_60px_-12px_rgba(0,0,0,0.8)]"
            )}
          >
            {/* Mobile Header */}
            <SheetHeader className="px-5 py-4 border-b border-white/[0.06]">
              <SheetTitle className="flex items-center justify-between">
                <Logo />
              </SheetTitle>
            </SheetHeader>

            {/* Mobile Nav */}
            <div className="px-3 py-4 overflow-y-auto">
              <Accordion type="multiple" className="space-y-1">
                {navItems.map((item, i) =>
                  item.dropdown?.length ? (
                    <AccordionItem
                      key={item.name}
                      value={item.name}
                      className="border-0 rounded-xl overflow-hidden"
                    >
                      <AccordionTrigger
                        className={cn(
                          "px-4 py-2.5 text-sm font-medium rounded-xl transition-colors duration-150 hover:no-underline",
                          "text-neutral-300 hover:text-white hover:bg-white/[0.06] [&[data-state=open]]:text-white [&[data-state=open]]:bg-white/[0.06]"
                        )}
                      >
                        {item.name}
                      </AccordionTrigger>
                      <AccordionContent className="pb-1 px-2">
                        <ul className="flex flex-col gap-0.5 mt-1">
                          {item.dropdown.map((sub) => {
                            const Icon = (sub as any).icon
                            return (
                              <li key={sub.name}>
                                <Link
                                  href={sub.link}
                                  onClick={() => setMobileOpen(false)}
                                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-colors duration-150"
                                >
                                  {Icon && (
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 flex-shrink-0">
                                      <Icon size={13} />
                                    </span>
                                  )}
                                  <span className="flex flex-col">
                                    <span className="font-medium text-neutral-200">{sub.name}</span>
                                    <span className="text-[10px] text-neutral-600">{(sub as any).description}</span>
                                  </span>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ) : (
                    <motion.div
                      key={item.name}
                      custom={i}
                      variants={itemVariants}
                      initial={shouldReduceMotion ? "visible" : "hidden"}
                      animate="visible"
                    >
                      <Link
                        href={item.link}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150",
                          pathname === item.link
                            ? "text-white bg-white/[0.07] border border-white/10"
                            : "text-neutral-400 hover:text-white hover:bg-white/[0.05]"
                        )}
                      >
                        {item.name}
                      </Link>
                    </motion.div>
                  )
                )}
              </Accordion>
            </div>

            {/* Mobile Auth */}
            <div className="px-4 py-4 border-t border-white/[0.06] mt-auto">
              {status === "authenticated" ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl p-3 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-colors duration-150"
                  >
                    <Avatar className="h-9 w-9 ring-2 ring-orange-500/30">
                      <AvatarImage src={String(getSessionUserProfilePicture(session) || "")} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-yellow-500 text-black text-xs font-bold">
                        {String(session?.user?.name || "U")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">{session?.user?.name}</span>
                      <span className="text-xs text-neutral-500">View profile</span>
                    </div>
                  </Link>

                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-neutral-400 hover:text-white hover:bg-white/[0.05] text-sm"
                    onClick={() => { signOut(); setMobileOpen(false) }}
                  >
                    <LogOut size={14} />
                    Sign out
                  </Button>
                </div>
              ) : (
                <Button
                  className={cn(
                    "w-full gap-2 font-semibold text-sm",
                    "bg-gradient-to-r from-orange-500 to-yellow-500 text-black",
                    "shadow-[0_0_20px_-4px_rgba(249,115,22,0.5)] hover:shadow-[0_0_28px_-2px_rgba(249,115,22,0.7)]",
                    "transition-all duration-300"
                  )}
                  onClick={() => { signIn("discord"); setMobileOpen(false) }}
                >
                  Login with Discord
                  <ArrowRight size={14} />
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </motion.nav>
    </div>
  )
}