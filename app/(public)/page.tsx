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
  TrendingUp,
  Package,
  Code,
} from "lucide-react";
import { HexagonBackground } from "@/components/animate-ui/components/backgrounds/hexagon";
import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars";
import { cn } from "@/lib/utils";
import Footer from "@/componentss/shared/footer";
import Image from "next/image";
interface Stats {
  totalScripts: number;
  totalUsers: number;
  totalGiveaways: number;
  totalGiveawayValue: number;
  totalDevelopers: number;
  categoryCounts: Record<string, number>;
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { status } = useSession();
  const { resolvedTheme } = useTheme();
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const statsRef = useRef(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  const platformFeatures = [
    {
      title: "Lightning Fast",
      description: "Optimized scripts that won't slow down your server",
      icon: Zap,
      gradient: "from-orange-500 to-orange-600",
    },
    {
      title: "Secure & Tested",
      description: "All scripts are thoroughly tested and security reviewed",
      icon: Shield,
      gradient: "from-yellow-400 to-yellow-500",
    },
    {
      title: "Community Driven",
      description: "Built by developers, for developers in the FiveM community",
      icon: Users,
      gradient: "from-orange-500 to-red-500",
    },
    {
      title: "Premium Quality",
      description:
        "Only the highest quality scripts make it to our marketplace",
      icon: Star,
      gradient: "from-yellow-400 to-orange-500",
    },
  ];

  const script = [
    {
      id: "script-101",
      title: "Modern SaaS Landing Page",
      description:
        "A sleek, responsive SaaS landing page built with Next.js and Tailwind CSS. Includes pricing, testimonials, and hero animations.",
      image: "/images/saas-landing.jpg",
      framework: ["Next.js", "Tailwind", "Framer Motion"],
      price: 29,
    },
    {
      id: "script-102",
      title: "Restaurant Ordering App UI",
      description:
        "A beautiful mobile-first UI for food ordering with category filters, cart system, and product details.",
      image: "/images/food-app.jpg",
      framework: ["React", "Redux", "Tailwind"],
      price: 19,
    },
    {
      id: "script-103",
      title: "AI Chatbot Starter Kit",
      description:
        "A complete AI chat interface with streaming responses, markdown support, and message persistence.",
      image: "/images/ai-chatbot.jpg",
      framework: ["Next.js", "OpenAI", "TypeScript"],
      price: 39,
    },
    {
      id: "script-104",
      title: "E-commerce Admin Dashboard",
      description:
        "Feature-rich dashboard with charts, product management, order tracking, and dark/light mode support.",
      image: "/images/ecommerce-dashboard.jpg",
      framework: ["Next.js", "ShadCN UI", "Recharts"],
      price: 49,
    },
    {
      id: "script-105",
      title: "Portfolio Website Template",
      description:
        "A clean and minimal portfolio with animations, a blog section, and integrated contact form.",
      image: "/images/portfolio-template.jpg",
      framework: ["Next.js", "Tailwind", "MDX"],
      price: 15,
    },
  ];

  // Auto-scroll for script cards
  useEffect(() => {
    if (script.length <= 3 || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    let scrollPosition = 0;
    const scrollSpeed = 0.5; // pixels per frame

    const autoScroll = () => {
      scrollPosition += scrollSpeed;
      const maxScroll = container.scrollWidth - container.clientWidth;

      if (scrollPosition >= maxScroll) {
        scrollPosition = 0; // Reset to start for infinite loop
      }

      container.scrollLeft = scrollPosition;
    };

    const interval = setInterval(autoScroll, 16); // ~60fps

    return () => clearInterval(interval);
  }, [script.length]);

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
      <div className="min-h-screen bg-neutral-950 text-white overflow-hidden">
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
              "bg-neutral-950 dark:bg-neutral-950"
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
                      className="text-5xl md:text-8xl font-bold mb-6 leading-tight"
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
                      Marketplace
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
                        boxShadow: "0 25px 50px rgba(249, 115, 22, 0.4)",
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {status === "authenticated" ? (
                        <Link href="/scripts">
                          <Button
                            size="lg"
                            className="bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 hover:from-orange-600 hover:via-yellow-500 hover:to-orange-600 text-black font-bold px-10 py-4 text-xl rounded-full shadow-2xl transition-all duration-300"
                          >
                            Explore Scripts
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="lg"
                          className="bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 hover:from-orange-600 hover:via-yellow-500 hover:to-orange-600 text-black font-bold px-10 py-4 text-xl rounded-full shadow-2xl transition-all duration-300"
                          onClick={() => signIn("discord")}
                        >
                          Login to Explore
                        </Button>
                      )}
                    </motion.div>

                    <motion.div
                      whileHover={{
                        scale: 1.05,
                        boxShadow: "0 25px 50px rgba(249, 115, 22, 0.3)",
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link href="/scripts/submit">
                        <Button
                          size="lg"
                          variant="outline"
                          className="bg-transparent border-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500 hover:text-orange-500 px-10 py-4 text-xl rounded-full backdrop-blur-sm transition-all duration-300 flex items-center gap-2"
                        >
                          <Code className="h-5 w-5" />
                          Submit Script
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
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-center mb-12"
            >
              <Badge className="bg-gradient-to-r from-orange-500/20 to-yellow-400/20 text-orange-400 border-orange-500/30 mb-6 px-4 py-2 text-sm font-semibold">
                Featured Scripts
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center gap-3 justify-center">
                <Zap className="h-10 w-10 text-orange-500" />
                Featured Scripts
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Check out our most popular and featured scripts
              </p>
            </motion.div>

            {script.length > 3 ? (
              <div className="relative">
                <div
                  ref={scrollContainerRef}
                  className="overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory"
                  style={{ scrollBehavior: "smooth" }}
                >
                  <div className="flex gap-6">
                    {script.map((item, index) => (
                      <div
                        key={item.id}
                        className="group flex-shrink-0 snap-start"
                        style={{
                          width: "calc((100vw - 8rem) / 3)",
                          minWidth: "320px",
                          maxWidth: "400px",
                        }}
                      >
                        <Link href={`/script/${item.id}`}>
                          <Card className="bg-neutral-900 border-2 border-neutral-700/50 hover:border-orange-500 cursor-pointer h-full backdrop-blur-sm relative overflow-hidden shadow-2xl rounded-xl w-full">
                            {/* Image Section */}
                            <CardHeader className="p-0 overflow-hidden rounded-t-xl">
                              <Image
                                src={item.image || "/placeholder.jpg"}
                                alt={item.title}
                                width={400}
                                height={256}
                                className="object-cover w-full h-52"
                              />
                            </CardHeader>

                            {/* Content Section */}
                            <div className="flex flex-col flex-1">
                              <CardContent className="p-3 flex-1 space-y-2">
                                {/* Title */}
                                <CardTitle className="text-base font-bold text-white leading-tight line-clamp-2">
                                  {item.title}
                                </CardTitle>

                                {/* Description */}
                                <CardDescription className="text-neutral-400 text-xs leading-snug line-clamp-2">
                                  {item.description}
                                </CardDescription>

                                {/* Framework Badges */}
                                {item.framework &&
                                  item.framework.length > 0 && (
                                    <motion.div
                                      className="flex flex-wrap gap-1"
                                      initial={{ scale: 0, rotate: 180 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      transition={{
                                        delay: index * 0.05 + 0.1,
                                        type: "spring",
                                      }}
                                    >
                                      {item.framework.map((fw, idx) => (
                                        <motion.div
                                          key={idx}
                                          whileHover={{
                                            scale: 1.1,
                                            y: -2,
                                          }}
                                        >
                                          <Badge className="bg-neutral-800/95 text-white backdrop-blur-sm text-[10px] font-bold border border-neutral-600/50 rounded px-1.5 py-0.5 uppercase tracking-wide shadow-lg">
                                            <span className="mr-1 text-xs">
                                              •
                                            </span>
                                            {fw}
                                          </Badge>
                                        </motion.div>
                                      ))}
                                    </motion.div>
                                  )}

                                {/* Price */}
                                <CardDescription className="text-orange-500 text-xl font-bold pt-1">
                                  ${item.price}
                                </CardDescription>
                              </CardContent>
                            </div>
                          </Card>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {script.map((item, index) => (
                  <div key={item.id} className="group">
                    <Link href={`/script/${item.id}`}>
                      <Card className="bg-neutral-900 border-2 border-neutral-700/50 hover:border-orange-500 cursor-pointer h-full backdrop-blur-sm relative overflow-hidden shadow-2xl rounded-xl">
                        {/* Image Section */}
                        <CardHeader className="p-0 overflow-hidden rounded-t-xl">
                          <Image
                            src={item.image || "/placeholder.jpg"}
                            alt={item.title}
                            width={400}
                            height={256}
                            className="object-cover w-full h-52"
                          />
                        </CardHeader>

                        {/* Content Section */}
                        <div className="flex flex-col flex-1">
                          <CardContent className="p-3 flex-1 space-y-2">
                            {/* Title */}
                            <CardTitle className="text-base font-bold text-white leading-tight line-clamp-2">
                              {item.title}
                            </CardTitle>

                            {/* Description */}
                            <CardDescription className="text-neutral-400 text-xs leading-snug line-clamp-2">
                              {item.description}
                            </CardDescription>

                            {/* Framework Badges */}
                            {item.framework && item.framework.length > 0 && (
                              <motion.div
                                className="flex flex-wrap gap-1"
                                initial={{ scale: 0, rotate: 180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                  delay: index * 0.05 + 0.1,
                                  type: "spring",
                                }}
                              >
                                {item.framework.map((fw, idx) => (
                                  <motion.div
                                    key={idx}
                                    whileHover={{
                                      scale: 1.1,
                                      y: -2,
                                    }}
                                  >
                                    <Badge className="bg-neutral-800/95 text-white backdrop-blur-sm text-[10px] font-bold border border-neutral-600/50 rounded px-1.5 py-0.5 uppercase tracking-wide shadow-lg">
                                      <span className="mr-1 text-xs">•</span>
                                      {fw}
                                    </Badge>
                                  </motion.div>
                                ))}
                              </motion.div>
                            )}

                            {/* Price */}
                            <CardDescription className="text-orange-500 text-xl font-bold pt-1">
                              ${item.price}
                            </CardDescription>
                          </CardContent>

                          {/* Button Section */}
                          <div className="flex justify-center px-3 pb-3">
                            <Button
                              variant="outline"
                              className="w-full bg-white text-black hover:bg-orange-600 hover:text-white transition-colors duration-200 font-semibold text-xs py-1.5 h-auto"
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </div>
                ))}
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
                  FiveHub
                </span>
                ?
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                The most trusted marketplace for premium FiveM scripts and
                resources
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

        {/* Enhanced Stats Section */}
        <motion.section
          ref={statsRef}
          className=" px-4 sm:px-6 lg:px-8 relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={statsInView ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
        >
          {/* Background effects */}

          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
              initial={{ opacity: 0, y: 50 }}
              animate={statsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, staggerChildren: 0.1 }}
            >
              {[
                {
                  number: loading
                    ? "..."
                    : stats
                    ? `${stats.totalScripts}+`
                    : "0+",
                  label: "Premium Scripts",
                  icon: Package,
                  gradient: "from-orange-500 to-orange-600",
                },
                {
                  number: loading
                    ? "..."
                    : stats
                    ? `${stats.totalDevelopers}+`
                    : "0+",
                  label: "Trusted Developers",
                  icon: Code,
                  gradient: "from-yellow-400 to-yellow-500",
                },
                {
                  number: loading
                    ? "..."
                    : stats
                    ? `${Math.round(stats.totalUsers / 1000)}K+`
                    : "0+",
                  label: "Happy Customers",
                  icon: Users,
                  gradient: "from-orange-500 to-red-500",
                },
                {
                  number: loading
                    ? "..."
                    : stats && stats.totalGiveawayValue > 0
                    ? `$${Math.round(stats.totalGiveawayValue / 1000)}K+`
                    : "$0",
                  label: "Active Giveaways",
                  icon: TrendingUp,
                  gradient: "from-yellow-400 to-orange-500",
                },
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30, scale: 0.8 }}
                    animate={statsInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -10 }}
                    className="group"
                  >
                    <Card className="bg-neutral-900/40 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 backdrop-blur-sm h-full relative overflow-hidden">
                      <CardContent className="p-8 relative z-10">
                        <div
                          className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${stat.gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}
                        >
                          <Icon className="h-7 w-7 text-white" />
                        </div>
                        <motion.div
                          className="text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
                          animate={statsInView ? { scale: [1, 1.1, 1] } : {}}
                          transition={{
                            delay: index * 0.1 + 0.3,
                            duration: 0.5,
                          }}
                        >
                          {stat.number}
                        </motion.div>
                        <div className="text-gray-400 font-semibold text-sm group-hover:text-orange-400 transition-colors uppercase tracking-wider">
                          {stat.label}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8">
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-neutral-900/40 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 backdrop-blur-sm h-full relative overflow-hidden group">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-400/20 group-hover:from-orange-500/30 group-hover:to-yellow-400/30 transition-all duration-300">
                      <Zap className="h-6 w-6 text-orange-400" />
                    </div>
                    <CardTitle className="text-xl font-bold text-white">FiveCrux</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-gray-300 text-sm leading-relaxed">
                    FiveCrux is a platform that allows you to create and manage your
                    own server with ease and efficiency.
                  </CardDescription>
                </CardContent>
                <CardFooter className="pt-4">
                  <a 
                    href="https://fivecrux.net" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-500 font-semibold text-sm flex items-center gap-2 transition-colors"
                  >
                    Visit FiveCrux.net
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </CardFooter>
              </Card>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-neutral-900/40 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 backdrop-blur-sm h-full relative overflow-hidden group">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-400/20 group-hover:from-orange-500/30 group-hover:to-yellow-400/30 transition-all duration-300">
                      <Zap className="h-6 w-6 text-orange-400" />
                    </div>
                    <CardTitle className="text-xl font-bold text-white">FiveCrux</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-gray-300 text-sm leading-relaxed">
                    FiveCrux is a platform that allows you to create and manage your
                    own server with ease and efficiency.
                  </CardDescription>
                </CardContent>
                <CardFooter className="pt-4">
                  <a 
                    href="https://fivecrux.net" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-500 font-semibold text-sm flex items-center gap-2 transition-colors"
                  >
                    Visit FiveCrux.net
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </CardFooter>
              </Card>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-neutral-900/40 border-gray-700/50 hover:border-orange-500/50 transition-all duration-500 backdrop-blur-sm h-full relative overflow-hidden group">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-400/20 group-hover:from-orange-500/30 group-hover:to-yellow-400/30 transition-all duration-300">
                      <Zap className="h-6 w-6 text-orange-400" />
                    </div>
                    <CardTitle className="text-xl font-bold text-white">FiveCrux</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-gray-300 text-sm leading-relaxed">
                    FiveCrux is a platform that allows you to create and manage your
                    own server with ease and efficiency.
                  </CardDescription>
                </CardContent>
                <CardFooter className="pt-4">
                  <a 
                    href="https://fivecrux.net" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-500 font-semibold text-sm flex items-center gap-2 transition-colors"
                  >
                    Visit FiveCrux.net
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </CardFooter>
              </Card>
            </motion.div>
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

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              <Badge className="bg-gradient-to-r from-orange-500/20 to-yellow-400/20 text-orange-400 border-orange-500/30 mb-6 px-4 py-2 text-sm font-semibold">
                Get Started
              </Badge>
              <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
                Ready to{" "}
                <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  Transform
                </span>
                <br />
                Your Server?
              </h2>
              <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Join thousands of server owners who trust{" "}
                <span className="text-orange-400 font-semibold">FiveHub</span>{" "}
                for their premium script needs. Start building your dream server
                today!
              </p>
              <motion.div
                className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group"
                >
                  <Link href="/scripts">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 hover:from-orange-600 hover:via-yellow-500 hover:to-orange-600 text-black font-bold px-12 py-6 text-xl rounded-full shadow-2xl transition-all duration-300 flex items-center gap-3 group-hover:shadow-orange-500/50"
                    >
                      <Package className="h-6 w-6" />
                      Browse Scripts
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href="/scripts/submit">
                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-transparent border-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500 px-12 py-6 text-xl rounded-full backdrop-blur-sm transition-all duration-300"
                    >
                      Sell Your Scripts
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>
        <Footer />
      </div>
    </>
  );
}
