"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, User, Menu } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Input } from "@/componentss/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/componentss/ui/sheet"
import { Badge } from "@/componentss/ui/badge"
import Link from "next/link"
import { useSession, signIn, signOut } from "next-auth/react"
import { Avatar, AvatarImage, AvatarFallback } from "@/componentss/ui/avatar"

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { data: session, status } = useSession()

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="border-b border-gray-800/50 bg-black/20 backdrop-blur-xl sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div className="flex items-center" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/" className="text-2xl font-bold">
              <motion.span
                className="text-orange-500"
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
                className="text-yellow-400"
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
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {[
                { name: "Home", href: "/" },
                { name: "Marketplace", href: "/scripts" },
                { name: "Giveaways", href: "/giveaways" },
                { name: "Advertise", href: "/advertise" },
              ].map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                >
                  <Link
                    href={item.href}
                    className="text-white hover:text-orange-500 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 relative group"
                  >
                    {item.name}
                    <motion.div
                      className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-yellow-400 group-hover:w-full transition-all duration-300"
                      layoutId="navbar-indicator"
                    />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Search and Actions */}
          <motion.div
            className="hidden md:flex items-center space-x-4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            {/* <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-orange-500 transition-colors" />
              <Input
                type="search"
                placeholder="Search scripts..."
                className="pl-10 w-64 bg-gray-900/50 border-gray-700/50 text-white placeholder-gray-400 focus:border-orange-500 focus:bg-gray-900/80 backdrop-blur-sm transition-all duration-300"
              />
            </div> */}


            {status === "authenticated" ? (
              <div className="flex items-center gap-6">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/profile" className="block">
                    <Avatar className="h-9 w-9 ring-1 ring-gray-700/60">
                      <AvatarImage src={String((session?.user as any)?.image || "")} alt={String(session?.user?.name || "User")} />
                      <AvatarFallback className="bg-gray-800 text-white text-sm">
                        {String(session?.user?.name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-900/50 border-gray-700/50 text-white hover:bg-red-500 hover:border-red-500 backdrop-blur-sm transition-all duration-300"
                    onClick={() => signOut()}
                  >
                    Logout
                  </Button>
                </motion.div>
              </div>
            ) : (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="bg-gray-900/50 border-gray-700/50 text-white hover:bg-orange-500 hover:border-orange-500 backdrop-blur-sm transition-all duration-300"
                  onClick={() => signIn("discord")}
                >
                  Login with Discord
                </Button>
              </motion.div>
            )}
            {status === "authenticated" && (
              <Link href="/admin">
                <Button variant="outline" className="bg-gray-900/50 border-gray-700/50 text-white hover:bg-orange-500 hover:border-orange-500 backdrop-blur-sm transition-all duration-300">
                  Admin
                </Button>
              </Link>
            )}
          </motion.div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-gray-900/50 border-gray-700/50 text-white backdrop-blur-sm"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </motion.div>
              </SheetTrigger>
              <SheetContent side="right" className="bg-black/95 border-gray-800 backdrop-blur-xl">
                <motion.div
                  className="flex flex-col space-y-4 mt-8"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ staggerChildren: 0.1 }}
                >
                  {[
                    { name: "All Scripts", href: "/scripts" },
                    { name: "Giveaways", href: "/giveaways" },
                    { name: "Marketplace", href: "/marketplace" },
                    { name: "Support", href: "/support" },
                  ].map((item, index) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={item.href}
                        className="text-white hover:text-orange-500 px-3 py-2 text-lg font-medium transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}