"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { useSession, signIn, signOut } from "next-auth/react"
import { ShoppingCart } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/componentss/ui/avatar"
import { getSessionUserProfilePicture } from "@/lib/user-utils"
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar"

export default function NavbarComponent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const [cartCount, setCartCount] = useState<number>(0)

  const userRoles = (session?.user as any)?.roles || []
  const hasAdminAccess =
    userRoles.includes("admin") ||
    userRoles.includes("founder") ||
    userRoles.includes("moderator")

  const fetchCartCount = async () => {
    try {
      const response = await fetch("/api/cart")
      if (!response.ok) {
        setCartCount(0)
        return
      }

      const data = await response.json()
      const count = Array.isArray(data.items)
        ? data.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0)
        : 0

      setCartCount(count)
    } catch (error) {
      setCartCount(0)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchCartCount()
    } else {
      setCartCount(0)
    }
  }, [status])

  useEffect(() => {
    const handleCartUpdated = () => {
      if (status === "authenticated") {
        fetchCartCount()
      }
    }

    window.addEventListener("cartUpdated", handleCartUpdated)
    return () => window.removeEventListener("cartUpdated", handleCartUpdated)
  }, [status])

  const navItems = [
    { name: "Home", link: "/" },
    { name: "Scripts", link: "/scripts" },
    { name: "Props", link: "/props" },
    { name: "Giveaways", link: "/giveaways" },
    { name: "Advertise", link: "/advertise" },
  ]

  // Custom logo component
  const CustomLogo = () => {
    return (
      <Link href="/" className="relative z-20 mr-4 flex items-center text-sm font-normal">
        <Image src="/CF.svg" alt="logo" width={60} height={60} />
        <motion.span
          className="text-orange-500 text-2xl font-bold"
          animate={{
            textShadow: [
              "0 0 10px rgba(249, 115, 22, 0.5)",
              "0 0 20px rgba(249, 115, 22, 0.8)",
              "0 0 10px rgba(249, 115, 22, 0.5)",
            ],
          }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          Five
        </motion.span>
        <motion.span
          className="text-yellow-400 text-2xl font-bold"
          animate={{
            textShadow: [
              "0 0 10px rgba(234, 179, 8, 0.5)",
              "0 0 20px rgba(234, 179, 8, 0.8)",
              "0 0 10px rgba(234, 179, 8, 0.5)",
            ],
          }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.5 }}
        >
          Crux
        </motion.span>
      </Link>
    )
  }

  return (
    <div className="relative w-full">
      <Navbar className="top-0 z-[60]">
        {/* Desktop Navigation */}
        <NavBody>
          <CustomLogo />
          <NavItems items={navItems} />
          <div className="flex items-center gap-2 ml-auto pl-6 flex-shrink-0">
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-700 transition hover:bg-gray-100 hover:text-orange-500 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-black">
                  {cartCount}
                </span>
              )}
            </Link>
            {status === "authenticated" ? (
              <>
                <Link href="/profile" className="block">
                  <Avatar className="h-9 w-9 ring-1 ring-gray-700/60">
                    <AvatarImage src={String(getSessionUserProfilePicture(session) || "")} alt={String(session?.user?.name || "User")} />
                    <AvatarFallback className="bg-gray-800 text-white text-sm">
                      {String(session?.user?.name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                {hasAdminAccess && (
                  <NavbarButton variant="secondary" className="text-white" href="/admin">
                    Admin
                  </NavbarButton>
                )}
                <NavbarButton
                  variant="secondary"
                  className="text-white"
                  as="button"
                  onClick={() => signOut()}
                >
                  Logout
                </NavbarButton>
              </>
            ) : (
              <NavbarButton
                variant="primary"
                as="button"
                onClick={() => signIn("discord")}
              >
                Login
              </NavbarButton>
            )}
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <CustomLogo />
            <div className="flex items-center gap-3">
              <Link
                href="/cart"
                aria-label="Cart"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-700 transition hover:bg-gray-100 hover:text-orange-500 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-black">
                    {cartCount}
                  </span>
                )}
              </Link>
              <MobileNavToggle
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              />
            </div>
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => (
              <Link
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative text-neutral-600 dark:text-neutral-300"
              >
                <span className="block">{item.name}</span>
              </Link>
            ))}

            {status === "authenticated" ? (
              <div className="flex w-full flex-col gap-4">
                <div className="flex items-center space-x-3 pb-4 border-b border-gray-700">
                  <Avatar className="h-10 w-10 ring-1 ring-gray-700/60">
                    <AvatarImage src={String(getSessionUserProfilePicture(session) || "")} alt={String(session?.user?.name || "User")} />
                    <AvatarFallback className="bg-gray-800 text-white text-sm">
                      {String(session?.user?.name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-neutral-600 dark:text-neutral-300 font-medium">{session?.user?.name}</p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">{session?.user?.email}</p>
                  </div>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="relative text-neutral-600 dark:text-neutral-300"
                >
                  <span className="block">Profile</span>
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="relative text-neutral-600 dark:text-neutral-300"
                >
                  <span className="block">Admin</span>
                </Link>
                <NavbarButton
                  onClick={() => {
                    signOut()
                    setIsMobileMenuOpen(false)
                  }}
                  variant="primary"
                  className="w-full"
                >
                  Logout
                </NavbarButton>
              </div>
            ) : (
              <NavbarButton
                onClick={() => {
                  signIn("discord")
                  setIsMobileMenuOpen(false)
                }}
                variant="primary"
                className="w-full"
              >
                Login with Discord
              </NavbarButton>
            )}
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  )
}
