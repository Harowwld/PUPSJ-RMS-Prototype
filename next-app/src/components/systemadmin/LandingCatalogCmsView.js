"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import LandingCatalogSkeleton from "@/components/systemadmin/skeletons/LandingCatalogSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import ConfirmModal from "@/components/shared/ConfirmModal"
import { cn } from "@/lib/utils"

export const MAX_CATALOG_ITEMS = 8
export const MIN_CATALOG_ITEMS = 2

const DEFAULT_CATALOG_CONTENT = {
  heading: "Academic Document Catalog",
  description:
    "Explore authentic credentials, university clearance protocols, and official registrar records issued by the University.",
  items: [
    {
      id: "tor",
      title: "Transcript of Records",
      client: "Student & Alumni",
      description:
        "Official comprehensive academic transcript for employment, PRC board examinations, and graduate studies.",
      requirements: [
        "2x2 Formal Photo (White Background, Nametag)",
        "University Clearance Form (Fully Signed)",
        "Documentary Stamp (BIR Compliant)",
      ],
    },
    {
      id: "cog",
      title: "Certificate of Grades",
      client: "Enrolled Students",
      description:
        "Certified summary of semester grades requested for scholarships, employer tuition subsidies, and academic evaluation.",
      requirements: [
        "Current Student ID or SIS Portal Profile Printout",
        "Specific Academic Year & Semester Identification",
      ],
    },
    {
      id: "cor",
      title: "Certificate of Registration",
      client: "Enrolled Students",
      description:
        "Official certification of enrollment status for student discounts, government aid, and passport/visa requirements.",
      requirements: [
        "Validated Assessment Form / Enrollment Proof",
        "Current Semester Course Load Details",
      ],
    },
    {
      id: "ctc",
      title: "Honorable Dismissal",
      client: "Transferees",
      description:
        "Formal Certificate of Transfer Credential certifying official release from PUP to transfer to another institution.",
      requirements: [
        "Comprehensive Campus University Clearance",
        "Surrender of PUP Student ID Card",
        "Parent / Guardian Consent Form (If Minor)",
      ],
    },
    {
      id: "moral",
      title: "Good Moral Character",
      client: "Student & Alumni",
      description:
        "Issued in coordination with OSAS certifying zero pending disciplinary infractions during university residency.",
      requirements: [
        "OSAS Disciplinary Clearance Slip",
        "Valid Student ID or Government ID Card",
      ],
    },
    {
      id: "diploma",
      title: "Second Copy of Diploma",
      client: "Alumni Only",
      description:
        "Official replacement graduation diploma reissued after verified destruction or loss of the original parchment.",
      requirements: [
        "Notarized Affidavit of Loss / Damage",
        "Copy of Official Certificate of Graduation",
        "Board of Regents Formal Verification",
      ],
    },
    {
      id: "cav",
      title: "CAV (DFA Apostille / Abroad)",
      client: "Graduates & Alumni",
      description:
        "Certification, Authentication, and Verification endorsed directly to DFA and CHED for international credential recognition.",
      requirements: [
        "Certified True Copies of TOR and Diploma",
        "Passport Identification Copy (Full Legal Name)",
        "CHED / Red Ribbon Endorsement Checklist",
      ],
    },
    {
      id: "certified_copy",
      title: "Certified True Copy",
      client: "Student & Alumni",
      description:
        "Official Registrar dry seal and verification stamp placed on original photocopies of university academic records.",
      requirements: [
        "Original Document for Verification Presentation",
        "Clear Photocopy for Dry Seal Stamping",
      ],
    },
  ],
}

const CLIENT_PILLS = [
  "Student & Alumni",
  "Enrolled Students",
  "Alumni Only",
  "Transferees",
  "Graduates & Alumni",
]

export default function LandingCatalogCmsView({ showToast }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("content") // 'content' | 'preview'
  const [catalogData, setCatalogData] = useState(DEFAULT_CATALOG_CONTENT)

  // Card editor states
  const [selectedCardIdx, setSelectedCardIdx] = useState(0)
  const [newRequirementText, setNewRequirementText] = useState("")
  const [deleteCardIdx, setDeleteCardIdx] = useState(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)

  // Live preview states
  const [previewActiveIdx, setPreviewActiveIdx] = useState(0)
  const [previewDarkTheme, setPreviewDarkTheme] = useState(false)

  const notify = useCallback(
    (msg, isError = false) => {
      if (showToast) showToast(msg, isError)
    },
    [showToast]
  )



  useEffect(() => {
    let ignore = false
    async function init() {
      try {
        const res = await fetch("/api/landing/catalog", { cache: "no-store" })
        const json = await res.json()
        if (ignore) return
        if (res.ok && json.ok && json.data) {
          setCatalogData(json.data)
        } else {
          notify(json.error || "Failed to load document catalog configuration", true)
        }
      } catch (err) {
        if (ignore) return
        console.error("[LandingCatalogCmsView] Fetch error:", err)
        notify("Network error fetching catalog settings", true)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [notify])

  const currentItems = catalogData.items || []
  const safeSelectedIdx = selectedCardIdx < currentItems.length ? selectedCardIdx : 0
  const currentCard = currentItems[safeSelectedIdx] || currentItems[0] || {}

  const handleSave = async () => {
    if (!catalogData.heading?.trim()) {
      notify("Section Heading cannot be blank", true)
      return
    }

    if (currentItems.length < MIN_CATALOG_ITEMS) {
      notify(`Catalog requires at least ${MIN_CATALOG_ITEMS} document credentials`, true)
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
        notify("Document catalog configuration saved successfully")
      } else {
        notify(json.error || "Failed to save catalog configuration", true)
      }
    } catch (err) {
      console.error("[LandingCatalogCmsView] Save error:", err)
      notify("Network error saving configuration", true)
    } finally {
      setSaving(false)
    }
  }

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
        notify("Document catalog reverted to default")
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

  // Card mutations
  const updateCardField = (field, value) => {
    setCatalogData((prev) => {
      const nextItems = [...(prev.items || [])]
      nextItems[safeSelectedIdx] = {
        ...nextItems[safeSelectedIdx],
        [field]: value,
      }
      return { ...prev, items: nextItems }
    })
  }

  const addRequirement = () => {
    const text = newRequirementText.trim()
    if (!text) return
    const currentReqs = currentCard.requirements || []
    updateCardField("requirements", [...currentReqs, text])
    setNewRequirementText("")
  }

  const removeRequirement = (reqIdx) => {
    const currentReqs = currentCard.requirements || []
    updateCardField(
      "requirements",
      currentReqs.filter((_, i) => i !== reqIdx)
    )
  }

  const updateRequirement = (reqIdx, val) => {
    const currentReqs = [...(currentCard.requirements || [])]
    currentReqs[reqIdx] = val
    updateCardField("requirements", currentReqs)
  }

  const handleMoveCard = (idx, direction) => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= currentItems.length) return

    setCatalogData((prev) => {
      const nextItems = [...(prev.items || [])]
      const temp = nextItems[idx]
      nextItems[idx] = nextItems[targetIdx]
      nextItems[targetIdx] = temp
      return { ...prev, items: nextItems }
    })

    if (safeSelectedIdx === idx) {
      setSelectedCardIdx(targetIdx)
    } else if (safeSelectedIdx === targetIdx) {
      setSelectedCardIdx(idx)
    }
  }

  const handleAddCard = () => {
    if (currentItems.length >= MAX_CATALOG_ITEMS) {
      notify(`Maximum limit of ${MAX_CATALOG_ITEMS} cards reached`, true)
      return
    }

    const newId = `credential_${Date.now()}`
    const newCard = {
      id: newId,
      title: "New Credential Document",
      client: "Enrolled Students",
      description: "Official description and purpose of this academic credential.",
      requirements: ["Valid Student ID or Government Issued ID"],
    }

    setCatalogData((prev) => ({
      ...prev,
      items: [...(prev.items || []), newCard],
    }))
    setSelectedCardIdx(currentItems.length)
  }

  const handleDeleteCard = () => {
    if (deleteCardIdx === null) return
    if (currentItems.length <= MIN_CATALOG_ITEMS) {
      notify(`Cannot delete: Minimum ${MIN_CATALOG_ITEMS} credentials required`, true)
      setDeleteCardIdx(null)
      return
    }

    setCatalogData((prev) => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== deleteCardIdx),
    }))

    if (safeSelectedIdx >= currentItems.length - 1) {
      setSelectedCardIdx(Math.max(0, currentItems.length - 2))
    }
    setDeleteCardIdx(null)
    notify("Document credential removed")
  }

  if (loading) {
    return <LandingCatalogSkeleton />
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none">
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
          description="Configure authentic university credentials, document codes, client eligibility tags, and filing requirements for the Apple-style carousel."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("/#catalog", "_blank")}
                className="flex h-10 items-center justify-center rounded-xl! border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Preview
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setResetModalOpen(true)}
                className="flex h-10 items-center justify-center rounded-xl! border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                Reset
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs"
              >
                {saving ? (
                  <>
                    <HugeIcon className="ph-bold ph-spinner animate-spin mr-1.5 text-[14px]" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          }
        />

        {/* Navigation Tabs */}
        <div className="flex items-center gap-6 shrink-0 h-10 px-6 border-b border-border dark:border-border bg-white dark:bg-card select-none">
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
              activeTab === "content"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Catalog Content
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

        {/* Content Body */}
        <CardContent className="p-6">
          {/* TAB 1: Catalog Content (Section Header + Document Cards) */}
          {activeTab === "content" && (
            <div className="space-y-6">
              {/* Section Header & Subtitle */}
              <div className="p-5 sm:p-6 rounded-2xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Section Header &amp; Description
                  </h3>
                  <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300 mt-0.5">
                    Controls the overarching headline and introductory copy displayed above the document carousel.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Main Section Heading
                      </label>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {catalogData.heading?.length || 0}/50
                      </span>
                    </div>
                    <Input
                      value={catalogData.heading || ""}
                      onChange={(e) =>
                        setCatalogData((prev) => ({ ...prev, heading: e.target.value }))
                      }
                      placeholder="e.g. Academic Document Catalog"
                      maxLength={50}
                      className="h-10 rounded-xl bg-white dark:bg-zinc-900 border border-border dark:border-border text-xs font-semibold focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 dark:focus:ring-pup-maroon/20"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Section Description / Intro
                      </label>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {catalogData.description?.length || 0}/200
                      </span>
                    </div>
                    <Input
                      value={catalogData.description || ""}
                      onChange={(e) =>
                        setCatalogData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Explore authentic credentials, university clearance protocols..."
                      maxLength={200}
                      className="h-10 rounded-xl bg-white dark:bg-zinc-900 border border-border dark:border-border text-xs font-normal focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 dark:focus:ring-pup-maroon/20"
                    />
                  </div>
                </div>
              </div>

              {/* Cards Management Area */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* LEFT COLUMN: LIST OF CARDS */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                          Catalog Credentials
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                          {currentItems.length} of {MAX_CATALOG_ITEMS}
                        </span>
                      </div>
                      <p className="text-xs text-gray-900 dark:text-zinc-300 mt-0.5">
                        Select a credential to edit or adjust its order in the carousel.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCard}
                      disabled={currentItems.length >= MAX_CATALOG_ITEMS}
                      title="Add Card to Catalog"
                      className="h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-semibold px-3 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      Add
                    </Button>
                  </div>

                  {/* Cards List */}
                  <div className="flex flex-col gap-2 max-h-[580px] overflow-y-auto pr-1">
                    {currentItems.map((item, idx) => {
                      const isSelected = idx === safeSelectedIdx
                      return (
                        <div
                          key={item.id || idx}
                          onClick={() => setSelectedCardIdx(idx)}
                          className={cn(
                            "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 select-none",
                            isSelected
                              ? "border-pup-maroon dark:border-red-500/60 bg-red-50/50 dark:bg-red-950/20 shadow-xs"
                              : "border-border dark:border-border bg-white dark:bg-zinc-900/50 hover:bg-gray-50/80 dark:hover:bg-zinc-800/60"
                          )}
                        >
                          <div
                            className={cn(
                              "w-7 h-7 rounded-xl flex items-center justify-center font-mono text-[11px] font-bold shrink-0",
                              isSelected
                                ? "bg-pup-maroon text-white"
                                : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                            )}
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                                {item.title || "Untitled Document"}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-900 dark:text-zinc-300 truncate mt-0.5">
                              {item.client || "Official Record"} · {item.requirements?.length || 0} requirements
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              title="Move Up"
                              disabled={idx === 0}
                              onClick={() => handleMoveCard(idx, "up")}
                              className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <HugeIcon className="ph-bold ph-caret-up text-xs" />
                            </button>
                            <button
                              type="button"
                              title="Move Down"
                              disabled={idx === currentItems.length - 1}
                              onClick={() => handleMoveCard(idx, "down")}
                              className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <HugeIcon className="ph-bold ph-caret-down text-xs" />
                            </button>
                            <button
                              type="button"
                              title="Delete Card"
                              disabled={currentItems.length <= MIN_CATALOG_ITEMS}
                              onClick={() => setDeleteCardIdx(idx)}
                              className="w-7 h-7 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <HugeIcon className="ph-bold ph-trash text-xs" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* RIGHT COLUMN: ACTIVE CARD EDITOR & LIVE CARD MINI-PREVIEW */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <div className="p-5 sm:p-6 rounded-2xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 flex flex-col gap-5">
                    <div className="flex items-center justify-between pb-3 border-b border-border/80 dark:border-border">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono uppercase font-bold text-pup-maroon dark:text-red-400 tracking-wider">
                          Document Card Editor
                        </span>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                          {currentCard.title || "Untitled Document"}
                        </h3>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 font-mono font-bold">
                        Slot {String(safeSelectedIdx + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Official Document Title */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300">
                          Official Document Title
                        </label>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {currentCard.title?.length || 0}/60
                        </span>
                      </div>
                      <Input
                        value={currentCard.title || ""}
                        onChange={(e) => updateCardField("title", e.target.value)}
                        placeholder="e.g. Transcript of Records"
                        maxLength={60}
                        className="h-10 w-full rounded-xl bg-white dark:bg-zinc-900 border-border dark:border-border text-xs font-semibold"
                      />
                    </div>

                    {/* Client Tag */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Client Eligibility Tag
                      </label>
                      <Input
                        value={currentCard.client || ""}
                        onChange={(e) => updateCardField("client", e.target.value)}
                        placeholder="e.g. Student & Alumni"
                        className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-border dark:border-border text-xs mb-2 font-medium"
                      />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 font-mono">Suggestions:</span>
                        {CLIENT_PILLS.map((pill) => (
                          <button
                            key={pill}
                            type="button"
                            onClick={() => updateCardField("client", pill)}
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white dark:bg-zinc-800 border border-border dark:border-border text-gray-600 dark:text-zinc-300 hover:border-pup-maroon hover:text-pup-maroon transition-colors cursor-pointer"
                          >
                            {pill}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Document Description / Purpose Summary
                      </label>
                      <textarea
                        rows={2}
                        value={currentCard.description || ""}
                        onChange={(e) => updateCardField("description", e.target.value)}
                        placeholder="Official comprehensive academic transcript for employment, PRC board examinations..."
                        className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-border dark:border-border text-xs leading-relaxed text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-pup-maroon resize-none"
                      />
                    </div>

                    {/* Mandatory Filing Requirements */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                          Mandatory Filing Requirements ({currentCard.requirements?.length || 0})
                        </label>
                        <span className="text-[10px] text-gray-400 font-mono">
                          Shown directly on the carousel card
                        </span>
                      </div>

                      <div className="space-y-2">
                        {(currentCard.requirements || []).map((req, rIdx) => (
                          <div key={rIdx} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                              <HugeIcon className="ph-bold ph-check" />
                            </span>
                            <Input
                              value={req}
                              onChange={(e) => updateRequirement(rIdx, e.target.value)}
                              className="h-8 rounded-lg bg-white dark:bg-zinc-900 border-border dark:border-border text-xs flex-1"
                            />
                            <button
                              type="button"
                              title="Remove requirement"
                              onClick={() => removeRequirement(rIdx)}
                              className="w-7 h-7 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer border-0 bg-transparent transition-colors"
                            >
                              <HugeIcon className="ph-bold ph-x text-xs" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add requirement input */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border dark:border-border">
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
                          className="h-9 rounded-xl bg-white dark:bg-zinc-900 border-border dark:border-border text-xs flex-1"
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

                    {/* IN-EDITOR LIVE CARD MINI-PREVIEW (Apple-style Card) */}
                    <div className="p-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-950/60 border border-border dark:border-border">
                      <div className="text-[10px] font-mono uppercase font-bold text-gray-500 mb-3 flex items-center justify-between">
                        <span>Carousel Card Preview</span>
                        <span className="text-pup-maroon dark:text-red-400 font-semibold">
                          Real-Time Renderer
                        </span>
                      </div>

                      {/* Apple-style card container */}
                      <div className="max-w-[420px] mx-auto bg-[#f5f5f7] dark:bg-zinc-900 rounded-3xl p-6 sm:p-7 text-left shadow-sm border border-black/[0.04] dark:border-border font-jakarta">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800/40">
                            {currentCard.client || "Student & Alumni"}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 font-medium">
                            Official Document
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-gray-950 dark:text-white tracking-tight leading-snug mb-2">
                          {currentCard.title || "Untitled Document"}
                        </h3>

                        <p className="text-xs text-gray-900 dark:text-zinc-300 leading-relaxed mb-6">
                          {currentCard.description || "Document description..."}
                        </p>

                        <div className="pt-4 border-t border-black/5 dark:border-border">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-2.5 flex items-center gap-1.5">
                            <HugeIcon className="ph-bold ph-shield-check text-xs" />
                            Filing Requirements
                          </div>
                          <ul className="space-y-2 text-xs text-gray-600 dark:text-zinc-300">
                            {(currentCard.requirements || []).slice(0, 2).map((req, i) => (
                              <li key={i} className="flex items-start gap-2 leading-relaxed">
                                <span className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[7px] font-bold">
                                  <HugeIcon className="ph-bold ph-check" />
                                </span>
                                <span className="text-[11px] line-clamp-1">{req}</span>
                              </li>
                            ))}
                            {(currentCard.requirements?.length || 0) > 2 && (
                              <li className="text-gray-400 text-[10px] italic pl-5">
                                +{(currentCard.requirements?.length || 0) - 2} more...
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Interactive Live Carousel Preview */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Simulated Apple-Style Document Carousel
                  </h3>
                  <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300">
                    Live interactive carousel with smooth horizontal scaling, active card highlighting, and pagination dots.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-900 dark:text-zinc-300">
                    Card {previewActiveIdx + 1} of {currentItems.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPreviewDarkTheme(!previewDarkTheme)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-200 border border-border dark:border-border cursor-pointer shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <HugeIcon className={cn("ph-bold", previewDarkTheme ? "ph-sun text-amber-500" : "ph-moon text-zinc-700")} />
                    <span>{previewDarkTheme ? "Switch to Light View" : "Switch to Dark View"}</span>
                  </button>
                </div>
              </div>

              {/* Stage Container */}
              <div
                className={cn(
                  "relative w-full rounded-2xl border p-6 sm:p-10 overflow-hidden transition-colors select-none font-jakarta flex flex-col items-center",
                  previewDarkTheme
                    ? "bg-zinc-950 text-white border-zinc-800"
                    : "bg-white text-gray-900 border-border"
                )}
              >
                {/* Header */}
                <div className="max-w-3xl text-center mb-8">
                  <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-950 dark:text-white leading-[1.08]">
                    {catalogData.heading || "Academic Document Catalog"}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-900 dark:text-zinc-300 mt-3 leading-relaxed">
                    {catalogData.description}
                  </p>
                </div>

                {/* Carousel Horizontal Scroll Strip */}
                <div className="w-full flex overflow-x-auto gap-4 pb-6 pt-2 hide-scrollbar snap-x snap-mandatory">
                  {currentItems.map((doc, idx) => {
                    const isActive = idx === previewActiveIdx
                    return (
                      <div
                        key={doc.id || idx}
                        onClick={() => setPreviewActiveIdx(idx)}
                        className={cn(
                          "shrink-0 w-[280px] sm:w-[320px] md:w-[360px] flex flex-col rounded-3xl p-6 text-left transition-all duration-300 cursor-pointer snap-center",
                          previewDarkTheme ? "bg-zinc-900 border border-white/10" : "bg-[#f5f5f7] border border-black/[0.04]",
                          isActive
                            ? "scale-[1.02] ring-2 ring-pup-maroon/50 dark:ring-red-500/50 shadow-md z-10"
                            : "scale-[0.96] opacity-75 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800/40">
                            {doc.client || "Student & Alumni"}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 font-medium">
                            Official Document
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-gray-950 dark:text-white tracking-tight leading-snug mb-2">
                          {doc.title}
                        </h3>

                        <p className="text-xs text-gray-900 dark:text-zinc-300 leading-relaxed mb-6 flex-grow">
                          {doc.description}
                        </p>

                        <div className="pt-4 border-t border-black/5 dark:border-border mt-auto">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-2 flex items-center gap-1.5">
                            <HugeIcon className="ph-bold ph-shield-check text-xs" />
                            Filing Requirements
                          </div>
                          <ul className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-300">
                            {doc.requirements?.slice(0, 2).map((req, i) => (
                              <li key={i} className="flex items-start gap-2 leading-relaxed">
                                <span className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[7px] font-bold">
                                  <HugeIcon className="ph-bold ph-check" />
                                </span>
                                <span className="text-[11px] line-clamp-1">{req}</span>
                              </li>
                            ))}
                            {(doc.requirements?.length || 0) > 2 && (
                              <li className="text-gray-400 text-[10px] italic pl-5">
                                +{(doc.requirements?.length || 0) - 2} more...
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination Dots */}
                <div className="flex items-center justify-center gap-1.5 mt-2 h-4">
                  {currentItems.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewActiveIdx(idx)}
                      className={cn(
                        "h-1.5 rounded-full transition-all cursor-pointer border-0",
                        idx === previewActiveIdx
                          ? "w-6 bg-black dark:bg-white"
                          : "w-1.5 bg-gray-300 dark:bg-zinc-700 hover:bg-gray-400"
                      )}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
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
        message="Are you sure you want to revert all catalog headlines, credential descriptions, and filing requirements back to the official PUP San Juan institutional template?"
        confirmLabel="Reset"
        icon="ph-duotone ph-arrow-counter-clockwise"
        buttonIcon="ph-bold ph-arrow-counter-clockwise"
        selectedItems={[
          "Reset catalog section heading and description",
          "Restore official 8 PUP San Juan academic credential documents",
          "Revert all filing requirement checklists and client eligibility tags",
        ]}
        isPersonnelModal={true}
        isAppleStyled={true}
        isArchiveModal={true}
      />

      {/* Delete Card Modal */}
      <ConfirmModal
        open={deleteCardIdx !== null}
        onCancel={() => setDeleteCardIdx(null)}
        onConfirm={handleDeleteCard}
        isLoading={saving}
        title="Remove Document Credential"
        message={`Are you sure you want to delete "${currentItems[deleteCardIdx]?.title || "this credential"}" from the public academic catalog?`}
        confirmLabel="Delete"
        buttonIcon="ph-bold ph-trash"
        isDeleteModal={true}
        isAppleStyled={true}
      />
    </div>
  )
}
