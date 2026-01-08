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
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="mb-8"
                  >
                    <motion.h1
                      className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
                      animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                      style={{
                        background:
                          "linear-gradient(45deg, #f97316, #eab308, #f59e0b, #fb923c, #f97316)",
                        backgroundSize: "400% 400%",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      Premium FiveM
                      <br />
                      Marketplace & <br />
                      Giveaway Platform
                    </motion.h1>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed"
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
                    <motion.div
                      whileHover={{
                        scale: 1.05,
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                        <Link href="/scripts">
                          <Button
                            size="lg"
                            className="bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 hover:from-orange-600 hover:via-yellow-500 hover:to-orange-600 text-black font-bold px-10 py-4 text-xl rounded-full shadow-2xl transition-all duration-300"
                          >
                            Explore Marketplace
                          </Button>
                        </Link>
                    </motion.div>

                    <motion.div
                      whileHover={{
                        scale: 1.05,
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link href="/giveaways">
                        <Button
                          size="lg"
                          variant="outline"
                          className="bg-transparent border-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500 hover:text-orange-500 px-10 py-4 text-xl rounded-full backdrop-blur-sm transition-all duration-300 flex items-center gap-2"
                        >
                          <Code className="h-5 w-5" />
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
              transition={{ duration: 1 }}
              className="text-center mb-20"
            >
              <Badge className="bg-gradient-to-r from-orange-500/20 to-yellow-400/20 text-orange-400 border-orange-500/30 mb-6 px-4 py-2 text-sm font-semibold">
                Why Choose Us
              </Badge>
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 bg-gradient-to-r from-white via-orange-200 to-yellow-200 bg-clip-text text-transparent">
                Why Choose{" "}
                <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
                  FiveCrux
                </span>
                ?
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                The most trusted marketplace and giveaway platform for premium FiveM scripts and resources
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {platformFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 50 }}
                    animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -10 }}
                    className="group"
                  >
                    <Card className="bg-neutral-900/40 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 backdrop-blur-sm h-full relative overflow-hidden">
                      <CardContent className="p-8 text-center relative z-10">
                        <div
                          className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`}
                        >
                          <Icon className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-white font-bold text-xl mb-3 group-hover:text-orange-400 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>



        {/*Our Services Seciton*/}
        <motion.div>
          <div className="max-w-7xl mx-auto relative z-10 py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
            <motion.div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center gap-3 justify-center">
                <Zap className="h-10 w-10 text-orange-500" />
                Our Services
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Our other services that made it possible to serve this website
                to you
              </p>
            </motion.div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 max-w-7xl mx-auto gap-6 px-8">
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.3 }}
            >

              <a
                href="https://www.gamecrux.io/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Card className="bg-neutral-900/40 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 backdrop-blur-sm h-full relative overflow-hidden group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-400/20 group-hover:from-orange-500/30 group-hover:to-yellow-400/30 transition-all duration-300">
                        <Image src="/gamecrux.webp" alt="GameCrux" width={48} height={48} />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">GameCrux</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-gray-300 text-sm leading-relaxed">
                      Discover, Play, and Enjoy a Curated Selection of Exciting Minigames <br />
                      Dive into the ultimate experience with our comprehensive games. Get started now!
                    </CardDescription>
                  </CardContent>
                  <CardFooter className="pt-4">
                    <div

                      className="text-orange-400 hover:text-orange-500 font-semibold text-sm flex items-center gap-2 transition-colors"
                    >
                      Visit GameCrux
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardFooter>
                </Card>
              </a>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <a
                href="https://crux.tebex.io/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Card className="bg-neutral-900/40 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 backdrop-blur-sm h-full relative overflow-hidden group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-400/20 group-hover:from-orange-500/30 group-hover:to-yellow-400/30 transition-all duration-300">
                        {/* <Zap className="h-6 w-6 text-orange-400" /> */}
                        <Image src="/cs.webp" alt="Crux Studio" width={48} height={48} />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">Crux Studio</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-gray-300 text-sm leading-relaxed">
                      Premium Fivem Assets Marketplace
                      <br />
                      Creating high-quality products with passion and attention to detail to make your server even better.
                    </CardDescription>
                  </CardContent>
                  <CardFooter className="pt-4">
                    <div
                      className="text-orange-400 hover:text-orange-500 font-semibold text-sm flex items-center gap-2 transition-colors"
                    >
                      Visit Crux Studio
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardFooter>
                </Card>
              </a>

            </motion.div>
          </div>
        </motion.div>

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
          className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {/* Background effects */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 align-middle justify-center">
            <h2 className="text-4xl font-bold mb-8">FAQs</h2>
            <Accordion type="single" collapsible>
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index + 1}`}>
                  <AccordionTrigger className="text-2xl">{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </motion.section>
        <Footer />
      </div>
    </>
  );
}
