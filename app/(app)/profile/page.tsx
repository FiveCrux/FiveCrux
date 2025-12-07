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
} from "lucide-react";
import { Button } from "@/componentss/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentss/ui/card";
import { Badge } from "@/componentss/ui/badge";
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
import { Camera, X } from "lucide-react";
import Link from "next/link";

interface Script {
  id: number;
  title: string;
  description: string;
  price: number;
  original_price?: number;
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

  // Track which tabs have been visited for lazy loading
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set(["overview"])
  );

  // Fetch data using React Query with lazy loading
  const {
    data: scriptsData,
    isLoading: scriptsLoading,
    refetch: refetchScripts,
  } = useUserScripts(
    100, // Get more items for now
    0
  );

  const {
    data: giveawaysData,
    isLoading: giveawaysLoading,
    refetch: refetchGiveaways,
  } = useUserGiveaways(100, 0);

  const {
    data: adsData,
    isLoading: adsLoading,
    refetch: refetchAds,
  } = useUserAdvertisements(100, 0);

  const {
    data: entriesData,
    isLoading: entriesLoading,
    refetch: refetchEntries,
  } = useUserCreatorGiveawayEntries(100, 0);

  // Featured Scripts
  const { data: featuredScriptSlotsData, refetch: refetchFeaturedScriptSlots } =
    useUserFeaturedScriptSlots();
  const {
    data: featuredScriptsData,
    isLoading: featuredScriptsLoading,
    refetch: refetchFeaturedScripts,
  } = useUserFeaturedScripts(100);
  const createFeaturedScriptMutation = useCreateFeaturedScript();
  const deleteFeaturedScriptMutation = useDeleteFeaturedScript();

  // Mutations for delete operations
  const deleteScriptMutation = useDeleteUserScript();
  const deleteGiveawayMutation = useDeleteUserGiveaway();

  const [showAdsForm, setShowAdsForm] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
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
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  // TODO: Fetch purchased slots from user data/API
  const [purchasedSlots, setPurchasedSlots] = useState(0); // This should come from user data
  const [availableSlotUniqueIds, setAvailableSlotUniqueIds] = useState<
    string[]
  >([]); // Available slot unique IDs

  // Extract data from React Query responses
  const scripts = scriptsData?.scripts || [];
  const scriptsTotal = scriptsData?.total || 0;
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

  // Calculate slot availability
  const usedSlots = ads.length;
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

  // Initialize name value from session
  useEffect(() => {
    if (session?.user?.name) {
      setNameValue(session.user.name);
    }
  }, [session?.user?.name]);

  // Fetch active ad slots on component mount
  useEffect(() => {
    const fetchActiveSlots = async () => {
      if (!session?.user?.id || status !== "authenticated") return;

      try {
        const response = await fetch("/api/user/ad-slots", {
          credentials: "include", // Important for session cookies
        });

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
          console.error("Failed to fetch active slots");
          // Default to 0 if fetch fails
          setPurchasedSlots(0);
          setAvailableSlotUniqueIds([]);
        }
      } catch (error) {
        console.error("Error fetching active slots:", error);
        setPurchasedSlots(0);
        setAvailableSlotUniqueIds([]);
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
    if (!confirm("Are you sure you want to delete this script?")) return;
    deleteScriptMutation.mutate(scriptId);
  };

  const handleDeleteGiveaway = async (giveawayId: number) => {
    if (!confirm("Are you sure you want to delete this giveaway?")) return;
    deleteGiveawayMutation.mutate(giveawayId);
  };

  const handleDeleteAd = async (adId: number) => {
    if (!confirm("Are you sure you want to delete this ad?")) return;

    try {
      const response = await fetch(`/api/users/advertisements?id=${adId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Refetch ads to update the list
        refetchAds();
        toast.success("Ad deleted successfully!");
      } else {
        toast.error("Failed to delete ad");
      }
    } catch (error) {
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
    if (!confirm("Are you sure you want to delete this featured script?"))
      return;
    deleteFeaturedScriptMutation.mutate(featuredScriptId);
  };

  const handleProfilePictureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingProfilePicture(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/user/profile-picture", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();
      toast.success("Profile picture updated successfully!");

      // Refresh session to get updated profile picture
      await updateSession();
    } catch (error) {
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

    try {
      const response = await fetch("/api/user/profile-picture", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove profile picture");
      }

      toast.success("Profile picture removed successfully!");

      // Refresh session to get updated profile picture
      await updateSession();
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove profile picture");
    }
  };

  const handleSaveName = async () => {
    if (!nameValue.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    if (nameValue.trim() === session?.user?.name) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      const response = await fetch("/api/user/name", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: nameValue.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update name");
      }

      toast.success("Name updated successfully!");
      setEditingName(false);

      // Refresh session to get updated name
      await updateSession();
    } catch (error) {
      console.error("Save name error:", error);
      toast.error(
        `Failed to update name: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      // Reset to original name on error
      setNameValue(session?.user?.name || "");
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelEditName = () => {
    setNameValue(session?.user?.name || "");
    setEditingName(false);
  };

  const profilePictureUrl = getSessionUserProfilePicture(session);

  if (status === "loading") {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
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
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500/10 to-yellow-400/10 py-16 px-4 sm:px-6 lg:px-8 border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="flex items-center gap-3 sm:gap-6 flex-wrap sm:flex-nowrap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative group">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profilePictureUrl || ""} />
                  <AvatarFallback className="bg-orange-500 text-white text-2xl">
                    {session.user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleProfilePictureUpload}
                      disabled={uploadingProfilePicture}
                      className="hidden"
                    />
                    <Camera className="h-6 w-6 text-white" />
                  </label>
                </div>
                {uploadingProfilePicture && (
                  <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  </div>
                )}
                {profilePictureUrl && (
                  <button
                    onClick={handleRemoveProfilePicture}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    title="Remove profile picture"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold truncate">{session.user?.name}</h1>
                <p className="text-gray-400 text-sm sm:text-base truncate">{session.user?.email}</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                  <div className="flex flex-wrap gap-2">
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
                              : "bg-gray-500/20 text-gray-400 border-gray-500/30"
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
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        Loading roles...
                      </Badge>
                    )}
                  </div>
                  <span className="text-gray-500 text-xs sm:text-sm whitespace-nowrap">
                    Member since {new Date().toLocaleDateString()}
                  </span>
                  {/* Debug session button removed */}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            {/* Mobile Tabs */}
            <div className="lg:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <TabsList className="flex w-max min-w-full bg-gray-800/50 gap-2 p-1">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-orange-500 whitespace-nowrap px-3 py-2 text-xs flex-shrink-0"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="scripts"
                className="data-[state=active]:bg-orange-500 whitespace-nowrap px-3 py-2 text-xs flex-shrink-0"
              >
                Scripts
              </TabsTrigger>
              <TabsTrigger
                value="giveaways"
                className="data-[state=active]:bg-orange-500 whitespace-nowrap px-3 py-2 text-xs flex-shrink-0"
              >
                Giveaways
              </TabsTrigger>
              <TabsTrigger
                value="ads"
                className="data-[state=active]:bg-orange-500 whitespace-nowrap px-3 py-2 text-xs flex-shrink-0"
              >
                Ads
              </TabsTrigger>
              <TabsTrigger
                value="featured-scripts"
                className="data-[state=active]:bg-purple-500 whitespace-nowrap px-3 py-2 text-xs flex-shrink-0"
              >
                Featured
              </TabsTrigger>
              <TabsTrigger
                value="entries"
                className="data-[state=active]:bg-orange-500 whitespace-nowrap px-3 py-2 text-xs flex-shrink-0"
              >
                Entries
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-orange-500 whitespace-nowrap px-3 py-2 text-xs flex-shrink-0"
              >
                Settings
              </TabsTrigger>
            </TabsList>
            </div>

            {/* Desktop Tabs */}
            <TabsList className="hidden lg:grid w-full grid-cols-7 bg-gray-800/50 gap-2 p-1">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-orange-500"
              >
                <User className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="scripts"
                className="data-[state=active]:bg-orange-500"
              >
                <Package className="h-4 w-4 mr-2" />
                Scripts
              </TabsTrigger>
              <TabsTrigger
                value="giveaways"
                className="data-[state=active]:bg-orange-500"
              >
                <Gift className="h-4 w-4 mr-2" />
                Giveaways
              </TabsTrigger>
              <TabsTrigger
                value="ads"
                className="data-[state=active]:bg-orange-500"
              >
                <Tag className="h-4 w-4 mr-2" />
                Ads
              </TabsTrigger>
              <TabsTrigger
                value="featured-scripts"
                className="data-[state=active]:bg-purple-500"
              >
                <Star className="h-4 w-4 mr-2" />
                Featured Scripts
              </TabsTrigger>
              <TabsTrigger
                value="entries"
                className="data-[state=active]:bg-orange-500"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Entries
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-orange-500"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                  <Card className="bg-gray-800/30 border-gray-700/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/20 rounded-lg">
                          <Package className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Total Scripts</p>
                          <p className="text-2xl font-bold">
                            {stats.totalScripts}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800/30 border-gray-700/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/20 rounded-lg">
                          <Gift className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">
                            Total Giveaways
                          </p>
                          <p className="text-2xl font-bold">
                            {stats.totalGiveaways}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-orange-500" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {scripts.slice(0, 3).map((script: any) => (
                        <div
                          key={script.id}
                          className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <Package className="h-5 w-5 text-orange-500" />
                            <div>
                              <p className="font-medium">{script.title}</p>
                              <p className="text-sm text-gray-400">
                                Script •{" "}
                                {new Date(
                                  script.created_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(script.status)}>
                            {script.status}
                          </Badge>
                        </div>
                      ))}
                      {giveaways.slice(0, 3).map((giveaway: any) => (
                        <div
                          key={giveaway.id}
                          className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <Gift className="h-5 w-5 text-green-500" />
                            <div>
                              <p className="font-medium">{giveaway.title}</p>
                              <p className="text-sm text-gray-400">
                                Giveaway •{" "}
                                {new Date(
                                  giveaway.created_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(giveaway.status)}>
                            {giveaway.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Scripts Tab */}
            <TabsContent value="scripts" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex flex-col mb-4 items-start justify-between sm:flex-row md:flex-row">
                  <h2 className="text-2xl font-bold mb-4 md:mb-0 sm:mb-0">My Scripts</h2>
                  <Button
                    onClick={() => router.push("/scripts/submit")}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Script
                  </Button>
                </div>

                {scriptsLoading ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scripts.map((script: any) => (
                      <Card
                        key={script.id}
                        className="bg-gray-800/30 border-gray-700/50 hover:border-orange-500/50 transition-colors"
                      >
                        <CardContent className="p-6">
                          <div className="aspect-video bg-gray-700 rounded-lg mb-4 overflow-hidden">
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
                                <Package className="h-12 w-12 text-gray-500" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div>
                              <h3 className="font-bold text-base sm:text-lg break-words">
                                {script.title}
                              </h3>
                              <p className="text-gray-400 text-sm line-clamp-2 break-words">
                                {script.description}
                              </p>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-orange-500" />
                                <span className="font-bold">
                                  ${script.price}
                                </span>
                              </div>
                              <Badge className={getStatusColor(script.status)}>
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
                      <Card className="bg-gray-800/30 border-gray-700/50">
                        <CardContent className="p-12 text-center">
                          <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                          <h3 className="text-xl font-bold mb-2">
                            No scripts yet
                          </h3>
                          <p className="text-gray-400 mb-4">
                            Start creating your first script to showcase your
                            work
                          </p>
                          <Button
                            onClick={() => router.push("/scripts/submit")}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Script
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </motion.div>
            </TabsContent>

            {/* Giveaways Tab */}
            <TabsContent value="giveaways" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex flex-col mb-4 items-start justify-between sm:flex-row md:flex-row">
                  <h2 className="text-2xl font-bold mb-4 md:mb-0 sm:mb-0">My Giveaways</h2>
                  <Button
                    onClick={() => router.push("/giveaways/create")}
                    className="bg-green-500 hover:bg-green-600"
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
                        className="bg-gray-800/30 border-gray-700/50 hover:border-green-500/50 transition-colors"
                      >
                        <CardContent className="p-6">
                          <div className="aspect-video bg-gray-700 rounded-lg mb-4 overflow-hidden">
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
                                <Gift className="h-12 w-12 text-gray-500" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div>
                              <h3 className="font-bold text-base sm:text-lg break-words">
                                {giveaway.title}
                              </h3>
                              <p className="text-gray-400 text-sm line-clamp-2 break-words">
                                {giveaway.description}
                              </p>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-500" />
                                <span className="font-bold">
                                  {giveaway.total_value}
                                </span>
                              </div>
                              <Badge
                                className={getStatusColor(giveaway.status)}
                              >
                                {giveaway.status}
                              </Badge>
                            </div>

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

                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400">
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
                              <Button
                                size="sm"
                                variant="outline"
                                type="button"
                                onClick={() => handleEditGiveaway(giveaway.id)}
                                className="flex-1 md:flex-initial min-w-0"
                              >
                                <Edit className="h-4 w-4 mr-1 md:mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
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
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {giveaways.length === 0 && !loading && (
                      <Card className="bg-gray-800/30 border-gray-700/50">
                        <CardContent className="p-12 text-center">
                          <Gift className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                          <h3 className="text-xl font-bold mb-2">
                            No giveaways yet
                          </h3>
                          <p className="text-gray-400 mb-4">
                            Start creating your first giveaway to engage with
                            the community
                          </p>
                          <Button
                            onClick={() => router.push("/giveaways/create")}
                            className="bg-green-500 hover:bg-green-600"
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

            {/* Ads Tab */}
            <TabsContent value="ads" className="space-y-6">
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
                          className="bg-gray-800/30 border-gray-700/50 hover:border-orange-500/50 transition-all duration-300"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <Badge
                                variant="secondary"
                                className="bg-orange-500/20 text-orange-400 border-orange-500/30"
                              >
                                {ad.category}
                              </Badge>
                              <Badge
                                className={`text-xs ${getStatusColor(
                                  ad.status
                                )}`}
                              >
                                {ad.status}
                              </Badge>
                            </div>
                            <CardTitle className="text-white text-lg line-clamp-2">
                              {ad.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                              {ad.description}
                            </p>
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
                              <div className="flex items-center gap-4 text-xs text-gray-500">
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
                              <Card className="bg-gray-800/30 border-2 border-dashed border-orange-500/50 hover:border-orange-500 transition-all duration-300 h-full flex flex-col items-center justify-center min-h-[300px]">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                  <div className="w-20 h-20 rounded-full bg-orange-500/10 border-2 border-dashed border-orange-500/50 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 group-hover:border-orange-500 transition-all duration-300">
                                    <Plus className="h-10 w-10 text-orange-500 group-hover:scale-110 transition-transform duration-300" />
                                  </div>
                                  <h3 className="text-lg font-semibold text-white mb-2">
                                    Create New Ad
                                  </h3>
                                  <p className="text-gray-400 text-sm text-center mb-4">
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
                          <Card className="bg-gray-800/30 border-gray-700/50 relative overflow-hidden h-full">
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
                              <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                                Purchase this slot to unlock and create your
                                advertisement.
                              </p>
                              <div className="w-full h-32 rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-gray-700/30 to-gray-800/30 flex items-center justify-center border border-gray-700/50">
                                <Tag className="h-12 w-12 text-gray-600" />
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">
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
                              <Card className="bg-gray-800/30 border-2 border-dashed border-orange-500/50 hover:border-orange-500 transition-all duration-300 h-full flex flex-col items-center justify-center min-h-[300px]">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                  <div className="w-20 h-20 rounded-full bg-orange-500/10 border-2 border-dashed border-orange-500/50 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 group-hover:border-orange-500 transition-all duration-300">
                                    <Plus className="h-10 w-10 text-orange-500 group-hover:scale-110 transition-transform duration-300" />
                                  </div>
                                  <h3 className="text-lg font-semibold text-white mb-2">
                                    Create New Ad
                                  </h3>
                                  <p className="text-gray-400 text-sm text-center mb-4">
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
                          <Card className="bg-gray-800/30 border-gray-700/50 relative overflow-hidden h-full">
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
                              <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                                Purchase this slot to unlock and create your
                                advertisement.
                              </p>
                              <div className="w-full h-32 rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-gray-700/30 to-gray-800/30 flex items-center justify-center border border-gray-700/50">
                                <Tag className="h-12 w-12 text-gray-600" />
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="text-xs text-gray-500">
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
            </TabsContent>

            {/* Featured Scripts Tab */}
            <TabsContent value="featured-scripts" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                {featuredScriptsLoading ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                  </div>
                ) : featuredScripts.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {featuredScripts.map((featuredScript: any) => (
                        <Card
                          key={featuredScript.id}
                          className="bg-gray-800/30 border-gray-700/50 hover:border-purple-500/50 transition-all duration-300"
                        >
                          {featuredScript.scriptCoverImage && (
                            <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
                              <img
                                src={featuredScript.scriptCoverImage}
                                alt={
                                  featuredScript.scriptTitle ||
                                  `Script ${featuredScript.scriptId}`
                                }
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <Badge
                                variant="secondary"
                                className="bg-purple-500/20 text-purple-400 border-purple-500/30"
                              >
                                Featured Script
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
                                `Script ID: ${featuredScript.scriptId}`}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {featuredScript.scriptDescription && (
                                <p className="text-sm text-gray-400 line-clamp-3 mb-2">
                                  {featuredScript.scriptDescription}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-500">
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
                                  View Script
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
                              <Card className="bg-gray-800/30 border-2 border-dashed border-purple-500/50 hover:border-purple-500 transition-all duration-300 h-full flex flex-col items-center justify-center min-h-[300px]">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                  <div className="w-20 h-20 rounded-full bg-purple-500/10 border-2 border-dashed border-purple-500/50 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 group-hover:border-purple-500 transition-all duration-300">
                                    <Plus className="h-10 w-10 text-purple-500 group-hover:scale-110 transition-transform duration-300" />
                                  </div>
                                  <h3 className="text-lg font-semibold text-white mb-2">
                                    Feature a Script
                                  </h3>
                                  <p className="text-gray-400 text-sm text-center mb-4">
                                    Click to select a script to feature in this
                                    slot
                                  </p>
                                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
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
                            <Card className="bg-gray-800/30 border-gray-700/50 relative overflow-hidden h-full">
                              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-gray-800/80 z-10 group-hover:opacity-0 transition-opacity duration-300" />
                              <CardHeader className="pb-3 relative z-0">
                                <div className="flex items-center justify-between">
                                  <Badge
                                    variant="secondary"
                                    className="bg-purple-500/20 text-purple-400 border-purple-500/30"
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
                                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                                  Purchase this slot to unlock and feature your
                                  script.
                                </p>
                                <div className="w-full h-32 rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-gray-700/30 to-gray-800/30 flex items-center justify-center border border-gray-700/50">
                                  <Star className="h-12 w-12 text-gray-600" />
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-500">
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
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-400/20 backdrop-blur-sm z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <Link href="/advertise">
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Button
                                      size="lg"
                                      className="bg-gradient-to-r from-purple-500 to-pink-400 hover:from-purple-600 hover:to-pink-500 text-white font-bold px-8 py-3 shadow-lg"
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
                              <Card className="bg-gray-800/30 border-2 border-dashed border-purple-500/50 hover:border-purple-500 transition-all duration-300 h-full flex flex-col items-center justify-center min-h-[300px]">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                  <div className="w-20 h-20 rounded-full bg-purple-500/10 border-2 border-dashed border-purple-500/50 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 group-hover:border-purple-500 transition-all duration-300">
                                    <Plus className="h-10 w-10 text-purple-500 group-hover:scale-110 transition-transform duration-300" />
                                  </div>
                                  <h3 className="text-lg font-semibold text-white mb-2">
                                    Feature a Script
                                  </h3>
                                  <p className="text-gray-400 text-sm text-center mb-4">
                                    Click to select a script to feature in this
                                    slot
                                  </p>
                                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
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
                            <Card className="bg-gray-800/30 border-gray-700/50 relative overflow-hidden h-full">
                              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-gray-800/80 z-10 group-hover:opacity-0 transition-opacity duration-300" />
                              <CardHeader className="pb-3 relative z-0">
                                <div className="flex items-center justify-between">
                                  <Badge
                                    variant="secondary"
                                    className="bg-purple-500/20 text-purple-400 border-purple-500/30"
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
                                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                                  Purchase this slot to unlock and feature your
                                  script.
                                </p>
                                <div className="w-full h-32 rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-gray-700/30 to-gray-800/30 flex items-center justify-center border border-gray-700/50">
                                  <Star className="h-12 w-12 text-gray-600" />
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-500">
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
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-400/20 backdrop-blur-sm z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <Link href="/advertise">
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Button
                                      size="lg"
                                      className="bg-gradient-to-r from-purple-500 to-pink-400 hover:from-purple-600 hover:to-pink-500 text-white font-bold px-8 py-3 shadow-lg"
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
            </TabsContent>

            {/* Entries Tab */}
            <TabsContent value="entries" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Giveaway Entries</h2>
                  <p className="text-gray-400 text-sm">
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
                        className="bg-gray-800/30 border-gray-700/50 hover:border-orange-500/50 transition-colors"
                      >
                        <CardContent className="p-6">
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
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-gray-400">
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
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
                                  <Star className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
                                  <span className="font-medium">
                                    {entry.points_earned} points
                                  </span>
                                </div>
                                {entry.requirements_completed &&
                                  entry.requirements_completed.length > 0 && (
                                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
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
                                className="border-gray-600 text-gray-300 hover:text-white hover:border-orange-500 whitespace-nowrap"
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
                      <Card className="bg-gray-800/30 border-gray-700/50">
                        <CardContent className="p-12 text-center">
                          <Sparkles className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                          <h3 className="text-xl font-bold mb-2">
                            No entries yet
                          </h3>
                          <p className="text-gray-400 mb-4">
                            No users have entered your giveaways yet. Create
                            more giveaways to attract participants!
                          </p>
                          <Button
                            onClick={() => router.push("/giveaways/create")}
                            className="bg-green-500 hover:bg-green-600"
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

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Card className="bg-gray-800/30 border-gray-700/50">
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
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Name
                          </label>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              value={nameValue}
                              onChange={(e) => setNameValue(e.target.value)}
                              onFocus={() => setEditingName(true)}
                              disabled={savingName}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none disabled:opacity-50 min-w-0"
                              placeholder="Enter your name"
                            />
                            {editingName && (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  onClick={handleSaveName}
                                  disabled={
                                    savingName ||
                                    !nameValue.trim() ||
                                    nameValue.trim() === session?.user?.name
                                  }
                                  className="bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap"
                                >
                                  {savingName ? (
                                    <>
                                      <Settings className="h-4 w-4 mr-1 animate-spin" />
                                      <span className="hidden sm:inline">Saving...</span>
                                    </>
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEditName}
                                  disabled={savingName}
                                  className="border-gray-600 text-gray-300 hover:text-white whitespace-nowrap"
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            value={session.user?.email || ""}
                            disabled
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50 min-w-0 overflow-x-auto"
                          />
                          <p className="text-xs text-gray-500 mt-1">
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
                        <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                          <p className="text-2xl font-bold text-orange-500">
                            {stats.totalScripts}
                          </p>
                          <p className="text-sm text-gray-400">Scripts</p>
                        </div>
                        <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                          <p className="text-2xl font-bold text-green-500">
                            {stats.totalGiveaways}
                          </p>
                          <p className="text-sm text-gray-400">Giveaways</p>
                        </div>
                        <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                          <p className="text-2xl font-bold text-purple-500">
                            {stats.totalEntries}
                          </p>
                          <p className="text-sm text-gray-400">Entries</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
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
