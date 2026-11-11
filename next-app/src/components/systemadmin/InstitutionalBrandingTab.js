"use client"

import React, { useState, useEffect, useCallback } from "react"
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty"
import PDFPreview from "@/components/shared/PDFPreview"
import PDFPreviewModal from "@/components/shared/PDFPreviewModal"
import { REPORT_FONT_OPTIONS } from "@/lib/reportFontOptions"
import { DEFAULT_BRANDING, BRANDING_UPLOAD_LIMITS, resolveBranding } from "@/lib/institutionalBranding"
import PageHeader from "@/components/shared/PageHeader"
import ConfirmModal from "@/components/shared/ConfirmModal"
import { InstitutionalBrandingSkeletonContent } from "./skeletons/InstitutionalBrandingSkeleton"
import { cn } from "@/lib/utils"
import { SUPERADMIN_BADGE_BASE as BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles"
import { generateSampleBrandingPdf, deriveDocumentPrefix } from "@/lib/pdfGenerator"
import { Alert02Icon, AlertCircleIcon, Tick01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
import ColorSelector from "@/components/ui/color-selector";
const DEFAULT_PUP_LOGO = "/assets/pup-logo.webp"
const OFFICIAL_FALLBACK_LOGO = "/assets/branding/black-icon.png"
const BRANDING_CACHE_KEY = "institution_branding_cache"

const COLOR_PRESETS = [
  { name: "PUP Maroon", hex: "#7A1E28" },
  { name: "State Blue", hex: "#1E40AF" },
  { name: "University Emerald", hex: "#15803D" },
  { name: "Heritage Crimson", hex: "#991B1B" },
  { name: "Academic Navy", hex: "#0F172A" },
  { name: "Institutional Gold", hex: "#B45309" },
  { name: "Royal Indigo", hex: "#4338CA" },
  { name: "Polytechnic Teal", hex: "#0D9488" },
  { name: "Regal Purple", hex: "#6D28D9" },
  { name: "Classic Cerulean", hex: "#2563EB" },
  { name: "Executive Amber", hex: "#D97706" },
  { name: "Academic Slate", hex: "#334155" },
]

export default function InstitutionalBrandingTab({ showToast, onDirtyChange }) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [sampleAttempt, setSampleAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [sample, setSample] = useState(null)
  const [sampleError, setSampleError] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [removeLogoModalOpen, setRemoveLogoModalOpen] = useState(false)
  const [removeSecondaryLogoModalOpen, setRemoveSecondaryLogoModalOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isSecondaryDragOver, setIsSecondaryDragOver] = useState(false)

  const [branding, setBranding] = useState(DEFAULT_BRANDING)
  const [savedBranding, setSavedBranding] = useState(null)
  const isDirty = savedBranding !== null && JSON.stringify(branding) !== JSON.stringify(savedBranding)

  const notify = useCallback(
    (msg, isError = false) => {
      if (showToast) showToast(msg, isError)
    },
    [showToast]
  )

  useEffect(() => {
    let ignore = false
    const init = async () => {
      setLoadError("")
      try {
        const res = await fetch("/api/system/branding", { cache: "no-store" })
        const json = await res.json()
        if (ignore) return
        if (res.ok && json.ok && json.data) {
          const loaded = resolveBranding(json.data)
          setBranding(loaded)
          setSavedBranding(loaded)
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(json.data))
            } catch {}
          }
        } else {
          throw new Error(json.error || "Unable to load institutional identity.")
        }
      } catch (err) {
        if (!ignore) {
          console.error("[InstitutionalBrandingTab] Fetch error:", err)
          setLoadError("Institutional identity could not be loaded. Retry before making changes.")
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
  }, [loadAttempt])

  useEffect(() => { onDirtyChange?.(isDirty) }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (!isDirty) return
    const warnBeforeLeaving = (event) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warnBeforeLeaving)
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving)
  }, [isDirty])

  const handleDiscardDraft = () => {
    if (savedBranding) {
      setBranding(savedBranding)
      notify("Draft changes discarded. Reverted to saved institutional identity.")
    }
  }

  // Process File to Base64
  const processImageFile = (file) => {
    if (!file) return

    if (!BRANDING_UPLOAD_LIMITS.allowedMimeTypes.includes(file.type)) {
      notify("Please upload a valid image file (PNG, WebP, SVG, or JPEG)", true)
      return
    }

    if (file.size > BRANDING_UPLOAD_LIMITS.maxFileSize) {
      notify("Image size must be smaller than 3MB for offline performance", true)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result
      if (typeof base64 === "string") {
        if (base64.length > BRANDING_UPLOAD_LIMITS.maxBase64Length) {
          notify("This seal is too large after processing. Choose an image smaller than 3 MB.", true)
          return
        }
        setBranding((prev) => ({
          ...prev,
          logoBase64: base64,
          logoUrl: null,
        }))
        notify("School logo selected. Click 'Save Branding' to apply across all reports.")
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

    if (!BRANDING_UPLOAD_LIMITS.allowedMimeTypes.includes(file.type)) {
      notify("Please upload a valid image file (PNG, WebP, SVG, or JPEG)", true)
      return
    }

    if (file.size > BRANDING_UPLOAD_LIMITS.maxFileSize) {
      notify("Image size must be smaller than 3MB for offline performance", true)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result
      if (typeof base64 === "string") {
        if (base64.length > BRANDING_UPLOAD_LIMITS.maxBase64Length) {
          notify("This seal is too large after processing. Choose an image smaller than 3 MB.", true)
          return
        }
        setBranding((prev) => ({
          ...prev,
          secondaryLogoBase64: base64,
          secondaryLogoUrl: null,
        }))
        notify("Secondary seal selected. Click 'Save Branding' to apply dual-seal masthead.")
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
    if (!/^#[0-9a-fA-F]{6}$/.test(branding.brandColor)) {
      notify("Enter a six-digit brand color, such as #7A1E28.", true)
      return
    }

    try {
      setSaving(true)
      const payload = {
        ...branding,
        tagline: branding.tagline?.trim() || "",
        signatoryPreparerTitle: branding.signatoryPreparerTitle?.trim().toUpperCase() || "",
        signatoryRegistrarTitle: branding.signatoryRegistrarTitle?.trim().toUpperCase() || "",
        signatoryHeadTitle: branding.signatoryHeadTitle?.trim().toUpperCase() || "",
        documentCodePrefix: deriveDocumentPrefix(branding.institutionName, branding.campusName),
      }
      const res = await fetch("/api/system/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        const saved = resolveBranding(json.data)
        setBranding(saved)
        setSavedBranding(saved)
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(json.data))
            window.dispatchEvent(new CustomEvent("institution-branding-updated", { detail: json.data }))
          } catch {}
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
        const saved = resolveBranding(json.data)
        setBranding(saved)
        setSavedBranding(saved)
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(json.data))
            window.dispatchEvent(new CustomEvent("institution-branding-updated", { detail: json.data }))
          } catch {}
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

  useEffect(() => {
    if (loading) return
    let active = true
    let url
    const timer = setTimeout(async () => {
      setSampleError("")
      try {
        const blob = await generateSampleBrandingPdf(branding)
        if (!active) return
        url = URL.createObjectURL(blob)
        setSample({ branding, url })
      } catch (error) {
        if (active) setSampleError(error.message || "Unable to generate the branding preview.")
      }
    }, 400)
    return () => {
      active = false
      clearTimeout(timer)
      if (url) URL.revokeObjectURL(url)
    }
  }, [branding, loading, sampleAttempt])
  const sampleReady = !loading && sample?.branding === branding && !sampleError

  const activeLogoSrc = branding.logoBase64 || branding.logoUrl || DEFAULT_PUP_LOGO
  const isCustomLogo = !!branding.logoBase64
  const activeSecondaryLogoSrc = branding.secondaryLogoBase64 || branding.secondaryLogoUrl
  const hasSecondaryLogo = !!activeSecondaryLogoSrc
  const reportFontLabel = REPORT_FONT_OPTIONS.find((font) => font.value === (branding.reportFont || "jakarta"))?.label || "Report font"

  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta select-none">
      {/* Main Container Card */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        <PageHeader
          icon=" Certificate01Icon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Institutional Identity</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400">
                {hasSecondaryLogo ? "Dual-seal letterhead" : "Single-seal letterhead"} · {reportFontLabel}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none"
                role="status"
                aria-live="polite"
              >
                {isDirty ? (
                  <>
                    <Alert02Icon size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="font-semibold text-gray-900 dark:text-zinc-100">Unsaved changes</span>
                    <span className="h-3.5 w-px bg-black/[0.1] dark:bg-white/15 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-gray-500 dark:text-zinc-400">Previewing draft</span>
                  </>
                ) : (
                  <>
                    <span className="size-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white inline-flex items-center justify-center shrink-0">
                      <Tick01Icon size={8} className="stroke-[3]" />
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-zinc-100">Status</span>
                    <span className="h-3.5 w-px bg-black/[0.1] dark:bg-white/15 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-gray-500 dark:text-zinc-400">All changes saved</span>
                  </>
                )}
              </span>
            </div>
          }
          description="Configure your official university seal, school credentials, administrative letterhead, and color theme for all official reports."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                disabled={!sampleReady}
                className="h-9 px-4"
              >
                {!sampleReady && !sampleError ? "Preparing PDF…" : PDF_ACTION_LABELS.preview}
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={loading || Boolean(loadError) || saving || !isDirty}
                className="h-9 px-4"
              >
                {saving ? "Saving Changes..." : "Save Branding"}
              </Button>
            </div>
          }
          secondaryActions={
            <>
              <Button type="button" variant="outline" onClick={() => setResetModalOpen(true)} disabled={loading || Boolean(loadError) || saving} className="h-9 px-4">Restore Defaults</Button>
              {isDirty && <Button type="button" variant="outline" onClick={handleDiscardDraft} disabled={loading || Boolean(loadError) || saving} className="h-9 px-4">Discard Draft</Button>}
            </>
          }
        />

        {/* Content Body */}
        {loading ? (
          <InstitutionalBrandingSkeletonContent />
        ) : loadError ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 border-t border-border p-6">
            <EmptyState icon={AlertCircleIcon} title="Institutional Identity Unavailable" description={loadError} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setLoading(true); setLoadAttempt((value) => value + 1) }}
            >
              Retry Loading Identity
            </Button>
          </div>
        ) : (
        <CardContent className="font-jakarta p-6 flex flex-[1_0_auto] flex-col gap-6 rounded-b-2xl border-t border-border dark:border-border">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN (7 cols): Settings Configuration */}
            <div className="lg:col-span-7 space-y-5">
              {/* Card 1: Official Institutional Seals & Logos (Apple Inset Grouped Card) */}
              <div className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/90 dark:bg-card/90 backdrop-blur-sm p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-none space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Official Institutional Seals &amp; Logos
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                    Configure your primary school seal (Left) and an optional secondary seal (Right: Republic, DepEd, CHED, or ISO badge) to activate dual-masthead letterheads.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Primary Seal */}
                  <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50/60 dark:bg-zinc-900/40 p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 truncate">
                          Primary Seal
                        </span>
                        <span className={cn(BADGE_BASE, "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300")}>
                          Left / Main
                        </span>
                      </div>
                      {isCustomLogo && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRemoveLogoModalOpen(true)}
                          className="h-7 px-2.5 text-xs font-semibold rounded-lg"
                        >
                          Remove Seal
                        </Button>
                      )}
                    </div>

                    {/* Interactive Dropzone Area */}
                    <label
                      htmlFor="identity-primary-seal"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={cn(
                        "relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-[color,background-color,border-color,box-shadow,opacity,transform] select-none min-h-[145px] focus-within:outline-none focus-within:ring-2 focus-within:ring-pup-maroon",
                        isDragOver
                          ? "border-pup-maroon bg-pup-maroon/5 dark:border-red-500 dark:bg-red-950/20"
                          : "border-border dark:border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      <input
                        id="identity-primary-seal"
                        type="file"
                        accept="image/png,image/webp,image/svg+xml,image/jpeg"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                      <div className="w-14 h-14 rounded-full flex items-center justify-center p-1.5 relative overflow-hidden bg-[repeating-conic-gradient(#f3f4f6_0%_25%,transparent_0%_50%)] [background-size:8px_8px] dark:bg-[repeating-conic-gradient(#18181b_0%_25%,transparent_0%_50%)] border border-border dark:border-border shadow-2xs mb-2">
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
                        {BRANDING_UPLOAD_LIMITS.acceptedExtensionsDescription}
                      </p>
                    </label>
                  </div>

                  {/* Secondary / Regulatory Seal (optional) */}
                  <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50/60 dark:bg-zinc-900/40 p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 truncate">
                          Secondary Seal
                        </span>
                        <span
                          className={cn(
                            BADGE_BASE,
                            hasSecondaryLogo
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
                          )}
                        >
                          {hasSecondaryLogo ? "Right / Active" : "Optional"}
                        </span>
                      </div>
                      {hasSecondaryLogo && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRemoveSecondaryLogoModalOpen(true)}
                          className="h-7 px-2.5 text-xs font-semibold rounded-lg"
                        >
                          Remove Seal
                        </Button>
                      )}
                    </div>

                    {/* Interactive Secondary Dropzone Area */}
                    <label
                      htmlFor="identity-secondary-seal"
                      onDrop={handleSecondaryDrop}
                      onDragOver={handleSecondaryDragOver}
                      onDragLeave={handleSecondaryDragLeave}
                      className={cn(
                        "relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-[color,background-color,border-color,box-shadow,opacity,transform] select-none min-h-[145px] focus-within:outline-none focus-within:ring-2 focus-within:ring-pup-maroon",
                        isSecondaryDragOver
                          ? "border-pup-maroon bg-pup-maroon/5 dark:border-red-500 dark:bg-red-950/20"
                          : "border-border dark:border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      <input
                        id="identity-secondary-seal"
                        type="file"
                        accept="image/png,image/webp,image/svg+xml,image/jpeg"
                        onChange={handleSecondaryFileChange}
                        className="sr-only"
                      />
                      {hasSecondaryLogo ? (
                        <div className="w-14 h-14 rounded-full flex items-center justify-center p-1.5 relative overflow-hidden bg-[repeating-conic-gradient(#f3f4f6_0%_25%,transparent_0%_50%)] [background-size:8px_8px] dark:bg-[repeating-conic-gradient(#18181b_0%_25%,transparent_0%_50%)] border border-amber-200/60 dark:border-amber-900/40 shadow-2xs mb-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeSecondaryLogoSrc}
                            alt="Secondary Seal"
                            className="max-w-full max-h-full object-contain filter drop-shadow-xs"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400 dark:text-zinc-500 mb-2 border border-border dark:border-border shadow-2xs">
                          <AppIcon className=" Shield01Icon text-xl" />
                        </div>
                      )}
                      <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                        {hasSecondaryLogo ? "Replace secondary seal" : "Add secondary seal"}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                        {BRANDING_UPLOAD_LIMITS.acceptedExtensionsDescription}
                      </p>
                    </label>
                  </div>
                </div>
              </div>

              {/* Card 2: Official School Credentials & Administrative Letterhead (Apple Inset Grouped Card) */}
              <div className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/90 dark:bg-card/90 backdrop-blur-sm p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-none space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    School Credentials &amp; Letterhead
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                    Official institution name, campus designation, and administrative header line rendered across all official PDF records. Document tracking codes are automatically derived.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Super-Header / Jurisdiction Line */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="identity-jurisdiction" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        Super-Header / Jurisdiction Line <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
                      </label>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                        CHED / SUC Standard
                      </span>
                    </div>
                    <Input
                      id="identity-jurisdiction"
                      value={branding.jurisdictionHeader ?? ""}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          jurisdictionHeader: e.target.value,
                        }))
                      }
                      placeholder="e.g. Republic of the Philippines"
                      maxLength={100}
                      className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-medium dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                    />
                  </div>

                  {/* School / Institution Name */}
                  <div>
                    <label htmlFor="identity-institution" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      School / Institution Name
                    </label>
                    <Input
                      id="identity-institution"
                      aria-invalid={!branding.institutionName?.trim()}
                      value={branding.institutionName}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          institutionName: e.target.value,
                        }))
                      }
                      placeholder="e.g. Polytechnic University of the Philippines"
                      maxLength={120}
                      className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-medium dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                    />
                    {!branding.institutionName?.trim() && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Institution name is required.</p>}
                  </div>

                  {/* Campus & Office Subheader */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="identity-campus" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Campus / Branch <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
                      </label>
                      <Input
                        id="identity-campus"
                        value={branding.campusName}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            campusName: e.target.value,
                          }))
                        }
                        placeholder="e.g. San Juan City Campus"
                        maxLength={100}
                        className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-medium dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="identity-office-header" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Administrative Office Subheader <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
                      </label>
                      <Input
                        id="identity-office-header"
                        value={branding.tagline}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            tagline: e.target.value,
                          }))
                        }
                        onBlur={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            tagline: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="e.g. OFFICIAL ACADEMIC ARCHIVES & RECORDS"
                        maxLength={100}
                        className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-sans tabular-nums dark:border-border dark:bg-card uppercase focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                      />
                    </div>
                  </div>

                  {/* Derived Document Tracking Code Prefix */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-gray-50/50 p-3.5 dark:bg-zinc-950/40">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                          Derived Document Code Prefix
                        </span>
                        <span className={cn(BADGE_BASE, "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300")}>
                          System Generated
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                        Derived from institution and campus designations. Applied to compliance slips, verification records, and report exports.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(BADGE_BASE, BADGE_PALETTES.maroon, "font-sans tabular-nums")}>
                        {deriveDocumentPrefix(branding.institutionName, branding.campusName)}-*
                      </span>
                    </div>
                  </div>

                  {/* Signatory Titles */}
                  <div className="pt-3 border-t border-border dark:border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        Signatory Titles <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
                      </label>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                        Leave blank for intelligent auto-defaults
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label htmlFor="identity-preparer-title" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                          1. Prepared By
                        </label>
                        <Input
                          id="identity-preparer-title"
                          value={branding.signatoryPreparerTitle ?? ""}
                          onChange={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              signatoryPreparerTitle: e.target.value,
                            }))
                          }
                          onBlur={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              signatoryPreparerTitle: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="Default: ADMINISTRATIVE STAFF"
                          maxLength={60}
                          className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-sans tabular-nums dark:border-border dark:bg-card uppercase focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="identity-registrar-title" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                          2. Reviewed By
                        </label>
                        <Input
                          id="identity-registrar-title"
                          value={branding.signatoryRegistrarTitle ?? ""}
                          onChange={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              signatoryRegistrarTitle: e.target.value,
                            }))
                          }
                          onBlur={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              signatoryRegistrarTitle: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder={branding.campusName ? "Default: CAMPUS REGISTRAR" : "Default: REGISTRAR"}
                          maxLength={60}
                          className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-sans tabular-nums dark:border-border dark:bg-card uppercase focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="identity-head-title" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                          3. Noted By
                        </label>
                        <Input
                          id="identity-head-title"
                          value={branding.signatoryHeadTitle ?? ""}
                          onChange={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              signatoryHeadTitle: e.target.value,
                            }))
                          }
                          onBlur={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              signatoryHeadTitle: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder={branding.campusName ? "Default: CAMPUS DIRECTOR" : "Default: HEAD OF INSTITUTION"}
                          maxLength={60}
                          className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-sans tabular-nums dark:border-border dark:bg-card uppercase focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Brand Theme & Typography (Apple Inset Grouped Card) */}
              <div className="rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/90 dark:bg-card/90 backdrop-blur-sm p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-none space-y-6">
                {/* Brand Color Theme Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                      Official Brand Color Theme
                    </h3>
                    <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                      Primary institutional color applied to university titles, dividing rules, and table header accents.
                    </p>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-border bg-gray-50/50 p-4 dark:bg-zinc-950/40 sm:p-5">
                    <ColorSelector
                      label={null}
                      value={branding.brandColor}
                      onChange={(hex) =>
                        setBranding((prev) => ({
                          ...prev,
                          brandColor: hex.toUpperCase(),
                        }))
                      }
                      presets={COLOR_PRESETS}
                      showCustom
                      showHexInput
                      errorText={
                        !/^#[0-9a-fA-F]{6}$/.test(branding.brandColor)
                          ? "Enter a six-digit hex color, such as #7A1E28."
                          : null
                      }
                    />
                  </div>
                </div>

                {/* Report Typography Section (Combined below color theme) */}
                <div className="pt-5 border-t border-border dark:border-border space-y-3.5">
                  <div>
                    <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">Report Typography</h3>
                    <p className="mt-0.5 text-[12px] text-gray-500 dark:text-zinc-400">Choose the typeface for the letterhead, body, tables, and footers of all generated reports.</p>
                  </div>
                  <div>
                    <label htmlFor="report-font" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-300">Report font</label>
                    <Select id="report-font" value={branding.reportFont || "jakarta"} onChange={(event) => setBranding((previous) => ({ ...previous, reportFont: event.target.value }))} className="h-11 w-full sm:h-10" aria-describedby="report-font-help">
                      {REPORT_FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                    </Select>
                    <p id="report-font-help" className="mt-2 text-xs text-gray-500 dark:text-zinc-400">All options embed standard institutional TrueType fonts (Plus Jakarta Sans, Arial/Liberation Sans, Times/Liberation Serif, Noto Sans, Noto Serif, Inter, Open Sans, DejaVu Serif, DejaVu Sans). The app interface keeps its current font.</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs dark:bg-card space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">Document Preview</h3>
                  <p className="mt-1 text-[12px] text-gray-500 dark:text-zinc-400">Preview your current settings in the actual report format. Save Branding to apply them to new reports.</p>
                </div>
                <div className="relative flex h-[calc(100vh-190px)] min-h-[560px] max-h-[840px] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-gray-100 dark:bg-muted" aria-busy={!sampleReady && !sampleError}>
                  {sampleError ? (
                    <div className="flex flex-1 items-center justify-center p-5">
                      <EmptyState variant="compact" icon={AlertCircleIcon} title="Preview Unavailable" description={sampleError}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSampleAttempt((value) => value + 1)}
                          className="h-9 px-4 text-xs font-semibold rounded-xl"
                        >
                          Retry Preview
                        </Button>
                      </EmptyState>
                    </div>
                  ) : sampleReady ? (
                    <PDFPreview src={sample.url} title="Institutional document style preview" />
                  ) : (
                    <div className="flex-1 space-y-4 bg-white p-5 dark:bg-card" role="status" aria-label="Preparing document preview">
                      <Skeleton className="mx-auto h-10 w-10" />
                      <Skeleton className="mx-auto h-4 w-4/5" />
                      <Skeleton className="h-72 w-full" />
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </CardContent>
        )}
      </Card>

      <PDFPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Institutional Document Style Sample"
        description="Review the current branding and font before saving."
        pdfUrl={sampleReady ? sample.url : null}
        isPreparing={!sampleReady && !sampleError}
        error={sampleError}
        onRetry={() => setSampleAttempt((value) => value + 1)}
        downloadFilename="Institutional-Document-Style-Sample.pdf"
      />

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        isAppleStyled={true}
        isRestoreModal={true}
        title="Restore Default Institutional Branding"
        message="Restore the institutional names, office header, report font, signatory titles, brand color, and seals to their default settings?"
        confirmLabel="Restore Defaults"
        cancelLabel="Cancel"
        variant="warning"
        buttonIcon=" ReloadIcon"
        isLoading={saving}
        onConfirm={handleReset}
      />

      {/* Remove Primary Logo Confirmation Modal */}
      <ConfirmModal
        open={removeLogoModalOpen}
        onCancel={() => setRemoveLogoModalOpen(false)}
        isAppleStyled={true}
        title="Remove Custom Primary School Seal"
        message="This will clear your custom uploaded primary seal and revert all reports to using the default PUP logo (with eManage as offline system fallback)."
        confirmLabel="Remove Primary Seal"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={saving}
        onConfirm={handleRemoveCustomLogo}
      />

      {/* Remove Secondary Logo Confirmation Modal */}
      <ConfirmModal
        open={removeSecondaryLogoModalOpen}
        onCancel={() => setRemoveSecondaryLogoModalOpen(false)}
        isAppleStyled={true}
        title="Remove Secondary Seal"
        message="This will clear your secondary regulatory or partner seal and return all generated reports and letterheads back to centered single-logo mode."
        confirmLabel="Remove Secondary Seal"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={saving}
        onConfirm={handleRemoveSecondaryLogo}
      />
    </div>
  )
}
