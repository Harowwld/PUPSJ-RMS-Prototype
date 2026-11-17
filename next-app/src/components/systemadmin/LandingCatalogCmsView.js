"use client"
import LandingSectionPreview from "./LandingSectionPreview"
import DocumentCatalog from "@/components/landing/DocumentCatalog"
import useViewPreference from "@/hooks/useViewPreference"
import { Textarea } from "@/components/ui/textarea";


import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LandingCatalogSkeletonContent } from "@/components/systemadmin/skeletons/LandingCatalogSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import LandingCmsViewTabs from "./LandingCmsViewTabs"
import ConfirmModal from "@/components/shared/ConfirmModal"
import useCmsDraft from "@/hooks/useCmsDraft"
import LandingCmsDraftStatus from "./LandingCmsDraftStatus"
import { cn } from "@/lib/utils"
import { SUPERADMIN_BADGE_BASE as BADGE_BASE } from "@/lib/badgeStyles"
import CatalogClientBadge from "@/components/landing/CatalogClientBadge"
import { ArrowDown01Icon, ArrowUp01Icon, Cancel01Icon, Delete01Icon, Shield01Icon, Tick01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
export const MAX_CATALOG_ITEMS = 15
export const MIN_CATALOG_ITEMS = 2

const DEFAULT_CATALOG_CONTENT = {
  heading: "Academic Document Catalog",
  description:
    "Explore authentic credentials, university clearance protocols, and official registrar records issued by the University.",
  items: [
    {
      id: "tor_first_copy",
      title: "Transcript of Records (TOR) – 1st Copy",
      client: "Graduates & Alumni",
      description:
        "The official comprehensive academic record listing all enrolled courses, final grades, earned units, and degree conferred, issued upon completion of graduation requirements.",
      requirements: [
        "Certificate of Candidacy",
        "Signed General Clearance",
        "2x2 colored toga photo (white background, with academic cap and hood)",
        "Valid government-issued ID",
        "Official Receipt (if not covered under R.A. 10931)",
      ],
    },
    {
      id: "tor_subsequent_copy",
      title: "Transcript of Records (TOR) – 2nd / Subsequent Copy",
      client: "Student & Alumni",
      description:
        "An official copy of a student's or alumnus's complete academic record required for employment, board/licensure examinations, graduate school admission, or credential evaluation.",
      requirements: [
        "Valid government-issued ID",
        "Student number or previous TOR reference",
        "Proof of payment (plus PRC examination notice if requested for licensure purposes)",
      ],
    },
    {
      id: "diploma_first_copy",
      title: "Diploma (1st Copy)",
      client: "Graduates & Alumni",
      description:
        "The official institutional certificate conferring an academic degree upon a graduate who has fulfilled all curriculum and clearance requirements.",
      requirements: [
        "Certificate of Candidacy",
        "Signed General Clearance",
        "2x2 colored toga photo",
        "Valid ID",
        "Official Receipt (if not covered under R.A. 10931)",
      ],
    },
    {
      id: "diploma_replacement",
      title: "Diploma (Replacement or Certified True Copy)",
      client: "Alumni Only",
      description:
        "An authenticated reproduction or re-issued certification of a previously conferred degree diploma.",
      requirements: [
        "Clear copy of the original Diploma (for Certified True Copy) or a notarized Affidavit of Loss (for replacement)",
        "Valid government-issued ID",
        "Proof of payment",
      ],
    },
    {
      id: "certificate_of_graduation",
      title: "Certificate of Graduation",
      client: "Graduates & Alumni",
      description:
        "An official Registrar certification confirming that a student has completed all academic requirements and graduated with a specific degree.",
      requirements: [
        "Signed General Clearance (for recent graduates)",
        "Valid ID",
        "Student number",
      ],
    },
    {
      id: "icg",
      title: "Informative Copy of Grades (ICG)",
      client: "Student & Alumni",
      description:
        "A semester-by-semester summary of grades used for academic evaluation, scholarship renewal, shifting, re-admission, or personal reference.",
      requirements: [
        "Active student number",
        "Valid school or government-issued ID",
        "Current Registration Card (if currently enrolled)",
      ],
    },
    {
      id: "cog",
      title: "Certificate of Grades",
      client: "Student & Alumni",
      description:
        "An official document certifying final ratings earned in specific semesters or subjects when a full Transcript of Records is not required.",
      requirements: [
        "Valid school or government-issued ID",
        "Student number",
      ],
    },
    {
      id: "certificate_of_enrollment",
      title: "Certificate of Enrollment",
      client: "Enrolled Students",
      description:
        "Official verification confirming that a student is currently registered and enrolled in a specific program for the active semester or academic year.",
      requirements: [
        "Current Registration Card (Certificate of Registration)",
        "Valid school ID",
      ],
    },
    {
      id: "certificate_of_candidacy",
      title: "Certificate of Candidacy",
      client: "Enrolled Students",
      description:
        "Formal attestation certifying that a graduating student has been evaluated and recognized as an official candidate for graduation for the current term.",
      requirements: [
        "Evaluated curriculum sheet",
        "Current Registration Card",
        "Valid school ID",
      ],
    },
    {
      id: "english_medium_of_instruction",
      title: "Certificate of English as Medium of Instruction",
      client: "Student & Alumni",
      description:
        "Official certification attesting that English was the primary language of instruction for the student's program, commonly required for overseas employment or international study.",
      requirements: [
        "Copy of Transcript of Records or Certificate of Graduation",
        "Valid government-issued ID",
      ],
    },
    {
      id: "honorable_dismissal",
      title: "Honorable Dismissal (Transfer Credential)",
      client: "Transferees",
      description:
        "Official withdrawal and transfer clearance issued to students leaving the university to enroll in another higher education institution.",
      requirements: [
        "Signed General Clearance",
        "Formal letter of intent to transfer",
        "Surrendered school ID",
        "Valid government-issued ID",
      ],
    },
    {
      id: "general_clearance",
      title: "General Clearance",
      client: "Student & Alumni",
      description:
        "A university-wide clearance certifying that a student has no pending financial, library, laboratory, or administrative accountabilities.",
      requirements: [
        "Valid school or government-issued ID",
        "Student number (subject to departmental sign-offs)",
      ],
    },
    {
      id: "cav",
      title: "Certification, Authentication, and Verification (CAV)",
      client: "Graduates & Alumni",
      description:
        "Official verification and endorsement of academic credentials (TOR, Diploma, Certificate of Graduation) required for CHED validation and DFA Apostille processing.",
      requirements: [
        "Original and photocopies of the academic documents for authentication",
        "Valid government-issued ID",
        "Proof of payment",
      ],
    },
    {
      id: "good_moral_character",
      title: "Certificate of Good Moral Character",
      client: "Student & Alumni",
      description:
        "Official attestation certifying that a student or alumnus has maintained satisfactory conduct and has no derogatory disciplinary record during their enrollment.",
      requirements: [
        "Valid school or government-issued ID",
        "Proof of enrollment or graduation (Registration Card, COG, or TOR)",
        "Stated purpose of request",
      ],
    },
    {
      id: "certified_true_copy",
      title: "Certified True Copy (CTC)",
      client: "Student & Alumni",
      description:
        "Authenticated copies of university-issued documents (such as Registration Cards, TORs, or Certificates) verified and stamped against official Registrar records.",
      requirements: [
        "Original document (for verification)",
        "Clear photocopy to be stamped",
        "Valid ID",
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

export default function LandingCatalogCmsView({ showToast, onDirtyChange }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useViewPreference("cms-catalog", "activeTab", "content") // 'content' | 'preview'
  const [catalogData, setCatalogData] = useState(DEFAULT_CATALOG_CONTENT)
  const { isDirty, savedData, markSaved } = useCmsDraft(catalogData, onDirtyChange)

  // Card editor states
  const [selectedCardIdx, setSelectedCardIdx] = useState(0)
  const [newRequirementText, setNewRequirementText] = useState("")
  const [deleteCardIdx, setDeleteCardIdx] = useState(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)


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
          markSaved(json.data)
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
  }, [notify, markSaved])

  const currentItems = catalogData.items || []
  const safeSelectedIdx = selectedCardIdx < currentItems.length ? selectedCardIdx : 0
  const currentCard = currentItems[safeSelectedIdx] || currentItems[0] || {}

  const handleSave = async () => {
    if (!isDirty || saving) return
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
        markSaved(json.data)
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
        markSaved(json.data)
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
      client: "Student & Alumni",
      description: "Official description and purpose of this academic credential.",
      requirements: ["Valid school or government-issued ID"],
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

  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex min-w-0 flex-[1_0_auto] h-auto w-full flex-col gap-0 overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none isolate font-jakarta">
        <PageHeader
          icon=" LibraryIcon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Landing Page CMS</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">{catalogData.items.length} documents · Academic Document Catalog</span>
              <LandingCmsDraftStatus isDirty={isDirty} />
            </div>
          }
          description="Configure authentic university credentials, document codes, client eligibility tags, and filing requirements for the Apple-style carousel."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex shrink-0 items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("/#catalog", "_blank")}
                className="h-9 px-4"
              >
                Preview Portal
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={loading || saving || !isDirty}
                className="h-9 px-4 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving changes…" : "Save catalog content"}
              </Button>
            </div>
          }
          secondaryActions={
            <>
              <Button type="button" variant="outline" onClick={() => setResetModalOpen(true)} disabled={loading || saving} className="h-9 px-4">Restore defaults</Button>
              {isDirty && <Button type="button" variant="outline" onClick={() => { setCatalogData(savedData); notify("Draft changes discarded. Reverted to saved catalog content.") }} disabled={loading || saving} className="h-9 px-4">Discard draft</Button>}
            </>
          }
        />

        {/* Navigation Tabs */}
        <LandingCmsViewTabs activeTab={activeTab} onChange={setActiveTab} contentLabel="Catalog Content" contentCount={catalogData.items.length} />

        {loading ? (
          <LandingCatalogSkeletonContent />
        ) : (
        <CardContent className="p-6 flex flex-[1_0_auto] flex-col rounded-b-2xl">
          {/* TAB 1: Catalog Content (Section Header + Document Cards) */}
          {activeTab === "content" && (
            <div className="space-y-6">
              {/* Section Header & Subtitle */}
              <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-5">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Section Header &amp; Description
                  </h3>
                  <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300 mt-0.5">
                    Controls the overarching headline and introductory copy displayed above the document carousel.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor="catalog-heading" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        Main Section Heading
                      </label>
                      <span className="text-[11px] text-gray-400 font-sans tabular-nums">
                        {catalogData.heading?.length || 0}/50
                      </span>
                    </div>
                    <Input
                      id="catalog-heading"
                      value={catalogData.heading || ""}
                      onChange={(e) =>
                        setCatalogData((prev) => ({ ...prev, heading: e.target.value }))
                      }
                      placeholder="Academic Document Catalog"
                      maxLength={50}
                      className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-normal placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor="catalog-description" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        Section Description / Intro
                      </label>
                      <span className="text-[11px] text-gray-400 font-sans tabular-nums">
                        {catalogData.description?.length || 0}/200
                      </span>
                    </div>
                    <Textarea
                      rows={3}
                      id="catalog-description"
                      value={catalogData.description || ""}
                      onChange={(e) =>
                        setCatalogData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Explore authentic credentials and university clearance protocols"
                      maxLength={200}
                      className="w-full min-h-[72px] resize-y rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs font-normal placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
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
                        <span className={cn(BADGE_BASE, "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-sans tabular-nums")}>
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
                      className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                    >
                      Add Document
                    </Button>
                  </div>

                  {/* Cards List */}
                  <div className="flex flex-col gap-2.5">
                    {currentItems.map((item, idx) => {
                      const isSelected = idx === safeSelectedIdx
                      return (
                        <div
                          key={item.id || idx}
                          onClick={() => setSelectedCardIdx(idx)}
                          className={cn(
                            "p-3.5 rounded-2xl border transition-[color,background-color,border-color,box-shadow,opacity,transform] cursor-pointer flex items-center gap-3.5 select-none",
                            isSelected
                              ? "border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 shadow-xs ring-1 ring-black/10 dark:ring-white/20"
                              : "border-border dark:border-border bg-white dark:bg-zinc-900/50 hover:bg-gray-50/80 dark:hover:bg-zinc-800/60"
                          )}
                        >
                          <div
                            className={cn(
                              "w-7 h-7 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 dark:focus-visible:ring-zinc-100 rounded-full flex items-center justify-center font-sans tabular-nums text-[11px] font-bold shrink-0 transition-colors",
                              isSelected
                                ? "bg-gray-950 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                                : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                            )}
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-xs font-semibold truncate transition-colors",
                                  isSelected
                                    ? "text-gray-950 dark:text-zinc-50 font-bold"
                                    : "text-gray-900 dark:text-zinc-100"
                                )}
                              >
                                {item.title || "Untitled Document"}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 dark:text-zinc-300 truncate mt-0.5">
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
                              className="w-7 h-7 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowUp01Icon size="1em" className="text-xs" />
                            </button>
                            <button
                              type="button"
                              title="Move Down"
                              disabled={idx === currentItems.length - 1}
                              onClick={() => handleMoveCard(idx, "down")}
                              className="w-7 h-7 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowDown01Icon size="1em" className="text-xs" />
                            </button>
                            <button
                              type="button"
                              title="Delete Card"
                              disabled={currentItems.length <= MIN_CATALOG_ITEMS}
                              onClick={() => setDeleteCardIdx(idx)}
                              className="w-7 h-7 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <Delete01Icon size="1em" className="text-xs" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* RIGHT COLUMN: ACTIVE CARD EDITOR & LIVE CARD MINI-PREVIEW */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs flex flex-col gap-5">
                    <div className="flex items-center justify-between pb-3 border-b border-border dark:border-border">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-sans tabular-nums uppercase font-bold text-pup-maroon dark:text-red-400 tracking-wider">
                          Document Card Editor
                        </span>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                          {currentCard.title || "Untitled Document"}
                        </h3>
                      </div>
                      <span className={cn(BADGE_BASE, "bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 font-sans tabular-nums")}>
                        Slot {String(safeSelectedIdx + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Official Document Title */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label htmlFor="catalog-document-title" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          Official Document Title
                        </label>
                        <span className="text-[10px] text-gray-400 font-sans tabular-nums">
                          {currentCard.title?.length || 0}/60
                        </span>
                      </div>
                      <Input
                        id="catalog-document-title"
                        value={currentCard.title || ""}
                        onChange={(e) => updateCardField("title", e.target.value)}
                        placeholder="Transcript of Records (TOR): 1st Copy"
                        maxLength={60}
                        className="h-10 w-full rounded-xl bg-white dark:bg-zinc-900 border border-border dark:border-border px-3.5 text-xs font-semibold focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                      />
                    </div>

                    {/* Client Tag */}
                    <div>
                      <label htmlFor="catalog-client" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        Client Eligibility Tag
                      </label>
                      <Input
                        id="catalog-client"
                        value={currentCard.client || ""}
                        onChange={(e) => updateCardField("client", e.target.value)}
                        placeholder="Student & Alumni"
                        className="h-10 rounded-xl bg-white dark:bg-zinc-900 border border-border dark:border-border px-3.5 text-xs mb-2 font-medium focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                      />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 font-sans tabular-nums">Suggestions:</span>
                        {CLIENT_PILLS.map((pill) => {
                          const isSelected =
                            (currentCard.client || "").trim().toLowerCase() === pill.toLowerCase()
                          return (
                            <button
                              key={pill}
                              type="button"
                              onClick={() => updateCardField("client", pill)}
                              className={cn(
                                "px-2.5 py-0.5 rounded-lg text-[10px] font-sans tabular-nums border transition-all cursor-pointer",
                                isSelected
                                  ? "border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 font-semibold shadow-xs ring-1 ring-black/10 dark:ring-white/20"
                                  : "bg-white dark:bg-zinc-900 border-border dark:border-border text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                              )}
                            >
                              {pill}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="catalog-document-description" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        Document Description / Purpose Summary
                      </label>
                      <Textarea
                        rows={2}
                        id="catalog-document-description"
                        value={currentCard.description || ""}
                        onChange={(e) => updateCardField("description", e.target.value)}
                        placeholder="Official comprehensive academic transcript for employment or PRC board examinations"
                        className="w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-normal placeholder:text-gray-400 dark:border-border dark:bg-zinc-900 focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                      />
                    </div>

                    {/* Mandatory Filing Requirements */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label htmlFor="catalog-new-requirement" className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          Mandatory Filing Requirements ({currentCard.requirements?.length || 0})
                        </label>
                        <span className="text-[10px] text-gray-400 font-sans tabular-nums">
                          Shown directly on the carousel card
                        </span>
                      </div>

                      <div className="space-y-2">
                        {!currentCard.requirements?.length && <p className="text-xs text-gray-500 dark:text-zinc-400">No filing requirements are configured for this document. Add the Registrar-approved requirements below.</p>}
                        {(currentCard.requirements || []).map((req, rIdx) => (
                          <div key={rIdx} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                              <Tick01Icon size={16}  />
                            </span>
                            <Input placeholder="Enter a filing requirement"
                              aria-label={`Filing requirement ${rIdx + 1}`}
                              value={req}
                              onChange={(e) => updateRequirement(rIdx, e.target.value)}
                              className="h-9 flex-1 rounded-xl border border-border bg-white px-3 text-xs placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                            />
                            <button
                              type="button"
                              title="Remove requirement"
                              onClick={() => removeRequirement(rIdx)}
                              className="w-7 h-7 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer border-0 bg-transparent transition-colors"
                            >
                              <Cancel01Icon size="1em" className="text-xs" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add requirement input */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border dark:border-border">
                        <Input
                          id="catalog-new-requirement"
                          value={newRequirementText}
                          onChange={(e) => setNewRequirementText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addRequirement()
                            }
                          }}
                          placeholder="Add required document or clearance (such as Valid Student ID)"
                          className="h-9 rounded-xl bg-white dark:bg-zinc-900 border border-border dark:border-border px-3 text-xs flex-1 focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={addRequirement}
                          disabled={!newRequirementText.trim()}
                          className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Add Requirement
                        </Button>
                      </div>
                    </div>

                    {/* IN-EDITOR LIVE CARD MINI-PREVIEW (Apple-style Card) */}
                    <div className="p-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-950/60 border border-border dark:border-border">
                      <div className="text-[10px] font-sans tabular-nums uppercase font-bold text-gray-500 mb-3 flex items-center justify-between">
                        <span>Carousel Card Preview</span>
                        <span className="text-pup-maroon dark:text-red-400 font-semibold">
                          Real-Time Renderer
                        </span>
                      </div>

                      {/* Apple-style card container */}
                      <div className="max-w-[420px] mx-auto bg-[#f5f5f7] dark:bg-zinc-900 rounded-3xl p-6 sm:p-7 text-left shadow-sm border border-black/[0.04] dark:border-border font-jakarta">
                        <div className="flex items-center justify-between mb-4">
                          <CatalogClientBadge label={currentCard.client} />
                          <span className="text-[10px] font-sans tabular-nums text-zinc-400 dark:text-zinc-500 font-medium">
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
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-sans tabular-nums mb-2.5 flex items-center gap-1.5">
                            <Shield01Icon size="1em" className="text-xs" />
                            Filing Requirements
                          </div>
                          <ul className="space-y-2 text-xs text-gray-600 dark:text-zinc-300">
                            {(currentCard.requirements || []).map((req, i) => (
                              <li key={i} className="flex items-start gap-2 leading-relaxed">
                                <span className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[7px] font-bold">
                                  <Tick01Icon size={16}  />
                                </span>
                                <span className="text-[11px] line-clamp-1">{req}</span>
                              </li>
                            ))}
                          </ul>
                          {!currentCard.requirements?.length && <p className="text-xs text-gray-500 dark:text-zinc-400">Contact the Registrar to confirm filing requirements.</p>}
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
            <LandingSectionPreview>
              {(classic) => <DocumentCatalog classic={classic} previewContent={catalogData} />}
            </LandingSectionPreview>
          )}
        </CardContent>
        )}
      </Card>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        onConfirm={handleReset}
        isLoading={saving}
        title="Reset Catalog to Institutional Defaults"
        message="Are you sure you want to revert all catalog headlines, credential descriptions, and filing requirements back to the official PUP San Juan institutional template?"
        confirmLabel="Restore Defaults"
        cancelLabel="Cancel"
        icon=" ReloadIcon"
        buttonIcon=" ReloadIcon"
        selectedItems={[
          "Reset catalog section heading and description",
          "Restore official 15 PUP San Juan academic credential documents",
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
        confirmLabel="Delete Document"
        cancelLabel="Cancel"
        buttonIcon=" Delete01Icon"
        isDeleteModal={true}
        isAppleStyled={true}
      />
    </div>
  )
}
