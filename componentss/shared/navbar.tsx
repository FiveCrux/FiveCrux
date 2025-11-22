"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useSession, signIn, signOut } from "next-auth/react"
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

  // Check if user has admin access (admin, founder, or moderator roles)
  const userRoles = (session?.user as any)?.roles || []
  const hasAdminAccess = userRoles.includes('admin') || userRoles.includes('founder') || userRoles.includes('moderator')
  const profilePictureUrl = getSessionUserProfilePicture(session)

  const navItems = [
    { name: "Home", link: "/" },
    { name: "Marketplace", link: "/scripts" },
    { name: "Giveaways", link: "/giveaways" },
    { name: "Advertise", link: "/advertise" },
  ]

  // Custom logo component
  const CustomLogo = () => {
    return (
      <Link href="/" className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal">
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
          Hub
        </motion.span>
      </Link>
    )
  }

  return (
    <div className="relative w-full">
      <Navbar className="top-0 z-30 mt-2">
        {/* Desktop Navigation */}
        <NavBody>
          <CustomLogo />
          <NavItems items={navItems} />
          <div className="flex items-center gap-2 ml-auto pl-6 flex-shrink-0">
            {status === "authenticated" ? (
              <>
                <Link href="/profile" className="block">
                  <Avatar className="h-9 w-9 ring-1 ring-gray-700/60">
                    <AvatarImage src={profilePictureUrl || ""} alt={String(session?.user?.name || "User")} />
                    <AvatarFallback className="bg-gray-800 text-white text-sm">
                      {String(session?.user?.name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                {hasAdminAccess && (
                  <NavbarButton variant="secondary" href="/admin">
                    Admin
                  </NavbarButton>
                )}
                <NavbarButton
                  variant="secondary"
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
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
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
                    <AvatarImage src={profilePictureUrl || ""} alt={String(session?.user?.name || "User")} />
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
                {hasAdminAccess && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="relative text-neutral-600 dark:text-neutral-300"
                  >
                    <span className="block">Admin</span>
                  </Link>
                )}
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