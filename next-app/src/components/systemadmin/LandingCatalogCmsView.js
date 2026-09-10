"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import LandingCatalogSkeleton from "@/components/systemadmin/skeletons/LandingCatalogSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import ConfirmModal from "@/components/shared/ConfirmModal"
import BevelButton from "@/components/ui/bevel-button"
import DocumentCardPreview from "@/components/landing/DocumentCardPreview"
import { cn } from "@/lib/utils"

export const MAX_CATALOG_ITEMS = 8
export const MIN_CATALOG_ITEMS = 2

const DEFAULT_CATALOG_CONTENT = {
  eyebrow: "Official University Credentials",
  heading: "Academic Document Catalog",
  description:
    "Explore authentic credentials, university clearance protocols, and official registrar records issued by the University.",
  badgeText: "Official Credential",
  primaryButtonText: "Request Credential",
  primaryButtonLink: "/login",
  primaryButtonEnabled: true,
  dragHint: "Drag or click document to inspect",
  items: [
    {
      id: "tor",
      code: "TOR",
      title: "Transcript of Records",
      category: "transcripts",
      client: "Student & Alumni",
      description:
        "Official comprehensive academic transcript for employment, PRC board examinations, and graduate studies.",
      requirements: [
        "2x2 Formal Photo (White Background, Nametag)",
        "University Clearance Form (Fully Signed)",
        "Documentary Stamp (BIR Compliant)",
      ],
      previewStyle: "tor",
      sealTag: "REGISTRAR SEAL VERIFIED",
    },
    {
      id: "cog",
      code: "COG",
      title: "Certificate of Grades",
      category: "transcripts",
      client: "Enrolled Students",
      description:
        "Certified summary of semester grades requested for scholarships, employer tuition subsidies, and academic evaluation.",
      requirements: [
        "Current Student ID or SIS Portal Profile Printout",
        "Specific Academic Year & Semester Identification",
      ],
      previewStyle: "cog",
      sealTag: "Registrar Certified",
    },
    {
      id: "cor",
      code: "COR",
      title: "Certificate of Registration",
      category: "certs",
      client: "Enrolled Students",
      description:
        "Official certification of enrollment status for student discounts, government aid, and passport/visa requirements.",
      requirements: [
        "Validated Assessment Form / Enrollment Proof",
        "Current Semester Course Load Details",
      ],
      previewStyle: "cor",
      sealTag: "Assessed & Cleared",
    },
    {
      id: "ctc",
      code: "HD",
      title: "Honorable Dismissal",
      category: "clearances",
      client: "Transferees",
      description:
        "Formal Certificate of Transfer Credential certifying official release from PUP to transfer to another institution.",
      requirements: [
        "Comprehensive Campus University Clearance",
        "Surrender of PUP Student ID Card",
        "Parent / Guardian Consent Form (If Minor)",
      ],
      previewStyle: "ctc",
      sealTag: "Release Approved",
    },
    {
      id: "moral",
      code: "GMC",
      title: "Good Moral Character",
      category: "certs",
      client: "Student & Alumni",
      description:
        "Issued in coordination with OSAS certifying zero pending disciplinary infractions during university residency.",
      requirements: [
        "OSAS Disciplinary Clearance Slip",
        "Valid Student ID or Government ID Card",
      ],
      previewStyle: "moral",
      sealTag: "Cleared",
    },
    {
      id: "diploma",
      code: "DIP-2",
      title: "Second Copy of Diploma",
      category: "clearances",
      client: "Alumni Only",
      description:
        "Official replacement graduation diploma reissued after verified destruction or loss of the original parchment.",
      requirements: [
        "Notarized Affidavit of Loss / Damage",
        "Copy of Official Certificate of Graduation",
        "Board of Regents Formal Verification",
      ],
      previewStyle: "diploma",
      sealTag: "Gold Seal Certified",
    },
    {
      id: "cav",
      code: "CAV",
      title: "CAV (DFA Apostille / Abroad)",
      category: "certs",
      client: "Graduates & Alumni",
      description:
        "Certification, Authentication, and Verification endorsed directly to DFA and CHED for international credential recognition.",
      requirements: [
        "Certified True Copies of TOR and Diploma",
        "Passport Identification Copy (Full Legal Name)",
        "CHED / Red Ribbon Endorsement Checklist",
      ],
      previewStyle: "cav",
      sealTag: "Apostille Cleared",
    },
    {
      id: "certified_copy",
      code: "CTC",
      title: "Certified True Copy",
      category: "transcripts",
      client: "Student & Alumni",
      description:
        "Official Registrar dry seal and verification stamp placed on original photocopies of university academic records.",
      requirements: [
        "Original Document for Verification Presentation",
        "Clear Photocopy for Dry Seal Stamping",
      ],
      previewStyle: "certified_copy",
      sealTag: "CERTIFIED TRUE COPY",
    },
  ],
}


const CATEGORY_OPTIONS = [
  { value: "transcripts", label: "Academic Record (Transcripts / Grades)" },
  { value: "certs", label: "Official Certification (Registration, Good Moral, CAV)" },
  { value: "clearances", label: "Clearance Credential (Dismissal, Diploma)" },
]

const CLIENT_PILLS = [
  "Student & Alumni",
  "Enrolled Students",
  "Alumni Only",
  "Transferees",
  "Graduates & Alumni",
]

const PREVIEW_STYLES = [
  { value: "tor", label: "Transcript Grades Table" },
  { value: "cog", label: "Semester Evaluation Summary" },
  { value: "cor", label: "Enrolled Section & Matriculation" },
  { value: "diploma", label: "Diploma Parchment & Seal" },
  { value: "moral", label: "OSAS Good Moral Statement" },
  { value: "cav", label: "DFA / CHED Apostille Clearance" },
  { value: "ctc", label: "Honorable Dismissal Release" },
  { value: "certified_copy", label: "Certified True Copy Rubber Stamp" },
  { value: "custom", label: "Modern Institutional Card" },
]

export default function LandingCatalogCmsView({ showToast }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("cards") // 'cards' | 'narrative' | 'preview'
  const [catalogData, setCatalogData] = useState(DEFAULT_CATALOG_CONTENT)

  // Card editor states
  const [selectedCardIdx, setSelectedCardIdx] = useState(0)
  const [newRequirementText, setNewRequirementText] = useState("")
  const [deleteCardIdx, setDeleteCardIdx] = useState(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)

  // In-CMS live preview state
  const [previewActiveIdx, setPreviewActiveIdx] = useState(0)
  const [previewDarkTheme, setPreviewDarkTheme] = useState(false)

  // Toast notification helper
  const notify = useCallback(
    (msg, isError = false) => {
      if (showToast) showToast(msg, isError)
    },
    [showToast]
  )

  // Fetch current catalog configuration
  const fetchCatalogData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/landing/catalog", { cache: "no-store" })
      const json = await res.json()
      if (res.ok && json.ok && json.data) {
        setCatalogData(json.data)
      } else {
        notify(json.error || "Failed to load catalog configuration", true)
      }
    } catch (err) {
      console.error("[LandingCatalogCmsView] Fetch error:", err)
      notify("Network error fetching catalog settings", true)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    fetchCatalogData()
  }, [fetchCatalogData])

  // Save changes
  const handleSave = async () => {
    if (!catalogData.heading.trim()) {
      notify("Section heading cannot be blank", true)
      return
    }
    if (!catalogData.items || catalogData.items.length < MIN_CATALOG_ITEMS) {
      notify(`At least ${MIN_CATALOG_ITEMS} documents are required`, true)
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/landing/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catalogData),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setCatalogData(json.data)
        notify("Academic catalog configuration saved successfully")
      } else {
        notify(json.error || "Failed to save catalog settings", true)
      }
    } catch (err) {
      console.error("[LandingCatalogCmsView] Save error:", err)
      notify("Network error saving configuration", true)
    } finally {
      setSaving(false)
    }
  }

  // Reset to defaults
  const handleReset = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/landing/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setCatalogData(json.data)
        setSelectedCardIdx(0)
        setPreviewActiveIdx(0)
        notify("Academic catalog reverted to institutional defaults")
      } else {
        notify(json.error || "Failed to reset catalog settings", true)
      }
    } catch (err) {
      console.error("[LandingCatalogCmsView] Reset error:", err)
      notify("Network error resetting configuration", true)
    } finally {
      setSaving(false)
      setResetModalOpen(false)
    }
  }

  // Card operations: Move, Delete, Duplicate, Add
  const moveCard = (idx, direction) => {
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= catalogData.items.length) return

    setCatalogData((prev) => {
      const nextItems = [...prev.items]
      const temp = nextItems[idx]
      nextItems[idx] = nextItems[targetIdx]
      nextItems[targetIdx] = temp
      return { ...prev, items: nextItems }
    })
    setSelectedCardIdx(targetIdx)
    setPreviewActiveIdx(targetIdx)
  }

  const deleteCard = (idx) => {
    if (catalogData.items.length <= MIN_CATALOG_ITEMS) {
      notify(`A minimum of ${MIN_CATALOG_ITEMS} documents is required to maintain the Ferris wheel layout`, true)
      return
    }

    setCatalogData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }))
    setDeleteCardIdx(null)
    setSelectedCardIdx((prev) => Math.max(0, Math.min(prev, catalogData.items.length - 2)))
    setPreviewActiveIdx((prev) => Math.max(0, Math.min(prev, catalogData.items.length - 2)))
    notify("Document card removed")
  }

  const duplicateCard = (idx) => {
    if (catalogData.items.length >= MAX_CATALOG_ITEMS) {
      notify(`Maximum of ${MAX_CATALOG_ITEMS} documents allowed`, true)
      return
    }

    const source = catalogData.items[idx]
    const duplicated = {
      ...source,
      id: `${source.id}_copy_${Date.now().toString().slice(-4)}`,
      code: source.code ? `${source.code}-2` : "COPY",
      title: `${source.title} (Copy)`,
      requirements: [...source.requirements],
    }

    setCatalogData((prev) => {
      const nextItems = [...prev.items]
      nextItems.splice(idx + 1, 0, duplicated)
      return { ...prev, items: nextItems }
    })
    setSelectedCardIdx(idx + 1)
    setPreviewActiveIdx(idx + 1)
    notify(`Duplicated "${source.title}"`)
  }

  const addNewCard = () => {
    if (catalogData.items.length >= MAX_CATALOG_ITEMS) {
      notify(`Maximum of ${MAX_CATALOG_ITEMS} documents allowed`, true)
      return
    }

    const nextIdx = catalogData.items.length + 1
    const uniqueSuffix = Date.now().toString().slice(-4)
    const newDoc = {
      id: `custom_doc_${uniqueSuffix}`,
      code: `DOC-${nextIdx}`,
      title: `New Academic Credential ${nextIdx}`,
      category: "certs",
      client: "Student & Alumni",
      description: "Official registrar credential issued for academic, legal, or employment verification purposes.",
      requirements: [
        "Valid Student ID or Government Issued ID",
        "Official Clearance Slip",
      ],
      previewStyle: "custom",
      sealTag: "OFFICIAL REGISTRAR RECORD",
    }

    setCatalogData((prev) => ({
      ...prev,
      items: [...prev.items, newDoc],
    }))
    setSelectedCardIdx(catalogData.items.length)
    setPreviewActiveIdx(catalogData.items.length)
    notify(`Added "${newDoc.title}"`)
  }

  const updateCardField = (field, value) => {
    setCatalogData((prev) => {
      const nextItems = [...prev.items]
      nextItems[selectedCardIdx] = {
        ...nextItems[selectedCardIdx],
        [field]: value,
      }
      return { ...prev, items: nextItems }
    })
  }

  // Requirement items manipulation
  const addRequirement = () => {
    const trimmed = newRequirementText.trim()
    if (!trimmed) return
    const currentReqs = currentCard?.requirements || []
    updateCardField("requirements", [...currentReqs, trimmed])
    setNewRequirementText("")
  }

  const removeRequirement = (reqIdx) => {
    const currentReqs = currentCard?.requirements || []
    if (currentReqs.length <= 1) {
      notify("Each document must have at least one filing requirement", true)
      return
    }
    updateCardField(
      "requirements",
      currentReqs.filter((_, i) => i !== reqIdx)
    )
  }

  const updateRequirement = (reqIdx, value) => {
    const currentReqs = [...(currentCard?.requirements || [])]
    currentReqs[reqIdx] = value
    updateCardField("requirements", currentReqs)
  }

  if (loading) {
    return <LandingCatalogSkeleton />
  }

  const currentItems = catalogData.items || []
  const currentCard = currentItems[selectedCardIdx] || currentItems[0] || {}

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-books"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Landing Page CMS</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · Academic Document Catalog
              </span>
            </div>
          }
          description="Configure authentic university credentials, filing requirements, client eligibility, and interactive Ferris Wheel 3D cards."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("/#catalog", "_blank")}
                className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                View Portal
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setResetModalOpen(true)}
                className="flex h-10 items-center justify-center rounded-xl! border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                Reset Defaults
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs"
              >
                {saving ? (
                  <>
                    <i className="ph-bold ph-spinner animate-spin mr-1.5 text-[14px]" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          }
        />

        {/* Standard Underline Tabs */}
        <div className="flex items-center gap-6 shrink-0 h-10 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card select-none">
          <button
            type="button"
            onClick={() => setActiveTab("cards")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
              activeTab === "cards"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Document Cards ({currentItems.length}/{MAX_CATALOG_ITEMS})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("narrative")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
              activeTab === "narrative"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Section Header &amp; Narrative
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
              activeTab === "preview"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Interactive Live Preview
          </button>
        </div>

        <CardContent className="p-6">
          {/* TAB 1: DOCUMENT CARDS MANAGEMENT */}
          {activeTab === "cards" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT COLUMN: DOCUMENT CARD LIST & ADD BUTTON */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>Catalog Credentials</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                        {currentItems.length} of {MAX_CATALOG_ITEMS}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      Select a credential to edit or drag position on the wheel.
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    disabled={currentItems.length >= MAX_CATALOG_ITEMS}
                    onClick={addNewCard}
                    className="h-8 rounded-xl bg-pup-maroon hover:bg-[#600000] text-white text-xs font-semibold px-3 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-40"
                    title={currentItems.length >= MAX_CATALOG_ITEMS ? `Maximum of ${MAX_CATALOG_ITEMS} cards reached` : "Add credential card"}
                  >
                    Add Card
                  </Button>
                </div>

                {/* Cards List (Non-scrollable) */}
                <div className="flex flex-col gap-2">
                  {currentItems.map((item, idx) => {
                    const isSelected = idx === selectedCardIdx
                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => setSelectedCardIdx(idx)}
                        className={cn(
                          "group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 select-none",
                          isSelected
                            ? "bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-900/60 shadow-xs ring-1 ring-red-400/30"
                            : "bg-white dark:bg-zinc-900/50 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40"
                        )}
                      >
                        {/* Position badge */}
                        <div
                          className={cn(
                            "w-7 h-7 rounded-xl flex items-center justify-center font-mono text-[11px] font-bold flex-shrink-0 transition-colors",
                            isSelected
                              ? "bg-pup-maroon text-white"
                              : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 group-hover:bg-gray-200"
                          )}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </div>

                        {/* Middle info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold font-mono uppercase text-gray-900 dark:text-white px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08]">
                              {item.code || "DOC"}
                            </span>
                            <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate">
                              {item.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-zinc-400">
                            <span className="truncate">{item.client}</span>
                            <span>•</span>
                            <span className="text-[10px] font-mono">
                              {item.requirements?.length || 0} Req.
                            </span>
                          </div>
                        </div>

                        {/* Order & Action controls */}
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title="Move Up"
                            disabled={idx === 0}
                            onClick={() => moveCard(idx, -1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-0 bg-transparent transition-colors"
                          >
                            <i className="ph-bold ph-caret-up text-xs" />
                          </button>
                          <button
                            type="button"
                            title="Move Down"
                            disabled={idx === currentItems.length - 1}
                            onClick={() => moveCard(idx, 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-0 bg-transparent transition-colors"
                          >
                            <i className="ph-bold ph-caret-down text-xs" />
                          </button>
                          <button
                            type="button"
                            title="Duplicate Card"
                            disabled={currentItems.length >= MAX_CATALOG_ITEMS}
                            onClick={() => duplicateCard(idx)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-pup-maroon dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-0 bg-transparent transition-colors"
                          >
                            <i className="ph-bold ph-copy text-xs" />
                          </button>
                          <button
                            type="button"
                            title="Delete Card"
                            disabled={currentItems.length <= MIN_CATALOG_ITEMS}
                            onClick={() => setDeleteCardIdx(idx)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-0 bg-transparent transition-colors"
                          >
                            <i className="ph-bold ph-trash text-xs" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Bottom Add Card Big Dashed Button */}
                {currentItems.length < MAX_CATALOG_ITEMS ? (
                  <button
                    type="button"
                    onClick={addNewCard}
                    className="w-full py-3.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-pup-maroon/40 hover:bg-pup-maroon/5 dark:hover:bg-red-500/5 transition-all flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 cursor-pointer select-none"
                  >
                    <i className="ph-bold ph-plus text-sm" />
                    <span>Add Another Credential Card ({currentItems.length}/{MAX_CATALOG_ITEMS})</span>
                  </button>
                ) : (
                  <div className="w-full py-3 px-3.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-zinc-900/30 text-center text-xs text-gray-500 dark:text-zinc-400 flex items-center justify-center gap-2">
                    <i className="ph-bold ph-info text-pup-maroon dark:text-red-400" />
                    <span>Maximum limit reached ({MAX_CATALOG_ITEMS} of {MAX_CATALOG_ITEMS} credentials). Document catalog is capped at {MAX_CATALOG_ITEMS} cards for layout stability.</span>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: ACTIVE CARD EDITOR & MINI LIVE MOCKUP */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 flex flex-col gap-5">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 dark:border-white/10">
                    <div>
                      <div className="text-[10px] font-mono uppercase font-bold text-pup-maroon dark:text-red-400 tracking-wider">
                        Document Card Editor
                      </div>
                      <h4 className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">
                        {currentCard.title || "Selected Credential"}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                        Position {selectedCardIdx + 1} of {currentItems.length}
                      </span>
                    </div>
                  </div>

                  {/* Identification: Title, Code, Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Document Full Name
                      </label>
                      <Input
                        value={currentCard.title || ""}
                        onChange={(e) => updateCardField("title", e.target.value)}
                        placeholder="e.g. Transcript of Records"
                        className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Short Code
                      </label>
                      <Input
                        value={currentCard.code || ""}
                        onChange={(e) => updateCardField("code", e.target.value.toUpperCase())}
                        maxLength={8}
                        placeholder="e.g. TOR"
                        className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 text-xs font-mono font-bold uppercase"
                      />
                    </div>
                  </div>

                  {/* Category & Client Eligibility */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Official Category
                      </label>
                      <Select
                        value={currentCard.category || "transcripts"}
                        onChange={(e) => updateCardField("category", e.target.value)}
                        className="h-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-800 dark:text-zinc-200 cursor-pointer shadow-none px-3"
                        menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                        optionClassName="rounded-lg text-xs font-medium py-2 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        {CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Eligible Client Group
                      </label>
                      <Input
                        value={currentCard.client || ""}
                        onChange={(e) => updateCardField("client", e.target.value)}
                        placeholder="e.g. Student & Alumni"
                        className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 text-xs"
                      />
                      {/* Quick pills */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {CLIENT_PILLS.map((pill, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => updateCardField("client", pill)}
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-md border cursor-pointer transition-colors",
                              currentCard.client === pill
                                ? "bg-pup-maroon text-white border-pup-maroon font-bold"
                                : "bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-white/10 hover:border-gray-300"
                            )}
                          >
                            {pill}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300">
                        Official Description
                      </label>
                      <span className="text-[10px] text-gray-400">
                        Shown in the left inspector when document is focused
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={currentCard.description || ""}
                      onChange={(e) => updateCardField("description", e.target.value)}
                      placeholder="Comprehensive summary of what this document certifies and what purposes it serves..."
                      className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 text-xs leading-relaxed text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-pup-maroon resize-none"
                    />
                  </div>

                  {/* Filing Requirements Checklist Builder */}
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono">
                          Mandatory Filing Requirements ({currentCard.requirements?.length || 0})
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">Checked items shown to applicants</span>
                    </div>

                    {/* Requirements list */}
                    <div className="space-y-2">
                      {currentCard.requirements?.map((req, rIdx) => (
                        <div key={rIdx} className="flex items-center gap-2 group">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                            <i className="ph-bold ph-check" />
                          </div>
                          <Input
                            value={req}
                            onChange={(e) => updateRequirement(rIdx, e.target.value)}
                            className="h-8 rounded-lg bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-xs flex-1"
                          />
                          <button
                            type="button"
                            title="Remove requirement"
                            onClick={() => removeRequirement(rIdx)}
                            className="w-7 h-7 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer border-0 bg-transparent transition-colors"
                          >
                            <i className="ph-bold ph-x text-xs" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add requirement input */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                      <Input
                        value={newRequirementText}
                        onChange={(e) => setNewRequirementText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addRequirement()
                          }
                        }}
                        placeholder="Add required document or clearance (e.g. Valid Student ID)..."
                        className="h-9 rounded-xl bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-xs flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={addRequirement}
                        disabled={!newRequirementText.trim()}
                        className="h-9 rounded-xl bg-zinc-800 hover:bg-zinc-900 text-white dark:bg-zinc-700 dark:hover:bg-zinc-600 text-xs font-semibold px-3 cursor-pointer shadow-xs"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Visual Style & Seal Tag */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Preview Mockup Style
                      </label>
                      <Select
                        value={currentCard.previewStyle || currentCard.id || "custom"}
                        onChange={(e) => updateCardField("previewStyle", e.target.value)}
                        className="h-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-800 dark:text-zinc-200 cursor-pointer shadow-none px-3"
                        menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                        optionClassName="rounded-lg text-xs font-medium py-2 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        {PREVIEW_STYLES.map((st) => (
                          <option key={st.value} value={st.value}>
                            {st.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Verification Seal Tag Text
                      </label>
                      <Input
                        value={currentCard.sealTag || ""}
                        onChange={(e) => updateCardField("sealTag", e.target.value)}
                        placeholder="e.g. REGISTRAR SEAL VERIFIED"
                        className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Card Visual Preview Comparison (Active Maroon vs Inactive Glass) */}
                  <div className="p-4 rounded-xl bg-zinc-100/80 dark:bg-zinc-950/60 border border-gray-200 dark:border-white/10">
                    <div className="text-[10px] font-mono uppercase font-bold text-gray-500 mb-3 flex items-center justify-between">
                      <span>Live Card Preview (Active vs Inactive)</span>
                      <span className="text-pup-maroon dark:text-red-400 font-semibold">
                        Real-Time Renderer
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2 overflow-x-auto">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-400">Focused (Selected)</span>
                        <div className="scale-[0.82] origin-top">
                          <DocumentCardPreview item={currentCard} isActive={true} />
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-400">Orbiting (Unfocused)</span>
                        <div className="scale-[0.82] origin-top">
                          <DocumentCardPreview item={currentCard} isActive={false} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECTION HEADER & NARRATIVE */}
          {activeTab === "narrative" && (
            <div className="w-full space-y-6">
              <div className="p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 space-y-5">
                <div className="border-b border-gray-200/80 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Section Header &amp; Subtitle
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Controls the overarching headline and introductory copy displayed on the left of the Ferris wheel.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Eyebrow Badge Tag (Optional)
                  </label>
                  <Input
                    value={catalogData.eyebrow || ""}
                    onChange={(e) =>
                      setCatalogData((prev) => ({ ...prev, eyebrow: e.target.value }))
                    }
                    placeholder="e.g. Official University Credentials"
                    className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Main Section Heading
                  </label>
                  <Input
                    value={catalogData.heading || ""}
                    onChange={(e) =>
                      setCatalogData((prev) => ({ ...prev, heading: e.target.value }))
                    }
                    placeholder="e.g. Academic Document Catalog"
                    className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 text-sm font-extrabold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Section Description / Intro Paragraph
                  </label>
                  <textarea
                    rows={3}
                    value={catalogData.description || ""}
                    onChange={(e) =>
                      setCatalogData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Explore authentic credentials, university clearance protocols, and official registrar records issued by the University."
                    className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 text-xs leading-relaxed text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-pup-maroon resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Inspector Badge Text
                  </label>
                  <Input
                    value={catalogData.badgeText || ""}
                    onChange={(e) =>
                      setCatalogData((prev) => ({ ...prev, badgeText: e.target.value }))
                    }
                    placeholder="e.g. Official Credential"
                    className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INTERACTIVE LIVE PREVIEW */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              {/* Standard Preview Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Simulated Academic Catalog Preview
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400">
                    Live interactive canvas showing credential inspection, requirement checklists, and 3D card presentation.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-500 dark:text-zinc-400">
                    Card {previewActiveIdx + 1} of {currentItems.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPreviewDarkTheme(!previewDarkTheme)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-white/10 cursor-pointer shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <i className={cn("ph-bold", previewDarkTheme ? "ph-sun text-amber-500" : "ph-moon text-zinc-700")} />
                    <span>{previewDarkTheme ? "Switch to Light View" : "Switch to Dark View"}</span>
                  </button>
                </div>
              </div>

              {/* Stage container */}
              <div
                className={cn(
                  "relative w-full rounded-2xl border p-8 lg:p-12 overflow-hidden transition-colors min-h-[620px] flex items-center select-none",
                  previewDarkTheme
                    ? "bg-zinc-950 text-white border-zinc-800"
                    : "bg-white text-gray-900 border-gray-200"
                )}
              >
                {/* Radial glow */}
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none opacity-25">
                  <div className="w-full h-full bg-radial from-[#800000] via-transparent to-transparent blur-3xl" />
                </div>

                <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column Inspector */}
                  <div className="lg:col-span-6 space-y-6 max-w-lg">
                    <div>
                      {catalogData.eyebrow && (
                        <div className="text-[11px] font-mono uppercase tracking-widest text-[#800000] dark:text-red-400 font-bold mb-2">
                          {catalogData.eyebrow}
                        </div>
                      )}
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                        {catalogData.heading}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-2 leading-relaxed">
                        {catalogData.description}
                      </p>
                    </div>

                    {/* Active Inspector Panel */}
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-black/[0.06] dark:border-white/[0.08]">
                          {currentItems[previewActiveIdx]?.client}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {catalogData.badgeText || "Official Credential"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                          {currentItems[previewActiveIdx]?.title}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-zinc-300 mt-1.5 leading-relaxed">
                          {currentItems[previewActiveIdx]?.description}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl liquid-glass-light border border-black/[0.06] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03]">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2.5 font-mono">
                          <i className="ph-bold ph-shield-check text-[#800000] dark:text-red-400 text-base" />
                          Mandatory Filing Requirements
                        </div>
                        <ul className="space-y-2 text-xs text-gray-600 dark:text-zinc-300">
                          {currentItems[previewActiveIdx]?.requirements?.map((req, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                              <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                                <i className="ph-bold ph-check text-[10px]" />
                              </span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Buttons & Indicator */}
                    <div className="flex items-center gap-4 pt-1">
                      {catalogData.primaryButtonEnabled !== false && (
                        <BevelButton className="h-10 px-6 rounded-full text-xs font-bold">
                          <span>{catalogData.primaryButtonText}</span>
                          <i className="ph-bold ph-arrow-right text-xs ml-1" />
                        </BevelButton>
                      )}

                      {/* Pagination buttons */}
                      <div className="flex items-center gap-1.5">
                        {currentItems.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPreviewActiveIdx(idx)}
                            className={cn(
                              "h-1.5 rounded-full transition-all cursor-pointer border-0",
                              idx === previewActiveIdx
                                ? "w-6 bg-[#800000] dark:bg-red-500"
                                : "w-1.5 bg-gray-300 dark:bg-zinc-700 hover:bg-gray-400"
                            )}
                            aria-label={`Go to ${item.title}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Interactive Card Showcase Carousel */}
                  <div className="lg:col-span-6 flex flex-col items-center justify-center gap-4">
                    <div className="relative flex items-center justify-center">
                      <div className="transition-all duration-300 transform scale-[0.95] sm:scale-100 shadow-2xl rounded-[32px]">
                        <DocumentCardPreview
                          item={currentItems[previewActiveIdx]}
                          isActive={true}
                        />
                      </div>
                    </div>

                    {/* Quick navigation arrows */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewActiveIdx((prev) => (prev === 0 ? currentItems.length - 1 : prev - 1))
                        }
                        className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 flex items-center justify-center text-xs font-bold shadow-xs hover:scale-105 active:scale-95 cursor-pointer transition-all"
                      >
                        <i className="ph-bold ph-arrow-left text-xs" />
                      </button>
                      <span className="text-xs font-mono font-bold">
                        {previewActiveIdx + 1} / {currentItems.length}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewActiveIdx((prev) => (prev === currentItems.length - 1 ? 0 : prev + 1))
                        }
                        className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 flex items-center justify-center text-xs font-bold shadow-xs hover:scale-105 active:scale-95 cursor-pointer transition-all"
                      >
                        <i className="ph-bold ph-arrow-right text-xs" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Drag hint floating pill */}
                {catalogData.dragHint && (
                  <div className="absolute bottom-4 right-6 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-black/10 dark:border-white/10 text-[11px] font-mono text-gray-500 dark:text-zinc-400 shadow-md">
                    <i className="ph-bold ph-hand-pointing text-xs text-[#800000] dark:text-red-400" />
                    <span>{catalogData.dragHint}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        onConfirm={handleReset}
        isLoading={saving}
        title="Reset Catalog to Institutional Defaults"
        message="Are you sure you want to revert all document credentials, clearance checklists, and catalog headlines back to the official PUP San Juan institutional template?"
        confirmLabel="Reset to Defaults"
        icon="ph-duotone ph-arrow-counter-clockwise"
        buttonIcon="ph-bold ph-arrow-counter-clockwise"
        selectedItems={[
          "Reset catalog headlines and introductory narrative copy",
          "Restore official 8 PUP San Juan academic credentials and clearances",
          "Revert all filing requirements, client groups, and document categories",
        ]}
        isPersonnelModal={true}
        isAppleStyled={true}
        isArchiveModal={true}
      />

      {/* Delete Card Confirmation Modal */}
      <ConfirmModal
        open={deleteCardIdx !== null}
        onCancel={() => setDeleteCardIdx(null)}
        onConfirm={() => {
          if (deleteCardIdx !== null) {
            deleteCard(deleteCardIdx)
          }
        }}
        title={
          deleteCardIdx !== null && currentItems[deleteCardIdx]
            ? `Delete Credential Card: ${currentItems[deleteCardIdx]?.title || "Academic Credential"}`
            : "Delete Academic Credential Card"
        }
        message="Are you sure you want to permanently remove this document credential card from the public catalog showcase?"
        confirmLabel="Delete Card"
        icon="ph-duotone ph-trash"
        buttonIcon="ph-bold ph-trash"
        selectedItems={
          deleteCardIdx !== null && currentItems[deleteCardIdx]
            ? [
                `Document: ${currentItems[deleteCardIdx].title || "Untitled"} (${currentItems[deleteCardIdx].code || "DOC"})`,
                currentItems[deleteCardIdx].client
                  ? `Eligible Client: ${currentItems[deleteCardIdx].client}`
                  : "Eligible Client: General",
                currentItems[deleteCardIdx].requirements?.length
                  ? `Requirements: ${currentItems[deleteCardIdx].requirements.join(", ")}`
                  : "Requirements: None specified",
              ]
            : []
        }
        isPersonnelModal={true}
        isAppleStyled={true}
        isArchiveModal={true}
      />
    </div>
  )
}
