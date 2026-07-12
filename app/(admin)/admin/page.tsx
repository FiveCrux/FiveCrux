"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
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
  LayoutDashboard,
  Inbox,
  FileCode2,
  Box,
  Activity,
  ChevronDown,
  Check,
  X,
  Eye,
  Menu,
  LogOut,
  CalendarDays,
  ShieldCheck,
  Search,
} from "lucide-react";
import Link from "next/link";
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
import VerificationRequests from "@/componentss/admin/verification-requests";
import HomeContentManager from "@/componentss/admin/home-content-manager";
import { useRoleValidation } from "@/hooks/use-role-validation";
import { getUserProfilePicture } from "@/lib/user-utils";
import {
  useAdminUsers,
  useAdminScripts,
  useAdminGiveaways,
  useAdminAds,
  useAdminProps,
  useUpdateUserRoles,
  useUpdateScript,
  useUpdateGiveaway,
  useUpdateAd,
  useUpdateAdminProp,
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

interface Prop {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPercentage?: number;
  discountedPrice?: number | null;
  images: string[];
  zipFile: string;
  createdBy: string;
  status: string;
  created_at: string;
  rejection_reason?: string;
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
  {
    value: "prop_lister",
    label: "Prop Lister",
    icon: Package,
    color: "bg-orange-500",
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

  const {
    data: propsData,
    isLoading: propsLoading,
    fetchNextPage: fetchNextProps,
    hasNextPage: hasMoreProps,
    isFetchingNextPage: loadingMoreProps,
  } = useAdminProps();

  // Flatten paginated data
  const users = usersData?.pages.flatMap((page) => page.users) || [];
  const scripts: Script[] = scriptsData?.pages.flatMap((page) => page.scripts) || [];
  const giveaways =
    giveawaysData?.pages.flatMap((page) => page.giveaways) || [];
  const ads = adsData?.pages.flatMap((page) => page.ads) || [];
  const props: Prop[] = propsData?.pages.flatMap((page) => page.props) || [];

  // Debug logging for ads
  console.log("Admin Dashboard - Ads:", ads.length, "Loading:", adsLoading);

  // Mutations
  const updateUserRolesMutation = useUpdateUserRoles();
  const updateScriptMutation = useUpdateScript();
  const updateGiveawayMutation = useUpdateGiveaway();
  const updateAdMutation = useUpdateAd();
  const updatePropMutation = useUpdateAdminProp();
  const createAdMutation = useCreateAd();
  const deleteAdMutation = useDeleteAd();

  // Safety timeout so the gating loader never spins forever when the DB/API is
  // unavailable in dev. After 8s we stop blocking and fall through to empty states.
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Combined loading state
  const isFetching =
    usersLoading || scriptsLoading || giveawaysLoading || adsLoading || propsLoading;
  // Never block the UI for more than 8s — if the data layer hangs (e.g. DB absent
  // in dev) we render the dashboard with empty states instead of an infinite spinner.
  const loading = isFetching && !loadingTimedOut;

  useEffect(() => {
    if (!isFetching) return;
    const c = new AbortController();
    const t = setTimeout(() => {
      c.abort();
      setLoadingTimedOut(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [isFetching]);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [verificationCount, setVerificationCount] = useState(0);

  // Check if user has moderator role
  const userRoles = (session?.user as any)?.roles || [];
  const isModerator = userRoles.includes("moderator");
  const isFounder = userRoles.includes("founder");

  // Seed the pending verification badge count (independent of opening the tab).
  useEffect(() => {
    if (!isModerator && !isFounder) return;
    let alive = true;
    fetch("/api/admin/verification")
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((d) => {
        if (alive) setVerificationCount(Array.isArray(d.requests) ? d.requests.length : 0);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isModerator, isFounder]);

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
  const [scriptSearchQuery, setScriptSearchQuery] = useState("");
  const [scriptCategoryFilter, setScriptCategoryFilter] = useState("all");
  const [rejectingScript, setRejectingScript] = useState<number | null>(null);
  const [rejectingScriptLoading, setRejectingScriptLoading] = useState(false);
  const [approvingScript, setApprovingScript] = useState<number | null>(null);
  const [viewingScript, setViewingScript] = useState<Script | null>(null);
  const [viewingGiveaway, setViewingGiveaway] = useState<Giveaway | null>(null);
  const [viewingAd, setViewingAd] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeGiveawayFilter, setActiveGiveawayFilter] = useState("all");
  const [giveawaySearchQuery, setGiveawaySearchQuery] = useState("");
  const [giveawayCategoryFilter, setGiveawayCategoryFilter] = useState("all");
  const [rejectingGiveaway, setRejectingGiveaway] = useState<number | null>(
    null
  );
  const [rejectingGiveawayLoading, setRejectingGiveawayLoading] =
    useState(false);
  const [giveawayRejectionReason, setGiveawayRejectionReason] = useState("");
  const [activeAdFilter, setActiveAdFilter] = useState("all");
  const [adSearchQuery, setAdSearchQuery] = useState("");
  const [adCategoryFilter, setAdCategoryFilter] = useState("all");
  const [rejectingAd, setRejectingAd] = useState<number | null>(null);
  const [rejectingAdLoading, setRejectingAdLoading] = useState(false);
  const [adRejectionReason, setAdRejectionReason] = useState("");
  const [activePropFilter, setActivePropFilter] = useState("all");
  const [propSearchQuery, setPropSearchQuery] = useState("");
  const [rejectingProp, setRejectingProp] = useState<string | null>(null);
  const [rejectingPropLoading, setRejectingPropLoading] = useState(false);
  const [approvingProp, setApprovingProp] = useState<string | null>(null);
  const [propRejectionReason, setPropRejectionReason] = useState("");

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
        formData.append("type", "image");
        formData.append("purpose", "ad_creative");

        // Abort the upload after 8s so the dialog never hangs indefinitely.
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 15000);
        let uploadResponse: Response;
        try {
          uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formData,
            signal: c.signal,
          });
        } finally {
          clearTimeout(t);
        }

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
    totalProps: props.length,
    totalAds: ads.length,
    pendingScripts: scripts.filter((s) => s.status === "pending").length,
    activeAds: ads.filter((a) => a.status === "active").length,
  };

  // Display stats — real counts only (shown even when 0).
  const displayStats = {
    totalUsers: stats.totalUsers,
    totalScripts: stats.totalScripts,
    totalGiveaways: stats.totalGiveaways,
    totalProps: stats.totalProps,
    totalAds: stats.totalAds,
  };

  // Real pending submissions across all content types, mapped into a single
  // shape for the "Pending approvals" table.
  type PendingRow = {
    key: string;
    title: string;
    image: string;
    type: "Asset" | "Prop" | "Giveaway" | "Ad";
    submitter: string;
    when: string;
    onApprove?: () => void;
    onReject?: () => void;
    onView?: () => void;
  };

  const timeAgo = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso).getTime();
    if (Number.isNaN(d)) return "—";
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const realPendingRows: PendingRow[] = [
    ...scripts
      .filter((s) => s.status === "pending")
      .map<PendingRow>((s) => ({
        key: `script-${s.id}`,
        title: s.title,
        image: s.cover_image || s.images?.[0] || "",
        type: "Asset",
        submitter: s.seller_name,
        when: timeAgo(s.created_at),
        onApprove: () => handleScriptAction(s.id, "approved"),
        onReject: () => setRejectingScript(s.id),
        onView: () => setViewingScript(s),
      })),
    ...props
      .filter((p) => p.status === "pending")
      .map<PendingRow>((p) => ({
        key: `prop-${p.id}`,
        title: p.name,
        image: p.images?.[0] || "",
        type: "Prop",
        submitter: p.createdBy,
        when: timeAgo(p.created_at),
        onApprove: () => handlePropAction(p.id, "approved"),
        onReject: () => setRejectingProp(p.id),
      })),
    ...giveaways
      .filter((g) => g.status === "pending")
      .map<PendingRow>((g) => ({
        key: `giveaway-${g.id}`,
        title: g.title,
        image: (g as any).coverImage || g.images?.[0] || "",
        type: "Giveaway",
        submitter: g.creator_name,
        when: timeAgo(g.created_at),
        onApprove: () => handleGiveawayAction(g.id, "approved"),
        onReject: () => setRejectingGiveaway(g.id),
        onView: () => setViewingGiveaway(g),
      })),
    ...ads
      .filter((a) => !a.status || a.status === "pending")
      .map<PendingRow>((a) => ({
        key: `ad-${a.id}`,
        title: a.title,
        image: (a as any).imageUrl || a.image || "",
        type: "Ad",
        submitter: a.creator_name,
        when: timeAgo(a.created_at),
        onApprove: () => handleAdAction(a.id, "approved"),
        onReject: () => setRejectingAd(a.id),
        onView: () => setViewingAd(a),
      })),
  ];

  // Real pending submissions only — no demo fallback.
  const pendingRows = realPendingRows;
  const pendingCount = realPendingRows.length;

  // Type badge colors for the pending table (semantic-ish per content type).
  const typeBadgeClass: Record<PendingRow["type"], string> = {
    Asset: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
    Prop: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    Giveaway: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
    Ad: "bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20",
  };

  // Sidebar navigation -> drives the SAME activeTab state as the original tabs.
  // Items gated to moderator/founder mirror the original tab visibility rules.
  const navItems: {
    value: string;
    label: string;
    icon: any;
    badge?: number;
    gated?: boolean;
  }[] = [
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      value: "pending",
      label: "Pending",
      icon: Inbox,
      badge: pendingCount,
    },
    { value: "users", label: "Users", icon: Users, gated: true },
    { value: "scripts", label: "Assets", icon: FileCode2 },
    { value: "giveaways", label: "Giveaways", icon: Gift },
    { value: "props", label: "Props", icon: Box },
    { value: "ads", label: "Ads", icon: Megaphone, gated: true },
    {
      value: "verification",
      label: "Verification",
      icon: ShieldCheck,
      gated: true,
      badge: verificationCount,
    },
    { value: "home-content", label: "Home Content", icon: FileText, gated: true },
  ];

  // Filter scripts based on active filter
  const scriptCategories = Array.from(
    new Set(scripts.map((s) => s.category).filter(Boolean))
  ) as string[];
  const filteredScripts = scripts.filter((script) => {
    if (activeScriptFilter !== "all" && script.status !== activeScriptFilter) return false;
    if (scriptCategoryFilter !== "all" && script.category !== scriptCategoryFilter) return false;
    const query = scriptSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      script.title?.toLowerCase().includes(query) ||
      script.description?.toLowerCase().includes(query) ||
      script.seller_name?.toLowerCase().includes(query) ||
      script.seller_email?.toLowerCase().includes(query)
    );
  });

  // Filter giveaways based on active filter
  const giveawayCategories = Array.from(
    new Set(giveaways.map((g) => g.category).filter(Boolean))
  ) as string[];
  const filteredGiveaways = giveaways.filter((giveaway) => {
    if (activeGiveawayFilter !== "all" && giveaway.status !== activeGiveawayFilter) return false;
    if (giveawayCategoryFilter !== "all" && giveaway.category !== giveawayCategoryFilter) return false;
    const query = giveawaySearchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      giveaway.title?.toLowerCase().includes(query) ||
      giveaway.description?.toLowerCase().includes(query) ||
      giveaway.creator_name?.toLowerCase().includes(query) ||
      giveaway.creator_email?.toLowerCase().includes(query) ||
      giveaway.tags?.some((tag) => tag?.toLowerCase().includes(query))
    );
  });

  const filteredProps = props.filter((prop) => {
    if (activePropFilter !== "all" && prop.status !== activePropFilter) return false;
    const query = propSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      prop.name?.toLowerCase().includes(query) ||
      prop.description?.toLowerCase().includes(query) ||
      (prop as any).createdBy?.toLowerCase?.().includes(query)
    );
  });

  const adCategories = Array.from(
    new Set(ads.map((a) => a.category).filter(Boolean))
  ) as string[];
  const filteredAds = ads.filter((ad) => {
    if (activeAdFilter === "pending" && !(!ad.status || ad.status === "pending")) return false;
    if (activeAdFilter === "approved" && !(ad.status === "approved" || ad.status === "active")) return false;
    if (activeAdFilter === "rejected" && ad.status !== "rejected") return false;
    if (adCategoryFilter !== "all" && ad.category !== adCategoryFilter) return false;
    const query = adSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      ad.title?.toLowerCase().includes(query) ||
      ad.description?.toLowerCase().includes(query) ||
      ad.creator_name?.toLowerCase().includes(query) ||
      ad.creator_email?.toLowerCase().includes(query)
    );
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

  const handlePropAction = async (
    propId: string,
    status: "approved" | "rejected"
  ) => {
    if (status === "rejected") {
      setRejectingPropLoading(true);
    } else {
      setApprovingProp(propId);
    }

    updatePropMutation.mutate(
      {
        propId,
        status,
        reason: status === "rejected" ? propRejectionReason : undefined,
      },
      {
        onSuccess: () => {
          if (status === "rejected") {
            setRejectingProp(null);
            setPropRejectionReason("");
          }
        },
        onSettled: () => {
          if (status === "rejected") {
            setRejectingPropLoading(false);
          } else {
            setApprovingProp(null);
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
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-white/10 border-t-orange-500" />
          <p className="text-sm text-gray-400">Loading admin dashboard...</p>
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

  // Pending-approvals table (shared by Dashboard + Pending sections). Maps the
  // mapped pending rows (real or demo) into the mockup's table; Approve = green,
  // Reject = red, View = neutral — all calling the existing handlers/dialogs.
  const renderPendingTable = () => (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0e0e0e]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold">Pending approvals</h2>
          <span className="rounded-full bg-orange-500/12 px-2 py-0.5 text-[11px] font-bold text-orange-400 ring-1 ring-orange-500/25 [font-variant-numeric:tabular-nums]">
            {pendingCount} waiting
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-white/[0.05] text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
              <th className="px-5 py-3 font-semibold">Submission</th>
              <th className="px-3 py-3 font-semibold">Type</th>
              <th className="px-3 py-3 font-semibold">Submitter</th>
              <th className="px-3 py-3 font-semibold">When</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {pendingRows.map((row) => (
              <tr key={row.key} className="group hover:bg-white/[0.015]">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {row.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.image}
                        alt={row.title}
                        className="h-11 w-16 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="grid h-11 w-16 shrink-0 place-items-center rounded-lg bg-white/[0.04] ring-1 ring-white/10">
                        <ImageIcon className="h-4 w-4 text-white/25" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold">
                        {row.title}
                      </div>
                      <div className="text-[11px] text-white/55">
                        {row.key}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <span
                    className={`rounded-md px-2 py-1 text-[11px] font-bold ring-1 ${typeBadgeClass[row.type]}`}
                  >
                    {row.type}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[10px] font-bold text-white/80">
                      {(row.submitter || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate text-[13px] font-medium text-white/80">
                      {row.submitter || "Unknown"}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3.5 text-[12px] text-white/55">
                  {row.when}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={row.onApprove}
                      disabled={!row.onApprove}
                      title="Approve"
                      className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/25 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={row.onReject}
                      disabled={!row.onReject}
                      title="Reject"
                      className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/12 text-red-400 ring-1 ring-red-500/25 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={row.onView}
                      disabled={!row.onView}
                      title="View"
                      className="grid h-8 w-8 place-items-center rounded-lg text-white/55 ring-1 ring-white/10 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pendingRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-white/55">
                  Nothing waiting for review.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      {/* No global <Navbar/> here — the admin shell provides its own top bar below
          (removing it fixes the double-navbar). */}
      <div className="relative min-h-screen bg-[#0a0a0a] text-white">
        {/* Admin top bar (logo + Admin Panel tag, avatar + Logout) */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/[0.06] bg-[#0a0a0a]/85 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg text-white/50 hover:bg-white/5 lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-sm font-black text-black">
              F
            </span>
            <span className="text-[17px] font-extrabold tracking-tight">
              FiveCrux
            </span>
            <span className="ml-1 rounded-md bg-orange-500/12 px-2 py-0.5 text-[11px] font-bold text-orange-400 ring-1 ring-orange-500/25">
              Admin Panel
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2.5 rounded-xl border border-white/[0.07] py-1 pl-1 pr-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-yellow-400 text-xs font-bold text-black">
              {session?.user?.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="hidden leading-tight sm:block">
              <div className="text-[13px] font-semibold">
                {session?.user?.name || "Admin"}
              </div>
              <div className="text-[10px] text-white/55">
                {isFounder ? "Founder" : isModerator ? "Moderator" : "Admin"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-white/55 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex">
            {/* Left vertical nav — drives the SAME activeTab state */}
            <aside
              className={`${
                mobileNavOpen ? "flex" : "hidden"
              } absolute z-20 h-[calc(100vh-4rem)] w-60 flex-col border-r border-white/[0.06] bg-[#0a0a0a] px-3 py-5 lg:sticky lg:top-16 lg:flex lg:shrink-0 lg:bg-transparent`}
            >
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                Workspace
              </div>
              <nav className="mt-2 space-y-0.5">
                {navItems
                  .filter((item) => !item.gated || isModerator || isFounder)
                  .map((item) => {
                    const active = activeTab === item.value;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.value);
                          setMobileNavOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          active
                            ? "bg-orange-500/12 font-semibold text-orange-400 ring-1 ring-inset ring-orange-500/20"
                            : "font-medium text-white/60 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        {item.label}
                        {item.badge ? (
                          <span className="ml-auto rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-black [font-variant-numeric:tabular-nums]">
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
              </nav>
              <div className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                System
              </div>
              <nav className="mt-2 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("settings");
                    setMobileNavOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    activeTab === "settings"
                      ? "bg-orange-500/12 font-semibold text-orange-400 ring-1 ring-inset ring-orange-500/20"
                      : "font-medium text-white/60 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Settings className="h-[18px] w-[18px]" />
                  Settings
                </button>
                <Link
                  href="/admin/categories"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  <Tag className="h-[18px] w-[18px]" />
                  Categories
                </Link>
                <Link
                  href="/admin/frameworks"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  <FileCode2 className="h-[18px] w-[18px]" />
                  Frameworks
                </Link>
              </nav>
              <div className="mt-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="flex items-center gap-2 text-[13px] font-semibold">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  All systems normal
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                  Moderation queue is healthy.
                </p>
              </div>
            </aside>

            {/* Main area */}
            <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-orange-300 mb-3">
                    <Shield className="h-3.5 w-3.5" />
                    Admin Panel
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight">
                    Dashboard
                  </h1>
                  <p className="mt-1 text-sm text-white/55">
                    Overview of the FiveCrux marketplace and moderation queue.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-white/55">
                  <CalendarDays className="h-4 w-4" />
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>

              {/* Summary stat cards */}
              <motion.section
                className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {[
                  { label: "Users", value: displayStats.totalUsers, icon: Users },
                  { label: "Assets", value: displayStats.totalScripts, icon: FileCode2 },
                  { label: "Giveaways", value: displayStats.totalGiveaways, icon: Gift },
                  { label: "Props", value: displayStats.totalProps, icon: Box },
                  { label: "Ads", value: displayStats.totalAds, icon: Megaphone },
                ].map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-2xl border border-white/[0.06] bg-[#0e0e0e] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                        {tile.label}
                      </span>
                      <tile.icon className="h-4 w-4 text-white/25" />
                    </div>
                    <div className="mt-3 text-2xl font-extrabold tracking-tight [font-variant-numeric:tabular-nums]">
                      {tile.value.toLocaleString()}
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl border border-orange-500/25 bg-orange-500/[0.06] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-400/80">
                      Pending review
                    </span>
                    <Clock className="h-4 w-4 text-orange-400/70" />
                  </div>
                  <div className="mt-3 text-2xl font-extrabold tracking-tight text-orange-400 [font-variant-numeric:tabular-nums]">
                    {pendingCount}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-orange-400/70">
                    Needs attention
                  </div>
                </div>
              </motion.section>

              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                {/* Dashboard / Pending share the pending table + users panel */}
                <TabsContent value="dashboard" className="m-0 xl:col-span-2 space-y-6">
                  {renderPendingTable()}

                  {/* Users management panel */}
                  {(isModerator || isFounder) && (
                    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0e0e0e]">
                      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                        <h2 className="text-sm font-bold">Users</h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab("users")}
                          className="text-[12px] font-semibold text-white/55 hover:text-white"
                        >
                          Manage →
                        </button>
                      </div>
                      <div className="divide-y divide-white/[0.05]">
                        {users.slice(0, 6).map((user) => {
                          const profilePic = getUserProfilePicture(user);
                          const primaryRole = roleOptions.find((r) =>
                            user.roles.includes(r.value)
                          );
                          const restricted =
                            isModerator &&
                            !isFounder &&
                            (user.roles.includes("moderator") ||
                              user.roles.includes("founder"));
                          return (
                            <div
                              key={user.id}
                              className="flex items-center gap-3 px-5 py-3.5"
                            >
                              <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-500 to-yellow-400 text-sm font-bold text-black">
                                {profilePic ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={profilePic}
                                    alt={user.name || "User"}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  user.name?.[0]?.toUpperCase() || "U"
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-semibold">
                                  {user.name || "Unknown"}
                                </div>
                                <div className="truncate text-[11px] text-white/55">
                                  {user.email}
                                </div>
                              </div>
                              {primaryRole && (
                                <span
                                  className={`hidden rounded-md px-2 py-1 text-[11px] font-bold text-white sm:inline ${primaryRole.color}`}
                                >
                                  {primaryRole.label}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditingRoles([...user.roles]);
                                }}
                                disabled={restricted}
                                className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[12px] font-semibold text-white/60 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Change role
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                        {users.length === 0 && (
                          <div className="px-5 py-8 text-center text-sm text-white/55">
                            No users to display.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Recent activity timeline */}
                <section className="xl:col-span-1">
                  <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0e0e0e]">
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                      <h2 className="text-sm font-bold">Recent activity</h2>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                        Audit log
                      </span>
                    </div>
                    <div className="px-5 py-4">
                      {scripts.length > 0 ? (
                        <div className="space-y-4">
                          {scripts.slice(0, 5).map((script) => (
                            <div
                              key={script.id}
                              className="flex items-start gap-3"
                            >
                              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
                                <Package className="h-3.5 w-3.5" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] leading-snug">
                                  <span className="font-semibold">
                                    {script.title}
                                  </span>
                                </p>
                                <p className="mt-0.5 text-[11px] text-white/55">
                                  by {script.seller_name} · <span className="capitalize">{script.status}</span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-white/[0.04] ring-1 ring-white/10">
                            <Activity className="h-4 w-4 text-white/25" />
                          </span>
                          <p className="text-[13px] font-medium text-white/55">No recent activity</p>
                          <p className="mt-0.5 text-[11px] text-white/55">
                            Moderation actions will appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              {/* Pending section (full table) */}
              <TabsContent value="pending" className="m-0 mt-6">
                {renderPendingTable()}
              </TabsContent>

              {/* Settings placeholder section */}
              <TabsContent value="settings" className="m-0 mt-6">
                <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e0e] p-8 text-center text-sm text-white/55">
                  <Settings className="mx-auto mb-3 h-8 w-8 text-white/25" />
                  Settings panel coming soon.
                </div>
              </TabsContent>

            {(isModerator || isFounder) && (
              <TabsContent value="users" className="mt-6">
                <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur rounded-2xl">
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
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 p-4 rounded-xl border border-white/[0.06] bg-white/[0.03] transition-colors hover:bg-white/[0.05]"
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
                              className="border-white/[0.12] bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {users.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No users found.</p>
                        </div>
                      )}

                      {/* Load More Button for Users */}
                      {hasMoreUsers && (
                        <div className="flex justify-center pt-6">
                          <Button
                            onClick={() => fetchNextUsers()}
                            disabled={loadingMoreUsers}
                            variant="outline"
                            className="border-white/[0.12] bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
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
              <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-500" />
                    Asset Management
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Review and manage pending assets
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

                  <div className="flex flex-col gap-3 mb-6 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <Input
                        value={scriptSearchQuery}
                        onChange={(e) => setScriptSearchQuery(e.target.value)}
                        placeholder="Search by title, description, or seller..."
                        className="pl-9 bg-white/[0.03] border-white/[0.08]"
                      />
                    </div>
                    <Select
                      value={scriptCategoryFilter}
                      onValueChange={setScriptCategoryFilter}
                    >
                      <SelectTrigger className="w-full sm:w-[200px] bg-white/[0.03] border-white/[0.08]">
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

                  <div className="space-y-4">
                    {filteredScripts.length === 0 && (
                      <p className="text-center text-white/50 py-8">No assets match your search.</p>
                    )}
                    {filteredScripts.map((script) => (
                      <div
                        key={script.id}
                        className="border border-white/[0.08] rounded-2xl p-4 bg-white/[0.03] transition-colors hover:bg-white/[0.05]"
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
                                <p className="text-white truncate capitalize">
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
                              className={`capitalize ${
                                script.status === "pending"
                                  ? "bg-yellow-500 text-white"
                                  : script.status === "approved"
                                  ? "bg-green-500 text-white"
                                  : "bg-red-500 text-white"
                              }`}
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
                        <p>No assets found with the selected filter.</p>
                      </div>
                    )}

                    {/* Load More Button for Scripts */}
                    {filteredScripts.length > 0 && hasMoreScripts && (
                      <div className="flex justify-center pt-6">
                        <Button
                          onClick={() => fetchNextScripts()}
                          disabled={loadingMoreScripts}
                          variant="outline"
                          className="border-white/[0.12] bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
                        >
                          {loadingMoreScripts ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Loading...
                            </>
                          ) : (
                            "Load More Assets"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="giveaways" className="mt-6">
              <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur rounded-2xl">
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

                  <div className="flex flex-col gap-3 mb-6 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <Input
                        value={giveawaySearchQuery}
                        onChange={(e) => setGiveawaySearchQuery(e.target.value)}
                        placeholder="Search by title, creator, or tag..."
                        className="pl-9 bg-white/[0.03] border-white/[0.08]"
                      />
                    </div>
                    <Select
                      value={giveawayCategoryFilter}
                      onValueChange={setGiveawayCategoryFilter}
                    >
                      <SelectTrigger className="w-full sm:w-[200px] bg-white/[0.03] border-white/[0.08]">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {giveawayCategories.map((category) => (
                          <SelectItem key={category} value={category} className="capitalize">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    {filteredGiveaways.length === 0 && (
                      <p className="text-center text-white/50 py-8">No giveaways match your search.</p>
                    )}
                    {filteredGiveaways.map((giveaway) => (
                      <div
                        key={giveaway.id}
                        className="border border-white/[0.08] rounded-2xl p-4 bg-white/[0.03] transition-colors hover:bg-white/[0.05]"
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
                                <p className="text-white truncate capitalize">
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
                              className={`capitalize ${
                                giveaway.status === "pending"
                                  ? "bg-yellow-500 text-white"
                                  : giveaway.status === "approved"
                                  ? "bg-green-500 text-white"
                                  : "bg-red-500 text-white"
                              }`}
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
                            className="border-white/[0.12] bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08] flex-shrink-0"
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
                          className="border-white/[0.12] bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
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

            <TabsContent value="props" className="mt-6">
              <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-500" />
                    Prop Management
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Review and manage pending props
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="flex gap-2 mb-4 w-max min-w-full">
                      {["all", "pending", "approved", "rejected"].map((filter) => (
                        <Button
                          key={filter}
                          variant={activePropFilter === filter ? "default" : "outline"}
                          onClick={() => setActivePropFilter(filter)}
                          className="whitespace-nowrap flex-shrink-0 capitalize"
                        >
                          {filter} ({filter === "all" ? props.length : props.filter((p) => p.status === filter).length})
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="relative mb-6">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <Input
                      value={propSearchQuery}
                      onChange={(e) => setPropSearchQuery(e.target.value)}
                      placeholder="Search by name, description, or creator ID..."
                      className="pl-9 bg-white/[0.03] border-white/[0.08]"
                    />
                  </div>

                  <div className="space-y-4">
                    {filteredProps.length === 0 && (
                      <p className="text-center text-white/50 py-8">No props match your search.</p>
                    )}
                    {filteredProps.map((prop) => (
                      <div
                        key={prop.id}
                        className="border border-white/[0.08] rounded-2xl p-4 bg-white/[0.03] transition-colors hover:bg-white/[0.05]"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-white mb-2 truncate">
                              {prop.name}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div className="min-w-0">
                                <span className="text-gray-400">Creator ID:</span>
                                <p className="text-white truncate">{prop.createdBy}</p>
                              </div>
                              <div className="min-w-0">
                                <span className="text-gray-400">Price:</span>
                                <p className="text-white">${String(prop.discountedPrice || prop.price)}</p>
                              </div>
                              <div className="min-w-0">
                                <span className="text-gray-400">Images:</span>
                                <p className="text-white">{prop.images?.length || 0}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <span className="text-gray-400">Description:</span>
                              <p className="text-white text-sm mt-1 line-clamp-2">
                                {prop.description}
                              </p>
                            </div>
                            {prop.status === "rejected" && prop.rejection_reason && (
                              <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                                <span className="text-red-400 text-sm font-medium">
                                  Rejection Reason:
                                </span>
                                <p className="text-red-200 text-sm mt-1 break-words">
                                  {prop.rejection_reason}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
                            <Badge
                              className={`capitalize ${
                                prop.status === "pending"
                                  ? "bg-yellow-500 text-white"
                                  : prop.status === "approved"
                                  ? "bg-green-500 text-white"
                                  : "bg-red-500 text-white"
                              }`}
                            >
                              {prop.status}
                            </Badge>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {new Date(prop.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                          {(prop.status === "pending" || prop.status === "approved") && (
                            <>
                              {prop.status === "pending" && (
                                <Button
                                  onClick={() => handlePropAction(prop.id, "approved")}
                                  disabled={approvingProp === prop.id}
                                  className="bg-green-500 hover:bg-green-600 flex-shrink-0"
                                  size="sm"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  {approvingProp === prop.id ? "Approving..." : "Approve"}
                                </Button>
                              )}
                              <Button
                                onClick={() => setRejectingProp(prop.id)}
                                variant="destructive"
                                size="sm"
                                className="flex-shrink-0"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {filteredProps.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No props found with the selected filter.</p>
                      </div>
                    )}

                    {filteredProps.length > 0 && hasMoreProps && (
                      <div className="flex justify-center pt-6">
                        <Button
                          onClick={() => fetchNextProps()}
                          disabled={loadingMoreProps}
                          variant="outline"
                          className="border-white/[0.12] bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
                        >
                          {loadingMoreProps ? "Loading..." : "Load More Props"}
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
                            : "border-white/[0.12] bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]"
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
                            : "border-white/[0.12] bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]"
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
                            : "border-white/[0.12] bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]"
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
                            : "border-white/[0.12] bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]"
                        } whitespace-nowrap flex-shrink-0`}
                      >
                        Rejected
                      </Button>
                    </div>
                  </div>

                  <Card className="bg-white/[0.04] border-white/[0.08] backdrop-blur rounded-2xl">
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
                          <DialogContent className="bg-[#0d0d0f] border-white/[0.08] rounded-2xl">
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
                                  className="bg-white/[0.04] border-white/[0.08] text-white"
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
                                  className="bg-white/[0.04] border-white/[0.08] text-white"
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
                                <p className="mt-1.5 text-xs text-gray-400">
                                  Recommended 1200×800px (landscape), PNG/JPG/WebP up to 5MB
                                </p>
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
                                  className="bg-white/[0.04] border-white/[0.08] text-white"
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
                                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#0d0d0f] border-white/[0.08]">
                                    <SelectItem value="scripts">
                                      Assets
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
                                  className="border-white/[0.12] bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
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
                      {ads.length > 0 && (
                        <div className="flex flex-col gap-3 mb-4 sm:flex-row">
                          <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                            <Input
                              value={adSearchQuery}
                              onChange={(e) => setAdSearchQuery(e.target.value)}
                              placeholder="Search by title, description, or creator..."
                              className="pl-9 bg-white/[0.04] border-white/[0.08]"
                            />
                          </div>
                          <Select
                            value={adCategoryFilter}
                            onValueChange={setAdCategoryFilter}
                          >
                            <SelectTrigger className="w-full sm:w-[200px] bg-white/[0.04] border-white/[0.08]">
                              <SelectValue placeholder="All categories" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All categories</SelectItem>
                              {adCategories.map((category) => (
                                <SelectItem key={category} value={category} className="capitalize">
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
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
                        ) : filteredAds.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-8 text-center">
                            <Megaphone className="h-12 w-12 text-gray-600 mb-4" />
                            <p className="text-gray-400">
                              No ads match your search
                            </p>
                          </div>
                        ) : (
                          filteredAds
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
                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 p-4 rounded-xl border border-white/[0.06] bg-white/[0.03] transition-colors hover:bg-white/[0.05]"
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
                                            className="bg-white/[0.08] text-gray-300 capitalize"
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
                                      className={`capitalize ${
                                        ad.status === "approved" ||
                                        ad.status === "active"
                                          ? "bg-green-500 text-white"
                                          : ad.status === "rejected"
                                          ? "bg-red-500 text-white"
                                          : "bg-yellow-500 text-white"
                                      }`}
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
                        {filteredAds.length > 0 && hasMoreAds && (
                          <div className="flex justify-center pt-6">
                            <Button
                              onClick={() => fetchNextAds()}
                              disabled={loadingMoreAds}
                              variant="outline"
                              className="border-white/[0.12] bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
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
                    <DialogContent className="bg-[#0d0d0f] border-white/[0.08] rounded-2xl">
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
                          className="bg-white/[0.04] border-white/[0.08] text-white"
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
                            className="border-white/[0.12] bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
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

            {/* Verification requests (gated) */}
            {(isModerator || isFounder) && (
              <TabsContent value="verification" className="mt-6">
                <VerificationRequests onCountChange={setVerificationCount} />
              </TabsContent>
            )}

            {/* Home page content editor (gated) */}
            {(isModerator || isFounder) && (
              <TabsContent value="home-content" className="mt-6">
                <HomeContentManager />
              </TabsContent>
            )}
            </main>
          </div>
          </Tabs>

        {/* Role Management Dialog */}
        <Dialog
          open={!!selectedUser}
          onOpenChange={() => setSelectedUser(null)}
        >
          <DialogContent className="bg-[#0d0d0f] border-white/[0.08] rounded-2xl">
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
                  className="border-white/[0.12] bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
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
          <DialogContent className="bg-[#0d0d0f] border-white/[0.08] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Reject Asset</DialogTitle>
              <DialogDescription className="text-gray-400">
                Please provide a reason for rejecting this asset
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
                  className="bg-white/[0.04] border-white/[0.08] text-white"
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
                    "Reject Asset"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRejectingScript(null)}
                  className="border-white/[0.12] bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Prop Rejection Dialog */}
        <Dialog
          open={!!rejectingProp}
          onOpenChange={() => setRejectingProp(null)}
        >
          <DialogContent className="bg-[#0d0d0f] border-white/[0.08] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Reject Prop</DialogTitle>
              <DialogDescription className="text-gray-400">
                Please provide a reason for rejecting this prop
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300">
                  Rejection Reason
                </label>
                <Textarea
                  value={propRejectionReason}
                  onChange={(e) => setPropRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="bg-white/[0.04] border-white/[0.08] text-white"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handlePropAction(rejectingProp!, "rejected")}
                  className="bg-red-500 hover:bg-red-600"
                  disabled={!propRejectionReason.trim() || rejectingPropLoading}
                >
                  {rejectingPropLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Rejecting...
                    </>
                  ) : (
                    "Reject Prop"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRejectingProp(null)}
                  className="border-white/[0.12] bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
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
          <DialogContent className="bg-[#0d0d0f] border-white/[0.08] rounded-2xl">
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
                  className="bg-white/[0.04] border-white/[0.08] text-white"
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
                  className="border-white/[0.12] bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
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
          <DialogContent className="bg-[#0d0d0f] border-white/[0.08] rounded-2xl max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Asset Details
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Complete information about the asset submission
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
                        className={`capitalize ${
                          viewingScript.status === "pending"
                            ? "bg-yellow-500 text-white"
                            : viewingScript.status === "approved"
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
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
                            <p className="text-white capitalize">
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
                        Approve Asset
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
                          Reject Asset
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
          <DialogContent className="bg-[#0d0d0f] border-white/[0.08] rounded-2xl max-w-6xl max-h-[90vh] overflow-y-auto">
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
                        className={`capitalize ${
                          viewingGiveaway.status === "pending"
                            ? "bg-yellow-500 text-white"
                            : viewingGiveaway.status === "approved"
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
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
                                  className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]"
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
                                  className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]"
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
                      <p className="text-white capitalize">{viewingGiveaway.status}</p>
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0d0d0f] border-white/[0.08] rounded-2xl">
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
                    className={`capitalize ${
                      viewingAd.status === "approved" ||
                      viewingAd.status === "active"
                        ? "bg-green-500 text-white"
                        : viewingAd.status === "rejected"
                        ? "bg-red-500 text-white"
                        : "bg-yellow-500 text-white"
                    }`}
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
                          <p className="text-white capitalize">{viewingAd.category}</p>
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
                          <p className="text-white capitalize">
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
