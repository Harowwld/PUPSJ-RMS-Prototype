"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import HugeIcon from "@/components/shared/HugeIcon"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import ConfirmModal from "@/components/shared/ConfirmModal"
import InstitutionalBrandingSkeleton from "./skeletons/InstitutionalBrandingSkeleton"
import { cn } from "@/lib/utils"
import { generateSampleBrandingPdf } from "@/lib/pdfGenerator"

const DEFAULT_PUP_LOGO = "/assets/pup-logo.webp"
const OFFICIAL_FALLBACK_LOGO = "/assets/branding/black-icon.png"
const BRANDING_CACHE_KEY = "institution_branding_cache"

const COLOR_PRESETS = [
  { label: "PUP Maroon", hex: "#7A1E28" },
  { label: "State Blue", hex: "#1E40AF" },
  { label: "University Emerald", hex: "#15803D" },
  { label: "Heritage Crimson", hex: "#991B1B" },
  { label: "Academic Navy", hex: "#0F172A" },
  { label: "Institutional Gold", hex: "#B45309" },
]

export default function InstitutionalBrandingTab({ showToast }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [removeLogoModalOpen, setRemoveLogoModalOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const [branding, setBranding] = useState({
    institutionName: "Polytechnic University of the Philippines",
    campusName: "San Juan City Campus",
    tagline: "OFFICIAL ACADEMIC ARCHIVES & RECORDS",
    brandColor: "#7A1E28",
    logoUrl: DEFAULT_PUP_LOGO,
    fallbackLogoUrl: OFFICIAL_FALLBACK_LOGO,
    logoBase64: null,
  })

  const fileInputRef = useRef(null)

  const notify = useCallback(
    (msg, isError = false) => {
      if (showToast) showToast(msg, isError)
    },
    [showToast]
  )

  const fetchBranding = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setLoading(true)
      try {
        const res = await fetch("/api/system/branding", { cache: "no-store" })
        const json = await res.json()
        if (res.ok && json.ok && json.data) {
          setBranding(json.data)
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(json.data))
            } catch (e) {}
          }
        } else {
          notify(json.error || "Failed to load branding settings", true)
        }
      } catch (err) {
        console.error("[InstitutionalBrandingTab] Fetch error:", err)
        notify("Network error fetching branding settings", true)
      } finally {
        setLoading(false)
      }
    },
    [notify]
  )

  useEffect(() => {
    fetchBranding()
  }, [fetchBranding])

  // Process File to Base64
  const processImageFile = (file) => {
    if (!file) return

    const validTypes = ["image/png", "image/webp", "image/jpeg", "image/svg+xml"]
    if (!validTypes.includes(file.type)) {
      notify("Please upload a valid image file (PNG, WebP, SVG, or JPEG)", true)
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      notify("Image size must be smaller than 3MB for offline performance", true)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result
      if (typeof base64 === "string") {
        setBranding((prev) => ({
          ...prev,
          logoBase64: base64,
          logoUrl: null,
        }))
        notify("School logo selected. Click 'Save' to apply across all reports.")
      }
    }
    reader.onerror = () => {
      notify("Failed to read image file", true)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) processImageFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processImageFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleRemoveCustomLogo = () => {
    setBranding((prev) => ({
      ...prev,
      logoBase64: null,
      logoUrl: DEFAULT_PUP_LOGO,
    }))
    setRemoveLogoModalOpen(false)
    notify("Reverted to default PUP logo (eManage fallback active)")
  }

  const handleSave = async () => {
    if (!branding.institutionName?.trim()) {
      notify("Institution name cannot be blank", true)
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/system/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setBranding(json.data)
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(json.data))
            window.dispatchEvent(new CustomEvent("institution-branding-updated", { detail: json.data }))
          } catch (e) {}
        }
        notify("Institutional identity & branding saved successfully!")
      } else {
        notify(json.error || "Failed to save branding", true)
      }
    } catch (err) {
      console.error("[InstitutionalBrandingTab] Save error:", err)
      notify("Network error saving configuration", true)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/system/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setBranding(json.data)
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(json.data))
            window.dispatchEvent(new CustomEvent("institution-branding-updated", { detail: json.data }))
          } catch (e) {}
        }
        notify("Reverted to institutional defaults")
      } else {
        notify(json.error || "Failed to reset branding", true)
      }
    } catch (err) {
      console.error("[InstitutionalBrandingTab] Reset error:", err)
      notify("Network error resetting configuration", true)
    } finally {
      setSaving(false)
      setResetModalOpen(false)
    }
  }

  const handleDownloadSamplePdf = async () => {
    try {
      setGeneratingPdf(true)
      notify("Rendering sample PDF specification...")
      const blob = await generateSampleBrandingPdf(branding)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Institutional-Branding-Sample-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      notify("Sample PDF downloaded successfully!")
    } catch (err) {
      console.error("[InstitutionalBrandingTab] PDF generation failed:", err)
      notify("Failed to generate sample PDF", true)
    } finally {
      setGeneratingPdf(false)
    }
  }

  const activeLogoSrc = branding.logoBase64 || branding.logoUrl || DEFAULT_PUP_LOGO
  const isCustomLogo = !!branding.logoBase64

  if (loading) {
    return <InstitutionalBrandingSkeleton />
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-jakarta">
      {/* Main Container Card */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-certificate"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Public Portal &amp; Identity</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · Campus Identity &amp; Branding
              </span>
            </div>
          }
          description="Configure your official university seal, institution name, and color theme for all official reports."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <RefreshButton
                onRefresh={() => fetchBranding(true)}
                isLoading={loading}
                title="Refresh Settings"
              />

              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadSamplePdf}
                disabled={generatingPdf}
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                {generatingPdf ? "Rendering..." : "Preview"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setResetModalOpen(true)}
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Reset
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-10 px-5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          }
        />

        {/* Content Body */}
        <CardContent className="font-jakarta bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN (6 cols): Settings Configuration */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* Card 1: Official Seal / Logo Upload */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                      Official Institutional Seal / Logo
                    </h3>
                    <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                      Embedded at the top center of all official administrative PDF reports.
                    </p>
                  </div>
                  {isCustomLogo && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRemoveLogoModalOpen(true)}
                      className="h-8 px-3 rounded-lg text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-xs"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Logo Preview Square */}
                  <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-950 select-none">
                    <div className="w-24 h-24 rounded-lg flex items-center justify-center p-2 relative overflow-hidden bg-[repeating-conic-gradient(#f3f4f6_0%_25%,transparent_0%_50%)] [background-size:12px_12px] dark:bg-[repeating-conic-gradient(#18181b_0%_25%,transparent_0%_50%)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeLogoSrc}
                        onError={(e) => {
                          e.currentTarget.src = OFFICIAL_FALLBACK_LOGO
                        }}
                        alt="Institution Logo"
                        className="max-w-full max-h-full object-contain filter drop-shadow-xs"
                      />
                    </div>
                    <span className="text-[10px] font-mono font-medium text-gray-400 dark:text-zinc-500 mt-2">
                      {isCustomLogo ? "Custom Upload" : "Default (PUP Logo)"}
                    </span>
                  </div>

                  {/* Dropzone Area */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "sm:col-span-8 h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all select-none",
                      isDragOver
                        ? "border-pup-maroon bg-pup-maroon/5 dark:border-red-500 dark:bg-red-950/20"
                        : "border-gray-200 dark:border-white/15 bg-white dark:bg-zinc-900/50 hover:bg-gray-100/50 dark:hover:bg-zinc-800/40"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/webp,image/svg+xml,image/jpeg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-300 mb-2">
                      <HugeIcon className="ph-bold ph-upload-simple text-sm" />
                    </div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                      Click to browse or drag &amp; drop
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                      PNG, WebP, or SVG (Transparent, max 3MB)
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">
                      Default: PUP Logo · Fallback: eManage Official Icon
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: School Credentials, Titles & Contact Info */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    School Credentials &amp; Contact Details
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                    Official school name, address, contact info, and header titles rendered across all campus offices.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* School / Institution Name */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                      School / Institution Name
                    </label>
                    <Input
                      value={branding.institutionName}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          institutionName: e.target.value,
                        }))
                      }
                      placeholder="e.g. Polytechnic University of the Philippines"
                      maxLength={120}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium dark:border-white/10 dark:bg-card"
                    />
                  </div>

                  {/* Campus & Tagline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Campus / Branch
                      </label>
                      <Input
                        value={branding.campusName}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            campusName: e.target.value,
                          }))
                        }
                        placeholder="e.g. San Juan City Campus"
                        maxLength={100}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium dark:border-white/10 dark:bg-card"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Classification Subtext / Tagline
                      </label>
                      <Input
                        value={branding.tagline}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            tagline: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="e.g. OFFICIAL ACADEMIC ARCHIVES & RECORDS"
                        maxLength={100}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-mono dark:border-white/10 dark:bg-card uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Brand Color Accent */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Official Brand Color Theme
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                    Primary institutional color applied to university titles, dividing rules, and table header accents.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center">
                      <input
                        type="color"
                        value={branding.brandColor}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            brandColor: e.target.value.toUpperCase(),
                          }))
                        }
                        className="w-10 h-10 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer p-0 bg-transparent"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={branding.brandColor}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            brandColor: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="#7A1E28"
                        maxLength={7}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-mono font-semibold dark:border-white/10 dark:bg-card uppercase"
                      />
                    </div>
                  </div>

                  {/* Preset Quick-Picks */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5">
                      Recommended University Presets
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() =>
                            setBranding((prev) => ({
                              ...prev,
                              brandColor: preset.hex,
                            }))
                          }
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all active:scale-95 shadow-xs",
                            branding.brandColor === preset.hex
                              ? "border-slate-900 dark:border-zinc-200 bg-slate-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                              : "border-gray-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN (6 cols): Live Interactive PDF Simulator */}
            <div className="lg:col-span-6 space-y-5">
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                      Live PDF Report Header Simulator
                    </h3>
                    <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                      Pixel-accurate representation of your A4 print headers.
                    </p>
                  </div>
                </div>

                {/* Simulated A4 Paper Header */}
                <div className="w-full rounded-2xl bg-white border border-gray-200 shadow-lg p-8 sm:p-10 select-none text-center relative overflow-hidden font-sans">
                  {/* Centered Logo */}
                  <div className="flex justify-center mb-3">
                    <div className="w-16 h-16 flex items-center justify-center p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeLogoSrc}
                        onError={(e) => {
                          e.currentTarget.src = OFFICIAL_FALLBACK_LOGO
                        }}
                        alt="Simulated Logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* University Name (Brand Color) */}
                  <h2
                    className="text-[15px] sm:text-[16px] font-bold tracking-tight transition-colors duration-200"
                    style={{ color: branding.brandColor }}
                  >
                    {branding.campusName
                      ? `${branding.institutionName} · ${branding.campusName}`
                      : branding.institutionName}
                  </h2>

                  {/* Office / Classification Subtitle */}
                  <p className="text-[9px] uppercase tracking-[0.2em] font-semibold text-gray-400 mt-1">
                    {branding.tagline || "OFFICIAL ACADEMIC ARCHIVES & RECORDS"}
                  </p>

                  {/* Sample Report Title */}
                  <h3 className="text-[13px] sm:text-[14px] font-bold text-gray-900 mt-5">
                    Official Document Header Specification
                  </h3>

                  {/* Sample Document ID */}
                  <p className="text-[9px] italic text-gray-500 mt-1 font-mono">
                    Document ID: RKS-SPEC-2026-XXXX
                  </p>

                  {/* Master Divider Line */}
                  <div
                    className="w-full h-[2px] mt-4 mb-6 transition-colors duration-200"
                    style={{ backgroundColor: branding.brandColor }}
                  />

                  {/* Simulated Table Body Snippet */}
                  <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 text-left space-y-2 text-[10px]">
                    <div
                      className="p-1.5 rounded text-white font-bold text-[9px] uppercase tracking-wider"
                      style={{ backgroundColor: branding.brandColor }}
                    >
                      Audit Specification Sample
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200/60 text-gray-600">
                      <span>School / University</span>
                      <span className="font-semibold text-gray-900">{branding.institutionName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200/60 text-gray-600">
                      <span>Campus / Branch</span>
                      <span className="font-semibold text-gray-900">{branding.campusName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200/60 text-gray-600">
                      <span>Classification Subtext</span>
                      <span className="font-semibold text-gray-900 text-right truncate max-w-[210px]">{branding.tagline || "—"}</span>
                    </div>
                    <div className="flex justify-between py-1 text-gray-600">
                      <span>Active Seal Engine</span>
                      <span className="font-semibold text-emerald-600">
                        {isCustomLogo ? "Custom Upload" : "Default PUP Seal (eManage Fallback)"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-100/70 dark:bg-zinc-800/40 text-[11px] text-gray-600 dark:text-zinc-400">
                  <HugeIcon className="ph-bold ph-info text-pup-maroon dark:text-red-400 text-sm shrink-0" />
                  <span>
                    When saved, this logo, title, and color are stored in the local database and cached for offline use across all campus offices.
                  </span>
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        open={resetModalOpen}
        onOpenChange={setResetModalOpen}
        title="Reset Institutional Branding?"
        description="This will revert the School Name, Campus, Classification Subtext, Primary Color, and Logo back to default institutional settings (PUP logo with eManage fallback)."
        confirmLabel="Reset"
        confirmVariant="danger"
        onConfirm={handleReset}
      />

      {/* Remove Logo Confirmation Modal */}
      <ConfirmModal
        open={removeLogoModalOpen}
        onOpenChange={setRemoveLogoModalOpen}
        title="Remove Custom School Logo?"
        description="This will clear your custom uploaded image and revert all reports to using the default PUP logo (with eManage as offline system fallback)."
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={handleRemoveCustomLogo}
      />
    </div>
  )
}
