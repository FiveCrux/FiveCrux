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
import { useTheme } from "next-themes";
import Navbar from "@/componentss/shared/navbar";
import {
  Zap,
  Shield,
  Users,
  Star,
  ArrowRight,
  Megaphone,
  Code,
  ClipboardCheck,
  MousePointerClick,
  CodeXmlIcon,
  ShoppingBag,
  Gift,
  HelpCircle
} from "lucide-react";
import { HexagonBackground } from "@/components/animate-ui/components/backgrounds/hexagon";
import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars";
import { cn } from "@/lib/utils";
import Footer from "@/componentss/shared/footer";
import Image from "next/image";
import { InfiniteMovingCards } from "@/componentss/ui/infinite-moving-cards";
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

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuredScripts, setFeaturedScripts] = useState<Script[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const { status } = useSession();
  const { resolvedTheme } = useTheme();
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
      <div className="min-h-screen text-white overflow-hidden">
        <Navbar />

        {/* Enhanced Hero Section */}
        <motion.section
          ref={heroRef}
          className="relative py-20 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center"
          style={{ y, opacity }}
        >
          {/* Stars Background */}
          <StarsBackground
            starColor={resolvedTheme === "dark" ? "#FFF" : "#000"}
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-xl",
              "bg-[#131313]"
            )}
          />
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <AnimatePresence>
              {heroInView && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-8"
                  >
                    {/* Badge pill */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 mb-6 text-xs font-semibold text-orange-400 uppercase tracking-widest backdrop-blur-sm"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                      </span>
                      FiveM&apos;s #1 Script Marketplace
                    </motion.div>

                    <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-[1.12] tracking-tight">
                      {/* Line 1 — word-by-word stagger */}
                      <motion.span
                        className="block"
                        initial="hidden"
                        animate="visible"
                        variants={{
                          visible: { transition: { staggerChildren: 0.09, delayChildren: 0.2 } },
                        }}
                      >
                        {["Premium", "FiveM"].map((word) => (
                          <motion.span
                            key={word}
                            className="inline-block mr-[0.3em] text-white"
                            variants={{
                              hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
                              visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 260, damping: 20 } },
                            }}
                          >
                            {word}
                          </motion.span>
                        ))}
                        {/* Gradient word */}
                        <motion.span
                          className="inline-block mr-[0.3em]"
                          style={{
                            background: "linear-gradient(90deg, #f97316, #eab308, #f97316)",
                            backgroundSize: "200% auto",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                          }}
                          animate={{ backgroundPosition: ["0% center", "200% center", "0% center"] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          variants={{
                            hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
                            visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 260, damping: 20, delay: 0.18 } },
                          }}
                        >
                          Marketplace
                        </motion.span>
                      </motion.span>

                      {/* Line 2 */}
                      <motion.span
                        className="block"
                        initial="hidden"
                        animate="visible"
                        variants={{
                          visible: { transition: { staggerChildren: 0.09, delayChildren: 0.5 } },
                        }}
                      >
                        {["&"].map((word) => (
                          <motion.span
                            key={word}
                            className="inline-block mr-[0.3em] text-neutral-400"
                            variants={{
                              hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
                              visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 220, damping: 22 } },
                            }}
                          >
                            {word}
                          </motion.span>
                        ))}
                        <motion.span
                          className="inline-block mr-[0.3em]"
                          style={{
                            background: "linear-gradient(90deg, #eab308, #f97316, #eab308)",
                            backgroundSize: "200% auto",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                          }}
                          animate={{ backgroundPosition: ["0% center", "200% center", "0% center"] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 0.5 }}
                          variants={{
                            hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
                            visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 220, damping: 22, delay: 0.1 } },
                          }}
                        >
                          Giveaway
                        </motion.span>
                        {["Platform"].map((word) => (
                          <motion.span
                            key={word}
                            className="inline-block mr-[0.3em] text-white"
                            variants={{
                              hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
                              visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 220, damping: 22, delay: 0.2 } },
                            }}
                          >
                            {word}
                          </motion.span>
                        ))}
                      </motion.span>
                    </h1>

                    {/* Animated underline glow */}
                    <motion.div
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ duration: 0.9, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
                      className="mx-auto mt-2 h-[3px] w-40 origin-left rounded-full"
                      style={{ background: "linear-gradient(90deg, #f97316, #eab308, transparent)" }}
                    />
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="text-lg md:text-xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed"
                  >
                    Discover the most advanced collection of high-quality
                    scripts for your FiveM server. Built by experts, trusted by
                    thousands. Plus enter amazing giveaways to win premium
                    content!
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                  >
                    {/* ── Primary CTA: Explore Marketplace ── */}
                    <motion.div
                      whileHover={{ scale: 1.04, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <Link href="/scripts">
                        <Button
                          size="lg"
                          className={cn(
                            "group relative overflow-hidden",
                            "bg-white text-black font-semibold",
                            "px-9 py-4 text-base rounded-xl",
                            "transition-all duration-300",
                            "flex items-center gap-2.5 hover:bg-neutral-100"
                          )}
                        >
                          <ShoppingBag className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                          Explore Marketplace
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    </motion.div>

                    {/* ── Secondary CTA: Explore Giveaways ── */}
                    <motion.div
                      whileHover={{ scale: 1.04, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <Link href="/giveaways">
                        <Button
                          size="lg"
                          variant="outline"
                          className={cn(
                            "group relative overflow-hidden",
                            "bg-white/10 backdrop-blur-md",
                            "border border-white/20 hover:border-white/40",
                            "text-white hover:bg-white/20",
                            "px-9 py-4 text-base rounded-xl font-semibold",
                            "transition-all duration-300",
                            "flex items-center gap-2.5"
                          )}
                        >
                          <Gift className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                          Explore Giveaways
                        </Button>
                      </Link>
                    </motion.div>
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
              <div className="text-center py-12">
                <p className="text-gray-400">No featured scripts available at the moment.</p>
              </div>
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
          className="py-32 px-4 sm:px-6 lg:px-8 relative"
          initial="hidden"
          animate={featuresInView ? "visible" : "hidden"}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
          }}
        >
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
              }}
              className="text-center mb-24"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 mb-6 backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">The Platform</span>
              </div>

              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                Why Choose <span className="text-orange-500">FiveCrux</span>?
              </h2>
              <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                The most trusted ecosystem for premium FiveM resources, engineered for performance and community growth.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {platformFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
                    }}
                    whileHover={{ y: -8 }}
                    className="group h-full"
                  >
                    <div className="relative h-full p-px rounded-2xl overflow-hidden bg-gradient-to-b from-white/10 to-transparent group-hover:from-orange-500/40 transition-colors duration-500">
                      <Card className="bg-[#0a0a0f]/80 border-0 backdrop-blur-xl h-full flex flex-col relative z-10">
                        <CardContent className="p-8 flex flex-col items-center text-center">
                          {/* Icon Container */}
                          <div className="relative mb-8">
                            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-500" />
                            <div className={cn(
                              "relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500",
                              "bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 group-hover:border-orange-500/50 group-hover:rotate-[10deg]"
                            )}>
                              <Icon className="h-7 w-7 text-neutral-400 group-hover:text-orange-500 transition-colors duration-300" />
                            </div>
                          </div>

                          <h3 className="text-white font-bold text-xl mb-4 group-hover:text-orange-500 transition-colors duration-300">
                            {feature.title}
                          </h3>
                          <p className="text-neutral-400 text-sm leading-relaxed group-hover:text-neutral-300 transition-colors duration-300">
                            {feature.description}
                          </p>

                          {/* Subtle arrow indicator */}
                          <div className="mt-auto pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-8 h-px bg-gradient-to-r from-orange-500 to-transparent" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>



        {/*Our Services Seciton*/}
        <motion.section
          className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
        >
          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
              }}
              className="text-center mb-20"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 mb-6 backdrop-blur-sm">
                <Zap className="h-3 w-3 text-orange-500" />
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Ecosystem</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                Our <span className="text-orange-500">Services</span>
              </h2>
              <p className="text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                Empowering the FiveM community through a specialized suite of premium services and platforms.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* GameCrux Card */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
                }}
                whileHover={{ y: -5 }}
                className="group"
              >
                <a href="https://www.gamecrux.io/" target="_blank" rel="noopener noreferrer" className="block h-full">
                  <div className="relative h-full p-px rounded-3xl overflow-hidden bg-gradient-to-b from-white/10 to-transparent group-hover:from-orange-500/40 transition-colors duration-500">
                    <Card className="bg-[#0a0a0f]/80 border-0 backdrop-blur-xl h-full relative z-10 overflow-hidden">
                      <CardHeader className="p-8 pb-4">
                        <div className="flex items-center gap-5">
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 p-2 group-hover:border-orange-500/50 transition-colors duration-300">
                              <Image src="/gamecrux.webp" alt="GameCrux" width={48} height={48} className="w-full h-full object-contain" />
                            </div>
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-bold text-white mb-1">GameCrux</CardTitle>
                            <div className="text-xs font-medium text-orange-500/80 uppercase tracking-widest">Minigames Platform</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-8 py-0">
                        <p className="text-neutral-400 text-sm leading-relaxed group-hover:text-neutral-300 transition-colors">
                          Discover, Play, and Enjoy a Curated Selection of Exciting Minigames. Dive into the ultimate experience with our comprehensive games ecosystem.
                        </p>
                      </CardContent>
                      <CardFooter className="p-8 pt-6 mt-auto">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white/50 group-hover:text-orange-400 transition-colors">
                          Launch Platform <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardFooter>
                    </Card>
                  </div>
                </a>
              </motion.div>

              {/* Crux Studio Card */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, x: 20 },
                  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
                }}
                whileHover={{ y: -5 }}
                className="group"
              >
                <a href="https://crux.tebex.io/" target="_blank" rel="noopener noreferrer" className="block h-full">
                  <div className="relative h-full p-px rounded-3xl overflow-hidden bg-gradient-to-b from-white/10 to-transparent group-hover:from-orange-500/40 transition-colors duration-500">
                    <Card className="bg-[#0a0a0f]/80 border-0 backdrop-blur-xl h-full relative z-10 overflow-hidden">
                      <CardHeader className="p-8 pb-4">
                        <div className="flex items-center gap-5">
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 p-2 group-hover:border-orange-500/50 transition-colors duration-300">
                              <Image src="/cs.webp" alt="Crux Studio" width={48} height={48} className="w-full h-full object-contain" />
                            </div>
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-bold text-white mb-1">Crux Studio</CardTitle>
                            <div className="text-xs font-medium text-orange-500/80 uppercase tracking-widest">Asset Marketplace</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-8 py-0">
                        <p className="text-neutral-400 text-sm leading-relaxed group-hover:text-neutral-300 transition-colors">
                          Premium FiveM Assets Marketplace. Creating high-quality products with passion and attention to detail to make your server even better.
                        </p>
                      </CardContent>
                      <CardFooter className="p-8 pt-6 mt-auto">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white/50 group-hover:text-orange-400 transition-colors">
                          Browse Store <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardFooter>
                    </Card>
                  </div>
                </a>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <motion.div className="max-w-7xl mx-auto mt-10 px-4 sm:px-6">
          <div className="relative h-64 sm:h-80 md:h-96 rounded-lg overflow-hidden">
            {/* Background Image */}
            <img
              src="/gtav_1.jpg"
              alt="FiveCrux"
              className="w-full h-full object-cover object-top opacity-60"
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/50 via-red-600/40 to-purple-900/60"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col md:flex-row items-center md:items-center justify-center md:justify-between px-4 sm:px-6 z-10 gap-4 md:gap-8">
              {/* Left Content */}
              <div className="max-w-xl flex flex-col items-start gap-3 md:gap-4">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">Publish Your Script</h2>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed text-left">
                  Every huge store starts with a great idea and yours could be next. Share published mods and get instant exposure. With us your scripts evolve alongside the community that loves it
                </p>
                {status === "authenticated" ? (
                  <Link href="/scripts/submit">
                    <button className="bg-white text-black font-bold px-6 sm:px-8 py-2 sm:py-3 text-base sm:text-lg shadow-lg rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2">
                      Submit Your Script <MousePointerClick className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </Link>
                ) : (
                  <button onClick={() => signIn("discord")} className="bg-white text-black font-bold px-6 sm:px-8 py-2 sm:py-3 text-base sm:text-lg shadow-lg rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2">
                    Submit Your Script <MousePointerClick className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                )
                }

              </div>

            </div>
          </div>
        </motion.div>

        <motion.div className="max-w-7xl mx-auto mt-10 px-4 sm:px-6">
          <div className="relative h-64 sm:h-80 md:h-96 rounded-lg overflow-hidden">
            {/* Background Image */}
            <img
              src="/gtav_2.jpg"
              alt="FiveCrux"
              className="w-full h-full object-cover object-top opacity-60"
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/50 via-red-600/40 to-purple-900/60"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col md:flex-row items-center md:items-center justify-center md:justify-between px-4 sm:px-6 z-10 gap-4 md:gap-8">
              {/* Left Content */}
              <div className="max-w-xl flex flex-col items-start gap-3 md:gap-4">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">Create Your Giveaway</h2>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed text-left">
                  Create and publish giveaways to promote your scripts and get instant exposure. With us your giveaways evolve alongside the community that loves it
                </p>
                {status === "authenticated" ? (
                  <Link href="/giveaways/create">
                    <button className="bg-white text-black font-bold px-6 sm:px-8 py-2 sm:py-3 text-base sm:text-lg shadow-lg rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2">
                      Create Your Giveaway <MousePointerClick className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </Link>
                ) : (
                  <button onClick={() => signIn("discord")} className="bg-white text-black font-bold px-6 sm:px-8 py-2 sm:py-3 text-base sm:text-lg shadow-lg rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2">
                    Create Your Giveaway <MousePointerClick className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                )}

              </div>

            </div>
          </div>
        </motion.div>
        {/* Call to Action Section */}
        <motion.section
          className="py-32 px-4 sm:px-6 lg:px-8 relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
        >
          <div className="max-w-4xl mx-auto relative z-10">
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
              }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 mb-6 backdrop-blur-sm">
                <HelpCircle className="h-3 w-3 text-orange-500" />
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Support</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Frequently Asked <span className="text-orange-500">Questions</span>
              </h2>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.3 } }
              }}
              className="space-y-4"
            >
              <Accordion type="single" collapsible className="w-full space-y-4">
                {faqs.map((faq, index) => (
                  <motion.div
                    key={index}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
                    }}
                  >
                    <AccordionItem
                      value={`item-${index + 1}`}
                      className="border border-white/[0.08] bg-white/[0.02] rounded-2xl px-6 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:bg-white/[0.04] hover:border-white/20 data-[state=open]:bg-white/[0.05] data-[state=open]:border-orange-500/30"
                    >
                      <AccordionTrigger className="text-lg md:text-xl font-semibold text-white/90 hover:no-underline py-6">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-neutral-400 text-base leading-relaxed pb-6">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </motion.section>
        <Footer />
      </div>
    </>
  );
}
