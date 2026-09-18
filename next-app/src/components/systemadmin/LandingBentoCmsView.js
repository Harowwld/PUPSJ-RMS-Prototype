"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import LandingBentoSkeleton from "@/components/systemadmin/skeletons/LandingBentoSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import ConfirmModal from "@/components/shared/ConfirmModal"
import { cn } from "@/lib/utils"

const DEFAULT_BENTO = {
  eyebrow: "Student & Alumni Services",
  headingLine1: "Request, track, and",
  headingLine2: "claim your documents",
  description:
    "Submit your request online, track its progress in real time, and pick up your official stamped documents at the Registrar counter without waiting in long lines.",
  card1: {
    title: "Request Online in Minutes",
    description:
      "Select the document you need, specify your purpose, and submit your request straight from your phone or computer.",
    portalTag: "Online Request Portal",
    campusLabel: "PUP San Juan Campus",
    accordionTitle: "Choose Document & Purpose",
    documents: [
      { name: "Transcript of Records (TOR)", purpose: "Employment / Job Application", tag: "Selected" },
      { name: "Certificate of Grades (COG)", purpose: "Scholarship & Honor Evaluation", tag: "Selected" },
      { name: "Certificate of Registration", purpose: "PRC Licensure Exam Filing", tag: "Selected" },
      { name: "Certified True Copy (CTC)", purpose: "Government & Embassy Clearance", tag: "Selected" },
    ],
    studentStub: "Student: 2022-04912-SJ-0",
    verifiedBadge: "Verified Student",
  },
  card2: {
    title: "Know Exactly When It's Ready",
    description:
      "Every document follows a clear schedule so you know exactly when to visit the Registrar counter.",
    headerText: "Clear Pick-Up Schedule",
    subtitleHint: "Counted in working days once cleared",
    instructionsText: "Processing times depend on the type of document you requested:",
    trackingSample: "Tracking #2026-SJ · Clearance Verified",
    slaChips: [
      { days: "3 Days", label: "Grades & Reg." },
      { days: "7 Days", label: "Clearances" },
      { days: "20 Days", label: "Transcripts" },
    ],
    sealFooter: "Stamped with the official university dry seal",
  },
  card3: {
    title: "Direct from Campus Archives",
    description:
      "Your online request connects directly to Room 1 archive cabinets, so staff can retrieve your folder faster.",
    roomCode: "R1",
    cabinetCode: "C-A",
    drawerCode: "D-2",
  },
  card4: {
    title: "What You Need to Prepare",
    description:
      "Have your student number, email, and signed clearance ready so your request is evaluated right away.",
    checklistHeader: "Checklist",
    primaryItemTitle: "Student Number & Email",
    primaryItemDesc: "Your official student number and an active email for notifications.",
    secondaryItemTitle: "Campus Clearance Stub",
    secondaryItemBadge: "Required for TOR",
    footerNote: "Bring a valid ID when picking up",
  },
  card5: {
    title: "Protected by Law (RA 11032)",
    description:
      "Backed by the Ease of Doing Business Act. Transparent tracking with zero hidden delays.",
    tab1Label: "Promise",
    tab2Label: "RA 11032",
    tab3Label: "Tracking",
    charterItems: [
      { icon: "ph-shield-check", title: "No Unrecorded Delays", desc: "Timestamped upon receipt", bg: "bg-[#800000]" },
      { icon: "ph-clock", title: "Clear Deadlines", desc: "Always on schedule", bg: "bg-zinc-800 dark:bg-zinc-700" },
    ],
    artaItems: [
      { icon: "ph-scales", title: "Zero Red Tape", desc: "Strict RA 11032 compliance", bg: "bg-[#800000]" },
      { icon: "ph-file-text", title: "Citizen's Charter", desc: "Published university SLA standards", bg: "bg-zinc-800 dark:bg-zinc-700" },
    ],
    auditItems: [
      { icon: "ph-fingerprint", title: "Tamper-Proof Audit Trail", desc: "Every personnel action logged", bg: "bg-[#800000]" },
      { icon: "ph-check-circle", title: "Live Tracking Updates", desc: "Real-time ticket progression", bg: "bg-zinc-800 dark:bg-zinc-700" },
    ],
    footerNote: "Fair, transparent university service",
  },
}

const SLA_CHIP_STYLES = [
  {
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300",
    activeRing: "ring-2 ring-emerald-500/50 shadow-sm shadow-emerald-500/10 scale-[1.04]",
  },
  {
    bgClass: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-300",
    activeRing: "ring-2 ring-amber-500/50 shadow-sm shadow-amber-500/10 scale-[1.04]",
  },
  {
    bgClass: "bg-red-50 dark:bg-red-950/40 border-red-200/60 dark:border-red-800/40 text-red-700 dark:text-red-300",
    activeRing: "ring-2 ring-red-500/50 shadow-sm shadow-red-500/10 scale-[1.04]",
  },
]

export default function LandingBentoCmsView({ showToast }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("cards") // 'cards' | 'header' | 'preview'
  const [activeCardTab, setActiveCardTab] = useState(1) // null = all collapsed, 1-5 = expanded card
  const [bentoData, setBentoData] = useState(DEFAULT_BENTO)
  const [resetModalOpen, setResetModalOpen] = useState(false)

  // Interactive preview state
  const [previewTab, setPreviewTab] = useState("charter")
  const [previewDocIdx, setPreviewDocIdx] = useState(0)
  const [previewChipIdx, setPreviewChipIdx] = useState(0)

  const notify = useCallback(
    (msg, isError = false) => {
      if (showToast) showToast(msg, isError)
    },
    [showToast]
  )

  const fetchBentoData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/landing/bento", { cache: "no-store" })
      const json = await res.json()
      if (res.ok && json.ok && json.data) {
        setBentoData(json.data)
      } else {
        notify(json.error || "Failed to load bento grid configuration", true)
      }
    } catch (err) {
      console.error("[LandingBentoCmsView] Fetch error:", err)
      notify("Network error fetching bento settings", true)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    fetchBentoData()
  }, [fetchBentoData])

  // Auto-cycle for preview
  useEffect(() => {
    if (activeTab !== "preview") return
    const docs = bentoData.card1?.documents || []
    if (!docs.length) return
    const timer = setInterval(() => {
      setPreviewDocIdx((prev) => (prev + 1) % docs.length)
    }, 3800)
    return () => clearInterval(timer)
  }, [activeTab, bentoData.card1?.documents])

  useEffect(() => {
    if (activeTab !== "preview") return
    const chips = bentoData.card2?.slaChips || []
    if (!chips.length) return
    const timer = setInterval(() => {
      setPreviewChipIdx((prev) => (prev + 1) % chips.length)
    }, 2500)
    return () => clearInterval(timer)
  }, [activeTab, bentoData.card2?.slaChips])

  const handleSave = async () => {
    if (!bentoData.headingLine1.trim()) {
      notify("Heading Line 1 cannot be blank", true)
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/landing/bento", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bentoData),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setBentoData(json.data)
        notify("Bento grid features saved successfully")
      } else {
        notify(json.error || "Failed to save bento grid settings", true)
      }
    } catch (err) {
      console.error("[LandingBentoCmsView] Save error:", err)
      notify("Network error saving configuration", true)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/landing/bento", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setBentoData(json.data)
        notify("Bento grid features reverted to institutional defaults")
      } else {
        notify(json.error || "Failed to reset bento settings", true)
      }
    } catch (err) {
      console.error("[LandingBentoCmsView] Reset error:", err)
      notify("Network error resetting configuration", true)
    } finally {
      setSaving(false)
      setResetModalOpen(false)
    }
  }

  if (loading) {
    return <LandingBentoSkeleton />
  }

  const currentDocs = bentoData.card1?.documents || []
  const currentSlaChips = bentoData.card2?.slaChips || []
  const previewDoc = currentDocs[previewDocIdx % currentDocs.length] || currentDocs[0]
  const tabData = {
    charter: bentoData.card5?.charterItems || [],
    arta: bentoData.card5?.artaItems || [],
    audit: bentoData.card5?.auditItems || [],
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-squares-four"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Landing Page CMS</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · Bento Grid &amp; Features
              </span>
            </div>
          }
          description="Manage public portal bento grid features, SLA turnaround schedules, campus archive locations, and citizen charter commitments."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("/", "_blank")}
                className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
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
                    <HugeIcon  className="ph-bold ph-spinner animate-spin mr-1.5 text-[14px]" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          }
        />

        {/* Standardized SuperAdmin Underline Navigation Tabs */}
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
            Bento Cards (5)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("header")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
              activeTab === "header"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Header &amp; Overview
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
            Interactive Bento Preview
          </button>
        </div>

        {/* Content Body */}
        <CardContent className="font-jakarta bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-6">
          {/* TAB 1: Bento Cards (5) with Focused Sub-Nav */}
          {activeTab === "cards" && (
            <div className="space-y-3">
              {/* ACCORDION CARD 1 */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setActiveCardTab(activeCardTab === 1 ? null : 1)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left cursor-pointer bg-transparent border-0 select-none group transition-colors hover:bg-gray-100/60 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      activeCardTab === 1
                        ? "bg-pup-maroon text-white"
                        : "bg-gray-200/80 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                    )}>
                      <HugeIcon  className="ph-bold ph-cursor-click text-sm" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 truncate">
                        Card 1: Online Request Simulation
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                        Large interactive card showcasing document and purpose selection.
                      </p>
                    </div>
                  </div>
                  <HugeIcon  className={cn(
                    "ph-bold ph-caret-down text-gray-400 text-sm shrink-0 transition-transform duration-200",
                    activeCardTab === 1 && "rotate-180"
                  )} />
                </button>
                {activeCardTab === 1 && (
                  <div className="px-5 pb-5 pt-1 space-y-5 border-t border-gray-200/60 dark:border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                          Card Heading Title
                        </label>
                        <Input
                          value={bentoData.card1.title}
                          onChange={(e) =>
                            setBentoData((prev) => ({
                              ...prev,
                              card1: { ...prev.card1, title: e.target.value },
                            }))
                          }
                          className="h-10 rounded-xl bg-white dark:bg-card text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                          Campus Label
                        </label>
                        <Input
                          value={bentoData.card1.campusLabel}
                          onChange={(e) =>
                            setBentoData((prev) => ({
                              ...prev,
                              card1: { ...prev.card1, campusLabel: e.target.value },
                            }))
                          }
                          className="h-10 rounded-xl bg-white dark:bg-card text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Explanatory Description
                      </label>
                      <textarea
                        value={bentoData.card1.description}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card1: { ...prev.card1, description: e.target.value },
                          }))
                        }
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed dark:border-white/10 dark:bg-card focus:outline-hidden"
                      />
                    </div>

                    {/* Sample Documents List */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-2">
                        Sample Cycled Documents (4 items)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {bentoData.card1.documents.map((doc, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-pup-maroon uppercase">
                                Document #{idx + 1}
                              </span>
                            </div>
                            <Input
                              value={doc.name}
                              onChange={(e) => {
                                const nextDocs = [...bentoData.card1.documents]
                                nextDocs[idx] = { ...nextDocs[idx], name: e.target.value }
                                setBentoData((prev) => ({
                                  ...prev,
                                  card1: { ...prev.card1, documents: nextDocs },
                                }))
                              }}
                              placeholder="Document name"
                              className="h-8 rounded-lg text-xs"
                            />
                            <Input
                              value={doc.purpose}
                              onChange={(e) => {
                                const nextDocs = [...bentoData.card1.documents]
                                nextDocs[idx] = { ...nextDocs[idx], purpose: e.target.value }
                                setBentoData((prev) => ({
                                  ...prev,
                                  card1: { ...prev.card1, documents: nextDocs },
                                }))
                              }}
                              placeholder="Purpose description"
                              className="h-8 rounded-lg text-[11px] text-gray-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION CARD 2 */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setActiveCardTab(activeCardTab === 2 ? null : 2)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left cursor-pointer bg-transparent border-0 select-none group transition-colors hover:bg-gray-100/60 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      activeCardTab === 2
                        ? "bg-pup-maroon text-white"
                        : "bg-gray-200/80 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                    )}>
                      <HugeIcon  className="ph-bold ph-clock text-sm" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 truncate">
                        Card 2: Pick-Up Schedule & SLA Chips
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                        Turnaround promises and official dry seal stamping notice.
                      </p>
                    </div>
                  </div>
                  <HugeIcon  className={cn(
                    "ph-bold ph-caret-down text-gray-400 text-sm shrink-0 transition-transform duration-200",
                    activeCardTab === 2 && "rotate-180"
                  )} />
                </button>
                {activeCardTab === 2 && (
                  <div className="px-5 pb-5 pt-1 space-y-5 border-t border-gray-200/60 dark:border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                          Card Heading Title
                        </label>
                        <Input
                          value={bentoData.card2.title}
                          onChange={(e) =>
                            setBentoData((prev) => ({
                              ...prev,
                              card2: { ...prev.card2, title: e.target.value },
                            }))
                          }
                          className="h-10 rounded-xl bg-white dark:bg-card text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                          Schedule Header Label
                        </label>
                        <Input
                          value={bentoData.card2.headerText}
                          onChange={(e) =>
                            setBentoData((prev) => ({
                              ...prev,
                              card2: { ...prev.card2, headerText: e.target.value },
                            }))
                          }
                          className="h-10 rounded-xl bg-white dark:bg-card text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Explanatory Description
                      </label>
                      <textarea
                        value={bentoData.card2.description}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card2: { ...prev.card2, description: e.target.value },
                          }))
                        }
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed dark:border-white/10 dark:bg-card focus:outline-hidden"
                      />
                    </div>

                    {/* 3 SLA Chips Editor */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-2">
                        3 Pick-Up Turnaround Chips (Working Days &amp; Document Categories)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {bentoData.card2.slaChips.map((chip, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 space-y-2"
                          >
                            <span className="text-[10px] font-bold text-pup-maroon uppercase">
                              Tier #{idx + 1}
                            </span>
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Days Target</label>
                              <Input
                                value={chip.days}
                                onChange={(e) => {
                                  const nextChips = [...bentoData.card2.slaChips]
                                  nextChips[idx] = { ...nextChips[idx], days: e.target.value }
                                  setBentoData((prev) => ({
                                    ...prev,
                                    card2: { ...prev.card2, slaChips: nextChips },
                                  }))
                                }}
                                placeholder="e.g. 3 Days"
                                className="h-8 rounded-lg text-xs font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Document Types</label>
                              <Input
                                value={chip.label}
                                onChange={(e) => {
                                  const nextChips = [...bentoData.card2.slaChips]
                                  nextChips[idx] = { ...nextChips[idx], label: e.target.value }
                                  setBentoData((prev) => ({
                                    ...prev,
                                    card2: { ...prev.card2, slaChips: nextChips },
                                  }))
                                }}
                                placeholder="e.g. Grades & Reg."
                                className="h-8 rounded-lg text-xs"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Dry Seal Accreditation Footer
                      </label>
                      <Input
                        value={bentoData.card2.sealFooter}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card2: { ...prev.card2, sealFooter: e.target.value },
                          }))
                        }
                        className="h-10 rounded-xl bg-white dark:bg-card text-xs font-mono text-gray-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION CARD 3 */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setActiveCardTab(activeCardTab === 3 ? null : 3)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left cursor-pointer bg-transparent border-0 select-none group transition-colors hover:bg-gray-100/60 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      activeCardTab === 3
                        ? "bg-pup-maroon text-white"
                        : "bg-gray-200/80 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                    )}>
                      <HugeIcon  className="ph-bold ph-archive text-sm" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 truncate">
                        Card 3: Direct Campus Archives Connection
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                        Physical archive drawer, room, and cabinet locator node indicators.
                      </p>
                    </div>
                  </div>
                  <HugeIcon  className={cn(
                    "ph-bold ph-caret-down text-gray-400 text-sm shrink-0 transition-transform duration-200",
                    activeCardTab === 3 && "rotate-180"
                  )} />
                </button>
                {activeCardTab === 3 && (
                  <div className="px-5 pb-5 pt-1 space-y-5 border-t border-gray-200/60 dark:border-white/5">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Heading Title
                      </label>
                      <Input
                        value={bentoData.card3.title}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card3: { ...prev.card3, title: e.target.value },
                          }))
                        }
                        className="h-10 rounded-xl bg-white dark:bg-card text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Explanatory Description
                      </label>
                      <textarea
                        value={bentoData.card3.description}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card3: { ...prev.card3, description: e.target.value },
                          }))
                        }
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed dark:border-white/10 dark:bg-card focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION CARD 4 */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setActiveCardTab(activeCardTab === 4 ? null : 4)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left cursor-pointer bg-transparent border-0 select-none group transition-colors hover:bg-gray-100/60 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      activeCardTab === 4
                        ? "bg-pup-maroon text-white"
                        : "bg-gray-200/80 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                    )}>
                      <HugeIcon  className="ph-bold ph-check-square text-sm" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 truncate">
                        Card 4: Preparation Checklist
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                        Clear reminders of what students must prepare before picking up documents.
                      </p>
                    </div>
                  </div>
                  <HugeIcon  className={cn(
                    "ph-bold ph-caret-down text-gray-400 text-sm shrink-0 transition-transform duration-200",
                    activeCardTab === 4 && "rotate-180"
                  )} />
                </button>
                {activeCardTab === 4 && (
                  <div className="px-5 pb-5 pt-1 space-y-5 border-t border-gray-200/60 dark:border-white/5">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Heading Title
                      </label>
                      <Input
                        value={bentoData.card4.title}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card4: { ...prev.card4, title: e.target.value },
                          }))
                        }
                        className="h-10 rounded-xl bg-white dark:bg-card text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Explanatory Description
                      </label>
                      <textarea
                        value={bentoData.card4.description}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card4: { ...prev.card4, description: e.target.value },
                          }))
                        }
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed dark:border-white/10 dark:bg-card focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 space-y-2">
                        <span className="text-[10px] font-bold text-pup-maroon uppercase">
                          Primary Checklist Item
                        </span>
                        <Input
                          value={bentoData.card4.primaryItemTitle}
                          onChange={(e) =>
                            setBentoData((prev) => ({
                              ...prev,
                              card4: { ...prev.card4, primaryItemTitle: e.target.value },
                            }))
                          }
                          placeholder="e.g. Student Number & Email"
                          className="h-8 rounded-lg text-xs font-semibold"
                        />
                        <Input
                          value={bentoData.card4.primaryItemDesc}
                          onChange={(e) =>
                            setBentoData((prev) => ({
                              ...prev,
                              card4: { ...prev.card4, primaryItemDesc: e.target.value },
                            }))
                          }
                          placeholder="Explanatory note"
                          className="h-8 rounded-lg text-xs text-gray-500"
                        />
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 space-y-2">
                        <span className="text-[10px] font-bold text-pup-maroon uppercase">
                          Secondary Clearance Stub
                        </span>
                        <Input
                          value={bentoData.card4.secondaryItemTitle}
                          onChange={(e) =>
                            setBentoData((prev) => ({
                              ...prev,
                              card4: { ...prev.card4, secondaryItemTitle: e.target.value },
                            }))
                          }
                          placeholder="e.g. Campus Clearance Stub"
                          className="h-8 rounded-lg text-xs font-semibold"
                        />
                        <Input
                          value={bentoData.card4.secondaryItemBadge}
                          onChange={(e) =>
                            setBentoData((prev) => ({
                              ...prev,
                              card4: { ...prev.card4, secondaryItemBadge: e.target.value },
                            }))
                          }
                          placeholder="e.g. Required for TOR"
                          className="h-8 rounded-lg text-xs text-emerald-600 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Counter Pick-Up ID Reminder
                      </label>
                      <Input
                        value={bentoData.card4.footerNote}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card4: { ...prev.card4, footerNote: e.target.value },
                          }))
                        }
                        className="h-10 rounded-xl bg-white dark:bg-card text-xs font-mono text-gray-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION CARD 5 */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setActiveCardTab(activeCardTab === 5 ? null : 5)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left cursor-pointer bg-transparent border-0 select-none group transition-colors hover:bg-gray-100/60 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      activeCardTab === 5
                        ? "bg-pup-maroon text-white"
                        : "bg-gray-200/80 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                    )}>
                      <HugeIcon  className="ph-bold ph-scales text-sm" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 truncate">
                        Card 5: Legal Safeguards & RA 11032 Compliance
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                        Ease of Doing Business Act standards, audit trail guarantees, and published university turnaround commitments.
                      </p>
                    </div>
                  </div>
                  <HugeIcon  className={cn(
                    "ph-bold ph-caret-down text-gray-400 text-sm shrink-0 transition-transform duration-200",
                    activeCardTab === 5 && "rotate-180"
                  )} />
                </button>
                {activeCardTab === 5 && (
                  <div className="px-5 pb-5 pt-1 space-y-5 border-t border-gray-200/60 dark:border-white/5">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Heading Title
                      </label>
                      <Input
                        value={bentoData.card5.title}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card5: { ...prev.card5, title: e.target.value },
                          }))
                        }
                        className="h-10 rounded-xl bg-white dark:bg-card text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Explanatory Description
                      </label>
                      <textarea
                        value={bentoData.card5.description}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card5: { ...prev.card5, description: e.target.value },
                          }))
                        }
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed dark:border-white/10 dark:bg-card focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Footer Note
                      </label>
                      <Input
                        value={bentoData.card5.footerNote}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card5: { ...prev.card5, footerNote: e.target.value },
                          }))
                        }
                        className="h-10 rounded-xl bg-white dark:bg-card text-xs font-mono text-gray-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Section Header & Overview */}
          {activeTab === "header" && (
            <div className="w-full space-y-6">
              <div className="w-full rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 sm:p-6 space-y-5">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Section Title &amp; Asymmetric Editorial Copy
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                    Displayed above the bento grid container with animated entrance transitions.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Eyebrow Label
                      </label>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {bentoData.eyebrow.length}/40
                      </span>
                    </div>
                    <Input
                      value={bentoData.eyebrow}
                      onChange={(e) =>
                        setBentoData((prev) => ({ ...prev, eyebrow: e.target.value }))
                      }
                      placeholder="e.g. Student & Alumni Services"
                      maxLength={40}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal placeholder:text-gray-400 dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                          Main Heading Line 1 (Dark)
                        </label>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {bentoData.headingLine1.length}/40
                        </span>
                      </div>
                      <Input
                        value={bentoData.headingLine1}
                        onChange={(e) =>
                          setBentoData((prev) => ({ ...prev, headingLine1: e.target.value }))
                        }
                        placeholder="e.g. Request, track, and"
                        maxLength={40}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal placeholder:text-gray-400 dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                          Main Heading Line 2 (Subtle)
                        </label>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {bentoData.headingLine2.length}/40
                        </span>
                      </div>
                      <Input
                        value={bentoData.headingLine2}
                        onChange={(e) =>
                          setBentoData((prev) => ({ ...prev, headingLine2: e.target.value }))
                        }
                        placeholder="e.g. claim your documents"
                        maxLength={40}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal placeholder:text-gray-400 dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Section Subtitle &amp; Editorial Description
                      </label>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {bentoData.description.length}/280
                      </span>
                    </div>
                    <textarea
                      value={bentoData.description}
                      onChange={(e) =>
                        setBentoData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={3}
                      maxLength={280}
                      placeholder="Submit your request online, track its progress in real time..."
                      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs font-normal leading-relaxed placeholder:text-gray-400 dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Interactive Bento Live Preview */}
          {activeTab === "preview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Simulated Bento Grid Preview
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400">
                    Real-time responsive rendering matching the public landing page layout, animations, and tab interactions.
                  </p>
                </div>
              </div>

              {/* Bento Simulator Container */}
              <div className="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-10 select-none shadow-sm">
                
                {/* Header Copy */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
                  <div className="lg:col-span-7">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-pup-maroon block mb-2">
                      {bentoData.eyebrow}
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight leading-[1.08]">
                      {bentoData.headingLine1}<br />
                      <span className="text-zinc-400 dark:text-zinc-500">{bentoData.headingLine2}</span>
                    </h2>
                  </div>
                  <div className="lg:col-span-5">
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                      {bentoData.description}
                    </p>
                  </div>
                </div>

                {/* Bento Grid Frame */}
                <div className="rounded-[1.75rem] bg-[#f4f5f7]/80 dark:bg-zinc-900/40 p-3 sm:p-4 border border-black/[0.04] dark:border-white/[0.06]">
                  
                  {/* Row 1: 2 Large Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    {/* Card 1 */}
                    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-5 shadow-xs flex flex-col justify-between">
                      <div className="rounded-xl bg-[#f8f9fa] dark:bg-zinc-800/40 p-4 border border-black/[0.03] dark:border-white/[0.04]">
                        <div className="flex items-center justify-between mb-2 text-[10px] font-mono uppercase text-zinc-400">
                          <span>{bentoData.card1.portalTag}</span>
                          <span>PUP San Juan</span>
                        </div>
                        <div className="p-2 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-black/[0.05] text-xs font-semibold mb-2 flex justify-between">
                          <span>{bentoData.card1.campusLabel}</span>
                          <HugeIcon  className="ph-bold ph-caret-down text-zinc-400 text-xs" />
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-black/[0.05]">
                          <div className="text-[11px] font-bold text-pup-maroon mb-1">
                            {bentoData.card1.accordionTitle}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                            
                            <span className="truncate">{previewDoc?.name}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 pl-3.5 truncate">
                            Purpose: {previewDoc?.purpose}
                          </div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1.5 border-t border-black/[0.04]">
                          <span>{bentoData.card1.studentStub}</span>
                          <span className="text-emerald-600 font-semibold">{bentoData.card1.verifiedBadge}</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h4 className="text-base font-bold text-[#1d1d1f] dark:text-white">
                          {bentoData.card1.title}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {bentoData.card1.description}
                        </p>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-5 shadow-xs flex flex-col justify-between">
                      <div className="rounded-xl bg-[#f8f9fa] dark:bg-zinc-800/40 p-4 border border-black/[0.03] dark:border-white/[0.04]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-md bg-pup-maroon text-white flex items-center justify-center text-xs">
                            <HugeIcon  className="ph-bold ph-clock text-[10px]" />
                          </div>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {bentoData.card2.headerText}
                          </span>
                        </div>
                        <div className="p-2 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-black/[0.05] text-xs font-mono text-zinc-600 dark:text-zinc-300 flex justify-between mb-2">
                          <span>{bentoData.card2.trackingSample}</span>
                          
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {currentSlaChips.map((chip, idx) => {
                            const isActive = previewChipIdx === idx
                            const style = SLA_CHIP_STYLES[idx % SLA_CHIP_STYLES.length]
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "p-1.5 rounded-md border text-center transition-all",
                                  style.bgClass,
                                  isActive && style.activeRing
                                )}
                              >
                                <div className="text-[10px] font-mono font-bold">{chip.days}</div>
                                <div className="text-[8px] opacity-80 truncate">{chip.label}</div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="text-[9px] font-mono text-zinc-400 pt-2 mt-2 border-t border-black/[0.04]">
                          {bentoData.card2.sealFooter}
                        </div>
                      </div>
                      <div className="mt-4">
                        <h4 className="text-base font-bold text-[#1d1d1f] dark:text-white">
                          {bentoData.card2.title}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {bentoData.card2.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: 3 Medium Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card 3 */}
                    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-4 shadow-xs flex flex-col justify-between">
                      <div className="rounded-xl bg-[#f8f9fa] dark:bg-zinc-800/40 p-4 border border-black/[0.03] min-h-[140px] flex items-center justify-center relative overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-pup-maroon text-white flex items-center justify-center shadow-md">
                          <HugeIcon  className="ph-bold ph-archive text-base" />
                        </div>
                        <span className="absolute top-2 left-3 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white shadow-2xs">
                          {bentoData.card3.roomCode}
                        </span>
                        <span className="absolute left-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white shadow-2xs">
                          {bentoData.card3.cabinetCode}
                        </span>
                        <span className="absolute right-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white shadow-2xs">
                          {bentoData.card3.drawerCode}
                        </span>
                      </div>
                      <div className="mt-3">
                        <h5 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
                          {bentoData.card3.title}
                        </h5>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          {bentoData.card3.description}
                        </p>
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-4 shadow-xs flex flex-col justify-between">
                      <div className="rounded-xl bg-[#f8f9fa] dark:bg-zinc-800/40 p-3 border border-black/[0.03] min-h-[140px] flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-mono uppercase text-zinc-400 block mb-1">
                            {bentoData.card4.checklistHeader}
                          </span>
                          <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-black/[0.04]">
                            <div className="text-[11px] font-bold text-gray-900 dark:text-white flex items-center gap-1">
                              <HugeIcon  className="ph-bold ph-check text-emerald-600 text-[10px]" />
                              {bentoData.card4.primaryItemTitle}
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate">
                              {bentoData.card4.primaryItemDesc}
                            </div>
                          </div>
                        </div>
                        <div className="text-[9px] font-mono text-zinc-400 pt-1">
                          {bentoData.card4.footerNote}
                        </div>
                      </div>
                      <div className="mt-3">
                        <h5 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
                          {bentoData.card4.title}
                        </h5>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          {bentoData.card4.description}
                        </p>
                      </div>
                    </div>

                    {/* Card 5 */}
                    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-4 shadow-xs flex flex-col justify-between">
                      <div className="rounded-xl bg-[#f8f9fa] dark:bg-zinc-800/40 p-3 border border-black/[0.03] min-h-[140px] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-black/[0.04] mb-2">
                            <button
                              type="button"
                              onClick={() => setPreviewTab("charter")}
                              className={cn(
                                "flex-1 py-0.5 rounded text-[9px] font-semibold cursor-pointer border-0",
                                previewTab === "charter" ? "bg-pup-maroon text-white" : "text-zinc-500"
                              )}
                            >
                              {bentoData.card5.tab1Label}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewTab("arta")}
                              className={cn(
                                "flex-1 py-0.5 rounded text-[9px] font-semibold cursor-pointer border-0",
                                previewTab === "arta" ? "bg-pup-maroon text-white" : "text-zinc-500"
                              )}
                            >
                              {bentoData.card5.tab2Label}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewTab("audit")}
                              className={cn(
                                "flex-1 py-0.5 rounded text-[9px] font-semibold cursor-pointer border-0",
                                previewTab === "audit" ? "bg-pup-maroon text-white" : "text-zinc-500"
                              )}
                            >
                              {bentoData.card5.tab3Label}
                            </button>
                          </div>
                          <div className="space-y-1">
                            {tabData[previewTab]?.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-black/[0.03] flex items-center gap-2"
                              >
                                <div className="w-5 h-5 rounded bg-pup-maroon text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                                  <HugeIcon  className={cn("ph-bold", item.icon)} />
                                </div>
                                <div className="overflow-hidden">
                                  <div className="text-[10px] font-bold text-gray-900 dark:text-white truncate">
                                    {item.title}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-[9px] font-mono text-zinc-400 pt-1">
                          {bentoData.card5.footerNote}
                        </div>
                      </div>
                      <div className="mt-3">
                        <h5 className="text-sm font-bold text-[#1d1d1f] dark:text-white">
                          {bentoData.card5.title}
                        </h5>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          {bentoData.card5.description}
                        </p>
                      </div>
                    </div>
                  </div>
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
        title="Reset Bento Grid to Defaults"
        message="Are you sure you want to reset all landing page bento grid features, SLA chips, checklist stubs, and legal commitments to default institutional branding?"
        confirmLabel="Reset"
        icon="ph-duotone ph-arrow-counter-clockwise"
        buttonIcon="ph-bold ph-arrow-counter-clockwise"
        selectedItems={[
          "Reset all 4 bento card headers, taglines, and descriptions",
          "Revert SLA badges, compliance metrics, and checklist items",
          "Restore official PUP San Juan institutional commitments",
        ]}
        isPersonnelModal={true}
        isAppleStyled={true}
        isArchiveModal={true}
      />
    </div>
  )
}
