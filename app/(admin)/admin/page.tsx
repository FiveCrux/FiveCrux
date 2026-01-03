"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users,
  Package,
  Gift,
  Megaphone,
  Settings,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Shield,
  Crown,
  UserCheck,
  AlertTriangle,
  FileText,
  Info,
  User as UserIcon,
  ExternalLink,
  ImageIcon,
  Calendar,
  AlertCircle,
  Target,
  Trophy,
  Star,
  Tag,
  Video,
} from "lucide-react";
import { Button } from "@/componentss/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Checkbox } from "@/componentss/ui/checkbox";
import { Input } from "@/componentss/ui/input";
import { Textarea } from "@/componentss/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentss/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/componentss/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/componentss/ui/alert-dialog";
import { toast } from "sonner";
import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import FileUpload from "@/componentss/shared/file-upload";
import { useRoleValidation } from "@/hooks/use-role-validation";
import { getUserProfilePicture } from "@/lib/user-utils";
import {
  useAdminUsers,
  useAdminScripts,
  useAdminGiveaways,
  useAdminAds,
  useUpdateUserRoles,
  useUpdateScript,
  useUpdateGiveaway,
  useUpdateAd,
  useCreateAd,
  useDeleteAd,
} from "@/hooks/use-admin-queries";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  profilePicture?: string | null;
  username: string | null;
  roles: string[];
  created_at?: string;
}

interface Script {
  id: number;
  title: string;
  description: string;
  price: number;
  original_price?: number;
  currency?: string;
  currency_symbol?: string;
  category: string;
  framework?: string | string[];
  status: string;
  seller_name: string;
  seller_email: string;
  seller_id?: string;
  features: string[];
  requirements: string[];
  link?: string;
  other_links?: string[];
  youtube_video_link?: string;
  images: string[];
  videos: string[];
  screenshots: string[];
  cover_image?: string;
  featured: boolean;
  free?: boolean;
  downloads: number;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
}

// Giveaway interface for admin popup
interface Giveaway {
  id: number;
  title: string;
  description: string;
  total_value: string;
  category: string;
  status: string;
  creator_name: string;
  creator_email: string;
  currency?: string;
  currency_symbol?: string;
  creator_id?: string;
  end_date: string;
  maxEntries?: number;
  featured: boolean;
  auto_announce: boolean;
  images: string[];
  videos: string[];
  youtube_video_link?: string;
  coverImage?: string;
  tags: string[];
  rules: string[];
  requirements: any[];
  prizes: any[];
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
  entriesCount?: number;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvedBy?: string;
  rejectedBy?: string;
  adminNotes?: string;
}

interface Ad {
  id: number;
  title: string;
  description: string;
  image: string;
  link: string;
  banner_type: string;
  status?: "active" | "inactive" | "pending" | "approved" | "rejected" | string;
  created_at: string;
  updated_at: string;
  creator_name: string;
  creator_email: string;
  rejection_reason?: string;
  category?: string;
}

// Updated role options to the requested set. Values should match DB enum (lowercase/underscored).
const roleOptions = [
  { value: "founder", label: "Founder", icon: Crown, color: "bg-indigo-500" },
  {
    value: "verified_creator",
    label: "Verified Creator",
    icon: UserCheck,
    color: "bg-emerald-500",
  },
  { value: "crew", label: "Crew", icon: Users, color: "bg-sky-500" },
  { value: "admin", label: "Admin", icon: Shield, color: "bg-red-500" },
  {
    value: "moderator",
    label: "Moderator",
    icon: Shield,
    color: "bg-yellow-500",
  },
];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Auto-validate roles and refresh if changed
  useRoleValidation();

  // Check if user has admin access and redirect if not
  useEffect(() => {
    if (status === "loading") return; // Wait for session to load

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    const userRoles = (session?.user as any)?.roles || [];
    const hasAdminAccess =
      userRoles.includes("admin") ||
      userRoles.includes("founder") ||
      userRoles.includes("moderator");

    if (!hasAdminAccess) {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch data using React Query (infinite queries for pagination)
  const {
    data: usersData,
    isLoading: usersLoading,
    fetchNextPage: fetchNextUsers,
    hasNextPage: hasMoreUsers,
    isFetchingNextPage: loadingMoreUsers,
  } = useAdminUsers();

  const {
    data: scriptsData,
    isLoading: scriptsLoading,
    fetchNextPage: fetchNextScripts,
    hasNextPage: hasMoreScripts,
    isFetchingNextPage: loadingMoreScripts,
  } = useAdminScripts();

  const {
    data: giveawaysData,
    isLoading: giveawaysLoading,
    fetchNextPage: fetchNextGiveaways,
    hasNextPage: hasMoreGiveaways,
    isFetchingNextPage: loadingMoreGiveaways,
  } = useAdminGiveaways();

  const {
    data: adsData,
    isLoading: adsLoading,
    fetchNextPage: fetchNextAds,
    hasNextPage: hasMoreAds,
    isFetchingNextPage: loadingMoreAds,
  } = useAdminAds();

  // Flatten paginated data
  const users = usersData?.pages.flatMap((page) => page.users) || [];
  const scripts: Script[] = scriptsData?.pages.flatMap((page) => page.scripts) || [];
  const giveaways =
    giveawaysData?.pages.flatMap((page) => page.giveaways) || [];
  const ads = adsData?.pages.flatMap((page) => page.ads) || [];

  // Debug logging for ads
  console.log("Admin Dashboard - Ads:", ads.length, "Loading:", adsLoading);

  // Mutations
  const updateUserRolesMutation = useUpdateUserRoles();
  const updateScriptMutation = useUpdateScript();
  const updateGiveawayMutation = useUpdateGiveaway();
  const updateAdMutation = useUpdateAd();
  const createAdMutation = useCreateAd();
  const deleteAdMutation = useDeleteAd();

  // Combined loading state
  const loading =
    usersLoading || scriptsLoading || giveawaysLoading || adsLoading;

  const [activeTab, setActiveTab] = useState("dashboard");

  // Check if user has moderator role
  const userRoles = (session?.user as any)?.roles || [];
  const isModerator = userRoles.includes("moderator");
  const isFounder = userRoles.includes("founder");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingRoles, setEditingRoles] = useState<string[]>([]);
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [newAd, setNewAd] = useState({
    title: "",
    description: "",
    imageUrl: "",
    linkUrl: "",
    category: "",
    status: "active",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [activeScriptFilter, setActiveScriptFilter] = useState("all");
  const [rejectingScript, setRejectingScript] = useState<number | null>(null);
  const [rejectingScriptLoading, setRejectingScriptLoading] = useState(false);
  const [approvingScript, setApprovingScript] = useState<number | null>(null);
  const [viewingScript, setViewingScript] = useState<Script | null>(null);
  const [viewingGiveaway, setViewingGiveaway] = useState<Giveaway | null>(null);
  const [viewingAd, setViewingAd] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeGiveawayFilter, setActiveGiveawayFilter] = useState("all");
  const [rejectingGiveaway, setRejectingGiveaway] = useState<number | null>(
    null
  );
  const [rejectingGiveawayLoading, setRejectingGiveawayLoading] =
    useState(false);
  const [giveawayRejectionReason, setGiveawayRejectionReason] = useState("");
  const [activeAdFilter, setActiveAdFilter] = useState("all");
  const [rejectingAd, setRejectingAd] = useState<number | null>(null);
  const [rejectingAdLoading, setRejectingAdLoading] = useState(false);
  const [adRejectionReason, setAdRejectionReason] = useState("");

  const handleRoleChange = (role: string, checked: boolean) => {
    // Prevent moderators from assigning moderator or founder roles
    if (
      isModerator &&
      !isFounder &&
      (role === "moderator" || role === "founder") &&
      checked
    ) {
      return;
    }

    if (checked) {
      setEditingRoles([...editingRoles, role]);
    } else {
      setEditingRoles(editingRoles.filter((r) => r !== role));
    }
  };

  const saveUserRoles = async () => {
    if (!selectedUser) return;

    // Filter out restricted roles if user is moderator (but not founder)
    let rolesToSave = editingRoles;
    if (isModerator && !isFounder) {
      rolesToSave = editingRoles.filter(
        (role) => role !== "moderator" && role !== "founder"
      );
    }

    updateUserRolesMutation.mutate(
      { userId: selectedUser.id, roles: rolesToSave },
      {
        onSuccess: () => {
          setSelectedUser(null);
          setEditingRoles([]);
        },
      }
    );
  };

  const createAd = async () => {
    try {
      let imageUrl = "";

      // Upload image if selected
      if (selectedImage) {
        const formData = new FormData();
        formData.append("file", selectedImage);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.url;
        } else {
          toast.error("Failed to upload image");
          return;
        }
      }

      const adData = {
        ...newAd,
        imageUrl: imageUrl,
      };

      createAdMutation.mutate(adData, {
        onSuccess: () => {
          setNewAd({
            title: "",
            description: "",
            imageUrl: "",
            linkUrl: "",
            category: "",
            status: "active",
          });
          setSelectedImage(null);
          setShowAdDialog(false);
        },
      });
    } catch (error) {
      console.error("Error creating ad:", error);
      toast.error("An error occurred while creating ad");
    }
  };

  const deleteAd = async (adId: number) => {
    if (!confirm("Are you sure you want to delete this ad?")) return;
    deleteAdMutation.mutate(adId);
  };

  const stats = {
    totalUsers: users.length,
    totalScripts: scripts.length,
    totalGiveaways: giveaways.length,
    totalAds: ads.length,
    pendingScripts: scripts.filter((s) => s.status === "pending").length,
    activeAds: ads.filter((a) => a.status === "active").length,
  };

  // Filter scripts based on active filter
  const filteredScripts = scripts.filter((script) => {
    if (activeScriptFilter === "all") return true;
    return script.status === activeScriptFilter;
  });

  // Filter giveaways based on active filter
  const filteredGiveaways = giveaways.filter((giveaway) => {
    if (activeGiveawayFilter === "all") return true;
    return giveaway.status === activeGiveawayFilter;
  });

  // Handle script approval/rejection
  const handleScriptAction = async (
    scriptId: number,
    status: "approved" | "rejected"
  ) => {
    if (status === "rejected") {
      setRejectingScriptLoading(true);
    } else if (status === "approved") {
      setApprovingScript(scriptId);
    }

    updateScriptMutation.mutate(
      {
        scriptId,
        status,
        reason: status === "rejected" ? rejectionReason : undefined,
      },
      {
        onSuccess: () => {
          if (status === "rejected") {
            setRejectingScript(null);
            setRejectionReason("");
          }
        },
        onSettled: () => {
          if (status === "rejected") {
            setRejectingScriptLoading(false);
          } else if (status === "approved") {
            setApprovingScript(null);
          }
        },
      }
    );
  };

  // Handle giveaway approval/rejection
  const handleGiveawayAction = async (
    giveawayId: number,
    status: "approved" | "rejected"
  ) => {
    if (status === "rejected") {
      setRejectingGiveawayLoading(true);
    }

    updateGiveawayMutation.mutate(
      {
        giveawayId,
        status,
        reason: status === "rejected" ? giveawayRejectionReason : undefined,
      },
      {
        onSuccess: () => {
          if (status === "rejected") {
            setRejectingGiveaway(null);
            setGiveawayRejectionReason("");
          }
        },
        onSettled: () => {
          if (status === "rejected") {
            setRejectingGiveawayLoading(false);
          }
        },
      }
    );
  };

  // Handle ad approval/rejection
  const handleAdAction = async (
    adId: number,
    status: "approved" | "rejected"
  ) => {
    if (status === "rejected") {
      setRejectingAdLoading(true);
    }

    updateAdMutation.mutate(
      {
        adId,
        status,
        rejectionReason: status === "rejected" ? adRejectionReason : undefined,
      },
      {
        onSuccess: () => {
          if (status === "rejected") {
            setRejectingAd(null);
            setAdRejectionReason("");
          }
        },
        onSettled: () => {
          if (status === "rejected") {
            setRejectingAdLoading(false);
          }
        },
      }
    );
  };

  // Show loading or redirect if not authorized
  if (status === "loading" || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
        {/* <Footer /> */}
      </>
    );
  }

  // Check if user has admin access (using userRoles defined above)
  const hasAdminAccess =
    userRoles.includes("admin") ||
    userRoles.includes("founder") ||
    userRoles.includes("moderator");

  // Redirect unauthorized users (this is a fallback, useEffect should handle it)
  if (!session || !hasAdminAccess) {
    return null; // useEffect will handle redirect
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
                Admin Dashboard
              </span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Manage users, scripts, giveaways, and advertisements
            </p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-500/5 to-blue-600/5 border-blue-500/30 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-400 font-medium mb-2">
                      Total Users
                    </p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                      {stats.totalUsers}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Users className="h-8 w-8 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-400 font-medium mb-2">
                      Total Scripts
                    </p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                      {stats.totalScripts}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-500/20 rounded-xl">
                    <Package className="h-8 w-8 text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-500/5 to-violet-600/5 border-violet-500/30 hover:border-violet-500/50 transition-all hover:shadow-lg hover:shadow-violet-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-violet-400 font-medium mb-2">
                      Total Giveaways
                    </p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-violet-500 bg-clip-text text-transparent">
                      {stats.totalGiveaways}
                    </p>
                  </div>
                  <div className="p-3 bg-violet-500/20 rounded-xl">
                    <Gift className="h-8 w-8 text-violet-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/5 to-amber-600/5 border-amber-500/30 hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-400 font-medium mb-2">
                      Total Ads
                    </p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
                      {stats.totalAds}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-500/20 rounded-xl">
                    <Megaphone className="h-8 w-8 text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            {/* Mobile Tabs */}
            <div className="lg:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <TabsList className="flex w-max min-w-full bg-gray-800/30 border border-gray-700/50 gap-2 p-1">
                <TabsTrigger
                  value="dashboard"
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white whitespace-nowrap px-3 py-2 text-xs flex-shrink-0"
                >
                  Dashboard
                </TabsTrigger>
                {(isModerator || isFounder) && (
                  <TabsTrigger
                    value="users"
                    className="data-[state=active]:bg-orange-500 data-[state=active]:text-white whitespace-nowrap px-3 py-2 text-xs flex-shrink-0"
                  >
                    Users
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="scripts"
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white whitespace-nowrap px-3 py-2 text-xs flex-shrink-0"
                >
                  Scripts
                </TabsTrigger>
                <TabsTrigger
                  value="giveaways"
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white whitespace-nowrap px-3 py-2 text-xs flex-shrink-0"
                >
                  Giveaways
                </TabsTrigger>
                {(isModerator || isFounder) && (
                  <TabsTrigger
                    value="ads"
                    className="data-[state=active]:bg-orange-500 data-[state=active]:text-white whitespace-nowrap px-3 py-2 text-xs flex-shrink-0"
                  >
                    Ads
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* Desktop Tabs */}
            <TabsList
              className={`hidden lg:grid w-full ${
                isModerator || isFounder ? "grid-cols-5" : "grid-cols-3"
              } bg-gray-800/30 border border-gray-700/50`}
            >
              <TabsTrigger
                value="dashboard"
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                Dashboard
              </TabsTrigger>
              {(isModerator || isFounder) && (
                <TabsTrigger
                  value="users"
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                >
                  Users
                </TabsTrigger>
              )}
              <TabsTrigger
                value="scripts"
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                Scripts
              </TabsTrigger>
              <TabsTrigger
                value="giveaways"
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                Giveaways
              </TabsTrigger>
              {(isModerator || isFounder) && (
                <TabsTrigger
                  value="ads"
                  className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                >
                  Ads
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-500" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {scripts.slice(0, 5).map((script) => (
                        <div
                          key={script.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/30"
                        >
                          <Package className="h-5 w-5 text-green-400" />
                          <div className="flex-1">
                            <p className="text-white font-medium">
                              {script.title}
                            </p>
                            <p className="text-sm text-gray-400">
                              by {script.seller_name}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-gray-600 text-gray-300"
                          >
                            {script.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* System Status */}
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Settings className="h-5 w-5 text-orange-500" />
                      System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                        <span className="text-gray-300">Pending Scripts</span>
                        <Badge className="bg-yellow-500 text-white">
                          {stats.pendingScripts}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                        <span className="text-gray-300">Total Ads</span>
                        <Badge className="bg-orange-500 text-white">
                          {stats.totalAds}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                        <span className="text-gray-300">Total Giveaways</span>
                        <Badge className="bg-purple-500 text-white">
                          {stats.totalGiveaways}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {(isModerator || isFounder) && (
              <TabsContent value="users" className="mt-6">
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-orange-500" />
                      User Management
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Manage user roles and permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 p-4 rounded-lg bg-gray-700/30"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-orange-500 to-yellow-400 flex items-center justify-center flex-shrink-0">
                              {(() => {
                                const profilePic = getUserProfilePicture(user);
                                return profilePic ? (
                                  <img
                                    src={profilePic}
                                    alt={user.name || "User"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.style.display = "none";
                                      target.nextElementSibling?.classList.remove(
                                        "hidden"
                                      );
                                    }}
                                  />
                                ) : null;
                              })()}
                              <span
                                className={`text-black font-bold ${
                                  getUserProfilePicture(user) ? "hidden" : ""
                                }`}
                              >
                                {user.name?.[0] || "U"}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-white font-medium truncate">
                                {user.name || "Unknown"}
                              </p>
                              <p className="text-sm text-gray-400 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <div className="flex gap-1 flex-wrap">
                              {user.roles.map((role) => {
                                const roleOption = roleOptions.find(
                                  (r) => r.value === role
                                );
                                return roleOption ? (
                                  <Badge
                                    key={role}
                                    className={`${roleOption.color} text-white`}
                                  >
                                    {roleOption.label}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setEditingRoles([...user.roles]);
                              }}
                              disabled={
                                isModerator &&
                                !isFounder &&
                                (user.roles.includes("moderator") ||
                                  user.roles.includes("founder"))
                              }
                              className="border-gray-600 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Load More Button for Users */}
                      {hasMoreUsers && (
                        <div className="flex justify-center pt-6">
                          <Button
                            onClick={() => fetchNextUsers()}
                            disabled={loadingMoreUsers}
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700"
                          >
                            {loadingMoreUsers ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Loading...
                              </>
                            ) : (
                              "Load More Users"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="scripts" className="mt-6">
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-500" />
                    Script Management
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Review and manage pending scripts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <div className="flex gap-2 mb-4 w-max min-w-full">
                        <Button
                          variant={
                            activeScriptFilter === "all" ? "default" : "outline"
                          }
                          onClick={() => setActiveScriptFilter("all")}
                          className="bg-orange-500 hover:bg-orange-600 whitespace-nowrap flex-shrink-0"
                        >
                          All ({scripts.length})
                        </Button>
                        <Button
                          variant={
                            activeScriptFilter === "pending"
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setActiveScriptFilter("pending")}
                          className="bg-yellow-500 hover:bg-yellow-600 whitespace-nowrap flex-shrink-0"
                        >
                          Pending (
                          {scripts.filter((s) => s.status === "pending").length}
                          )
                        </Button>
                        <Button
                          variant={
                            activeScriptFilter === "approved"
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setActiveScriptFilter("approved")}
                          className="bg-green-500 hover:bg-green-600 whitespace-nowrap flex-shrink-0"
                        >
                          Approved (
                          {
                            scripts.filter((s) => s.status === "approved")
                              .length
                          }
                          )
                        </Button>
                        <Button
                          variant={
                            activeScriptFilter === "rejected"
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setActiveScriptFilter("rejected")}
                          className="bg-red-500 hover:bg-red-600 whitespace-nowrap flex-shrink-0"
                        >
                          Rejected (
                          {
                            scripts.filter((s) => s.status === "rejected")
                              .length
                          }
                          )
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {filteredScripts.map((script) => (
                      <div
                        key={script.id}
                        className="border border-gray-700/50 rounded-lg p-4 bg-gray-700/20"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-white mb-2 truncate">
                              {script.title}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="min-w-0">
                                <span className="text-gray-400">Seller:</span>
                                <p className="text-white truncate">
                                  {script.seller_name}
                                </p>
                              </div>
                              <div className="min-w-0">
                                <span className="text-gray-400">Category:</span>
                                <p className="text-white truncate">
                                  {script.category}
                                </p>
                              </div>
                              <div className="min-w-0">
                                <span className="text-gray-400">Price:</span>
                                <p className="text-white">
                                  {script.free ? "Free" : `${script.currency_symbol || "$"}${script.price}`}
                                </p>
                              </div>
                              <div className="min-w-0">
                                <span className="text-gray-400">
                                  Framework:
                                </span>
                                <p className="text-white truncate">
                                  {script.framework || "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <span className="text-gray-400">
                                Description:
                              </span>
                              <p className="text-white text-sm mt-1 line-clamp-2">
                                {script.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
                            <Badge
                              className={
                                script.status === "pending"
                                  ? "bg-yellow-500 text-white"
                                  : script.status === "approved"
                                  ? "bg-green-500 text-white"
                                  : "bg-red-500 text-white"
                              }
                            >
                              {script.status}
                            </Badge>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {new Date(script.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-700/50">
                          <Button
                            onClick={() => setViewingScript(script)}
                            variant="outline"
                            size="sm"
                            className="border-blue-500/50 text-blue-400 hover:text-blue-300 flex-shrink-0"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View Details
                          </Button>

                          {(script.status === "pending" ||
                            script.status === "approved") && (
                            <>
                              {script.status === "pending" && (
                                <Button
                                  onClick={() =>
                                    handleScriptAction(script.id, "approved")
                                  }
                                  className="bg-green-500 hover:bg-green-600 flex-shrink-0"
                                  size="sm"
                                  disabled={approvingScript === script.id}
                                >
                                  {approvingScript === script.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                      Approving...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve
                                    </>
                                  )}
                                </Button>
                              )}
                              <Button
                                onClick={() => setRejectingScript(script.id)}
                                variant="outline"
                                className="border-red-500/50 text-red-400 hover:text-red-300 flex-shrink-0"
                                size="sm"
                                disabled={rejectingScript === script.id}
                              >
                                {rejectingScript === script.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400 mr-2" />
                                    Rejecting...
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>

                        {script.status === "rejected" &&
                          script.rejection_reason && (
                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded">
                              <span className="text-red-400 text-sm font-medium">
                                Rejection Reason:
                              </span>
                              <p className="text-red-300 text-sm mt-1 break-words">
                                {script.rejection_reason}
                              </p>
                            </div>
                          )}
                      </div>
                    ))}

                    {filteredScripts.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No scripts found with the selected filter.</p>
                      </div>
                    )}

                    {/* Load More Button for Scripts */}
                    {filteredScripts.length > 0 && hasMoreScripts && (
                      <div className="flex justify-center pt-6">
                        <Button
                          onClick={() => fetchNextScripts()}
                          disabled={loadingMoreScripts}
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700"
                        >
                          {loadingMoreScripts ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Loading...
                            </>
                          ) : (
                            "Load More Scripts"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="giveaways" className="mt-6">
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Gift className="h-5 w-5 text-purple-500" />
                    Giveaway Management
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Review and manage pending giveaways
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <div className="flex gap-2 mb-4 w-max min-w-full">
                        <Button
                          variant={
                            activeGiveawayFilter === "all"
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setActiveGiveawayFilter("all")}
                          className="bg-purple-500 hover:bg-purple-600 whitespace-nowrap flex-shrink-0"
                        >
                          All ({giveaways.length})
                        </Button>
                        <Button
                          variant={
                            activeGiveawayFilter === "pending"
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setActiveGiveawayFilter("pending")}
                          className="bg-yellow-500 hover:bg-yellow-600 whitespace-nowrap flex-shrink-0"
                        >
                          Pending (
                          {
                            giveaways.filter((g) => g.status === "pending")
                              .length
                          }
                          )
                        </Button>
                        <Button
                          variant={
                            activeGiveawayFilter === "approved"
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setActiveGiveawayFilter("approved")}
                          className="bg-green-500 hover:bg-green-600 whitespace-nowrap flex-shrink-0"
                        >
                          Approved (
                          {
                            giveaways.filter((g) => g.status === "approved")
                              .length
                          }
                          )
                        </Button>
                        <Button
                          variant={
                            activeGiveawayFilter === "rejected"
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setActiveGiveawayFilter("rejected")}
                          className="bg-red-500 hover:bg-red-600 whitespace-nowrap flex-shrink-0"
                        >
                          Rejected (
                          {
                            giveaways.filter((g) => g.status === "rejected")
                              .length
                          }
                          )
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {filteredGiveaways.map((giveaway) => (
                      <div
                        key={giveaway.id}
                        className="border border-gray-700/50 rounded-lg p-4 bg-gray-700/20"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-white mb-2 truncate">
                              {giveaway.title}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="min-w-0">
                                <span className="text-gray-400">Creator:</span>
                                <p className="text-white truncate">
                                  {giveaway.creator_name}
                                </p>
                              </div>
                              <div className="min-w-0">
                                <span className="text-gray-400">Category:</span>
                                <p className="text-white truncate">
                                  {giveaway.category}
                                </p>
                              </div>
                              <div className="min-w-0">
                                <span className="text-gray-400">
                                  Total Value:
                                </span>
                                <p className="text-white">
                                  {giveaway.currency_symbol || "$"}{giveaway.total_value}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <span className="text-gray-400">
                                Description:
                              </span>
                              <p className="text-white text-sm mt-1 line-clamp-2">
                                {giveaway.description}
                              </p>
                            </div>
                            {giveaway.status === "rejected" &&
                              giveaway.rejection_reason && (
                                <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                                  <span className="text-red-400 text-sm font-medium">
                                    Rejection Reason:
                                  </span>
                                  <p className="text-red-200 text-sm mt-1 break-words">
                                    {giveaway.rejection_reason}
                                  </p>
                                </div>
                              )}
                          </div>
                          <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
                            <Badge
                              className={
                                giveaway.status === "pending"
                                  ? "bg-yellow-500 text-white"
                                  : giveaway.status === "approved"
                                  ? "bg-green-500 text-white"
                                  : "bg-red-500 text-white"
                              }
                            >
                              {giveaway.status}
                            </Badge>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {new Date(
                                giveaway.created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                          <Button
                            onClick={() => setViewingGiveaway(giveaway)}
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-300 hover:text-white flex-shrink-0"
                          >
                            View Details
                          </Button>
                          {(giveaway.status === "pending" ||
                            giveaway.status === "approved") && (
                            <>
                              {giveaway.status === "pending" && (
                                <Button
                                  onClick={() =>
                                    handleGiveawayAction(
                                      giveaway.id,
                                      "approved"
                                    )
                                  }
                                  className="bg-green-500 hover:bg-green-600 flex-shrink-0"
                                  size="sm"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                              )}
                              <Button
                                onClick={() =>
                                  setRejectingGiveaway(giveaway.id)
                                }
                                variant="destructive"
                                size="sm"
                                disabled={rejectingGiveaway === giveaway.id}
                                className="flex-shrink-0"
                              >
                                {rejectingGiveaway === giveaway.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Rejecting...
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {filteredGiveaways.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No giveaways found with the selected filter.</p>
                      </div>
                    )}

                    {/* Load More Button for Giveaways */}
                    {filteredGiveaways.length > 0 && hasMoreGiveaways && (
                      <div className="flex justify-center pt-6">
                        <Button
                          onClick={() => fetchNextGiveaways()}
                          disabled={loadingMoreGiveaways}
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700"
                        >
                          {loadingMoreGiveaways ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Loading...
                            </>
                          ) : (
                            "Load More Giveaways"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {(isModerator || isFounder) && (
              <TabsContent value="ads" className="mt-6">
                <div className="space-y-6">
                  {/* Filter Tabs */}
                  <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="flex gap-2 mb-4 w-max min-w-full">
                      <Button
                        variant={
                          activeAdFilter === "all" ? "default" : "outline"
                        }
                        onClick={() => setActiveAdFilter("all")}
                        className={`${
                          activeAdFilter === "all"
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "border-gray-600 text-gray-300"
                        } whitespace-nowrap flex-shrink-0`}
                      >
                        All Ads
                      </Button>
                      <Button
                        variant={
                          activeAdFilter === "pending" ? "default" : "outline"
                        }
                        onClick={() => setActiveAdFilter("pending")}
                        className={`${
                          activeAdFilter === "pending"
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "border-gray-600 text-gray-300"
                        } whitespace-nowrap flex-shrink-0`}
                      >
                        Pending
                      </Button>
                      <Button
                        variant={
                          activeAdFilter === "approved" ? "default" : "outline"
                        }
                        onClick={() => setActiveAdFilter("approved")}
                        className={`${
                          activeAdFilter === "approved"
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "border-gray-600 text-gray-300"
                        } whitespace-nowrap flex-shrink-0`}
                      >
                        Approved
                      </Button>
                      <Button
                        variant={
                          activeAdFilter === "rejected" ? "default" : "outline"
                        }
                        onClick={() => setActiveAdFilter("rejected")}
                        className={`${
                          activeAdFilter === "rejected"
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "border-gray-600 text-gray-300"
                        } whitespace-nowrap flex-shrink-0`}
                      >
                        Rejected
                      </Button>
                    </div>
                  </div>

                  <Card className="bg-gray-800/30 border-gray-700/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Megaphone className="h-5 w-5 text-orange-500" />
                            Advertisement Management
                          </CardTitle>
                          <CardDescription className="text-gray-400">
                            Review and manage advertisement submissions
                          </CardDescription>
                        </div>
                        <Dialog
                          open={showAdDialog}
                          onOpenChange={setShowAdDialog}
                        >
                          <DialogContent className="bg-gray-800 border-gray-700">
                            <DialogHeader>
                              <DialogTitle className="text-white">
                                Create New Advertisement
                              </DialogTitle>
                              <DialogDescription className="text-gray-400">
                                Add a new advertisement to the platform
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm text-gray-300">
                                  Title
                                </label>
                                <Input
                                  value={newAd.title}
                                  onChange={(e) =>
                                    setNewAd({
                                      ...newAd,
                                      title: e.target.value,
                                    })
                                  }
                                  className="bg-gray-700 border-gray-600 text-white"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-300">
                                  Description
                                </label>
                                <Textarea
                                  value={newAd.description}
                                  onChange={(e) =>
                                    setNewAd({
                                      ...newAd,
                                      description: e.target.value,
                                    })
                                  }
                                  className="bg-gray-700 border-gray-600 text-white"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-300 mb-2 block">
                                  Advertisement Image
                                </label>
                                <FileUpload
                                  onFileSelect={setSelectedImage}
                                  onFileRemove={() => setSelectedImage(null)}
                                  selectedFile={selectedImage}
                                  accept="image/*"
                                  maxSize={5}
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-300">
                                  Link URL
                                </label>
                                <Input
                                  value={newAd.linkUrl}
                                  onChange={(e) =>
                                    setNewAd({
                                      ...newAd,
                                      linkUrl: e.target.value,
                                    })
                                  }
                                  className="bg-gray-700 border-gray-600 text-white"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-300">
                                  Category
                                </label>
                                <Select
                                  value={newAd.category}
                                  onValueChange={(value) =>
                                    setNewAd({ ...newAd, category: value })
                                  }
                                >
                                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-700 border-gray-600">
                                    <SelectItem value="scripts">
                                      Scripts
                                    </SelectItem>
                                    <SelectItem value="giveaways">
                                      Giveaways
                                    </SelectItem>
                                    <SelectItem value="general">
                                      General
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  onClick={createAd}
                                  className="bg-orange-500 hover:bg-orange-600"
                                >
                                  Create Ad
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowAdDialog(false)}
                                  className="border-gray-600 text-gray-300"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {adsLoading ? (
                          <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                            <span className="ml-3 text-gray-400">
                              Loading ads...
                            </span>
                          </div>
                        ) : ads.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-8 text-center">
                            <Megaphone className="h-12 w-12 text-gray-600 mb-4" />
                            <p className="text-gray-400">
                              No advertisements found
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                              Create your first ad to get started
                            </p>
                          </div>
                        ) : (
                          ads
                            .filter((ad) => {
                              if (activeAdFilter === "all") return true;
                              // For pending ads, they might not have a status field or it might be null
                              if (activeAdFilter === "pending")
                                return !ad.status || ad.status === "pending";
                              if (activeAdFilter === "approved")
                                return (
                                  ad.status === "approved" ||
                                  ad.status === "active"
                                );
                              if (activeAdFilter === "rejected")
                                return ad.status === "rejected";
                              return true;
                            })
                            .map((ad) => {
                              console.log(
                                "Admin - Ad:",
                                ad.id,
                                "Status:",
                                ad.status,
                                "Has buttons:",
                                ad.status === "pending" ||
                                  ad.status === "approved"
                              );
                              return (
                                <div
                                  key={ad.id}
                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 p-4 rounded-lg bg-gray-700/30"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-400/20 flex items-center justify-center flex-shrink-0">
                                      <Megaphone className="h-6 w-6 text-orange-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-white font-medium truncate">
                                        {ad.title}
                                      </p>
                                      <p className="text-sm text-gray-400 line-clamp-2">
                                        {ad.description}
                                      </p>
                                      {ad.category && (
                                        <div className="flex gap-2 mt-1 flex-wrap">
                                          <Badge
                                            variant="secondary"
                                            className="bg-gray-600 text-gray-300"
                                          >
                                            {ad.category}
                                          </Badge>
                                        </div>
                                      )}
                                      {ad.rejection_reason && (
                                        <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-sm break-words">
                                          <strong>Rejection Reason:</strong>{" "}
                                          {ad.rejection_reason}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setViewingAd(ad)}
                                      className="border-blue-500/50 text-blue-400 hover:text-blue-300 flex-shrink-0"
                                    >
                                      <FileText className="h-4 w-4 mr-1" />
                                      View
                                    </Button>
                                    <Badge
                                      className={
                                        ad.status === "approved" ||
                                        ad.status === "active"
                                          ? "bg-green-500 text-white"
                                          : ad.status === "rejected"
                                          ? "bg-red-500 text-white"
                                          : "bg-yellow-500 text-white"
                                      }
                                    >
                                      {ad.status || "pending"}
                                    </Badge>
                                    {(ad.status === "pending" ||
                                      ad.status === "approved") && (
                                      <>
                                        {ad.status === "pending" && (
                                          <Button
                                            size="sm"
                                            onClick={() =>
                                              handleAdAction(ad.id, "approved")
                                            }
                                            className="bg-green-500 hover:bg-green-600 text-white flex-shrink-0"
                                          >
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Approve
                                          </Button>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setRejectingAd(ad.id)}
                                          className="border-red-500/50 text-red-400 hover:text-red-300 flex-shrink-0"
                                          disabled={rejectingAd === ad.id}
                                        >
                                          {rejectingAd === ad.id ? (
                                            <>
                                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400 mr-1" />
                                              Rejecting...
                                            </>
                                          ) : (
                                            <>
                                              <XCircle className="h-4 w-4 mr-1" />
                                              Reject
                                            </>
                                          )}
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        )}

                        {/* Load More Button for Ads */}
                        {ads.length > 0 && hasMoreAds && (
                          <div className="flex justify-center pt-6">
                            <Button
                              onClick={() => fetchNextAds()}
                              disabled={loadingMoreAds}
                              variant="outline"
                              className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700"
                            >
                              {loadingMoreAds ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Loading...
                                </>
                              ) : (
                                "Load More Ads"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Rejection Dialog */}
                  <Dialog
                    open={rejectingAd !== null}
                    onOpenChange={() => setRejectingAd(null)}
                  >
                    <DialogContent className="bg-gray-800 border-gray-700">
                      <DialogHeader>
                        <DialogTitle className="text-white">
                          Reject Advertisement
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Please provide a reason for rejecting this
                          advertisement.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          value={adRejectionReason}
                          onChange={(e) => setAdRejectionReason(e.target.value)}
                          placeholder="Enter rejection reason..."
                          className="bg-gray-700 border-gray-600 text-white"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() =>
                              handleAdAction(rejectingAd!, "rejected")
                            }
                            className="bg-red-500 hover:bg-red-600 text-white"
                            disabled={
                              !adRejectionReason.trim() || rejectingAdLoading
                            }
                          >
                            {rejectingAdLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Rejecting...
                              </>
                            ) : (
                              "Reject Advertisement"
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setRejectingAd(null);
                              setAdRejectionReason("");
                            }}
                            className="border-gray-600 text-gray-300"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Role Management Dialog */}
        <Dialog
          open={!!selectedUser}
          onOpenChange={() => setSelectedUser(null)}
        >
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                Manage User Roles
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Select roles for {selectedUser?.name || "this user"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {roleOptions.map((role) => {
                const isRestrictedRole =
                  role.value === "moderator" || role.value === "founder";
                const isDisabled =
                  isModerator && !isFounder && isRestrictedRole;

                return (
                  <div key={role.value} className="flex items-center space-x-3">
                    <Checkbox
                      id={role.value}
                      checked={editingRoles.includes(role.value)}
                      onCheckedChange={(checked) =>
                        handleRoleChange(role.value, checked as boolean)
                      }
                      disabled={isDisabled}
                    />
                    <label
                      htmlFor={role.value}
                      className={`flex items-center gap-2 text-white ${
                        isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded ${role.color}`}></div>
                      <role.icon className="h-4 w-4" />
                      {role.label}
                      {isDisabled && (
                        <span className="text-xs text-gray-400">
                          (Restricted)
                        </span>
                      )}
                    </label>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={saveUserRoles}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedUser(null)}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Script Rejection Dialog */}
        <Dialog
          open={!!rejectingScript}
          onOpenChange={() => setRejectingScript(null)}
        >
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Reject Script</DialogTitle>
              <DialogDescription className="text-gray-400">
                Please provide a reason for rejecting this script
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300">
                  Rejection Reason
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    handleScriptAction(rejectingScript!, "rejected")
                  }
                  className="bg-red-500 hover:bg-red-600"
                  disabled={!rejectionReason.trim() || rejectingScriptLoading}
                >
                  {rejectingScriptLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Rejecting...
                    </>
                  ) : (
                    "Reject Script"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRejectingScript(null)}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Giveaway Rejection Dialog */}
        <Dialog
          open={!!rejectingGiveaway}
          onOpenChange={() => setRejectingGiveaway(null)}
        >
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Reject Giveaway</DialogTitle>
              <DialogDescription className="text-gray-400">
                Please provide a reason for rejecting this giveaway
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300">
                  Rejection Reason
                </label>
                <Textarea
                  value={giveawayRejectionReason}
                  onChange={(e) => setGiveawayRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    handleGiveawayAction(rejectingGiveaway!, "rejected")
                  }
                  className="bg-red-500 hover:bg-red-600"
                  disabled={
                    !giveawayRejectionReason.trim() || rejectingGiveawayLoading
                  }
                >
                  {rejectingGiveawayLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Rejecting...
                    </>
                  ) : (
                    "Reject Giveaway"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRejectingGiveaway(null)}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Script Details Dialog */}
        <Dialog
          open={!!viewingScript}
          onOpenChange={() => setViewingScript(null)}
        >
          <DialogContent className="bg-gray-800 border-gray-700 max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Script Details
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Complete information about the script submission
              </DialogDescription>
            </DialogHeader>
            {viewingScript && (
              <div className="space-y-8">
                {/* Cover Image */}
                {viewingScript.cover_image && (
                  <div className="relative">
                    <img
                      src={viewingScript.cover_image}
                      alt={viewingScript.title}
                      className="w-full h-64 object-contain rounded-lg border border-gray-700"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge
                        className={
                          viewingScript.status === "pending"
                            ? "bg-yellow-500 text-white"
                            : viewingScript.status === "approved"
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        }
                      >
                        {viewingScript.status}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Basic Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Info className="h-5 w-5 text-orange-500" />
                        Basic Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <span className="text-gray-400 text-sm font-medium">
                            Title:
                          </span>
                          <p className="text-white text-lg font-semibold">
                            {viewingScript.title}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm font-medium">
                            Description:
                          </span>
                          <p className="text-white text-sm leading-relaxed bg-gray-900/50 p-3 rounded-lg">
                            {viewingScript.description}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-400 text-sm font-medium">
                              Category:
                            </span>
                            <p className="text-white">
                              {viewingScript.category}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm font-medium">
                              Framework:
                            </span>
                            <p className="text-white">
                              {Array.isArray(viewingScript.framework)
                                ? viewingScript.framework.join(", ")
                                : viewingScript.framework || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-400 text-sm font-medium">
                              Price:
                            </span>
                            <p className="text-white font-semibold">
                              {viewingScript.free ? "Free" : `${viewingScript.currency_symbol || "$"}${viewingScript.price}`}
                            </p>
                          </div>
                          {viewingScript.original_price && !viewingScript.free && (
                            <div>
                              <span className="text-gray-400 text-sm font-medium">
                                Original Price:
                              </span>
                              <p className="text-white line-through">
                                {viewingScript.currency_symbol || "$"}{viewingScript.original_price}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-orange-500" />
                        Seller Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <span className="text-gray-400 text-sm font-medium">
                            Seller Name:
                          </span>
                          <p className="text-white">
                            {viewingScript.seller_name}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm font-medium">
                            Seller Email:
                          </span>
                          <p className="text-white">
                            {viewingScript.seller_email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Features */}
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Star className="h-5 w-5 text-orange-500" />
                        Features
                      </h3>
                      {viewingScript.features &&
                      viewingScript.features.length > 0 ? (
                        <div className="space-y-2">
                          {viewingScript.features.map((feature, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-white text-sm">
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm bg-gray-900/50 p-3 rounded-lg">
                          No features provided
                        </div>
                      )}
                    </div>

                    {/* Requirements */}
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-orange-500" />
                        Requirements
                      </h3>
                      {viewingScript.requirements &&
                      viewingScript.requirements.length > 0 ? (
                        <div className="space-y-2">
                          {viewingScript.requirements.map(
                            (requirement, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-2"
                              >
                                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span className="text-white text-sm">
                                  {requirement}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm bg-gray-900/50 p-3 rounded-lg">
                          No requirements provided
                        </div>
                      )}
                    </div>

                    {/* Links */}
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-orange-500" />
                        Link
                      </h3>
                      {viewingScript.link ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-400 hover:text-blue-300 border-blue-500/50"
                            onClick={() =>
                              window.open(viewingScript.link!, "_blank")
                            }
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Link
                          </Button>
                          <span className="text-gray-400 text-sm truncate max-w-xs">
                            {viewingScript.link}
                          </span>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm bg-gray-900/50 p-3 rounded-lg">
                          No link provided
                        </div>
                      )}
                    </div>

                    {/* Other Links Section */}
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-orange-500" />
                        Other Links
                      </h3>
                      {viewingScript.other_links &&
                      viewingScript.other_links.length > 0 ? (
                        <div className="space-y-2">
                          {viewingScript.other_links.map((link, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 bg-gray-900/50 p-3 rounded-lg"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-400 hover:text-blue-300 border-blue-500/50"
                                onClick={() => window.open(link, "_blank")}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <span className="text-gray-300 text-sm truncate flex-1">
                                {link}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm bg-gray-900/50 p-3 rounded-lg">
                          No other links provided
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Media Section */}
                {(viewingScript.images?.length > 0 ||
                  viewingScript.videos?.length > 0 ||
                  viewingScript.screenshots?.length > 0 ||
                  viewingScript.youtube_video_link) && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-orange-500" />
                      Media & Screenshots
                    </h3>

                    {/* Images */}
                    {viewingScript.images &&
                      viewingScript.images.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-white mb-3">
                            Images
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {viewingScript.images.map((image, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={image}
                                  alt={`Image ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border border-gray-700 cursor-pointer hover:border-orange-500 transition-colors"
                                  onClick={() => window.open(image, "_blank")}
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                  <ExternalLink className="h-6 w-6 text-white" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Screenshots */}
                    {viewingScript.screenshots &&
                      viewingScript.screenshots.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-white mb-3">
                            Screenshots
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {viewingScript.screenshots.map(
                              (screenshot, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={screenshot}
                                    alt={`Screenshot ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border border-gray-700 cursor-pointer hover:border-orange-500 transition-colors"
                                    onClick={() =>
                                      window.open(screenshot, "_blank")
                                    }
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                    <ExternalLink className="h-6 w-6 text-white" />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Videos */}
                    {viewingScript.videos &&
                      viewingScript.videos.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-white mb-3">
                            Videos
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {viewingScript.videos.map((video, index) => (
                              <div key={index} className="relative group">
                                <video
                                  src={video}
                                  controls
                                  className="w-full h-48 object-cover rounded-lg border border-gray-700"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* YouTube Video Link */}
                    {viewingScript.youtube_video_link && (
                      <div className="mb-6">
                        <h4 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                          <Video className="h-5 w-5 text-red-500" />
                          YouTube Video Link
                        </h4>
                        <div className="flex items-center gap-2 bg-gray-900/50 p-3 rounded-lg">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-400 hover:text-red-300 border-red-500/50"
                            onClick={() =>
                              window.open(viewingScript.youtube_video_link!, "_blank")
                            }
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open YouTube Video
                          </Button>
                          <span className="text-gray-300 text-sm truncate flex-1">
                            {viewingScript.youtube_video_link}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="border-t border-gray-700/50 pt-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-500" />
                    Metadata
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-gray-400 text-sm font-medium">
                        Created:
                      </span>
                      <p className="text-white">
                        {new Date(
                          viewingScript.created_at
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm font-medium">
                        Updated:
                      </span>
                      <p className="text-white">
                        {new Date(
                          viewingScript.updated_at
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm font-medium">
                        Featured:
                      </span>
                      <p className="text-white">
                        {viewingScript.featured ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason */}
                {viewingScript.status === "rejected" &&
                  viewingScript.rejection_reason && (
                    <div className="border-t border-gray-700/50 pt-6">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        Rejection Reason
                      </h3>
                      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                        <p className="text-red-300">
                          {viewingScript.rejection_reason}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Action Buttons */}
                {(viewingScript.status === "pending" ||
                  viewingScript.status === "approved") && (
                  <div className="flex gap-4 pt-6 border-t border-gray-700/50">
                    {viewingScript.status === "pending" && (
                      <Button
                        onClick={() => {
                          handleScriptAction(viewingScript.id, "approved");
                          setViewingScript(null);
                        }}
                        className="bg-green-500 hover:bg-green-600 flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Script
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        setViewingScript(null);
                        setRejectingScript(viewingScript.id);
                      }}
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:text-red-300 flex-1"
                      disabled={rejectingScript === viewingScript.id}
                    >
                      {rejectingScript === viewingScript.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400 mr-2" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Script
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Giveaway Details Dialog */}
        <Dialog
          open={!!viewingGiveaway}
          onOpenChange={() => setViewingGiveaway(null)}
        >
          <DialogContent className="bg-gray-800 border-gray-700 max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-500" />
                Giveaway Details
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Complete information about the giveaway submission
              </DialogDescription>
            </DialogHeader>
            {viewingGiveaway && (
              <div className="space-y-8">
                {/* Cover Image */}
                {(viewingGiveaway as any).coverImage && (
                  <div className="relative">
                    <img
                      src={(viewingGiveaway as any).coverImage}
                      alt={viewingGiveaway.title}
                      className="w-full h-64 object-cover rounded-lg border border-gray-700"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge
                        className={
                          viewingGiveaway.status === "pending"
                            ? "bg-yellow-500 text-white"
                            : viewingGiveaway.status === "approved"
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        }
                      >
                        {viewingGiveaway.status}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Basic Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Info className="h-5 w-5 text-purple-500" />
                        Basic Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <span className="text-gray-400 text-sm font-medium">
                            Title:
                          </span>
                          <p className="text-white text-lg font-semibold">
                            {viewingGiveaway.title}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm font-medium">
                            Description:
                          </span>
                          <p className="text-white text-sm leading-relaxed bg-gray-900/50 p-3 rounded-lg">
                            {viewingGiveaway.description}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-400 text-sm font-medium">
                              Max Entries:
                            </span>
                            <p className="text-white">
                              {(viewingGiveaway as any).maxEntries ||
                                "Unlimited"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-400 text-sm font-medium">
                              Total Value:
                            </span>
                            <p className="text-white font-semibold">
                              <span className="text-orange-500">{(viewingGiveaway as any).currency_symbol || "$"}</span>{viewingGiveaway.total_value}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm font-medium">
                              End Date:
                            </span>
                            <p className="text-white">
                              {(() => {
                                const endDateStr = (viewingGiveaway as any).endDate || viewingGiveaway.end_date;
                                if (!endDateStr) return 'Not set';
                                
                                // Parse the ISO string to extract date and time components in UTC (as stored in DB)
                                const date = new Date(endDateStr);
                                const year = date.getUTCFullYear();
                                const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
                                const day = date.getUTCDate();
                                const hours = String(date.getUTCHours()).padStart(2, '0');
                                const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                                
                                // Format as 12-hour time
                                const hour12 = parseInt(hours) % 12 || 12;
                                const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
                                
                                return `${month} ${day}, ${year} at ${hour12}:${minutes} ${ampm} UTC`;
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-400 text-sm font-medium">
                              Featured:
                            </span>
                            <p className="text-white">
                              {viewingGiveaway.featured ? "Yes (+$10)" : "No"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm font-medium">
                              Auto Announce:
                            </span>
                            <p className="text-white">
                              {viewingGiveaway.auto_announce ? "Yes" : "No"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-purple-500" />
                        Creator Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <span className="text-gray-400 text-sm font-medium">
                            Creator Name:
                          </span>
                          <p className="text-white">
                            {viewingGiveaway.creator_name}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm font-medium">
                            Creator Email:
                          </span>
                          <p className="text-white">
                            {viewingGiveaway.creator_email}
                          </p>
                        </div>
                        {(viewingGiveaway as any).creator_id && (
                          <div>
                            <span className="text-gray-400 text-sm font-medium">
                              Creator ID:
                            </span>
                            <p className="text-white font-mono text-sm">
                              {viewingGiveaway.creator_id}
                            </p>
                          </div>
                        )}
                        {(viewingGiveaway as any).entriesCount !==
                          undefined && (
                          <div>
                            <span className="text-gray-400 text-sm font-medium">
                              Current Entries:
                            </span>
                            <p className="text-white font-semibold">
                              {(viewingGiveaway as any).entriesCount}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Requirements */}
                    {viewingGiveaway.requirements &&
                      viewingGiveaway.requirements.length > 0 && (
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Target className="h-5 w-5 text-purple-500" />
                            Entry Requirements
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                              {viewingGiveaway.requirements.reduce(
                                (sum: number, req: any) =>
                                  sum + (req.points || 0),
                                0
                              )}{" "}
                              total points
                            </Badge>
                          </h3>
                          <div className="space-y-3">
                            {viewingGiveaway.requirements.map(
                              (requirement: any, index: number) => (
                                <div
                                  key={index}
                                  className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                      <span className="text-white font-medium">
                                        Requirement {index + 1}
                                      </span>
                                      {requirement.required && (
                                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                          Required
                                        </Badge>
                                      )}
                                    </div>
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                      {requirement.points || 0} points
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <span className="text-gray-400 text-sm font-medium">
                                        Type:
                                      </span>
                                      <p className="text-white capitalize">
                                        {requirement.type}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-400 text-sm font-medium">
                                        Description:
                                      </span>
                                      <p className="text-white text-sm">
                                        {requirement.description}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Prizes */}
                    {viewingGiveaway.prizes &&
                      viewingGiveaway.prizes.length > 0 && (
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-purple-500" />
                            Prizes ({viewingGiveaway.prizes.length})
                          </h3>
                          <div className="space-y-3">
                            {viewingGiveaway.prizes.map(
                              (prize: any, index: number) => (
                                <div
                                  key={index}
                                  className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Star className="h-4 w-4 text-yellow-500" />
                                      <span className="text-white font-medium">
                                        {index === 0
                                          ? "1st"
                                          : index === 1
                                          ? "2nd"
                                          : index === 2
                                          ? "3rd"
                                          : `${index + 1}th`}
                                      </span>
                                    </div>
                                    {prize.value && (
                                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                        ${prize.value}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <span className="text-gray-400 text-sm font-medium">
                                        Prize Name:
                                      </span>
                                      <p className="text-white font-medium">
                                        {prize.name}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-400 text-sm font-medium">
                                        Description:
                                      </span>
                                      <p className="text-white text-sm">
                                        {prize.description}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Rules */}
                    {viewingGiveaway.rules &&
                      viewingGiveaway.rules.length > 0 && (
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-purple-500" />
                            Rules
                          </h3>
                          <div className="space-y-2">
                            {viewingGiveaway.rules.map(
                              (rule: string, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-white text-sm">
                                    {rule}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Tags Section */}
                {viewingGiveaway.tags && viewingGiveaway.tags.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Tag className="h-5 w-5 text-purple-500" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {viewingGiveaway.tags.map(
                        (tag: string, index: number) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-purple-500/20 text-purple-300 border-purple-500/30"
                          >
                            {tag}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Media Section */}
                {(viewingGiveaway.images?.length > 0 ||
                  viewingGiveaway.videos?.length > 0 ||
                  (viewingGiveaway as any).coverImage ||
                  (viewingGiveaway as any).youtube_video_link ||
                  (viewingGiveaway as any).youtubeVideoLink) && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-purple-500" />
                      Media & Content
                    </h3>

                    {/* Cover Image */}
                    {(viewingGiveaway as any).coverImage && (
                      <div className="mb-6">
                        <h4 className="text-lg font-medium text-white mb-3">
                          Cover Image
                        </h4>
                        <div className="max-w-md">
                          <div className="relative group">
                            <img
                              src={(viewingGiveaway as any).coverImage}
                              alt="Cover Image"
                              className="w-full h-48 object-cover rounded-lg border border-gray-700 cursor-pointer hover:border-purple-500 transition-colors"
                              onClick={() =>
                                window.open(
                                  (viewingGiveaway as any).coverImage,
                                  "_blank"
                                )
                              }
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <ExternalLink className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Additional Images */}
                    {viewingGiveaway.images &&
                      viewingGiveaway.images.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-white mb-3">
                            Additional Images ({viewingGiveaway.images.length})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {viewingGiveaway.images.map(
                              (image: string, index: number) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={image}
                                    alt={`Image ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border border-gray-700 cursor-pointer hover:border-purple-500 transition-colors"
                                    onClick={() => window.open(image, "_blank")}
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                    <ExternalLink className="h-6 w-6 text-white" />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Videos */}
                    {viewingGiveaway.videos &&
                      viewingGiveaway.videos.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-white mb-3">
                            Videos ({viewingGiveaway.videos.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {viewingGiveaway.videos.map(
                              (video: string, index: number) => (
                                <div key={index} className="relative group">
                                  <video
                                    src={video}
                                    controls
                                    className="w-full h-48 object-cover rounded-lg border border-gray-700"
                                  />
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* YouTube Video Link */}
                    {((viewingGiveaway as any).youtube_video_link || (viewingGiveaway as any).youtubeVideoLink) && (
                      <div className="mb-6">
                        <h4 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                          <Video className="h-5 w-5 text-red-500" />
                          YouTube Video Link
                        </h4>
                        <div className="flex items-center gap-2 bg-gray-900/50 p-3 rounded-lg">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-400 hover:text-red-300 border-red-500/50"
                            onClick={() =>
                              window.open((viewingGiveaway as any).youtube_video_link || (viewingGiveaway as any).youtubeVideoLink, "_blank")
                            }
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open YouTube Video
                          </Button>
                          <span className="text-gray-300 text-sm truncate flex-1">
                            {(viewingGiveaway as any).youtube_video_link || (viewingGiveaway as any).youtubeVideoLink}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="border-t border-gray-700/50 pt-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    Metadata & Statistics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-gray-400 text-sm font-medium">
                        Created:
                      </span>
                      <p className="text-white">
                        {new Date(
                          viewingGiveaway.created_at
                        ).toLocaleDateString()}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(
                          viewingGiveaway.created_at
                        ).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm font-medium">
                        Updated:
                      </span>
                      <p className="text-white">
                        {new Date(
                          viewingGiveaway.updated_at
                        ).toLocaleDateString()}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(
                          viewingGiveaway.updated_at
                        ).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm font-medium">
                        Status:
                      </span>
                      <p className="text-white">{viewingGiveaway.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm font-medium">
                        Giveaway ID:
                      </span>
                      <p className="text-white font-mono text-sm">
                        #{viewingGiveaway.id}
                      </p>
                    </div>
                  </div>

                  {/* Additional metadata if available */}
                  {(viewingGiveaway as any).submittedAt && (
                    <div className="mt-4 pt-4 border-t border-gray-700/30">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-gray-400 text-sm font-medium">
                            Submitted:
                          </span>
                          <p className="text-white">
                            {new Date(
                              (viewingGiveaway as any).submittedAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        {(viewingGiveaway as any).approvedAt && (
                          <div>
                            <span className="text-gray-400 text-sm font-medium">
                              Approved:
                            </span>
                            <p className="text-white">
                              {new Date(
                                (viewingGiveaway as any).approvedAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {(viewingGiveaway as any).rejectedAt && (
                          <div>
                            <span className="text-gray-400 text-sm font-medium">
                              Rejected:
                            </span>
                            <p className="text-white">
                              {new Date(
                                (viewingGiveaway as any).rejectedAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Notes */}
                {(viewingGiveaway as any).adminNotes && (
                  <div className="border-t border-gray-700/50 pt-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-500" />
                      Admin Notes
                    </h3>
                    <div className="bg-gray-900/50 border border-gray-600/50 rounded-lg p-4">
                      <p className="text-white text-sm leading-relaxed">
                        {(viewingGiveaway as any).adminNotes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {viewingGiveaway.status === "rejected" &&
                  viewingGiveaway.rejection_reason && (
                    <div className="border-t border-gray-700/50 pt-6">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        Rejection Reason
                      </h3>
                      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                        <p className="text-red-300">
                          {viewingGiveaway.rejection_reason}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Action Buttons */}
                {(viewingGiveaway.status === "pending" ||
                  viewingGiveaway.status === "approved") && (
                  <div className="flex gap-4 pt-6 border-t border-gray-700/50">
                    {viewingGiveaway.status === "pending" && (
                      <Button
                        onClick={() => {
                          handleGiveawayAction(viewingGiveaway.id, "approved");
                          setViewingGiveaway(null);
                        }}
                        className="bg-green-500 hover:bg-green-600 flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Giveaway
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        setViewingGiveaway(null);
                        setRejectingGiveaway(viewingGiveaway.id);
                      }}
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:text-red-300 flex-1"
                      disabled={rejectingGiveaway === viewingGiveaway.id}
                    >
                      {rejectingGiveaway === viewingGiveaway.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400 mr-2" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Giveaway
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Ad Details Dialog */}
        <Dialog open={!!viewingAd} onOpenChange={() => setViewingAd(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">
                Ad Details
              </DialogTitle>
            </DialogHeader>
            {viewingAd && (
              <div className="space-y-6">
                {/* Cover Image */}
                {viewingAd.imageUrl && (
                  <div className="relative">
                    <img
                      src={viewingAd.imageUrl}
                      alt={viewingAd.title}
                      className="w-full h-64 object-contain rounded-lg bg-gray-800"
                    />
                  </div>
                )}

                {/* Media Gallery */}
                {viewingAd.images?.length > 0 && (
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-3">
                      Media Gallery
                    </h3>

                    <div className="mb-4">
                      <h4 className="text-gray-300 text-sm mb-2">
                        Images ({viewingAd.images.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {viewingAd.images.map(
                          (image: string, index: number) => (
                            <div key={index} className="relative group">
                              <img
                                src={image}
                                alt={`Ad image ${index + 1}`}
                                className="w-full h-32 object-contain rounded-lg cursor-pointer hover:opacity-80 transition-opacity bg-gray-800"
                                onClick={() => window.open(image, "_blank")}
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                <ExternalLink className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      viewingAd.status === "approved" ||
                      viewingAd.status === "active"
                        ? "bg-green-500 text-white"
                        : viewingAd.status === "rejected"
                        ? "bg-red-500 text-white"
                        : "bg-yellow-500 text-white"
                    }
                  >
                    {viewingAd.status || "pending"}
                  </Badge>
                  <span className="text-gray-400 text-sm">
                    ID: #{viewingAd.id}
                  </span>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h3 className="text-white font-semibold mb-3">
                        Basic Information
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-white text-lg font-semibold">
                            {viewingAd.title}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-300 text-sm mb-1">
                            Description:
                          </p>
                          <p className="text-white text-sm leading-relaxed">
                            {viewingAd.description}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-300 text-sm mb-1">
                            Category:
                          </p>
                          <p className="text-white">{viewingAd.category}</p>
                        </div>
                        <div>
                          <p className="text-gray-300 text-sm mb-1">
                            Priority:
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h3 className="text-white font-semibold mb-3">
                        Creator Information
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-gray-300 text-sm mb-1">
                            Creator Name:
                          </p>
                          <p className="text-white">
                            {viewingAd.creator_name || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-300 text-sm mb-1">
                            Creator Email:
                          </p>
                          <p className="text-white">
                            {viewingAd.creator_email || "N/A"}
                          </p>
                        </div>
                        {viewingAd.creator_id && (
                          <div>
                            <p className="text-gray-300 text-sm mb-1">
                              Creator ID:
                            </p>
                            <p className="text-white font-mono text-sm">
                              {viewingAd.creator_id}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h3 className="text-white font-semibold mb-3">
                        Ad Details
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-gray-300 text-sm mb-1">
                            Link URL:
                          </p>
                          <a
                            href={viewingAd.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 break-all"
                          >
                            {viewingAd.linkUrl}
                          </a>
                        </div>
                        <div>
                          <p className="text-gray-300 text-sm mb-1">
                            Image URL:
                          </p>
                          <a
                            href={viewingAd.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 break-all"
                          >
                            {viewingAd.imageUrl}
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h3 className="text-white font-semibold mb-3">
                        Timestamps
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-gray-300 text-sm mb-1">Created:</p>
                          <p className="text-white">
                            {new Date(viewingAd.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {new Date(viewingAd.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-300 text-sm mb-1">Updated:</p>
                          <p className="text-white">
                            {new Date(viewingAd.updatedAt).toLocaleDateString()}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {new Date(viewingAd.updatedAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-300 text-sm mb-1">Status:</p>
                          <p className="text-white">
                            {viewingAd.status || "pending"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-300 text-sm mb-1">Ad ID:</p>
                          <p className="text-white font-mono text-sm">
                            #{viewingAd.id}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submission Timeline */}
                {viewingAd.submittedAt && (
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-3">
                      Submission Timeline
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-gray-300 text-sm mb-1">Submitted:</p>
                        <p className="text-white">
                          {new Date(viewingAd.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {viewingAd.approvedAt && (
                        <div>
                          <p className="text-gray-300 text-sm mb-1">
                            Approved:
                          </p>
                          <p className="text-white">
                            {new Date(
                              viewingAd.approvedAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {viewingAd.rejectedAt && (
                        <div>
                          <p className="text-gray-300 text-sm mb-1">
                            Rejected:
                          </p>
                          <p className="text-white">
                            {new Date(
                              viewingAd.rejectedAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                {viewingAd.adminNotes && (
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-3">
                      Admin Notes
                    </h3>
                    <div className="bg-gray-700/50 p-3 rounded border border-gray-600">
                      <p className="text-white text-sm leading-relaxed">
                        {viewingAd.adminNotes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {viewingAd.status === "rejected" &&
                  viewingAd.rejectionReason && (
                    <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
                      <h3 className="text-red-400 font-semibold mb-3">
                        Rejection Reason
                      </h3>
                      <div className="bg-red-800/20 p-3 rounded border border-red-500/20">
                        <p className="text-red-300">
                          {viewingAd.rejectionReason}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-700">
                  {(!viewingAd.status || viewingAd.status === "pending") && (
                    <Button
                      onClick={() => {
                        handleAdAction(viewingAd.id, "approved");
                        setViewingAd(null);
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Ad
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setViewingAd(null);
                      setRejectingAd(viewingAd.id);
                    }}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:text-red-300 flex-1"
                    disabled={rejectingAd === viewingAd.id}
                  >
                    {rejectingAd === viewingAd.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400 mr-2" />
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Ad
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* <Footer /> */}
      </div>
    </>
  );
}
