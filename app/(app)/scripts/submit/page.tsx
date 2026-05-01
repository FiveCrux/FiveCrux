"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Upload,
  Plus,
  X,
  Code,
  FileText,
  Sparkles,
  ImageIcon,
  Video,
  ExternalLink,
  Package,
  Zap,
  Star,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Settings,
  Loader2,
  ChevronDown,
  Layout,
  MousePointer2,
} from "lucide-react";
import { Button } from "@/componentss/ui/button";
import { Input } from "@/componentss/ui/input";
import { Textarea } from "@/componentss/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentss/ui/card";
import { Badge } from "@/componentss/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentss/ui/select";
import { Switch } from "@/componentss/ui/switch";
import { Label } from "@/componentss/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/componentss/ui/popover";
import { Checkbox } from "@/componentss/ui/checkbox";
import { cn } from "@/lib/utils";
import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import { toast } from "sonner";
import { CurrencySelect, type Currency } from "@/componentss/currency-select";
import * as countryData from "country-data-list";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
// Lazy-load Three.js canvas to avoid SSR issues
const ParticleCanvas = dynamic(() => import("@/componentss/home/ParticleCanvas"), { ssr: false });

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SubmitScriptPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const scriptId = searchParams.get("edit");

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Form Logic & State ────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "",
    framework: [] as string[],
    sellerName: session?.user?.name || "",
    sellerEmail: session?.user?.email || "",
    featured: false,
    currency: "",
    currencySymbol: "",
  });

  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [features, setFeatures] = useState([{ id: 1, text: "" }]);
  const [requirements, setRequirements] = useState([{ id: 1, text: "" }]);
  const [otherLinks, setOtherLinks] = useState([{ id: 1, text: "" }]);
  const [link, setLink] = useState("");
  const [youtubeVideoLink, setYoutubeVideoLink] = useState("");
  const [youtubeLinkError, setYoutubeLinkError] = useState("");
  const [media, setMedia] = useState<{
    images: string[];
    videos: string[];
    screenshots: string[];
    coverImage: string | null;
    thumbnail: string | null;
  }>({
    images: [],
    videos: [],
    screenshots: [],
    coverImage: null,
    thumbnail: null,
  });

  useEffect(() => {
    if (session?.user && !isEditMode) {
      setFormData((prev) => ({
        ...prev,
        sellerName: session.user?.name || "",
        sellerEmail: session.user?.email || "",
      }));
    }
  }, [session, isEditMode]);

  useEffect(() => {
    if (scriptId) {
      setIsEditMode(true);
      setIsLoadingScript(true);
      const fetchScript = async () => {
        try {
          const response = await fetch(`/api/scripts/${scriptId}`);
          if (response.ok) {
            const script = await response.json();
            setFormData({
              title: script.title || "",
              description: script.description || "",
              price: script.price?.toString() || "",
              originalPrice: script.original_price?.toString() || "",
              category: script.category || "",
              framework: Array.isArray(script.framework) ? script.framework : script.framework ? [script.framework] : [],
              sellerName: script.seller_name || "",
              sellerEmail: script.seller_email || "",
              featured: script.featured || false,
              currency: script.currency || "",
              currencySymbol: script.currency_symbol || "",
            });
            if (script.currency) {
              const allCurrencies = (countryData as any).currencies?.all || [];
              const currency = allCurrencies.find((c: any) => c.code === script.currency);
              if (currency) {
                setSelectedCurrency({
                  code: currency.code || "",
                  name: currency.name || "",
                  symbol: (currency as any).symbol || currency.code || "",
                });
              }
            }
            if (script.features?.length > 0) setFeatures(script.features.map((f: string, i: number) => ({ id: i + 1, text: f })));
            if (script.requirements?.length > 0) setRequirements(script.requirements.map((r: string, i: number) => ({ id: i + 1, text: r })));
            if (script.link) setLink(script.link);
            if (script.other_links?.length > 0) setOtherLinks(script.other_links.map((l: string, i: number) => ({ id: i + 1, text: l })));
            else setOtherLinks([{ id: 1, text: "" }]);
            if (script.youtube_video_link) setYoutubeVideoLink(script.youtube_video_link);
            setMedia({ images: script.images || [], videos: script.videos || [], screenshots: script.screenshots || [], coverImage: script.cover_image || null, thumbnail: null });
            setIsFree(script.free === true || script.free === 1);
          } else {
            router.push("/scripts/submit");
          }
        } catch (error) {
          router.push("/scripts/submit");
        } finally {
          setIsLoadingScript(false);
        }
      };
      fetchScript();
    }
  }, [scriptId, router]);

  if (status === "loading" || isLoadingScript) return <div className="min-h-screen flex items-center justify-center text-white bg-black">Loading...</div>;
  if (!session) { router.push("/auth/signin"); return null; }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFileUpload = async (file: File, type: "image" | "video", purpose: string = "screenshot") => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      fd.append("purpose", purpose);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()).url;
    } catch (e) {
      toast.error(`Upload failed: ${e instanceof Error ? e.message : "Unknown error"}`);
      return null;
    }
  };

  const handleYoutubeLinkChange = (v: string) => {
    setYoutubeVideoLink(v);
    if (v.trim() && !/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(v)) setYoutubeLinkError("Invalid YouTube URL");
    else setYoutubeLinkError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeVideoLink.trim() && youtubeLinkError) return toast.error("Fix YouTube link before submitting");
    setIsSubmitting(true);
    try {
      const data = {
        ...formData,
        price: isFree ? 0 : (Number.parseFloat(formData.price) || 0),
        original_price: isFree ? null : (formData.originalPrice ? (Number.parseFloat(formData.originalPrice) || 0) : null),
        currency: isFree ? null : (formData.currency || null),
        currency_symbol: isFree ? null : (formData.currencySymbol || null),
        free: isFree,
        features: features.filter(f => f.text.trim()).map(f => f.text.trim()),
        requirements: requirements.filter(r => r.text.trim()).map(r => r.text.trim()),
        link: link.trim() || null,
        other_links: otherLinks.filter(l => l.text.trim()).map(l => l.text.trim()),
        images: media.images,
        videos: media.videos,
        screenshots: media.screenshots,
        cover_image: media.coverImage,
        youtube_video_link: youtubeVideoLink.trim() || null,
        status: "pending" as const,
      };
      const res = await fetch(isEditMode ? `/api/scripts/${scriptId}` : "/api/scripts", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success(isEditMode ? "Updated successfully!" : "Submitted successfully!");
        router.push("/profile");
      } else throw new Error();
    } catch {
      toast.error("Submission failed. Try again.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#000000" }}>
      <Navbar />

      {/* ── Background & Particles ─────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {mounted && <ParticleCanvas />}
        {/* Subtle radial glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-orange-500/[0.03] blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/[0.02] blur-[120px] rounded-full" />
      </div>

      {/* ── Perspective Grid Floor ─────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 pointer-events-none z-0 overflow-hidden"
        style={{ height: "500px", perspective: "1000px" }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: "rotateX(75deg)",
            transformOrigin: "top center",
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            backgroundPosition: "center top",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Page Content ───────────────────────────────────────────── */}
      <main className="relative z-10 pt-40 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* Hero Header */}
        <header className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-6 text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]"
          >
            <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
            <span className="text-neutral-800">/</span>
            <Link href="/scripts" className="hover:text-orange-500 transition-colors">Marketplace</Link>
            <span className="text-neutral-800">/</span>
            <span className="text-orange-500">Submit</span>
          </motion.div>

          <div className="flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 w-fit"
            >
              <Sparkles className="h-3 w-3 text-orange-500" />
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">CREATOR STUDIO</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter"
            >
              {isEditMode ? "Update" : "Submit"} <span className="gradient-text">Script</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-neutral-500 max-w-2xl text-lg leading-relaxed"
            >
              Showcase your engineering to thousands of server owners. High-quality submissions
              gain 3x more visibility in our featured listings.
            </motion.p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* Left Column: Form Sections */}
          <div className="lg:col-span-8 space-y-10">
            <form onSubmit={handleSubmit} className="space-y-10">

              {/* Section 1: Identity */}
              <FormSection title="Basic Information" icon={<FileText className="h-4 w-4" />}>
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Script Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Advanced Banking System v2"
                      className="bg-neutral-900/50 border-neutral-800 focus:border-orange-500/50 text-white placeholder:text-neutral-700 h-12 rounded-xl transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Explain features, usage, and why it's better than alternatives..."
                      className="bg-neutral-900/50 border-neutral-800 focus:border-orange-500/50 text-white placeholder:text-neutral-700 min-h-[160px] rounded-xl transition-all resize-none"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(v) => setFormData({ ...formData, category: v })}
                      >
                        <SelectTrigger className="bg-neutral-900/50 border-neutral-800 h-12 rounded-xl text-neutral-300">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                          <SelectItem value="scripts">Scripts</SelectItem>
                          <SelectItem value="maps">Maps</SelectItem>
                          <SelectItem value="props">Props</SelectItem>
                          <SelectItem value="clothing">Clothing</SelectItem>
                          <SelectItem value="economy">Economy</SelectItem>
                          <SelectItem value="vehicles">Vehicles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Frameworks</Label>
                      <FrameworkMultiSelect
                        selected={formData.framework}
                        onChange={(v) => setFormData({ ...formData, framework: v })}
                      />
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* Section 2: Pricing */}
              <FormSection title="Pricing Model" icon={<DollarSign className="h-4 w-4" />}>
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">Free Resource</span>
                      <span className="text-[10px] text-neutral-500 font-medium">Make this script available to everyone for free</span>
                    </div>
                    <Switch
                      checked={isFree}
                      onCheckedChange={(checked) => {
                        setIsFree(checked);
                        if (checked) setFormData({ ...formData, price: "0", originalPrice: "", currency: "", currencySymbol: "" });
                        setSelectedCurrency(null);
                      }}
                    />
                  </div>

                  <AnimatePresence>
                    {!isFree && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid gap-6 overflow-hidden"
                      >
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Currency</Label>
                          <CurrencySelect
                            value={formData.currency}
                            onValueChange={(v) => {
                              const allCurrencies = (countryData as any).currencies?.all || [];
                              const c = allCurrencies.find((curr: any) => curr.code === v);
                              if (c) {
                                setFormData({ 
                                  ...formData, 
                                  currency: v, 
                                  currencySymbol: (c as any).symbol || c.code || "" 
                                });
                              }
                            }}
                            onCurrencySelect={(c) => {
                              setSelectedCurrency(c);
                              setFormData({ ...formData, currency: c.code, currencySymbol: c.symbol });
                            }}
                            placeholder="Select Sale Currency"
                            disabled={isFree}
                            currencies="all"
                            variant="default"
                            className="bg-neutral-900/50 border-neutral-800 h-12 rounded-xl text-white"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Sale Price</Label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="bg-neutral-900/50 border-neutral-800 h-12 rounded-xl pl-10"
                                placeholder="0.00"
                                required={!isFree}
                                disabled={!selectedCurrency}
                              />
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 font-bold">
                                {selectedCurrency?.symbol || "$"}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Original Price</Label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                value={formData.originalPrice}
                                onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                                className="bg-neutral-900/50 border-neutral-800 h-12 rounded-xl pl-10"
                                placeholder="0.00"
                                disabled={!selectedCurrency}
                              />
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 font-bold">
                                {selectedCurrency?.symbol || "$"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FormSection>

              {/* Section 3: Media */}
              <FormSection title="Visual Media" icon={<ImageIcon className="h-4 w-4" />}>
                <div className="grid gap-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Cover Image (Listing View)</Label>
                    <MediaUploadZone
                      id="cover-upload"
                      type="image"
                      label="Drop cover image here"
                      desc="PNG, JPG (1920x1080 recommended)"
                      loading={uploadingCoverImage}
                      onFileChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadingCoverImage(true);
                          const url = await handleFileUpload(file, "image", "cover");
                          if (url) setMedia(prev => ({ ...prev, coverImage: url }));
                          setUploadingCoverImage(false);
                        }
                      }}
                      preview={media.coverImage}
                      onRemove={() => setMedia(prev => ({ ...prev, coverImage: null }))}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Screenshots Gallery (Max 10)</Label>
                    <MediaUploadZone
                      id="screenshots-upload"
                      type="image"
                      multiple
                      label="Upload Gallery"
                      desc="Showcase the UI and features"
                      loading={uploadingScreenshots}
                      onFileChange={async (e) => {
                        const files = e.target.files;
                        if (!files) return;
                        setUploadingScreenshots(true);
                        const urls: string[] = [];
                        for (let i = 0; i < files.length; i++) {
                          const u = await handleFileUpload(files[i], "image", "screenshot");
                          if (u) urls.push(u);
                        }
                        setMedia(prev => ({ ...prev, screenshots: [...prev.screenshots, ...urls] }));
                        setUploadingScreenshots(false);
                      }}
                    />
                    {media.screenshots.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                        {media.screenshots.map((s, i) => (
                          <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-neutral-800 group">
                            <Image src={s} alt="Screenshot" fill className="object-cover" />
                            <button
                              type="button"
                              onClick={() => setMedia(prev => ({ ...prev, screenshots: prev.screenshots.filter((_, idx) => idx !== i) }))}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Video Showcase</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <MediaUploadZone
                        id="video-upload"
                        type="video"
                        label="Direct Upload"
                        desc="MP4, MOV (Max 4.5MB)"
                        loading={uploadingVideos}
                        onFileChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadingVideos(true);
                            const url = await handleFileUpload(file, "video", "demo");
                            if (url) setMedia(prev => ({ ...prev, videos: [...prev.videos, url] }));
                            setUploadingVideos(false);
                          }
                        }}
                      />
                      <div className="space-y-2">
                        <Input
                          value={youtubeVideoLink}
                          onChange={(e) => handleYoutubeLinkChange(e.target.value)}
                          placeholder="Or YouTube URL..."
                          className={cn(
                            "bg-neutral-900/50 border-neutral-800 h-[100px] rounded-xl text-center text-sm",
                            youtubeLinkError && "border-red-500"
                          )}
                        />
                        {youtubeLinkError && <p className="text-[10px] text-red-500 font-bold uppercase">{youtubeLinkError}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* Section 4: Specifications */}
              <FormSection title="Technical Specifications" icon={<Package className="h-4 w-4" />}>
                <div className="grid gap-8">
                  <DynamicList
                    label="Core Features"
                    items={features}
                    onAdd={() => setFeatures([...features, { id: Math.random(), text: "" }])}
                    onRemove={(id: number) => setFeatures(features.filter(f => f.id !== id))}
                    onUpdate={(id: number, t: string) => setFeatures(features.map(f => f.id === id ? { ...f, text: t } : f))}
                    placeholder="e.g. Real-time synchronization"
                  />
                  <DynamicList
                    label="Dependencies"
                    items={requirements}
                    onAdd={() => setRequirements([...requirements, { id: Math.random(), text: "" }])}
                    onRemove={(id: number) => setRequirements(requirements.filter(r => r.id !== id))}
                    onUpdate={(id: number, t: string) => setRequirements(requirements.map(r => r.id === id ? { ...r, text: t } : r))}
                    placeholder="e.g. ox_lib 2.0+"
                  />
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Purchase Link (External)</Label>
                    <div className="relative">
                      <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-600" />
                      <Input
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        className="bg-neutral-900/50 border-neutral-800 h-12 rounded-xl pl-12"
                        placeholder="https://your-store.tebex.io/package/..."
                      />
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* Submit Action */}
              <div className="pt-10 flex flex-col sm:flex-row gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-orange-500 hover:bg-orange-400 text-black font-black text-sm h-14 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all uppercase tracking-widest"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      {isEditMode ? "Update Repository" : "Publish to Marketplace"}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="px-10 border-neutral-800 hover:bg-neutral-900 h-14 rounded-2xl text-xs font-bold uppercase tracking-widest"
                >
                  Save Draft
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Preview Sticky */}
          <aside className="lg:col-span-4 lg:sticky lg:top-32 space-y-8">
            <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
              <MousePointer2 className="h-3 w-3 text-orange-500" />
              Live Preview
            </div>

            <Card className="bg-[#080808] border-neutral-800/60 rounded-3xl overflow-hidden shadow-2xl">
              <div className="aspect-video relative bg-neutral-900">
                {media.coverImage ? (
                  <Image src={media.coverImage} alt="Preview" fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-700">
                    <ImageIcon className="h-10 w-10 mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">No Preview Image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {formData.featured && (
                  <div className="absolute top-4 left-4 px-3 py-1 rounded bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest">
                    Featured
                  </div>
                )}
              </div>

              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-white line-clamp-1 mb-2">
                    {formData.title || "Your Script Title"}
                  </h3>
                  <p className="text-sm text-neutral-500 line-clamp-2 leading-relaxed">
                    {formData.description || "Enter a description to see how it looks in the marketplace listings..."}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    {isFree ? (
                      <span className="text-2xl font-black text-orange-500 uppercase tracking-tighter italic">Free</span>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">
                          {selectedCurrency?.symbol || "$"}{formData.price || "0.00"}
                        </span>
                        {formData.originalPrice && (
                          <span className="text-xs text-neutral-600 line-through">
                            ${formData.originalPrice}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {formData.price && formData.originalPrice && !isFree && (
                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-black">
                      -{Math.round(((Number(formData.originalPrice) - Number(formData.price)) / Number(formData.originalPrice)) * 100)}%
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {formData.category && (
                    <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[9px] font-black uppercase tracking-widest text-orange-400">
                      {formData.category}
                    </span>
                  )}
                  {formData.framework.slice(0, 2).map(f => (
                    <span key={f} className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[9px] font-black uppercase tracking-widest text-neutral-500">
                      {f}
                    </span>
                  ))}
                  {formData.framework.length > 2 && <span className="text-[9px] font-black text-neutral-700">+{formData.framework.length - 2}</span>}
                </div>

                <Button className="w-full h-12 bg-neutral-900 border border-neutral-800 hover:bg-orange-500 hover:text-black hover:border-orange-500 text-neutral-500 font-bold transition-all rounded-xl uppercase tracking-widest text-xs">
                  Purchase Now
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900/20 border-neutral-800/40 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <h4 className="text-sm font-black uppercase tracking-widest text-white">Guidelines</h4>
              </div>
              <ul className="space-y-4">
                <GuidelineItem icon={<CheckCircle className="h-3 w-3 text-green-500" />} text="Verified script ownership" />
                <GuidelineItem icon={<CheckCircle className="h-3 w-3 text-green-500" />} text="Clean, commented code" />
                <GuidelineItem icon={<CheckCircle className="h-3 w-3 text-green-500" />} text="1-3 Day review process" />
              </ul>
              <div className="pt-4 border-t border-neutral-800/50">
                <p className="text-[10px] text-neutral-600 leading-relaxed italic">
                  Note: FiveCrux maintains a 15% platform commission on all successful marketplace transactions.
                </p>
              </div>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ── Internal Components ──────────────────────────────────────────────────────

function FormSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="bg-[#080808] border border-neutral-800/60 rounded-[2.5rem] p-10 overflow-hidden relative group"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center gap-4 mb-10">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
          {icon}
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
      </div>

      <div className="relative z-10">{children}</div>
    </motion.section>
  );
}

interface MediaUploadZoneProps {
  id: string;
  type: "image" | "video";
  multiple?: boolean;
  label: string;
  desc: string;
  loading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  preview?: string | null;
  onRemove?: () => void;
}

function MediaUploadZone({ id, type, multiple, label, desc, loading, onFileChange, preview, onRemove }: MediaUploadZoneProps) {
  return (
    <div className="relative group">
      <input
        type="file"
        id={id}
        multiple={multiple}
        accept={type === "image" ? "image/*" : "video/*"}
        onChange={onFileChange}
        className="hidden"
        disabled={loading}
      />
      <label
        htmlFor={id}
        className={cn(
          "flex flex-col items-center justify-center w-full aspect-video md:aspect-[21/9] bg-neutral-900/30 border-2 border-dashed border-neutral-800 rounded-3xl cursor-pointer transition-all hover:border-orange-500/50 group-hover:bg-neutral-900/50",
          loading && "opacity-50 cursor-wait",
          preview && "border-none"
        )}
      >
        {preview ? (
          <div className="relative w-full h-full rounded-3xl overflow-hidden border border-orange-500/30 shadow-2xl">
            <Image src={preview} alt="Upload" fill className="object-cover" />
            {onRemove && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onRemove(); }}
                className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4 transition-all group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-black">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (type === "image" ? <ImageIcon className="h-6 w-6" /> : <Video className="h-6 w-6" />)}
            </div>
            <span className="text-sm font-bold text-white mb-1 uppercase tracking-widest">{label}</span>
            <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">{desc}</span>
          </>
        )}
      </label>
    </div>
  );
}

interface DynamicListProps {
  label: string;
  items: { id: number; text: string }[];
  onAdd: () => void;
  onRemove: (id: number) => void;
  onUpdate: (id: number, text: string) => void;
  placeholder: string;
}

function DynamicList({ label, items, onAdd, onRemove, onUpdate, placeholder }: DynamicListProps) {
  return (
    <div className="space-y-4">
      <Label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{label}</Label>
      <div className="space-y-3">
        {items.map((item: any, i: number) => (
          <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
            <Input
              value={item.text}
              onChange={(e) => onUpdate(item.id, e.target.value)}
              placeholder={placeholder}
              className="bg-neutral-900/50 border-neutral-800 h-12 rounded-xl"
            />
            {items.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onRemove(item.id)}
                className="w-12 h-12 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </motion.div>
        ))}
      </div>
      <Button
        type="button"
        onClick={onAdd}
        variant="outline"
        className="w-full h-12 border-neutral-800 hover:border-orange-500/50 hover:bg-orange-500/5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
      >
        <Plus className="mr-2 h-3 w-3" />
        Add Item
      </Button>
    </div>
  );
}

function FrameworkMultiSelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const frameworks = ["qbcore", "qbox", "esx", "ox", "vrp", "standalone"];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="w-full bg-neutral-900/50 border border-neutral-800 h-12 rounded-xl justify-between px-4 text-neutral-400 hover:text-white transition-all">
          <span className="text-sm">{selected.length > 0 ? `${selected.length} Selected` : "Choose Frameworks"}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] bg-[#0d0d0d] border-neutral-800 p-2 rounded-2xl shadow-2xl">
        <div className="grid gap-1">
          {frameworks.map(f => (
            <label key={f} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-orange-500/5 cursor-pointer group">
              <Checkbox
                checked={selected.includes(f)}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  const next = isChecked 
                    ? (selected.includes(f) ? selected : [...selected, f])
                    : selected.filter(x => x !== f);
                  onChange(next);
                }}
              />
              <span className="text-xs font-bold text-neutral-500 group-hover:text-white uppercase tracking-widest">{f}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function GuidelineItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-lg bg-neutral-800/50 flex items-center justify-center">{icon}</div>
      <span className="text-xs font-medium text-neutral-400">{text}</span>
    </li>
  );
}
