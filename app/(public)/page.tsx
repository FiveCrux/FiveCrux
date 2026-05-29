"use client";

import { useState, useRef, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  AnimatePresence,
} from "framer-motion";
import { Button } from "@/componentss/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/componentss/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/componentss/ui/accordion";
import { Badge } from "@/componentss/ui/badge";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import Navbar from "@/componentss/shared/navbar";
import {
  Zap,
  Shield,
  Users,
  Star,
  ArrowRight,
  Megaphone,
  Gift,
  MousePointerClick,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Footer from "@/componentss/shared/footer";
import Image from "next/image";
import { InfiniteMovingCards } from "@/componentss/ui/infinite-moving-cards";
import { LiquidBackground } from "@/components/ui/liquid-background";
import { TiltCard } from "@/components/ui/tilt-card";
import { ScrollCardStack } from "@/components/ui/scroll-stack";
import FeaturedScriptCard from "@/componentss/featured-scripts/featured-script-card";
interface Stats {
  totalScripts: number;
  totalUsers: number;
  totalGiveaways: number;
  totalGiveawayValue: number;
  totalDevelopers: number;
  categoryCounts: Record<string, number>;
}

interface Script {
  id: number;
  featuredScriptId?: number; // ID of the featured script entry for tracking
  title: string;
  description: string;
  cover_image?: string;
  framework?: string[];
  price: number;
  original_price?: number;
  currency_symbol?: string;
  free?: boolean;
  seller?: string;
  seller_name?: string;
  seller_image?: string;
  seller_roles?: string[];
}

// ─── Framer FAQs-inspired accordion item ────────────────────────────────────
function FAQItem({
  question,
  answer,
  index,
}: {
  question: string
  answer: string
  index: number
}) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", damping: 60, stiffness: 500, delay: index * 0.05 }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left px-6 py-5 rounded-[22px] transition-colors duration-200 group"
        style={{
          background: open ? "rgba(249,115,22,0.07)" : "transparent",
        }}
        aria-expanded={open}
      >
        <span className={`text-base font-semibold pr-4 transition-colors duration-200 ${open ? "text-orange-400" : "text-white"}`}>
          {question}
        </span>
        {/* Rotating icon — + when closed, × when open */}
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: "spring", damping: 60, stiffness: 500 }}
          className={`flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full text-lg font-light leading-none transition-colors duration-200 ${open ? "text-orange-400" : "text-white/40 group-hover:text-white/70"}`}
          style={{
            background: open ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.06)",
            border: open ? "1px solid rgba(249,115,22,0.25)" : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          +
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 60, stiffness: 500 }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm text-white/50 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuredScripts, setFeaturedScripts] = useState<Script[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const { status } = useSession();
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const statsRef = useRef(null);

  const { scrollYProgress } = useScroll();
  const heroInView = useInView(heroRef, { once: true });
  const featuresInView = useInView(featuresRef, { once: true });
  const statsInView = useInView(statsRef, { once: true });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Fetch dynamic stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const statsRes = await fetch("/api/stats", { cache: "no-store" });

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch featured scripts
  useEffect(() => {
    const fetchFeaturedScripts = async () => {
      try {
        setScriptsLoading(true);
        const response = await fetch("/api/featured-scripts?status=active", { cache: "no-store" });

        if (response.ok) {
          const data = await response.json();
          const featuredScriptsData = data.featuredScripts || [];
          // Map API response to match the expected format
          const mappedScripts: Script[] = featuredScriptsData.map((item: any) => ({
            id: item.scriptId,
            featuredScriptId: item.id, // Store the featured script ID for tracking
            title: item.scriptTitle || "",
            description: item.scriptDescription || "",
            cover_image: item.scriptCoverImage || "/placeholder.jpg",
            framework: Array.isArray(item.scriptFramework) ? item.scriptFramework : item.scriptFramework ? [item.scriptFramework] : [],
            price: item.scriptPrice || 0,
            original_price: item.scriptPrice || 0,
            currency_symbol: item.scriptCurrencySymbol || "$",
            free: item.scriptFree || false,
            seller: item.scriptSellerName || "",
            seller_name: item.scriptSellerName || "",
            seller_image: item.scriptSellerImage || null,
            seller_roles: item.scriptSellerRoles || null,
          }));

          // Shuffle the array to randomize starting position
          const shuffledScripts = [...mappedScripts].sort(() => Math.random() - 2);
          setFeaturedScripts(shuffledScripts);
        }
      } catch (error) {
        console.error("Error fetching featured scripts:", error);
      } finally {
        setScriptsLoading(false);
      }
    };

    fetchFeaturedScripts();
  }, []);

  const faqs = [
    {
      question: "How does publishing a script work?",
      answer: "Developers can submit their scripts through the developer panel. Each submission goes through a review process to ensure quality, security, and compatibility before being published.",
    },
    {
      question: "Who owns the script rights?",
      answer: "Developers retain full ownership of their scripts. FiveCrux only provides the platform for promotion."
    },
    {
      question: "Is there any publishing fee?",
      answer: "There is no upfront fee to publish scripts."
    },
    {
      question: "Can I host giveaways on FiveCrux?",
      answer: "Yes. Developers can create and publish giveaways to promote their scripts, gain visibility, and reach a wider FiveM audience."
    }
  ]
  const platformFeatures = [
    {
      title: "Community Driven",
      description: "Built by experienced FiveM developers, trusted and improved by the community.",
      icon: Users,
      gradient: "from-orange-500 to-orange-600",
    },
    {
      title: "Premium Quality",
      description: "Only top-tier scripts that meet our quality standards are listed on FiveCrux. ",
      icon: Star,
      gradient: "from-yellow-400 to-yellow-500",
    },
    {
      title: "Security Verified",
      description: "Every resource is manually reviewed",
      icon: Shield,
      gradient: "from-orange-500 to-red-500",
    },
    {
      title: "Maximum Reach",
      description:
        "Get your scripts discovered by thousands of FiveM server owners and communities worldwide.",
      icon: Megaphone,
      gradient: "from-yellow-400 to-orange-500",
    },
  ];


  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `,
        }}
      />
      <div className="min-h-screen text-white overflow-x-clip">
        <Navbar />

        {/* ── Hero Section ── */}
        <motion.section
          ref={heroRef}
          className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden"
          style={{ y, opacity }}
        >
          {/* Dark base */}
          <div className="absolute inset-0 bg-[#0e0e0e]" />

          {/* Animated liquid blobs */}
          <LiquidBackground opacity={0.9} />

          {/* Fine noise texture for depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
              opacity: 0.04,
              mixBlendMode: "overlay",
            }}
          />

          {/* Bottom fade to page bg */}
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#131313] to-transparent pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <AnimatePresence>
              {heroInView && (
                <>
                  {/* Eyebrow badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.6 }}
                    className="mb-8 flex justify-center"
                  >
                    <span
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold text-white/80"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                      The #1 FiveM Marketplace & Giveaway Platform
                    </span>
                  </motion.div>

                  {/* Headline — white, no gradient */}
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.7, delay: 0.1 }}
                    className="mb-6"
                  >
                    <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight text-white">
                      Premium FiveM
                      <br />
                      <span className="text-orange-400">Scripts</span>
                      {" & "}
                      <span className="text-yellow-300">Giveaways</span>
                    </h1>
                  </motion.div>

                  {/* Sub-headline */}
                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.7, delay: 0.22 }}
                    className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed font-normal"
                  >
                    Discover high-quality scripts, enter amazing giveaways, and
                    grow your FiveM server — all in one place.
                  </motion.p>

                  {/* CTA buttons — pill style matching navbar */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.7, delay: 0.34 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                  >
                    {/* Primary — solid orange pill */}
                    <Link href="/scripts">
                      <motion.button
                        whileHover={{ scale: 1.04, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full text-base font-semibold text-white transition-all duration-200 cursor-pointer"
                        style={{
                          background: "rgba(249,115,22,1)",
                          boxShadow: "0 0 0 1px rgba(249,115,22,0.5), 0 4px 24px rgba(249,115,22,0.45)",
                        }}
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Explore Marketplace
                      </motion.button>
                    </Link>

                    {/* Secondary — glass pill */}
                    <Link href="/giveaways">
                      <motion.button
                        whileHover={{ scale: 1.04, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full text-base font-semibold text-white transition-all duration-200 cursor-pointer"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.18)",
                          backdropFilter: "blur(12px)",
                          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                        }}
                      >
                        <Gift className="h-4 w-4" />
                        Explore Giveaways
                      </motion.button>
                    </Link>
                  </motion.div>

                  {/* Trust strip */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.7 }}
                    className="mt-16 flex flex-wrap items-center justify-center gap-6 text-sm text-white/35"
                  >
                    <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-yellow-400/70" />Premium Quality</span>
                    <span className="h-3 w-px bg-white/10" />
                    <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-orange-400/70" />Security Verified</span>
                    <span className="h-3 w-px bg-white/10" />
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-white/50" />Community Driven</span>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Featured scripts Section */}
        <motion.section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-center mb-12"
            >
              <Badge className="bg-gradient-to-r from-orange-500/20 to-yellow-400/20 text-orange-400 border-orange-500/30 mb-6 px-4 py-2 text-sm font-semibold">
                Featured Scripts
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center gap-0 justify-center sm:gap-3">
                <Zap className="h-10 w-10 text-orange-500" />
                Featured Scripts
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Check out our most popular and featured scripts
              </p>
            </motion.div>

            {scriptsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-neutral-900 border-2 border-neutral-700/50 rounded-xl h-96 animate-pulse" />
                ))}
              </div>
            ) : featuredScripts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.7 }}
                className="flex flex-col items-center justify-center py-20 px-4"
              >
                {/* Glassy card */}
                <div
                  className="relative flex flex-col items-center gap-6 rounded-2xl px-10 py-6 w-full overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(16px)",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(249,115,22,0.08)",
                  }}
                >
                  {/* Subtle orange glow behind icon */}
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse at center, rgba(249,115,22,0.18) 0%, transparent 70%)",
                    }}
                  />

                  {/* Animated icon */}
                  <motion.div
                    animate={{
                      scale: [1, 1.12, 1],
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{
                      background: "rgba(249,115,22,0.12)",
                      border: "1px solid rgba(249,115,22,0.25)",
                      boxShadow: "0 0 20px rgba(249,115,22,0.2)",
                    }}
                  >
                    <Zap className="h-8 w-8 text-orange-400" />
                  </motion.div>

                  {/* Heading with shimmer */}
                  <motion.h3
                    className="relative z-10 text-xl font-bold text-white text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, type: "spring", bounce: 0, duration: 0.6 }}
                  >
                    No Featured Scripts Yet
                  </motion.h3>

                  {/* Sub-text */}
                  <motion.p
                    className="relative z-10 text-sm text-white/45 text-center leading-relaxed max-w-xs"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, type: "spring", bounce: 0, duration: 0.6 }}
                  >
                    Featured scripts will appear here once developers promote their work. Check back soon!
                  </motion.p>

                  {/* CTA */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, type: "spring", bounce: 0, duration: 0.6 }}
                  >
                    <Link href="/scripts">
                      <motion.button
                        whileHover={{ scale: 1.04, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white cursor-pointer transition-all duration-200"
                        style={{
                          background: "rgba(249,115,22,0.9)",
                          boxShadow: "0 0 0 1px rgba(249,115,22,0.4), 0 4px 16px rgba(249,115,22,0.35)",
                        }}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Browse All Scripts
                      </motion.button>
                    </Link>
                  </motion.div>

                  {/* Animated dots row */}
                  <div className="flex gap-2">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-orange-400/40"
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay, ease: "easeInOut" }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : featuredScripts.length > 3 ? (
              <InfiniteMovingCards
                items={featuredScripts}
                direction="left"
                speed="fast"
                pauseOnHover={true}
                className="max-w-7xl"
                renderItem={(item, index) => (
                  <FeaturedScriptCard
                    item={item}
                    index={index}
                    style={{
                      width: "calc((100vw - 8rem) / 3)",
                      minWidth: "320px",
                      maxWidth: "400px",
                    }}
                  />
                )}
              />
            ) : (
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex md:grid md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-6 min-w-max md:min-w-0">
                  {featuredScripts.map((item, index) => (
                    <FeaturedScriptCard
                      key={item.id}
                      item={item}
                      index={index}
                      className="flex-shrink-0 w-[320px] md:w-auto"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* Platform Features Section */}
        <motion.section
          ref={featuresRef}
          className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={featuresInView ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
        >
          {/* Background decoration */}

          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={featuresInView ? { opacity: 1, y: 0 } : {}}
              transition={{ type: "spring", bounce: 0, duration: 0.7 }}
              className="text-center mb-16"
            >
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold text-white/70 mb-6"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                Why Choose Us
              </span>
              <h2 className="text-5xl md:text-6xl font-extrabold text-white mt-4 mb-5 tracking-tight">
                Why Choose{" "}
                <span className="text-orange-400">FiveCrux</span>?
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
                The most trusted marketplace and giveaway platform for premium FiveM scripts and resources
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {platformFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 40 }}
                    animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ type: "spring", bounce: 0, duration: 0.6, delay: index * 0.08 }}
                  >
                    <TiltCard
                      className="h-full rounded-2xl cursor-pointer"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      {/* Inner glow on hover via group */}
                      <div className="group relative h-full p-8 flex flex-col items-center text-center rounded-2xl transition-all duration-300 hover:bg-white/[0.02]">
                        {/* Spotlight */}
                        <div
                          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                          style={{
                            background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(249,115,22,0.12) 0%, transparent 70%)",
                          }}
                        />
                        <div
                          className="relative z-10 inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6"
                          style={{
                            background: "rgba(249,115,22,0.1)",
                            border: "1px solid rgba(249,115,22,0.2)",
                            boxShadow: "0 0 16px rgba(249,115,22,0.15)",
                          }}
                        >
                          <Icon className="h-7 w-7 text-orange-400" />
                        </div>
                        <h3 className="relative z-10 text-white font-bold text-lg mb-2">
                          {feature.title}
                        </h3>
                        <p className="relative z-10 text-white/45 text-sm leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </TiltCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>



        {/*Our Services Section*/}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", bounce: 0, duration: 0.7 }}
        >
          <div className="max-w-7xl mx-auto relative z-10 py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold text-white/70 mb-6"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              Our Services
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 text-center tracking-tight">
              Powered by the <span className="text-orange-400">Crux</span> Ecosystem
            </h2>
            <p className="text-white/45 max-w-2xl mx-auto text-center text-base">
              Our other services that make FiveCrux possible
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto gap-6 px-8">
            {/* GameCrux */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", bounce: 0, duration: 0.6 }}
            >
              <a href="https://www.gamecrux.io/" target="_blank" rel="noopener noreferrer">
                <TiltCard
                  className="rounded-2xl overflow-hidden h-full cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  }}
                >
                  <div className="group relative flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-300 hover:bg-white/[0.02]">
                    {/* Orange spotlight on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249,115,22,0.10) 0%, transparent 70%)",
                      }}
                    />
                    {/* Top border accent */}
                    <div className="absolute top-0 inset-x-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(249,115,22,0.5), transparent)" }}
                    />
                    <div className="relative z-10 p-8 flex flex-col gap-5 h-full">
                      <div className="flex items-center gap-4">
                        <div
                          className="flex-shrink-0 p-2.5 rounded-xl"
                          style={{
                            background: "rgba(249,115,22,0.1)",
                            border: "1px solid rgba(249,115,22,0.2)",
                          }}
                        >
                          <Image src="/gamecrux.webp" alt="GameCrux" width={40} height={40} className="rounded-lg" />
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-xl">GameCrux</h3>
                          <p className="text-orange-400/70 text-xs font-medium uppercase tracking-wide">Gaming Platform</p>
                        </div>
                      </div>
                      <p className="text-white/45 text-sm leading-relaxed flex-1">
                        Discover, Play, and Enjoy a Curated Selection of Exciting Minigames. Dive into the ultimate experience with our comprehensive games.
                      </p>
                      <div className="flex items-center gap-1.5 text-orange-400 text-sm font-semibold group-hover:gap-2.5 transition-all duration-200">
                        Visit GameCrux
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </a>
            </motion.div>

            {/* Crux Studio */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", bounce: 0, duration: 0.6, delay: 0.1 }}
            >
              <a href="https://crux.tebex.io/" target="_blank" rel="noopener noreferrer">
                <TiltCard
                  className="rounded-2xl overflow-hidden h-full cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  }}
                >
                  <div className="group relative flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-300 hover:bg-white/[0.02]">
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249,115,22,0.10) 0%, transparent 70%)",
                      }}
                    />
                    <div className="absolute top-0 inset-x-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(249,115,22,0.5), transparent)" }}
                    />
                    <div className="relative z-10 p-8 flex flex-col gap-5 h-full">
                      <div className="flex items-center gap-4">
                        <div
                          className="flex-shrink-0 p-2.5 rounded-xl"
                          style={{
                            background: "rgba(249,115,22,0.1)",
                            border: "1px solid rgba(249,115,22,0.2)",
                          }}
                        >
                          <Image src="/cs.webp" alt="Crux Studio" width={40} height={40} className="rounded-lg" />
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-xl">Crux Studio</h3>
                          <p className="text-orange-400/70 text-xs font-medium uppercase tracking-wide">FiveM Marketplace</p>
                        </div>
                      </div>
                      <p className="text-white/45 text-sm leading-relaxed flex-1">
                        Premium FiveM Assets Marketplace. Creating high-quality products with passion and attention to detail to make your server even better.
                      </p>
                      <div className="flex items-center gap-1.5 text-orange-400 text-sm font-semibold group-hover:gap-2.5 transition-all duration-200">
                        Visit Crux Studio
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </a>
            </motion.div>
          </div>
        </motion.div>

        <ScrollCardStack />
        {/* FAQ Section */}
        <motion.section
          className="py-24 px-4 sm:px-6 lg:px-8"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", bounce: 0, duration: 0.7 }}
        >
          <div className="max-w-3xl mx-auto">
            {/* Section header */}
            <div className="text-center mb-12">
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold text-white/70 mb-6"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                FAQ
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mt-4 mb-4">
                Frequently Asked <span className="text-orange-400">Questions</span>
              </h2>
              <p className="text-white/45 text-base max-w-xl mx-auto">
                Everything you need to know about FiveCrux.
              </p>
            </div>

            {/* Framer-style FAQ accordion — glassy outer card, gap: 2px, padding: 4px, radius: 26px */}
            <motion.div
              className="flex flex-col w-full p-1"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "26px",
                gap: "2px",
              }}
            >
              {faqs.map((faq, index) => (
                <FAQItem key={index} index={index} question={faq.question} answer={faq.answer} />
              ))}
            </motion.div>
          </div>
        </motion.section>
        <Footer />
      </div>
    </>
  );
}
