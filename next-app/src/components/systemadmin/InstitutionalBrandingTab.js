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
import { generateSampleBrandingPdf, deriveDocumentPrefix } from "@/lib/pdfGenerator"

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
  const [removeSecondaryLogoModalOpen, setRemoveSecondaryLogoModalOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isSecondaryDragOver, setIsSecondaryDragOver] = useState(false)

  const [branding, setBranding] = useState({
    institutionName: "Polytechnic University of the Philippines",
    campusName: "San Juan City Campus",
    tagline: "OFFICIAL ACADEMIC ARCHIVES & RECORDS",
    jurisdictionHeader: "Republic of the Philippines",
    documentCodePrefix: "PUPSJ",
    brandColor: "#7A1E28",
    logoUrl: DEFAULT_PUP_LOGO,
    fallbackLogoUrl: OFFICIAL_FALLBACK_LOGO,
    logoBase64: null,
    secondaryLogoUrl: null,
    secondaryLogoBase64: null,
    signatoryRegistrarTitle: "",
    signatoryHeadTitle: "",
  })

  const fileInputRef = useRef(null)
  const secondaryFileInputRef = useRef(null)

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
    let ignore = false
    const init = async () => {
      try {
        const res = await fetch("/api/system/branding", { cache: "no-store" })
        const json = await res.json()
        if (ignore) return
        if (res.ok && json.ok && json.data) {
          setBranding(json.data)
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(json.data))
            } catch (e) {}
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("[InstitutionalBrandingTab] Fetch error:", err)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [])

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

  const processSecondaryImageFile = (file) => {
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
          secondaryLogoBase64: base64,
          secondaryLogoUrl: null,
        }))
        notify("Secondary seal selected. Click 'Save' to apply dual-seal masthead.")
      }
    }
    reader.onerror = () => {
      notify("Failed to read image file", true)
    }
    reader.readAsDataURL(file)
  }

  const handleSecondaryFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) processSecondaryImageFile(file)
  }

  const handleSecondaryDrop = (e) => {
    e.preventDefault()
    setIsSecondaryDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processSecondaryImageFile(file)
  }

  const handleSecondaryDragOver = (e) => {
    e.preventDefault()
    setIsSecondaryDragOver(true)
  }

  const handleSecondaryDragLeave = (e) => {
    e.preventDefault()
    setIsSecondaryDragOver(false)
  }

  const handleRemoveSecondaryLogo = () => {
    setBranding((prev) => ({
      ...prev,
      secondaryLogoBase64: null,
      secondaryLogoUrl: null,
    }))
    setRemoveSecondaryLogoModalOpen(false)
    notify("Secondary seal removed. Report headers restored to centered single-logo mode.")
  }

  const handleSave = async () => {
    if (!branding.institutionName?.trim()) {
      notify("Institution name cannot be blank", true)
      return
    }

    try {
      setSaving(true)
      const payload = {
        ...branding,
        documentCodePrefix: deriveDocumentPrefix(branding.institutionName, branding.campusName),
      }
      const res = await fetch("/api/system/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      const payload = {
        ...branding,
        documentCodePrefix: deriveDocumentPrefix(branding.institutionName, branding.campusName),
      }
      const blob = await generateSampleBrandingPdf(payload)
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
  const activeSecondaryLogoSrc = branding.secondaryLogoBase64 || branding.secondaryLogoUrl
  const hasSecondaryLogo = !!activeSecondaryLogoSrc
  const derivedPrefix = deriveDocumentPrefix(branding.institutionName, branding.campusName)

  if (loading) {
    return <InstitutionalBrandingSkeleton />
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-jakarta">
      {/* Main Container Card */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-certificate"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Institutional Identity</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · School Credentials &amp; Letterhead
              </span>
            </div>
          }
          description="Configure your official university seal, school credentials, administrative letterhead, and color theme for all official reports."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
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
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN (7 cols): Settings Configuration */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Card 1: Official Institutional Seals & Logos (Side-by-Side Dual-Seal Masthead Layout) */}
              <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Official Institutional Seals &amp; Logos
                  </h3>
                  <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300 mt-0.5">
                    Configure your primary school seal (Left) and an optional secondary seal (Right: Republic, DepEd, CHED, or ISO badge) to activate dual-masthead letterheads.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Primary Seal */}
                  <div className="rounded-xl border border-border/70 dark:border-border bg-white dark:bg-zinc-950/60 p-3.5 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 truncate">
                          Primary Seal
                        </span>
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 shrink-0">
                          Left / Main
                        </span>
                      </div>
                      {isCustomLogo && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRemoveLogoModalOpen(true)}
                          className="h-6 px-2 rounded-lg text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[10px] font-semibold cursor-pointer active:scale-95 transition-all shadow-xs"
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    {/* Interactive Dropzone Area */}
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all select-none min-h-[140px]",
                        isDragOver
                          ? "border-pup-maroon bg-pup-maroon/5 dark:border-red-500 dark:bg-red-950/20"
                          : "border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/40 hover:bg-gray-100/50 dark:hover:bg-zinc-800/40"
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/webp,image/svg+xml,image/jpeg"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center p-1.5 relative overflow-hidden bg-[repeating-conic-gradient(#f3f4f6_0%_25%,transparent_0%_50%)] [background-size:8px_8px] dark:bg-[repeating-conic-gradient(#18181b_0%_25%,transparent_0%_50%)] border border-border/60 dark:border-border shadow-xs mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeLogoSrc}
                          onError={(e) => {
                            e.currentTarget.src = OFFICIAL_FALLBACK_LOGO
                          }}
                          alt="Primary Seal"
                          className="max-w-full max-h-full object-contain filter drop-shadow-xs"
                        />
                      </div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                        {isCustomLogo ? "Replace primary seal" : "Upload primary seal"}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                        PNG, WebP, SVG (max 3MB)
                      </p>
                    </div>
                  </div>

                  {/* Secondary / Regulatory Seal (Optional) */}
                  <div className="rounded-xl border border-border/70 dark:border-border bg-white dark:bg-zinc-950/60 p-3.5 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 truncate">
                          Secondary Seal
                        </span>
                        <span className={cn(
                          "text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                          hasSecondaryLogo
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
                        )}>
                          {hasSecondaryLogo ? "Right / Active" : "Optional"}
                        </span>
                      </div>
                      {hasSecondaryLogo && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRemoveSecondaryLogoModalOpen(true)}
                          className="h-6 px-2 rounded-lg text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[10px] font-semibold cursor-pointer active:scale-95 transition-all shadow-xs"
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    {/* Interactive Secondary Dropzone Area */}
                    <div
                      onDrop={handleSecondaryDrop}
                      onDragOver={handleSecondaryDragOver}
                      onDragLeave={handleSecondaryDragLeave}
                      onClick={() => secondaryFileInputRef.current?.click()}
                      className={cn(
                        "relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all select-none min-h-[140px]",
                        isSecondaryDragOver
                          ? "border-pup-maroon bg-pup-maroon/5 dark:border-red-500 dark:bg-red-950/20"
                          : "border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/40 hover:bg-gray-100/50 dark:hover:bg-zinc-800/40"
                      )}
                    >
                      <input
                        ref={secondaryFileInputRef}
                        type="file"
                        accept="image/png,image/webp,image/svg+xml,image/jpeg"
                        onChange={handleSecondaryFileChange}
                        className="hidden"
                      />
                      {hasSecondaryLogo ? (
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center p-1.5 relative overflow-hidden bg-[repeating-conic-gradient(#f3f4f6_0%_25%,transparent_0%_50%)] [background-size:8px_8px] dark:bg-[repeating-conic-gradient(#18181b_0%_25%,transparent_0%_50%)] border border-amber-200/60 dark:border-amber-900/40 shadow-xs mb-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeSecondaryLogoSrc}
                            alt="Secondary Seal"
                            className="max-w-full max-h-full object-contain filter drop-shadow-xs"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400 dark:text-zinc-500 mb-2 border border-border/60 dark:border-border">
                          <HugeIcon className="ph-duotone ph-shield-plus text-xl" />
                        </div>
                      )}
                      <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                        {hasSecondaryLogo ? "Replace secondary seal" : "Add secondary seal"}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                        Republic, CHED, DepEd, ISO
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Official School Credentials & Administrative Letterhead */}
              <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    School Credentials
                  </h3>
                  <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300 mt-0.5">
                    Official institution name, campus designation, and administrative header line rendered across all official PDF records. Document tracking codes are automatically derived.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Super-Header / Jurisdiction Line */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Super-Header / Jurisdiction Line (Optional)
                      </label>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                        CHED / SUC Standard
                      </span>
                    </div>
                    <Input
                      value={branding.jurisdictionHeader ?? ""}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          jurisdictionHeader: e.target.value,
                        }))
                      }
                      placeholder="e.g. Republic of the Philippines"
                      maxLength={100}
                      className="h-10 w-full rounded-xl border border-border bg-white px-3 text-xs font-medium dark:border-border dark:bg-card"
                    />
                  </div>

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
                      className="h-10 w-full rounded-xl border border-border bg-white px-3 text-xs font-medium dark:border-border dark:bg-card"
                    />
                  </div>

                  {/* Campus & Office Subheader */}
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
                        className="h-10 w-full rounded-xl border border-border bg-white px-3 text-xs font-medium dark:border-border dark:bg-card"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Administrative Office / Division Subheader
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
                        className="h-10 w-full rounded-xl border border-border bg-white px-3 text-xs font-mono dark:border-border dark:bg-card uppercase"
                      />
                    </div>
                  </div>

                  {/* Signatory Titles (Optional Overrides) */}
                  <div className="pt-3 border-t border-border/70 dark:border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Signatory Titles (Optional Overrides)
                      </label>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                        Leave blank for intelligent auto-defaults
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-900 dark:text-zinc-300 mb-1">
                          Records / Registrar Title
                        </label>
                        <Input
                          value={branding.signatoryRegistrarTitle ?? ""}
                          onChange={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              signatoryRegistrarTitle: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder={branding.campusName ? "Default: CAMPUS REGISTRAR" : "Default: REGISTRAR"}
                          maxLength={60}
                          className="h-10 w-full rounded-xl border border-border bg-white px-3 text-xs font-mono dark:border-border dark:bg-card uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-gray-900 dark:text-zinc-300 mb-1">
                          Executive Approver Title
                        </label>
                        <Input
                          value={branding.signatoryHeadTitle ?? ""}
                          onChange={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              signatoryHeadTitle: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder={branding.campusName ? "Default: CAMPUS DIRECTOR" : "Default: HEAD OF INSTITUTION"}
                          maxLength={60}
                          className="h-10 w-full rounded-xl border border-border bg-white px-3 text-xs font-mono dark:border-border dark:bg-card uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Brand Color Accent */}
              <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Official Brand Color Theme
                  </h3>
                  <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300 mt-0.5">
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
                        className="w-10 h-10 rounded-xl border border-border dark:border-border cursor-pointer p-0 bg-transparent"
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
                        className="h-10 w-full rounded-xl border border-border bg-white px-3 text-xs font-mono font-semibold dark:border-border dark:bg-card uppercase"
                      />
                    </div>
                  </div>

                  {/* Preset Quick-Picks */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-900 dark:text-zinc-300 mb-1.5">
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
                              ? "border-slate-900 dark:border-border bg-slate-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                              : "border-border dark:border-border bg-zinc-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
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

            {/* RIGHT COLUMN (5 cols): Live Interactive PDF Simulator (Sticky) */}
            <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
              <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                      Live PDF Report Header Simulator
                    </h3>
                    <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300 mt-0.5">
                      Pixel-accurate representation of your A4 print headers.
                    </p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 border",
                    hasSecondaryLogo
                      ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40"
                      : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-border"
                  )}>
                    {hasSecondaryLogo ? "Dual-Seal Split" : "Single-Seal Mode"}
                  </span>
                </div>

                {/* Simulated A4 Paper Header */}
                <div className="w-full rounded-2xl bg-white border border-border shadow-lg p-6 sm:p-8 select-none text-center relative overflow-hidden font-sans">
                  {hasSecondaryLogo ? (
                    /* Mode B: Dual-Logo Split Masthead */
                    <div className="flex items-center justify-between gap-3 mb-4">
                      {/* Left Primary Seal */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center p-1 border border-border/60 rounded-xl bg-gray-50/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeLogoSrc}
                          onError={(e) => {
                            e.currentTarget.src = OFFICIAL_FALLBACK_LOGO
                          }}
                          alt="Primary Seal"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>

                      {/* Center Institutional Block */}
                      <div className="flex-1 text-center min-w-0">
                        {branding.jurisdictionHeader && (
                          <p className="text-[7.5px] uppercase tracking-[0.2em] font-medium text-gray-400 mb-0.5 truncate">
                            {branding.jurisdictionHeader}
                          </p>
                        )}
                        <h2
                          className="text-[13px] sm:text-[14px] font-bold tracking-tight transition-colors duration-200 truncate"
                          style={{ color: branding.brandColor }}
                        >
                          {branding.institutionName}
                        </h2>
                        {branding.campusName && (
                          <p className="text-[9.5px] sm:text-[10px] font-semibold text-gray-600 dark:text-zinc-300 mt-0.5 truncate">
                            {branding.campusName}
                          </p>
                        )}
                        <p className="text-[8px] uppercase tracking-[0.16em] font-semibold text-gray-400 mt-0.5 truncate">
                          {branding.tagline || "OFFICIAL ACADEMIC ARCHIVES & RECORDS"}
                        </p>
                      </div>

                      {/* Right Secondary Seal */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center p-1 border border-amber-200/60 rounded-xl bg-amber-50/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeSecondaryLogoSrc}
                          alt="Secondary Seal"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Mode A: Single-Logo Centered Masthead */
                    <>
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

                      {branding.jurisdictionHeader && (
                        <p className="text-[8px] uppercase tracking-[0.2em] font-medium text-gray-400 mb-0.5">
                          {branding.jurisdictionHeader}
                        </p>
                      )}

                      <h2
                        className="text-[15px] sm:text-[16px] font-bold tracking-tight transition-colors duration-200"
                        style={{ color: branding.brandColor }}
                      >
                        {branding.campusName
                          ? `${branding.institutionName} · ${branding.campusName}`
                          : branding.institutionName}
                      </h2>

                      <p className="text-[9px] uppercase tracking-[0.2em] font-semibold text-gray-400 mt-1">
                        {branding.tagline || "OFFICIAL ACADEMIC ARCHIVES & RECORDS"}
                      </p>
                    </>
                  )}

                  {/* Sample Report Title */}
                  <h3 className="text-[13px] sm:text-[14px] font-bold text-gray-900 mt-4">
                    Official Document Header Specification
                  </h3>

                  {/* Sample Document ID */}
                  <p className="text-[9px] italic text-gray-500 mt-1 font-mono">
                    Document ID: {derivedPrefix}-SPEC-2026-XXXX
                  </p>

                  {/* Master Divider Line */}
                  <div
                    className="w-full h-[2px] mt-3.5 mb-5 transition-colors duration-200"
                    style={{ backgroundColor: branding.brandColor }}
                  />

                  {/* Simulated Table Body Snippet */}
                  <div className="rounded-lg border border-border bg-gray-50/60 p-3 text-left space-y-2 text-[10px]">
                    <div
                      className="p-1.5 rounded text-white font-bold text-[9px] uppercase tracking-wider flex items-center justify-between"
                      style={{ backgroundColor: branding.brandColor }}
                    >
                      <span>Audit Specification Sample</span>
                      <span className="text-[8px] opacity-90">
                        {hasSecondaryLogo ? "Dual-Seal Mode" : "Single-Seal Mode"}
                      </span>
                    </div>
                    {branding.jurisdictionHeader && (
                      <div className="flex justify-between py-1 border-b border-border/60 text-gray-600">
                        <span>Super-Header / Jurisdiction</span>
                        <span className="font-semibold text-gray-900">{branding.jurisdictionHeader}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-border/60 text-gray-600">
                      <span>School / University</span>
                      <span className="font-semibold text-gray-900">{branding.institutionName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/60 text-gray-600">
                      <span>Campus / Branch</span>
                      <span className="font-semibold text-gray-900">{branding.campusName || "—"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/60 text-gray-600">
                      <span>Office / Subheader</span>
                      <span className="font-semibold text-gray-900 text-right truncate max-w-[210px]">{branding.tagline || "—"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/60 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span>Tracking Code Prefix</span>
                        <span className="text-[8px] font-semibold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          Auto
                        </span>
                      </div>
                      <span className="font-semibold font-mono text-gray-900">{derivedPrefix}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/60 text-gray-600">
                      <span>Primary Seal</span>
                      <span className="font-semibold text-emerald-600">
                        {isCustomLogo ? "Custom Upload" : "Default PUP Seal (eManage Fallback)"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/60 text-gray-600">
                      <span>Secondary / Regulatory Seal</span>
                      <span className={cn(
                        "font-semibold",
                        hasSecondaryLogo ? "text-amber-600 dark:text-amber-400" : "text-gray-400"
                      )}>
                        {hasSecondaryLogo ? "Custom Upload (Dual Masthead Active)" : "None (Single Logo Mode)"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/60 text-gray-600">
                      <span>Registrar Signatory</span>
                      <span className="font-semibold text-gray-900">
                        {branding.signatoryRegistrarTitle || (branding.campusName ? "CAMPUS REGISTRAR (Auto)" : "REGISTRAR (Auto)")}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 text-gray-600">
                      <span>Executive Signatory</span>
                      <span className="font-semibold text-gray-900">
                        {branding.signatoryHeadTitle || (branding.campusName ? "CAMPUS DIRECTOR (Auto)" : "HEAD OF INSTITUTION (Auto)")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-900 dark:text-zinc-300">
                    <HugeIcon className="ph-fill ph-check-circle text-emerald-500 text-sm shrink-0" />
                    <span>Matches official A4 PDF engine</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadSamplePdf}
                    disabled={generatingPdf}
                    title="Export Sample Preview PDF"
                    className="h-8 px-3 rounded-lg text-xs font-semibold border border-border dark:border-border hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 cursor-pointer active:scale-95 transition-all shadow-xs"
                  >
                    {generatingPdf ? "Exporting..." : "Export"}
                  </Button>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-100/70 dark:bg-zinc-800/40 text-[11px] text-gray-600 dark:text-zinc-400">
                  <HugeIcon className="ph-bold ph-info text-pup-maroon dark:text-red-400 text-sm shrink-0" />
                  <span>
                    When saved, these seals, titles, and color are stored in the local database and cached for offline use across all campus offices.
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
        description="This will revert the Jurisdiction Line, School Name, Campus, Administrative Office Header, Signatory Titles, Brand Color, and all uploaded seals back to default institutional settings (PUP logo with eManage fallback)."
        confirmLabel="Reset"
        confirmVariant="danger"
        onConfirm={handleReset}
      />

      {/* Remove Primary Logo Confirmation Modal */}
      <ConfirmModal
        open={removeLogoModalOpen}
        onOpenChange={setRemoveLogoModalOpen}
        title="Remove Custom Primary School Logo?"
        description="This will clear your custom uploaded primary seal and revert all reports to using the default PUP logo (with eManage as offline system fallback)."
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={handleRemoveCustomLogo}
      />

      {/* Remove Secondary Logo Confirmation Modal */}
      <ConfirmModal
        open={removeSecondaryLogoModalOpen}
        onOpenChange={setRemoveSecondaryLogoModalOpen}
        title="Remove Secondary / Regulatory Seal?"
        description="This will clear your secondary regulatory or partner seal and return all generated reports and letterheads back to centered single-logo mode."
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={handleRemoveSecondaryLogo}
      />
    </div>
  )
}
