"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import {
  User,
  Package,
  Gift,
  Edit,
  Trash2,
  Plus,
  Eye,
  Settings,
  Star,
  Calendar,
  DollarSign,
  Tag,
  Code,
  Sparkles,
  AlertCircle,
  Lock,
  MousePointer,
  Clock,
  LayoutDashboard,
  BadgeCheck,
  Trophy,
  Search,
} from "lucide-react";
import { Button } from "@/componentss/ui/button";
import { Input } from "@/componentss/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentss/ui/card";
import { Badge } from "@/componentss/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentss/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/componentss/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/componentss/ui/avatar";
import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import AdsForm from "@/componentss/ads/ads-form";
import ScriptSelectionPopup from "@/componentss/featured-scripts/script-selection-popup";
import CouponsTab from "@/componentss/profile/coupons-tab";
import CreatorCodesTab from "@/componentss/profile/creator-codes-tab";
import PropsTab from "@/componentss/profile/props-tab";
import {
  useUserScripts,
  useDeleteUserScript,
} from "@/hooks/use-scripts-queries";
import {
  useUserGiveaways,
  useDeleteUserGiveaway,
  useUserCreatorGiveawayEntries,
} from "@/hooks/use-giveaways-queries";
import {
  useUserAdvertisements,
  useUserFeaturedScriptSlots,
  useUserFeaturedScripts,
  useCreateFeaturedScript,
  useDeleteFeaturedScript,
} from "@/hooks/use-profile-queries";
import { toast } from "sonner";
import { getSessionUserProfilePicture } from "@/lib/user-utils";
import { useSession as useNextAuthSession } from "next-auth/react";
import { Camera, X, Megaphone, ShieldCheck, Store, BarChart3 } from "lucide-react";
import CreatorAnalytics from "@/componentss/profile/creator-analytics";
import SideBannersManager from "@/componentss/profile/side-banners-manager";
import AdDetailedAnalyticsModal from "@/componentss/profile/ad-detailed-analytics-modal";
import GetVerified from "@/componentss/profile/get-verified";
import GiveawayWinners from "@/componentss/profile/giveaway-winners";
import TebexStoreImporter from "@/componentss/profile/tebex-store-importer";
import AdvertisePanel from "@/componentss/advertise/advertise-panel";
import Link from "next/link";

interface Script {
  id: number;
  title: string;
  description: string;
  price: number;
  original_price?: number;
  currency?: string;
  currency_symbol?: string;
  category: string;
  framework?: string;
  seller_name: string;
  seller_email: string;
  seller_id?: string;
  tags: string[];
  features: string[];
  requirements: string[];
  images: string[];
  videos: string[];
  screenshots: string[];
  cover_image?: string;
  demo_url?: string;
  documentation_url?: string;
  support_url?: string;
  version: string;
  last_updated: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  featured: boolean;
  free?: boolean;
  created_at: string;
  updated_at: string;
}

interface Giveaway {
  id: number;
  title: string;
  description: string;
  total_value: string;
  category: string;
  end_date: string;
  max_entries?: number;
  featured: boolean;
  auto_announce: boolean;
  creator_name: string;
  creator_email: string;
  creator_id?: string;
  images: string[];
  videos: string[];
  cover_image?: string;
  tags: string[];
  rules: string[];
  status:
    | "active"
    | "ended"
    | "cancelled"
    | "pending"
    | "approved"
    | "rejected";
  entries_count: number;
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
  currency?: string;
  currency_symbol?: string;
}

interface Ad {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  link_url?: string;
  category: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  slot_unique_id?: string;
  priority: number;
  click_count?: number;
  view_count?: number;
  created_at: string;
  updated_at: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { update: updateSession } = useNextAuthSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  // Coupon access now also opens to any seller with an approved listing (not
  // just verified_creator/admin/founder) — that requires a DB check, so we
  // ask the coupons API itself rather than only inspecting the JWT roles.
  const [hasListingCouponAccess, setHasListingCouponAccess] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/coupons")
      .then((r) => {
        if (alive && r.ok) setHasListingCouponAccess(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Track which tabs have been visited for lazy loading
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set(["overview"])
  );

  // Fetch data using React Query. All queries still load once (the overview
  // tab needs every count), but only the ACTIVE tab keeps the 30s status
  // polling — so we don't run 5 background polls at once on every profile view.
  const {
    data: scriptsData,
    isLoading: scriptsLoading,
    refetch: refetchScripts,
  } = useUserScripts(
    100, // Get more items for now
    0,
    activeTab === "scripts"
  );

  const {
    data: giveawaysData,
    isLoading: giveawaysLoading,
    refetch: refetchGiveaways,
  } = useUserGiveaways(100, 0, activeTab === "giveaways");

  const {
    data: adsData,
    isLoading: adsLoading,
    refetch: refetchAds,
  } = useUserAdvertisements(100, 0, activeTab === "ad-slots");

  const {
    data: entriesData,
    isLoading: entriesLoading,
    refetch: refetchEntries,
  } = useUserCreatorGiveawayEntries(100, 0, activeTab === "entries");

  // Featured Scripts
  const { data: featuredScriptSlotsData, refetch: refetchFeaturedScriptSlots } =
    useUserFeaturedScriptSlots();
  const {
    data: featuredScriptsData,
    isLoading: featuredScriptsLoading,
    refetch: refetchFeaturedScripts,
  } = useUserFeaturedScripts(100, activeTab === "ad-slots");
  const createFeaturedScriptMutation = useCreateFeaturedScript();
  const deleteFeaturedScriptMutation = useDeleteFeaturedScript();

  // Mutations for delete operations
  const deleteScriptMutation = useDeleteUserScript();
  const deleteGiveawayMutation = useDeleteUserGiveaway();

  // Which purchased-slot type the consolidated "My Ad Slots" tab is showing.
  const [adSlotView, setAdSlotView] = useState<"ads" | "side-banners" | "featured">("ads");
  const AD_SLOT_VIEWS: { value: "ads" | "side-banners" | "featured"; label: string }[] = [
    { value: "ads", label: "Ads" },
    { value: "side-banners", label: "Side Banners" },
    { value: "featured", label: "Featured Assets" },
  ];

  const [showAdsForm, setShowAdsForm] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [drawingWinnersId, setDrawingWinnersId] = useState<number | null>(null);
  const [analyticsTarget, setAnalyticsTarget] = useState<{ adType: "ad" | "featured_script" | "side_banner"; adId: string | number; title: string } | null>(null);
  const [selectedSlotUniqueId, setSelectedSlotUniqueId] = useState<
    string | null
  >(null);

  // Featured Scripts state
  const [showScriptSelectionPopup, setShowScriptSelectionPopup] =
    useState(false);
  const [
    selectedFeaturedScriptSlotUniqueId,
    setSelectedFeaturedScriptSlotUniqueId,
  ] = useState<string | null>(null);
  // TODO: Fetch purchased slots from user data/API
  const [purchasedSlots, setPurchasedSlots] = useState(0); // This should come from user data
  const [availableSlotUniqueIds, setAvailableSlotUniqueIds] = useState<
    string[]
  >([]); // Available slot unique IDs

  const [scriptSearchQuery, setScriptSearchQuery] = useState("");
  const [scriptCategoryFilter, setScriptCategoryFilter] = useState("all");

  // Extract data from React Query responses
  const scripts = scriptsData?.scripts || [];
  const scriptsTotal = scriptsData?.total || 0;
  const scriptCategories = Array.from(
    new Set(scripts.map((s: any) => s.category).filter(Boolean))
  ) as string[];
  const filteredScripts = scripts.filter((script: any) => {
    const matchesCategory =
      scriptCategoryFilter === "all" || script.category === scriptCategoryFilter;
    const query = scriptSearchQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      script.title?.toLowerCase().includes(query) ||
      script.description?.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });
  const giveaways = giveawaysData?.giveaways || [];
  const giveawaysTotal = giveawaysData?.total || 0;
  const ads = adsData?.ads || [];
  const adsTotal = adsData?.total || 0;
  const giveawayEntries = entriesData?.entries || [];
  const entriesTotal = entriesData?.total || 0;

  // Featured Scripts data
  const featuredScripts = featuredScriptsData?.featuredScripts || [];
  const featuredScriptsTotal = featuredScriptsData?.total || 0;
  const purchasedFeaturedScriptSlots =
    featuredScriptSlotsData?.activeSlots || 0;
  const availableFeaturedScriptSlotUniqueIds =
    featuredScriptSlotsData?.availableUniqueIds || [];

  // Calculate slot availability. "Used" means actually occupying one of the
  // purchased slot_unique_ids (matches isAdSlotUniqueIdInUse's semantics,
  // which only checks pending/approved ads with a real slot attached) — not
  // just "any ad this user has ever submitted." A rejected ad, or an ad with
  // no slot attached, must not count against the purchased-slot total.
  const usedSlots = ads.filter(
    (ad: any) => ad.status !== "rejected" && !!(ad.slot_unique_id || ad.slotUniqueId)
  ).length;
  const availableSlots = Math.max(0, purchasedSlots - usedSlots);
  const totalSlots = 3; // Total slots available
  const lockedSlots = Math.max(0, totalSlots - purchasedSlots);

  // Calculate featured script slot availability
  const usedFeaturedScriptSlots = featuredScripts.length;
  const availableFeaturedScriptSlots = Math.max(
    0,
    purchasedFeaturedScriptSlots - usedFeaturedScriptSlots
  );
  const totalFeaturedScriptSlots = 3; // Total slots available
  const lockedFeaturedScriptSlots = Math.max(
    0,
    totalFeaturedScriptSlots - purchasedFeaturedScriptSlots
  );

  // Combined loading state
  const loading =
    scriptsLoading || giveawaysLoading || adsLoading || entriesLoading;

  const stats = {
    totalScripts: scriptsTotal,
    totalGiveaways: giveawaysTotal,
    totalAds: adsTotal,
    totalEntries: entriesTotal,
  };

  // Track tab visits for better UX
  useEffect(() => {
    if (status !== "authenticated") return;
    setVisitedTabs((prev) => new Set([...prev, activeTab]));
  }, [activeTab, status]);


  // Fetch active ad slots on component mount
  useEffect(() => {
    const fetchActiveSlots = async () => {
      if (!session?.user?.id || status !== "authenticated") return;

      // Abort the request after 8s so a slow/down API never blocks the slot UI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch("/api/user/ad-slots", {
          credentials: "include", // Important for session cookies
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          setPurchasedSlots(data.activeSlots || 0); // Uses activeSlots from one-time purchases

          // Get available unique IDs and filter out ones already used in ads
          const allUniqueIds = data.availableUniqueIds || [];
          const usedUniqueIds = new Set(
            ads.map((ad: Ad) => ad.slot_unique_id).filter(Boolean)
          );
          const available = allUniqueIds.filter(
            (id: string) => !usedUniqueIds.has(id)
          );
          setAvailableSlotUniqueIds(available);
        } else {
          // Do NOT default to 0 here — a failed fetch is not the same as
          // "you own zero slots". Overwriting a real purchased-slot count
          // with 0 on a transient error would show a paying customer's
          // active slot as "Locked". Leave the last-known-good value in
          // place and just log it.
          console.error("Failed to fetch active slots — keeping last known slot count");
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if ((error as any)?.name !== "AbortError") console.error("Error fetching active slots — keeping last known slot count:", error);
      }
    };

    fetchActiveSlots();
  }, [session?.user?.id, status, ads]); // Include ads in dependencies to update when ads change

  const handleEditScript = (scriptId: number) => {
    router.push(`/scripts/submit?edit=${scriptId}`);
  };

  const handleEditGiveaway = (giveawayId: number) => {
    router.push(`/profile/giveaways/${giveawayId}/edit`);
  };

  const handleEditAd = (adId: number) => {
    const ad = ads.find((a: any) => a.id === adId);
    if (ad) {
      setEditingAd(ad);
      setShowAdsForm(true);
    }
  };

  const handleDeleteScript = async (scriptId: number) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    deleteScriptMutation.mutate(scriptId);
  };

  const handleDeleteGiveaway = async (giveawayId: number) => {
    if (!confirm("Are you sure you want to delete this giveaway?")) return;
    deleteGiveawayMutation.mutate(giveawayId);
  };

  const handleDrawWinners = async (giveawayId: number) => {
    if (!confirm("Draw winners for this giveaway now? This can't be undone.")) return;
    setDrawingWinnersId(giveawayId);
    try {
      const res = await fetch(`/api/giveaways/${giveawayId}/draw-winners`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(
          data.announced ? "Winners drawn and announced on Discord!" : "Winners drawn!"
        );
        refetchGiveaways();
      } else {
        toast.error(data.error || "Failed to draw winners");
      }
    } catch {
      toast.error("Failed to draw winners");
    } finally {
      setDrawingWinnersId(null);
    }
  };

  const handleDeleteAd = async (adId: number) => {
    if (!confirm("Are you sure you want to delete this ad?")) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`/api/users/advertisements?id=${adId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        // Refetch ads to update the list
        refetchAds();
        toast.success("Ad deleted successfully!");
      } else {
        toast.error("Failed to delete ad");
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Error deleting ad:", error);
      toast.error("Error deleting ad");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "rejected":
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "ended":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const handleAdCreated = () => {
    // Refresh ads data after creating/updating an ad
    refetchAds();
    setEditingAd(null);
  };

  // Featured Scripts handlers
  const handleSelectScriptForFeature = async (scriptId: number) => {
    if (!selectedFeaturedScriptSlotUniqueId) return;

    try {
      await createFeaturedScriptMutation.mutateAsync({
        script_id: scriptId,
        slot_unique_id: selectedFeaturedScriptSlotUniqueId,
      });
      setShowScriptSelectionPopup(false);
      setSelectedFeaturedScriptSlotUniqueId(null);
      refetchFeaturedScripts();
      refetchFeaturedScriptSlots();
    } catch (error) {
      console.error("Error creating featured script:", error);
    }
  };

  const handleDeleteFeaturedScript = async (featuredScriptId: number) => {
    if (!confirm("Are you sure you want to delete this featured asset?"))
      return;
    deleteFeaturedScriptMutation.mutate(featuredScriptId);
  };

  const handleProfilePictureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingProfilePicture(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/user/profile-picture", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();
      toast.success("Profile picture updated successfully!");

      // Refresh session to get updated profile picture
      await updateSession();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Upload error:", error);
      toast.error(
        `Failed to upload profile picture: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setUploadingProfilePicture(false);
      // Reset input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!confirm("Are you sure you want to remove your profile picture?"))
      return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/user/profile-picture", {
        method: "DELETE",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to remove profile picture");
      }

      toast.success("Profile picture removed successfully!");

      // Refresh session to get updated profile picture
      await updateSession();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Remove error:", error);
      toast.error("Failed to remove profile picture");
    }
  };

  const profilePictureUrl = getSessionUserProfilePicture(session);
  // Coupons are managed by founders/admins, verified creators, and any seller
  // with an approved listing. Creators' coupons are self-scoped server-side
  // (their own products only) — see lib/coupon-access.ts + validateCoupon.
  const canManageCoupons =
    (((session?.user as any)?.roles || []) as string[]).some(
      (role: string) => role === "founder" || role === "admin" || role === "verified_creator"
    ) || hasListingCouponAccess;

  // Sidebar navigation items (drive the same activeTab state as the tabs).
  // Coupons is only shown when the user can manage coupons.
  const navItems: { value: string; label: string; icon: any }[] = [
    { value: "overview", label: "Overview", icon: LayoutDashboard },
    { value: "analytics", label: "Analytics", icon: BarChart3 },
    { value: "scripts", label: "Assets", icon: Package },
    { value: "tebex-store", label: "Tebex Store", icon: Store },
    { value: "props", label: "Props", icon: Package },
    { value: "giveaways", label: "Giveaways", icon: Gift },
    { value: "winners", label: "Winners", icon: Trophy },
    { value: "ad-slots", label: "My Ad Slots", icon: Tag },
    { value: "advertise", label: "Advertise", icon: Megaphone },
    { value: "entries", label: "Entries", icon: Sparkles },
    { value: "get-verified", label: "Get Verified", icon: ShieldCheck },
    { value: "settings", label: "Settings", icon: Settings },
    // Coupons/Creator Codes management disabled (2026-07-12): FiveCrux is
    // moving to Tebex-native discount codes at checkout instead of maintaining
    // a parallel custom coupon system. Commented out (not deleted) so it can
    // be restored if needed — see coupons-tab.tsx / creator-codes-tab.tsx.
    // ...(canManageCoupons
    //   ? [
    //       { value: "coupons", label: "Coupons", icon: Tag },
    //       { value: "creator-codes", label: "Creator Codes", icon: Megaphone },
    //     ]
    //   : []),
  ];

  const activeNavLabel =
    navItems.find((n) => n.value === activeTab)?.label || "Overview";

  // Primary CTA in the sidebar adapts to the active section.
  const primaryCta =
    activeTab === "giveaways"
      ? { label: "New giveaway", onClick: () => router.push("/giveaways/create") }
      : { label: "New product", onClick: () => router.push("/scripts/submit") };

  if (status === "loading") {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
      </>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0a0a0a] text-white [font-variant-numeric:tabular-nums]">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8"
          >
            {/* ============ SIDEBAR ============ */}
            <aside className="lg:sticky lg:top-[88px] lg:h-fit">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="rounded-3xl border border-white/[0.07] bg-[#0e0e0e] p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]"
              >
                {/* identity */}
                <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-0">
                  <div className="relative group shrink-0 lg:mb-4">
                    <div className="rounded-2xl p-[2px] bg-gradient-to-br from-orange-500 to-amber-400">
                      <Avatar className="h-16 w-16 rounded-2xl ring-1 ring-[#0e0e0e]">
                        <AvatarImage src={profilePictureUrl || ""} className="rounded-2xl object-cover" />
                        <AvatarFallback className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-black text-2xl font-black">
                          {session.user?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[#0e0e0e] ring-1 ring-white/10">
                      <BadgeCheck className="h-4 w-4 text-orange-400" />
                    </span>
                    {/* hover upload overlay */}
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                      <label className="cursor-pointer" title="Square image recommended, min 200×200px, up to 5MB">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleProfilePictureUpload}
                          disabled={uploadingProfilePicture}
                          className="hidden"
                        />
                        <Camera className="h-5 w-5 text-white" />
                      </label>
                    </div>
                    {uploadingProfilePicture && (
                      <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center">
                        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-orange-500"></div>
                      </div>
                    )}
                    {profilePictureUrl && (
                      <button
                        onClick={handleRemoveProfilePicture}
                        className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg z-10"
                        title="Remove profile picture"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-extrabold tracking-tight">
                      {session.user?.name}
                    </h1>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(session.user as any)?.roles?.length > 0 ? (
                        (session.user as any).roles.map((role: string) => (
                          <Badge
                            key={role}
                            className={`${
                              role === "founder"
                                ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                : role === "admin"
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : role === "verified_creator"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : role === "moderator"
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                : role === "crew"
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                : "bg-white/[0.06] text-white/60 border-white/[0.1]"
                            }`}
                          >
                            {role === "verified_creator"
                              ? "Verified Creator"
                              : role === "moderator"
                              ? "Moderator"
                              : role.charAt(0).toUpperCase() + role.slice(1)}
                          </Badge>
                        ))
                      ) : (
                        <Badge className="bg-white/[0.06] text-white/60 border-white/[0.1]">
                          Loading roles...
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <p className="mt-4 truncate text-[13px] leading-relaxed text-white/55">
                  {session.user?.email}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/55">
                  <Calendar className="h-3.5 w-3.5" />
                  Member since{" "}
                  {(session.user as any)?.createdAt
                    ? new Date((session.user as any).createdAt).toLocaleDateString()
                    : "—"}
                </div>

                {/* mini stat list */}
                <div className="mt-5 divide-y divide-white/[0.05] border-y border-white/[0.05]">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                      Assets
                    </span>
                    <span className="text-sm font-bold">{stats.totalScripts}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                      Giveaways
                    </span>
                    <span className="text-sm font-bold">{stats.totalGiveaways}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                      Ads
                    </span>
                    <span className="text-sm font-bold">{stats.totalAds}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                      Entries
                    </span>
                    <span className="text-sm font-bold">{stats.totalEntries}</span>
                  </div>
                </div>

                {/* vertical nav (desktop) — drives the same activeTab as the tabs.
                    On mobile this becomes a horizontal scroller below. */}
                <TabsList className="mt-5 flex flex-row gap-1.5 overflow-x-auto bg-transparent p-0 h-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-col lg:gap-1 lg:overflow-visible">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <TabsTrigger
                        key={item.value}
                        value={item.value}
                        className="flex w-auto shrink-0 items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 transition hover:bg-white/[0.04] hover:text-white data-[state=active]:bg-orange-500/12 data-[state=active]:text-orange-400 data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-orange-500/20 whitespace-nowrap lg:w-full"
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        {item.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <button
                  type="button"
                  onClick={primaryCta.onClick}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400"
                >
                  <Plus className="h-4 w-4" /> {primaryCta.label}
                </button>
              </motion.div>
            </aside>

            {/* ============ MAIN ============ */}
            <main className="mt-6 lg:mt-0 space-y-8">
              {/* welcome header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="flex flex-wrap items-end justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-orange-400/90">
                    Creator dashboard
                  </div>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight lg:text-[28px] truncate">
                    Welcome back, {session.user?.name}
                  </h2>
                  <p className="mt-1 text-sm text-white/55">
                    Here&apos;s how your store is performing.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2 text-sm font-medium text-white/70">
                    {activeNavLabel}
                  </span>
                </div>
              </motion.div>

              {/* stat cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
              >
                {[
                  { label: "Assets", value: stats.totalScripts, icon: Package, accent: false },
                  { label: "Giveaways", value: stats.totalGiveaways, icon: Gift, accent: false },
                  { label: "Ads", value: stats.totalAds, icon: Tag, accent: true },
                  { label: "Entries", value: stats.totalEntries, icon: Sparkles, accent: false },
                ].map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-2xl border border-white/[0.06] bg-[#0e0e0e] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-xl ${
                          tile.accent
                            ? "bg-orange-500/12 text-orange-400"
                            : "bg-white/[0.04] text-white/60"
                        }`}
                      >
                        <tile.icon className="h-[18px] w-[18px]" />
                      </span>
                    </div>
                    <div className="mt-4 text-3xl font-extrabold tracking-tight">
                      {tile.value}
                    </div>
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                      {tile.label}
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* ====== SECTION CONTENT (active tab) ====== */}

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  {/* Recent Activity */}
                  <div className="rounded-3xl border border-white/[0.06] bg-[#0e0e0e] p-5 lg:p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-orange-500" />
                        Recent activity
                      </h3>
                      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                        Latest
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {scripts.slice(0, 3).map((script: any) => (
                        <div
                          key={script.id}
                          className="flex items-center justify-between gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="p-2 rounded-lg bg-orange-500/15 shrink-0">
                              <Package className="h-5 w-5 text-orange-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{script.title}</p>
                              <p className="text-sm text-white/55">
                                Asset •{" "}
                                {new Date(
                                  script.created_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={`shrink-0 capitalize ${getStatusColor(script.status)}`}>
                            {script.status}
                          </Badge>
                        </div>
                      ))}
                      {giveaways.slice(0, 3).map((giveaway: any) => (
                        <div
                          key={giveaway.id}
                          className="flex items-center justify-between gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="p-2 rounded-lg bg-green-500/15 shrink-0">
                              <Gift className="h-5 w-5 text-green-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{giveaway.title}</p>
                              <p className="text-sm text-white/55">
                                Giveaway •{" "}
                                {new Date(
                                  giveaway.created_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={`shrink-0 capitalize ${getStatusColor(giveaway.status)}`}>
                            {giveaway.status}
                          </Badge>
                        </div>
                      ))}
                      {scripts.length === 0 && giveaways.length === 0 && (
                        <div className="py-10 text-center">
                          <Sparkles className="h-10 w-10 text-white/20 mx-auto mb-3" />
                          <p className="text-white/55 text-sm">
                            No recent activity yet. Create an asset or giveaway to get started.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Scripts Tab */}
              <TabsContent value="scripts" className="space-y-6 mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="flex flex-col gap-3 mb-6 items-start justify-between sm:flex-row sm:items-center">
                    <h2 className="text-xl sm:text-2xl font-bold">My Assets</h2>
                    <Button
                      onClick={() => router.push("/scripts/submit")}
                      className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-black font-semibold"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Asset
                    </Button>
                  </div>

                  {scripts.length > 0 && (
                    <div className="flex flex-col gap-3 mb-6 sm:flex-row">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                        <Input
                          value={scriptSearchQuery}
                          onChange={(e) => setScriptSearchQuery(e.target.value)}
                          placeholder="Search your assets..."
                          className="pl-9 bg-[#0e0e0e] border-white/[0.08]"
                        />
                      </div>
                      <Select
                        value={scriptCategoryFilter}
                        onValueChange={setScriptCategoryFilter}
                      >
                        <SelectTrigger className="w-full sm:w-[200px] bg-[#0e0e0e] border-white/[0.08]">
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All categories</SelectItem>
                          {scriptCategories.map((category) => (
                            <SelectItem key={category} value={category} className="capitalize">
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {scriptsLoading ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredScripts.map((script: any) => (
                        <Card
                          key={script.id}
                          className="bg-[#0e0e0e] border-white/[0.06] rounded-2xl hover:border-orange-500/40 transition-colors"
                        >
                          <CardContent className="p-5">
                            <div className="aspect-video bg-white/[0.04] border border-white/[0.06] rounded-xl mb-4 overflow-hidden">
                              {script.cover_image ||
                              (script.screenshots &&
                                script.screenshots.length > 0) ? (
                                <img
                                  src={
                                    script.cover_image || script.screenshots[0]
                                  }
                                  alt={script.title}
                                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-12 w-12 text-white/20" />
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div>
                                <h3 className="font-bold text-base sm:text-lg break-words">
                                  {script.title}
                                </h3>
                                <p className="text-white/55 text-sm line-clamp-2 break-words">
                                  {script.description}
                                </p>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {script.free ? (
                                    <span className="font-bold text-orange-500">Free</span>
                                  ) : (
                                    <span className="font-bold">
                                      <span className="text-orange-500">{script.currency_symbol || "$"}</span> {script.price}
                                    </span>
                                  )}
                                </div>
                                <Badge className={`capitalize ${getStatusColor(script.status)}`}>
                                  {script.status}
                                </Badge>
                              </div>

                              {script.status === "rejected" &&
                                script.rejection_reason && (
                                  <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-red-400 text-sm font-medium">
                                          Rejection Reason:
                                        </p>
                                        <p className="text-red-300 text-sm mt-1">
                                          {script.rejection_reason}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                              <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  onClick={() =>
                                    router.push(`/script/${script.id}`)
                                  }
                                  className="flex-1 md:flex-initial min-w-0"
                                >
                                  <Eye className="h-4 w-4 mr-1 md:mr-1" />
                                  <span className="hidden sm:inline">View</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  onClick={() => handleEditScript(script.id)}
                                  className="flex-1 md:flex-initial min-w-0"
                                >
                                  <Edit className="h-4 w-4 mr-1 md:mr-1" />
                                  <span className="hidden sm:inline">Edit</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  onClick={() => handleDeleteScript(script.id)}
                                  className="text-red-400 hover:text-red-300 flex-1 md:flex-initial min-w-0"
                                >
                                  <Trash2 className="h-4 w-4 mr-1 md:mr-1" />
                                  <span className="hidden sm:inline">Delete</span>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {scripts.length === 0 && !loading && (
                        <Card className="bg-[#0e0e0e] border-white/[0.06] rounded-2xl md:col-span-2 lg:col-span-3">
                          <CardContent className="p-12 text-center">
                            <Package className="h-12 w-12 text-white/20 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">
                              No assets yet
                            </h3>
                            <p className="text-white/55 mb-4">
                              Start creating your first asset to showcase your
                              work
                            </p>
                            <Button
                              onClick={() => router.push("/scripts/submit")}
                              className="bg-orange-500 hover:bg-orange-600 text-black font-semibold"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create Your First Asset
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {scripts.length > 0 && filteredScripts.length === 0 && (
                        <Card className="bg-[#0e0e0e] border-white/[0.06] rounded-2xl md:col-span-2 lg:col-span-3">
                          <CardContent className="p-12 text-center">
                            <Search className="h-12 w-12 text-white/20 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">
                              No assets match your search
                            </h3>
                            <p className="text-white/55">
                              Try a different search term or category.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              {/* Giveaways Tab */}
              <TabsContent value="giveaways" className="space-y-6 mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="flex flex-col gap-3 mb-6 items-start justify-between sm:flex-row sm:items-center">
                    <h2 className="text-xl sm:text-2xl font-bold">My Giveaways</h2>
                    <Button
                      onClick={() => router.push("/giveaways/create")}
                      className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-black font-semibold"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Giveaway
                    </Button>
                  </div>

                  {giveawaysLoading ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {giveaways.map((giveaway: any) => (
                        <Card
                          key={giveaway.id}
                          className="bg-[#0e0e0e] border-white/[0.06] rounded-2xl hover:border-green-500/40 transition-colors"
                        >
                          <CardContent className="p-5">
                            <div className="aspect-video bg-white/[0.04] border border-white/[0.06] rounded-xl mb-4 overflow-hidden">
                              {giveaway.cover_image ||
                              (giveaway.images && giveaway.images.length > 0) ? (
                                <img
                                  src={giveaway.cover_image || giveaway.images[0]}
                                  alt={giveaway.title}
                                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Gift className="h-12 w-12 text-white/20" />
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div>
                                <h3 className="font-bold text-base sm:text-lg break-words">
                                  {giveaway.title}
                                </h3>
                                <p className="text-white/55 text-sm line-clamp-2 break-words">
                                  {giveaway.description}
                                </p>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">
                                    <span className="text-green-500">{giveaway.currency_symbol || "$"}</span> {giveaway.total_value}
                                  </span>
                                </div>
                                <Badge
                                  className={`capitalize ${getStatusColor(giveaway.status)}`}
                                >
                                  {giveaway.status}
                                </Badge>
                              </div>

                              {(() => {
                                const endDate = giveaway.end_date ? new Date(giveaway.end_date) : null;
                                const isEnded = endDate ? new Date() > endDate : false;
                                return isEnded && endDate ? (
                                  <div className="mt-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <Clock className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-orange-400 text-sm font-medium">
                                          Giveaway Ended
                                        </p>
                                        <p className="text-orange-300 text-sm mt-1">
                                          Ended on {endDate.toLocaleDateString()} at {endDate.toLocaleTimeString()}. Editing is disabled.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ) : null;
                              })()}

                              {giveaway.status === "rejected" &&
                                giveaway.rejection_reason && (
                                  <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-red-400 text-sm font-medium">
                                          Rejection Reason:
                                        </p>
                                        <p className="text-red-300 text-sm mt-1">
                                          {giveaway.rejection_reason}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-white/55">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span>
                                    Ends{" "}
                                    {new Date(
                                      giveaway.end_date
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Tag className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                  <span>{giveaway.entries_count} entries</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  onClick={() =>
                                    router.push(`/giveaway/${giveaway.id}`)
                                  }
                                  className="flex-1 md:flex-initial min-w-0"
                                >
                                  <Eye className="h-4 w-4 mr-1 md:mr-1" />
                                  <span className="hidden sm:inline">View</span>
                                </Button>
                                {(() => {
                                  const endDate = giveaway.end_date ? new Date(giveaway.end_date) : null;
                                  const isEnded = endDate ? new Date() > endDate : false;
                                  return (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      type="button"
                                      onClick={() => handleEditGiveaway(giveaway.id)}
                                      disabled={isEnded}
                                      className="flex-1 md:flex-initial min-w-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={isEnded && endDate ? `Giveaway ended on ${endDate.toLocaleDateString()} at ${endDate.toLocaleTimeString()}` : "Edit giveaway"}
                                    >
                                      <Edit className="h-4 w-4 mr-1 md:mr-1" />
                                      <span className="hidden sm:inline">Edit</span>
                                    </Button>
                                  );
                                })()}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  onClick={() =>
                                    handleDeleteGiveaway(giveaway.id)
                                  }
                                  className="text-red-400 hover:text-red-300 flex-1 md:flex-initial min-w-0"
                                >
                                  <Trash2 className="h-4 w-4 mr-1 md:mr-1" />
                                  <span className="hidden sm:inline">Delete</span>
                                </Button>
                              </div>

                              {(() => {
                                const endDate = giveaway.end_date ? new Date(giveaway.end_date) : null;
                                const isEnded = endDate ? new Date() > endDate : false;
                                if (!isEnded || giveaway.status !== "approved") return null;
                                const isDrawing = drawingWinnersId === giveaway.id;
                                return (
                                  <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => handleDrawWinners(giveaway.id)}
                                    disabled={isDrawing}
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold disabled:opacity-60"
                                  >
                                    <Trophy className="h-4 w-4 mr-1.5" />
                                    {isDrawing ? "Drawing..." : "Draw Winners"}
                                  </Button>
                                );
                              })()}
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {giveaways.length === 0 && !loading && (
                        <Card className="bg-[#0e0e0e] border-white/[0.06] rounded-2xl md:col-span-2 lg:col-span-3">
                          <CardContent className="p-12 text-center">
                            <Gift className="h-12 w-12 text-white/20 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">
                              No giveaways yet
                            </h3>
                            <p className="text-white/55 mb-4">
                              Start creating your first giveaway to engage with
                              the community
                            </p>
                            <Button
                              onClick={() => router.push("/giveaways/create")}
                              className="bg-green-500 hover:bg-green-600 text-black font-semibold"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create Your First Giveaway
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              {/* Winners Tab — prize-delivery tracker for the creator's giveaways */}
              <TabsContent value="winners" className="space-y-6 mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <GiveawayWinners />
                </motion.div>
              </TabsContent>

              {/* Ads Tab */}
              <TabsContent value="ad-slots" className="space-y-6 mt-0">
                {/* Switcher — Ads / Side Banners / Featured Scripts share this one section */}
                <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
                  {AD_SLOT_VIEWS.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setAdSlotView(v.value)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        adSlotView === v.value
                          ? "bg-orange-500 text-black"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                {adSlotView === "ads" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  {adsLoading ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                    </div>
                  ) : ads.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ads.map((ad: any) => (
                          <Card
                            key={ad.id}
                            className="bg-[#0e0e0e] border-white/[0.06] rounded-2xl hover:border-orange-500/40 transition-all duration-300"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant="secondary"
                                  className="bg-orange-500/20 text-orange-400 border-orange-500/30 capitalize"
                                >
                                  {ad.category}
                                </Badge>
                                <Badge
                                  className={`text-xs capitalize ${getStatusColor(
                                    ad.status
                                  )}`}
                                >
                                  {ad.status}
                                </Badge>
                              </div>
                              {ad.image_url && (
                                <div className="w-full h-32 rounded-lg overflow-hidden mb-4">
                                  <img
                                    src={ad.image_url}
                                    alt={ad.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              <CardTitle className="text-white text-lg line-clamp-2">
                                {ad.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-white/55 text-sm mb-4 line-clamp-3">
                                {ad.description}
                              </p>

                              {ad.status === "rejected" &&
                                ad.rejection_reason && (
                                  <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-red-400 text-sm font-medium">
                                          Rejection Reason:
                                        </p>
                                        <p className="text-red-300 text-sm mt-1">
                                          {ad.rejection_reason}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                              <div className="space-y-2">
                                <div className="flex items-center gap-4 text-xs text-white/55">
                                  <div>
                                    Created:{" "}
                                    {new Date(ad.created_at).toLocaleDateString()}
                                  </div>
                                  {ad.status === "approved" && (
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-1 text-orange-400">
                                        <MousePointer className="h-3 w-3" />
                                        <span>{ad.click_count || 0} clicks</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-blue-400">
                                        <Eye className="h-3 w-3" />
                                        <span>{ad.view_count || 0} views</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {ad.status === "approved" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      type="button"
                                      onClick={() => setAnalyticsTarget({ adType: "ad", adId: ad.id, title: ad.title })}
                                      className="text-orange-400 hover:text-orange-300"
                                    >
                                      <BarChart3 className="h-4 w-4 mr-1" />
                                      Analytics
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    type="button"
                                    onClick={() => handleEditAd(ad.id)}
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    type="button"
                                    onClick={() => handleDeleteAd(ad.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {/* Available Ad Slots (Purchased but not used) */}
                        {Array.from({ length: availableSlots }).map(
                          (_, index) => {
                            const slotUniqueId =
                              availableSlotUniqueIds[index] || null;
                            return (
                              <motion.div
                                key={`available-slot-${index}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                className="group cursor-pointer"
                                onClick={() => {
                                  setSelectedSlotUniqueId(slotUniqueId);
                                  setShowAdsForm(true);
                                }}
                              >
                                <Card className="bg-white/[0.04] backdrop-blur-sm rounded-2xl border-2 border-dashed border-orange-500/40 hover:border-orange-500 transition-all duration-300 h-full flex flex-col items-center justify-center min-h-[300px]">
                                  <CardContent className="flex flex-col items-center justify-center py-12">
                                    <div className="w-20 h-20 rounded-full bg-orange-500/10 border-2 border-dashed border-orange-500/50 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 group-hover:border-orange-500 transition-all duration-300">
                                      <Plus className="h-10 w-10 text-orange-500 group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                      Create New Ad
                                    </h3>
                                    <p className="text-white/55 text-sm text-center mb-4">
                                      Click to create an advertisement in this
                                      slot
                                    </p>
                                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                      Available Slot
                                    </Badge>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            );
                          }
                        )}
                        {/* Locked Ad Slots */}
                        {Array.from({ length: lockedSlots }).map((_, index) => (
                          <motion.div
                            key={`locked-slot-${index}`}
                            className="group relative"
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur-sm rounded-2xl relative overflow-hidden h-full">
                              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-gray-800/80 group-hover:opacity-0 transition-opacity duration-300" />
                              <CardHeader className="pb-3 relative z-0">
                                <div className="flex items-center justify-between">
                                  <Badge
                                    variant="secondary"
                                    className="bg-orange-500/20 text-orange-400 border-orange-500/30"
                                  >
                                    Slot {index + 1}
                                  </Badge>
                                  <Badge className="text-xs bg-gray-500/20 text-gray-400 border-gray-500/30">
                                    <Lock className="h-3 w-3 mr-1 inline" />
                                    Locked
                                  </Badge>
                                </div>
                                <CardTitle className="text-white text-lg line-clamp-2 mt-2">
                                  Available Slot
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="relative z-0">
                                <p className="text-white/55 text-sm mb-4 line-clamp-3">
                                  Purchase this slot to unlock and create your
                                  advertisement.
                                </p>
                                <div className="w-full h-32 rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-gray-700/30 to-gray-800/30 flex items-center justify-center border border-gray-700/50">
                                  <Tag className="h-12 w-12 text-gray-600" />
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-white/55">
                                    Status: Locked
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      type="button"
                                      disabled
                                      className="text-gray-500 cursor-not-allowed opacity-50"
                                    >
                                      <Lock className="h-4 w-4 mr-1" />
                                      Locked
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>

                              {/* Hover Overlay with Buy Slot Button */}
                              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-yellow-400/20 backdrop-blur-sm z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <Link href="/advertise">
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Button
                                      size="lg"
                                      className="bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-bold px-8 py-3 shadow-lg"
                                    >
                                      <DollarSign className="h-5 w-5 mr-2" />
                                      Buy Slot
                                    </Button>
                                  </motion.div>
                                </Link>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Available Ad Slots (Purchased but not used) */}
                        {Array.from({ length: availableSlots }).map(
                          (_, index) => {
                            const slotUniqueId =
                              availableSlotUniqueIds[index] || null;
                            return (
                              <motion.div
                                key={`available-slot-empty-${index}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                className="group cursor-pointer"
                                onClick={() => {
                                  setSelectedSlotUniqueId(slotUniqueId);
                                  setShowAdsForm(true);
                                }}
                              >
                                <Card className="bg-white/[0.04] backdrop-blur-sm rounded-2xl border-2 border-dashed border-orange-500/40 hover:border-orange-500 transition-all duration-300 h-full flex flex-col items-center justify-center min-h-[300px]">
                                  <CardContent className="flex flex-col items-center justify-center py-12">
                                    <div className="w-20 h-20 rounded-full bg-orange-500/10 border-2 border-dashed border-orange-500/50 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 group-hover:border-orange-500 transition-all duration-300">
                                      <Plus className="h-10 w-10 text-orange-500 group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                      Create New Ad
                                    </h3>
                                    <p className="text-white/55 text-sm text-center mb-4">
                                      Click to create an advertisement in this
                                      slot
                                    </p>
                                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                      Available Slot
                                    </Badge>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            );
                          }
                        )}
                        {/* Locked Ad Slots */}
                        {Array.from({ length: lockedSlots }).map((_, index) => (
                          <motion.div
                            key={`locked-slot-empty-${index}`}
                            className="group relative"
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur-sm rounded-2xl relative overflow-hidden h-full">
                              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-gray-800/80 z-10 group-hover:opacity-0 transition-opacity duration-300" />
                              <CardHeader className="pb-3 relative z-0">
                                <div className="flex items-center justify-between">
                                  <Badge
                                    variant="secondary"
                                    className="bg-orange-500/20 text-orange-400 border-orange-500/30"
                                  >
                                    Slot {index + 1}
                                  </Badge>
                                  <Badge className="text-xs bg-gray-500/20 text-gray-400 border-gray-500/30">
                                    <Lock className="h-3 w-3 mr-1 inline" />
                                    Locked
                                  </Badge>
                                </div>
                                <CardTitle className="text-white text-lg line-clamp-2 mt-2">
                                  Available Slot
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="relative z-0">
                                <p className="text-white/55 text-sm mb-4 line-clamp-3">
                                  Purchase this slot to unlock and create your
                                  advertisement.
                                </p>
                                <div className="w-full h-32 rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-gray-700/30 to-gray-800/30 flex items-center justify-center border border-gray-700/50">
                                  <Tag className="h-12 w-12 text-gray-600" />
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-white/55">
                                    Status: Locked
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      type="button"
                                      disabled
                                      className="text-gray-500 cursor-not-allowed opacity-50"
                                    >
                                      <Lock className="h-4 w-4 mr-1" />
                                      Locked
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>

                              {/* Hover Overlay with Buy Slot Button */}
                              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-yellow-400/20 backdrop-blur-sm z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <Link href="/advertise">
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Button
                                      size="lg"
                                      className="bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-bold px-8 py-3 shadow-lg"
                                    >
                                      <DollarSign className="h-5 w-5 mr-2" />
                                      Buy Slot
                                    </Button>
                                  </motion.div>
                                </Link>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
                )}

                {/* Side Banners — manage the creative for bought side slots */}
                {adSlotView === "side-banners" && <SideBannersManager />}
              </TabsContent>

              {/* Get Verified Tab — apply for the verified-creator badge */}
              <TabsContent value="get-verified" className="space-y-6 mt-0">
                <GetVerified />
              </TabsContent>

              {/* Analytics Tab — creator's real recorded performance */}
              <TabsContent value="analytics" className="space-y-6 mt-0">
                <CreatorAnalytics />
              </TabsContent>

              {/* Tebex Store Tab — connect + import packages as listings */}
              <TabsContent value="tebex-store" className="space-y-6 mt-0">
                <TebexStoreImporter />
              </TabsContent>

              {/* Advertise Tab — packages + side-banner booking (moved from navbar) */}
              <TabsContent value="advertise" className="space-y-6 mt-0">
                <AdvertisePanel />
              </TabsContent>

              {/* Featured Scripts — same consolidated "My Ad Slots" section (renders
                  alongside the Ads/Side-Banners TabsContent above since they share
                  the "ad-slots" value; visibility is gated by adSlotView instead). */}
              <TabsContent value="ad-slots" className="space-y-6 mt-0">
                {adSlotView === "featured" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  {featuredScriptsLoading ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                    </div>
                  ) : featuredScripts.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {featuredScripts.map((featuredScript: any) => (
                          <Card
                            key={featuredScript.id}
                            className="bg-[#0e0e0e] border-white/[0.06] rounded-2xl hover:border-orange-500/40 transition-all duration-300"
                          >
                            {featuredScript.scriptCoverImage && (
                              <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
                                <img
                                  src={featuredScript.scriptCoverImage}
                                  alt={
                                    featuredScript.scriptTitle ||
                                    `Asset ${featuredScript.scriptId}`
                                  }
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant="secondary"
                                  className="bg-orange-500/20 text-orange-400 border-orange-500/30"
                                >
                                  Featured Asset
                                </Badge>
                                <Badge
                                  className={`text-xs ${
                                    (featuredScript.featuredStatus ||
                                      featuredScript.status) === "active"
                                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                                      : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                                  }`}
                                >
                                  {(featuredScript.featuredStatus ||
                                    featuredScript.status) === "active"
                                    ? "Active"
                                    : "Inactive"}
                                </Badge>
                              </div>
                              <CardTitle className="text-white text-lg line-clamp-2">
                                {featuredScript.scriptTitle ||
                                  `Asset ID: ${featuredScript.scriptId}`}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {featuredScript.scriptDescription && (
                                  <p className="text-sm text-white/55 line-clamp-3 mb-2">
                                    {featuredScript.scriptDescription}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-white/55">
                                  <div>
                                    Created:{" "}
                                    {new Date(
                                      featuredScript.featuredCreatedAt ||
                                        featuredScript.created_at
                                    ).toLocaleDateString()}
                                  </div>
                                  {featuredScript.featuredStatus === "active" && (
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-1 text-purple-400">
                                        <MousePointer className="h-3 w-3" />
                                        <span>
                                          {featuredScript.featuredClickCount ||
                                            featuredScript.click_count ||
                                            0}{" "}
                                          clicks
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 text-blue-400">
                                        <Eye className="h-3 w-3" />
                                        <span>
                                          {featuredScript.featuredViewCount ||
                                            featuredScript.view_count ||
                                            0}{" "}
                                          views
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {featuredScript.featuredStatus === "active" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      type="button"
                                      onClick={() =>
                                        setAnalyticsTarget({
                                          adType: "featured_script",
                                          adId: featuredScript.id,
                                          title: featuredScript.scriptTitle || `Asset ID: ${featuredScript.scriptId}`,
                                        })
                                      }
                                      className="text-orange-400 hover:text-orange-300"
                                    >
                                      <BarChart3 className="h-4 w-4 mr-1" />
                                      Analytics
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    type="button"
                                    onClick={() =>
                                      router.push(
                                        `/script/${featuredScript.scriptId}`
                                      )
                                    }
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Asset
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    type="button"
                                    onClick={() =>
                                      handleDeleteFeaturedScript(
                                        featuredScript.id
                                      )
                                    }
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {/* Available Featured Script Slots */}
                        {Array.from({ length: availableFeaturedScriptSlots }).map(
                          (_, index) => {
                            const slotUniqueId =
                              availableFeaturedScriptSlotUniqueIds[index] || null;
                            return (
                              <motion.div
                                key={`available-featured-script-slot-${index}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                className="group cursor-pointer"
                                onClick={() => {
                                  setSelectedFeaturedScriptSlotUniqueId(
                                    slotUniqueId
                                  );
                                  setShowScriptSelectionPopup(true);
                                }}
                              >
                                <Card className="bg-white/[0.04] backdrop-blur-sm rounded-2xl border-2 border-dashed border-orange-500/40 hover:border-orange-500 transition-all duration-300 h-full flex flex-col items-center justify-center min-h-[300px]">
                                  <CardContent className="flex flex-col items-center justify-center py-12">
                                    <div className="w-20 h-20 rounded-full bg-orange-500/10 border-2 border-dashed border-orange-500/50 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 group-hover:border-orange-500 transition-all duration-300">
                                      <Plus className="h-10 w-10 text-orange-500 group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                      Feature an Asset
                                    </h3>
                                    <p className="text-white/55 text-sm text-center mb-4">
                                      Click to select an asset to feature in this
                                      slot
                                    </p>
                                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                      Available Slot
                                    </Badge>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            );
                          }
                        )}
                        {/* Locked Featured Script Slots */}
                        {Array.from({ length: lockedFeaturedScriptSlots }).map(
                          (_, index) => (
                            <motion.div
                              key={`locked-featured-script-slot-${index}`}
                              className="group relative"
                              whileHover={{ scale: 1.02 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur-sm rounded-2xl relative overflow-hidden h-full">
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-gray-800/80 z-10 group-hover:opacity-0 transition-opacity duration-300" />
                                <CardHeader className="pb-3 relative z-0">
                                  <div className="flex items-center justify-between">
                                    <Badge
                                      variant="secondary"
                                      className="bg-orange-500/20 text-orange-400 border-orange-500/30"
                                    >
                                      Slot {index + 1}
                                    </Badge>
                                    <Badge className="text-xs bg-gray-500/20 text-gray-400 border-gray-500/30">
                                      <Lock className="h-3 w-3 mr-1 inline" />
                                      Locked
                                    </Badge>
                                  </div>
                                  <CardTitle className="text-white text-lg line-clamp-2 mt-2">
                                    Available Slot
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="relative z-0">
                                  <p className="text-white/55 text-sm mb-4 line-clamp-3">
                                    Purchase this slot to unlock and feature your
                                    asset.
                                  </p>
                                  <div className="w-full h-32 rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-gray-700/30 to-gray-800/30 flex items-center justify-center border border-gray-700/50">
                                    <Star className="h-12 w-12 text-gray-600" />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs text-white/55">
                                      Status: Locked
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        type="button"
                                        disabled
                                        className="text-gray-500 cursor-not-allowed opacity-50"
                                      >
                                        <Lock className="h-4 w-4 mr-1" />
                                        Locked
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-yellow-400/20 backdrop-blur-sm z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <Link href="/advertise">
                                    <motion.div
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Button
                                        size="lg"
                                        className="bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-bold px-8 py-3 shadow-lg"
                                      >
                                        <DollarSign className="h-5 w-5 mr-2" />
                                        Buy Slot
                                      </Button>
                                    </motion.div>
                                  </Link>
                                </div>
                              </Card>
                            </motion.div>
                          )
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Available Featured Script Slots */}
                        {Array.from({ length: availableFeaturedScriptSlots }).map(
                          (_, index) => {
                            const slotUniqueId =
                              availableFeaturedScriptSlotUniqueIds[index] || null;
                            return (
                              <motion.div
                                key={`available-featured-script-slot-empty-${index}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                className="group cursor-pointer"
                                onClick={() => {
                                  setSelectedFeaturedScriptSlotUniqueId(
                                    slotUniqueId
                                  );
                                  setShowScriptSelectionPopup(true);
                                }}
                              >
                                <Card className="bg-white/[0.04] backdrop-blur-sm rounded-2xl border-2 border-dashed border-orange-500/40 hover:border-orange-500 transition-all duration-300 h-full flex flex-col items-center justify-center min-h-[300px]">
                                  <CardContent className="flex flex-col items-center justify-center py-12">
                                    <div className="w-20 h-20 rounded-full bg-orange-500/10 border-2 border-dashed border-orange-500/50 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 group-hover:border-orange-500 transition-all duration-300">
                                      <Plus className="h-10 w-10 text-orange-500 group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                      Feature an Asset
                                    </h3>
                                    <p className="text-white/55 text-sm text-center mb-4">
                                      Click to select an asset to feature in this
                                      slot
                                    </p>
                                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                      Available Slot
                                    </Badge>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            );
                          }
                        )}
                        {/* Locked Featured Script Slots */}
                        {Array.from({ length: lockedFeaturedScriptSlots }).map(
                          (_, index) => (
                            <motion.div
                              key={`locked-featured-script-slot-empty-${index}`}
                              className="group relative"
                              whileHover={{ scale: 1.02 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur-sm rounded-2xl relative overflow-hidden h-full">
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-gray-800/80 z-10 group-hover:opacity-0 transition-opacity duration-300" />
                                <CardHeader className="pb-3 relative z-0">
                                  <div className="flex items-center justify-between">
                                    <Badge
                                      variant="secondary"
                                      className="bg-orange-500/20 text-orange-400 border-orange-500/30"
                                    >
                                      Slot {index + 1}
                                    </Badge>
                                    <Badge className="text-xs bg-gray-500/20 text-gray-400 border-gray-500/30">
                                      <Lock className="h-3 w-3 mr-1 inline" />
                                      Locked
                                    </Badge>
                                  </div>
                                  <CardTitle className="text-white text-lg line-clamp-2 mt-2">
                                    Available Slot
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="relative z-0">
                                  <p className="text-white/55 text-sm mb-4 line-clamp-3">
                                    Purchase this slot to unlock and feature your
                                    asset.
                                  </p>
                                  <div className="w-full h-32 rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-gray-700/30 to-gray-800/30 flex items-center justify-center border border-gray-700/50">
                                    <Star className="h-12 w-12 text-gray-600" />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs text-white/55">
                                      Status: Locked
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        type="button"
                                        disabled
                                        className="text-gray-500 cursor-not-allowed opacity-50"
                                      >
                                        <Lock className="h-4 w-4 mr-1" />
                                        Locked
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-yellow-400/20 backdrop-blur-sm z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <Link href="/advertise">
                                    <motion.div
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Button
                                        size="lg"
                                        className="bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-bold px-8 py-3 shadow-lg"
                                      >
                                        <DollarSign className="h-5 w-5 mr-2" />
                                        Buy Slot
                                      </Button>
                                    </motion.div>
                                  </Link>
                                </div>
                              </Card>
                            </motion.div>
                          )
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
                )}
              </TabsContent>

              {/* Entries Tab */}
              <TabsContent value="entries" className="space-y-6 mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold">Giveaway Entries</h2>
                    <p className="text-white/55 text-sm">
                      Entries from users who participated in your giveaways
                    </p>
                  </div>
                  {entriesLoading ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {giveawayEntries.map((entry: any, index: number) => (
                        <Card
                          key={entry.id}
                          className="bg-[#0e0e0e] border-white/[0.06] rounded-2xl hover:border-orange-500/40 transition-colors"
                        >
                          <CardContent className="p-5 sm:p-6">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
                                  {entry.giveaway_cover && (
                                    <img
                                      src={entry.giveaway_cover}
                                      alt={entry.giveaway_title}
                                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1 break-words">
                                      {entry.giveaway_title}
                                    </h3>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-white/55">
                                      <div className="flex items-center gap-1">
                                        <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <span className="truncate">
                                          {entry.user_name || "Anonymous User"}
                                        </span>
                                      </div>
                                      <span className="hidden sm:inline">•</span>
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <span>
                                          Entered{" "}
                                          {new Date(
                                            entry.entry_date
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
                                  <Badge
                                    className={`flex-shrink-0 ${
                                      entry.status === "active"
                                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                                        : entry.status === "winner"
                                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                        : "bg-red-500/20 text-red-400 border-red-500/30"
                                    }`}
                                  >
                                    {entry.status.charAt(0).toUpperCase() +
                                      entry.status.slice(1)}
                                  </Badge>
                                  <div className="flex items-center gap-2 text-xs sm:text-sm text-white/55">
                                    <Star className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
                                    <span className="font-medium">
                                      {entry.points_earned} points
                                    </span>
                                  </div>
                                  {entry.requirements_completed &&
                                    entry.requirements_completed.length > 0 && (
                                      <div className="flex items-center gap-2 text-xs sm:text-sm text-white/55">
                                        <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0" />
                                        <span className="break-words">
                                          {entry.requirements_completed.length}{" "}
                                          requirements completed
                                        </span>
                                      </div>
                                    )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  onClick={() =>
                                    router.push(`/giveaway/${entry.giveaway_id}`)
                                  }
                                  className="border-white/[0.12] bg-transparent text-white/70 hover:text-white hover:border-orange-500 whitespace-nowrap"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">View Giveaway</span>
                                  <span className="sm:hidden">View</span>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {giveawayEntries.length === 0 && !loading && (
                        <Card className="bg-[#0e0e0e] border-white/[0.06] rounded-2xl">
                          <CardContent className="p-12 text-center">
                            <Sparkles className="h-12 w-12 text-white/20 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">
                              No entries yet
                            </h3>
                            <p className="text-white/55 mb-4">
                              No users have entered your giveaways yet. Create
                              more giveaways to attract participants!
                            </p>
                            <Button
                              onClick={() => router.push("/giveaways/create")}
                              className="bg-green-500 hover:bg-green-600 text-black font-semibold"
                            >
                              <Gift className="h-4 w-4 mr-2" />
                              Create Giveaway
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              {/* Coupons/Creator Codes tabs disabled (2026-07-12) — see navItems
                  comment above. Commented out, not deleted.
              {canManageCoupons && (
                <TabsContent value="coupons" className="space-y-6 mt-0">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    <CouponsTab />
                  </motion.div>
                </TabsContent>
              )}

              {canManageCoupons && (
                <TabsContent value="creator-codes" className="space-y-6 mt-0">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    <CreatorCodesTab />
                  </motion.div>
                </TabsContent>
              )}
              */}

              {/* Props Tab */}
              <TabsContent value="props" className="space-y-6 mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <PropsTab />
                </motion.div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6 mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <Card className="bg-[#0e0e0e] border-white/[0.06] rounded-3xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Settings className="h-5 w-5 text-orange-500" />
                        Account Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          Profile Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-white/50 mb-2">
                              Name
                            </label>
                            <input
                              type="text"
                              value={session.user?.name || ""}
                              disabled
                              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white disabled:opacity-50 min-w-0"
                            />
                            <p className="text-xs text-white/55 mt-1">
                              Synced from your Discord account
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/50 mb-2">
                              Email
                            </label>
                            <input
                              type="email"
                              value={session.user?.email || ""}
                              disabled
                              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white disabled:opacity-50 min-w-0 overflow-x-auto"
                            />
                            <p className="text-xs text-white/55 mt-1">
                              Email cannot be changed
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          Account Statistics
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                            <p className="text-2xl font-bold text-orange-500">
                              {stats.totalScripts}
                            </p>
                            <p className="text-sm text-white/55">Assets</p>
                          </div>
                          <div className="text-center p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                            <p className="text-2xl font-bold text-green-500">
                              {stats.totalGiveaways}
                            </p>
                            <p className="text-sm text-white/55">Giveaways</p>
                          </div>
                          <div className="text-center p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                            <p className="text-2xl font-bold text-purple-500">
                              {stats.totalEntries}
                            </p>
                            <p className="text-sm text-white/55">Entries</p>
                          </div>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </main>
          </Tabs>
        </div>
      </div>
      <Footer />

      {/* Ads Form Dialog */}
      <AdsForm
        isOpen={showAdsForm}
        onClose={() => {
          setShowAdsForm(false);
          setEditingAd(null);
          setSelectedSlotUniqueId(null);
        }}
        onSuccess={handleAdCreated}
        editData={editingAd}
        slotUniqueId={selectedSlotUniqueId}
      />

      {/* Detailed Analytics Modal */}
      {analyticsTarget && (
        <AdDetailedAnalyticsModal
          adType={analyticsTarget.adType}
          adId={analyticsTarget.adId}
          title={analyticsTarget.title}
          onClose={() => setAnalyticsTarget(null)}
        />
      )}

      {/* Script Selection Popup */}
      <ScriptSelectionPopup
        isOpen={showScriptSelectionPopup}
        onClose={() => {
          setShowScriptSelectionPopup(false);
          setSelectedFeaturedScriptSlotUniqueId(null);
        }}
        onSelect={handleSelectScriptForFeature}
        slotUniqueId={selectedFeaturedScriptSlotUniqueId}
      />
    </>
  );
}
