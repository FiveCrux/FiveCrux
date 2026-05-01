"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";

// ── Home Section Components ──────────────────────────────────────────────────
import HeroSection from "@/componentss/home/HeroSection";
import FeaturedScriptsSection from "@/componentss/home/FeaturedScriptsSection";
import StatsBannerSection from "@/componentss/home/StatsBannerSection";
import PlatformFeaturesSection from "@/componentss/home/PlatformFeaturesSection";
import CTABannersSection from "@/componentss/home/CTABannersSection";
import ServicesSection from "@/componentss/home/ServicesSection";
import FAQSection from "@/componentss/home/FAQSection";

// ── Types ───────────────────────────────────────────────────────────────────
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
  featuredScriptId?: number;
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

// ── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [featuredScripts, setFeaturedScripts] = useState<Script[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);

  // ── Fetch stats ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (res.ok) setStats(await res.json());
      } catch (e) {
        console.error("Error fetching stats:", e);
      }
    };
    fetchStats();
  }, []);

  // ── Fetch featured scripts ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchFeaturedScripts = async () => {
      try {
        setScriptsLoading(true);
        const res = await fetch("/api/featured-scripts?status=active", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const mapped: Script[] = (data.featuredScripts || []).map(
            (item: any) => ({
              id: item.scriptId,
              featuredScriptId: item.id,
              title: item.scriptTitle || "",
              description: item.scriptDescription || "",
              cover_image: item.scriptCoverImage || "/placeholder.jpg",
              framework: Array.isArray(item.scriptFramework)
                ? item.scriptFramework
                : item.scriptFramework
                ? [item.scriptFramework]
                : [],
              price: item.scriptPrice || 0,
              original_price: item.scriptPrice || 0,
              currency_symbol: item.scriptCurrencySymbol || "$",
              free: item.scriptFree || false,
              seller: item.scriptSellerName || "",
              seller_name: item.scriptSellerName || "",
              seller_image: item.scriptSellerImage || null,
              seller_roles: item.scriptSellerRoles || null,
            })
          );
          setFeaturedScripts([...mapped].sort(() => Math.random() - 2));
        }
      } catch (e) {
        console.error("Error fetching featured scripts:", e);
      } finally {
        setScriptsLoading(false);
      }
    };
    fetchFeaturedScripts();
  }, []);

  // ── Hero stats row ─────────────────────────────────────────────────────────
  const heroStats = stats
    ? [
        {
          value:
            stats.totalScripts >= 1000
              ? `${(stats.totalScripts / 1000).toFixed(1)}k+`
              : `${stats.totalScripts}+`,
          label: "Scripts",
        },
        {
          value:
            stats.totalUsers >= 1000
              ? `${(stats.totalUsers / 1000).toFixed(1)}k+`
              : `${stats.totalUsers}+`,
          label: "Users",
        },
        {
          value:
            stats.totalGiveaways >= 1000
              ? `${(stats.totalGiveaways / 1000).toFixed(1)}k+`
              : `${stats.totalGiveaways}+`,
          label: "Giveaways",
        },
      ]
    : [];

  return (
    <div className="min-h-screen text-white overflow-hidden" style={{ background: "#000000" }}>
      <Navbar />

      {/* 1 — Hero with Three.js particle background */}
      <HeroSection stats={heroStats} />

      {/* 2 — Featured Scripts carousel */}
      <FeaturedScriptsSection scripts={featuredScripts} loading={scriptsLoading} />

      {/* 3 — Animated stats banner (placeholder values, replaced by live API) */}
      <StatsBannerSection liveStats={stats} />

      {/* 4 — Platform features with mouse-tilt cards */}
      <PlatformFeaturesSection />

      {/* 5 — CTA banners: Publish Script + Create Giveaway */}
      <CTABannersSection />

      {/* 6 — Services: GameCrux + Crux Studio */}
      <ServicesSection />

      {/* 7 — FAQ accordion */}
      <FAQSection />

      <Footer />
    </div>
  );
}
