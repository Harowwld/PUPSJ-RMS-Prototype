"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    step1Label: "Select Document",
    step2Label: "Specify Purpose",
    buttonLabel: "Submit",
    successLabel: "Submitted!",
  },
  card2: {
    title: "Know Exactly When It's Ready",
    description:
      "Every document follows a clear schedule so you know exactly when to visit the Registrar counter.",
    step1Title: "Clear Schedule",
    step1Subtitle: "Based on document type",
    step2Title: "Live Notifications",
    step2Subtitle: "Track progress instantly",
    step3Title: "Visit Counter",
    step3Subtitle: "No waiting in lines",
  },
  card3: {
    title: "Direct from Campus Archives",
    description:
      "Your online request connects directly to Room 1 archive cabinets, so staff can retrieve your folder faster.",
    step1Label: "Request",
    step2Label: "Room 1",
    step3Label: "Staff",
  },
  card4: {
    title: "What You Need to Prepare",
    description:
      "Have your student number, email, and signed clearance ready so your request is evaluated right away.",
    item1: "Student Number",
    item2: "Active Email",
    item3: "Campus Clearance",
  },
  card5: {
    title: "Protected by Law (RA 11032)",
    description:
      "Backed by the Ease of Doing Business Act. Transparent tracking with zero hidden delays.",
    badgeLabel: "RA 11032",
    item1: "Zero Red Tape",
    item2: "No Hidden Delays",
    item3: "Transparent Tracking",
  },
}

export default function LandingBentoCmsView({ showToast }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("cards") // 'cards' | 'header' | 'preview'
  const [activeCardTab, setActiveCardTab] = useState(1) // 1-5 or null
  const [bentoData, setBentoData] = useState(DEFAULT_BENTO)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [previewDarkTheme, setPreviewDarkTheme] = useState(false)

  const notify = useCallback(
    (msg, isError = false) => {
      if (showToast) showToast(msg, isError)
    },
    [showToast]
  )

  const fetchBentoData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setLoading(true)
      }
      try {
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
    },
    [notify]
  )

  useEffect(() => {
    let ignore = false
    async function init() {
      try {
        const res = await fetch("/api/landing/bento", { cache: "no-store" })
        const json = await res.json()
        if (ignore) return
        if (res.ok && json.ok && json.data) {
          setBentoData(json.data)
        } else {
          notify(json.error || "Failed to load bento grid configuration", true)
        }
      } catch (err) {
        if (ignore) return
        console.error("[LandingBentoCmsView] Fetch error:", err)
        notify("Network error fetching bento settings", true)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [notify])

  const handleSave = async () => {
    if (!bentoData.headingLine1?.trim()) {
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
        notify("Bento grid configuration saved successfully")
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
        notify("Bento grid features reverted to default")
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
          description="Manage public portal bento grid features, interactive animation simulation steps, archive retrieval nodes, and statutory compliance tags."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("/#about", "_blank")}
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
          {/* TAB 1: Bento Cards (5) */}
          {activeTab === "cards" && (
            <div className="space-y-4">
              {/* ACCORDION CARD 1 */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setActiveCardTab(activeCardTab === 1 ? null : 1)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left cursor-pointer bg-transparent border-0 select-none group transition-colors hover:bg-gray-100/60 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        activeCardTab === 1
                          ? "bg-pup-maroon text-white"
                          : "bg-gray-200/80 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                      )}
                    >
                      <HugeIcon className="ph-bold ph-cursor-click text-sm" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 truncate">
                        Card 1: Online Request Simulation
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                        Large card showcasing document selection, purpose choice, and submission.
                      </p>
                    </div>
                  </div>
                  <HugeIcon
                    className={cn(
                      "ph-bold ph-caret-down text-gray-400 text-sm shrink-0 transition-transform duration-200",
                      activeCardTab === 1 && "rotate-180"
                    )}
                  />
                </button>

                {activeCardTab === 1 && (
                  <div className="px-5 pb-5 pt-2 space-y-5 border-t border-gray-200/60 dark:border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                          Card Heading Title
                        </label>
                        <Input
                          value={bentoData.card1?.title || ""}
                          onChange={(e) =>
                            setBentoData((prev) => ({
                              ...prev,
                              card1: { ...prev.card1, title: e.target.value },
                            }))
                          }
                          className="h-10 rounded-xl bg-white dark:bg-card text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                          Success Overlay Text
                        </label>
                        <Input
                          value={bentoData.card1?.successLabel || ""}
                          onChange={(e) =>
                            setBentoData((prev) => ({
                              ...prev,
                              card1: { ...prev.card1, successLabel: e.target.value },
                            }))
                          }
                          placeholder="e.g. Submitted!"
                          className="h-10 rounded-xl bg-white dark:bg-card text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Explanatory Description
                      </label>
                      <textarea
                        value={bentoData.card1?.description || ""}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card1: { ...prev.card1, description: e.target.value },
                          }))
                        }
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed dark:border-white/10 dark:bg-card focus:outline-none focus:ring-1 focus:ring-pup-maroon resize-none"
                      />
                    </div>

                    {/* Simulation Flow Steps */}
                    <div className="p-4 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white dark:bg-zinc-950 space-y-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 font-mono">
                        Interactive Simulation Flow Labels
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-600 dark:text-zinc-400 mb-1">
                            Step 1 Label
                          </label>
                          <Input
                            value={bentoData.card1?.step1Label || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card1: { ...prev.card1, step1Label: e.target.value },
                              }))
                            }
                            placeholder="Select Document"
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-600 dark:text-zinc-400 mb-1">
                            Step 2 Label
                          </label>
                          <Input
                            value={bentoData.card1?.step2Label || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card1: { ...prev.card1, step2Label: e.target.value },
                              }))
                            }
                            placeholder="Specify Purpose"
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-600 dark:text-zinc-400 mb-1">
                            Action Button Label
                          </label>
                          <Input
                            value={bentoData.card1?.buttonLabel || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card1: { ...prev.card1, buttonLabel: e.target.value },
                              }))
                            }
                            placeholder="Submit"
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
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
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        activeCardTab === 2
                          ? "bg-pup-maroon text-white"
                          : "bg-gray-200/80 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                      )}
                    >
                      <HugeIcon className="ph-bold ph-calendar-check text-sm" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 truncate">
                        Card 2: Processing Schedule &amp; Milestones
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                        Large card showing document pickup schedule, notifications, and counter visit.
                      </p>
                    </div>
                  </div>
                  <HugeIcon
                    className={cn(
                      "ph-bold ph-caret-down text-gray-400 text-sm shrink-0 transition-transform duration-200",
                      activeCardTab === 2 && "rotate-180"
                    )}
                  />
                </button>

                {activeCardTab === 2 && (
                  <div className="px-5 pb-5 pt-2 space-y-5 border-t border-gray-200/60 dark:border-white/5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Heading Title
                      </label>
                      <Input
                        value={bentoData.card2?.title || ""}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card2: { ...prev.card2, title: e.target.value },
                          }))
                        }
                        className="h-10 rounded-xl bg-white dark:bg-card text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Explanatory Description
                      </label>
                      <textarea
                        value={bentoData.card2?.description || ""}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card2: { ...prev.card2, description: e.target.value },
                          }))
                        }
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed dark:border-white/10 dark:bg-card focus:outline-none focus:ring-1 focus:ring-pup-maroon resize-none"
                      />
                    </div>

                    {/* Milestones */}
                    <div className="p-4 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white dark:bg-zinc-950 space-y-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 font-mono">
                        Schedule Milestones (3 Steps)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200/60 dark:border-white/5">
                          <span className="text-[10px] font-mono font-bold text-pup-maroon dark:text-red-400">Step 1: Schedule</span>
                          <Input
                            value={bentoData.card2?.step1Title || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card2: { ...prev.card2, step1Title: e.target.value },
                              }))
                            }
                            placeholder="Clear Schedule"
                            className="h-8 text-xs font-semibold"
                          />
                          <Input
                            value={bentoData.card2?.step1Subtitle || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card2: { ...prev.card2, step1Subtitle: e.target.value },
                              }))
                            }
                            placeholder="Based on document type"
                            className="h-7 text-[11px]"
                          />
                        </div>

                        <div className="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200/60 dark:border-white/5">
                          <span className="text-[10px] font-mono font-bold text-pup-maroon dark:text-red-400">Step 2: Notification</span>
                          <Input
                            value={bentoData.card2?.step2Title || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card2: { ...prev.card2, step2Title: e.target.value },
                              }))
                            }
                            placeholder="Live Notifications"
                            className="h-8 text-xs font-semibold"
                          />
                          <Input
                            value={bentoData.card2?.step2Subtitle || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card2: { ...prev.card2, step2Subtitle: e.target.value },
                              }))
                            }
                            placeholder="Track progress instantly"
                            className="h-7 text-[11px]"
                          />
                        </div>

                        <div className="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200/60 dark:border-white/5">
                          <span className="text-[10px] font-mono font-bold text-pup-maroon dark:text-red-400">Step 3: Counter</span>
                          <Input
                            value={bentoData.card2?.step3Title || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card2: { ...prev.card2, step3Title: e.target.value },
                              }))
                            }
                            placeholder="Visit Counter"
                            className="h-8 text-xs font-semibold"
                          />
                          <Input
                            value={bentoData.card2?.step3Subtitle || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card2: { ...prev.card2, step3Subtitle: e.target.value },
                              }))
                            }
                            placeholder="No waiting in lines"
                            className="h-7 text-[11px]"
                          />
                        </div>
                      </div>
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
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        activeCardTab === 3
                          ? "bg-pup-maroon text-white"
                          : "bg-gray-200/80 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                      )}
                    >
                      <HugeIcon className="ph-bold ph-archive text-sm" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 truncate">
                        Card 3: Direct from Campus Archives
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                        Flow diagram connecting online request to Room 1 archive cabinets and staff.
                      </p>
                    </div>
                  </div>
                  <HugeIcon
                    className={cn(
                      "ph-bold ph-caret-down text-gray-400 text-sm shrink-0 transition-transform duration-200",
                      activeCardTab === 3 && "rotate-180"
                    )}
                  />
                </button>

                {activeCardTab === 3 && (
                  <div className="px-5 pb-5 pt-2 space-y-5 border-t border-gray-200/60 dark:border-white/5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Heading Title
                      </label>
                      <Input
                        value={bentoData.card3?.title || ""}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card3: { ...prev.card3, title: e.target.value },
                          }))
                        }
                        className="h-10 rounded-xl bg-white dark:bg-card text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Explanatory Description
                      </label>
                      <textarea
                        value={bentoData.card3?.description || ""}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card3: { ...prev.card3, description: e.target.value },
                          }))
                        }
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed dark:border-white/10 dark:bg-card focus:outline-none focus:ring-1 focus:ring-pup-maroon resize-none"
                      />
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white dark:bg-zinc-950 space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 font-mono">
                        Flow Diagram Node Labels
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-600 dark:text-zinc-400 mb-1">
                            Node 1 (Online Request)
                          </label>
                          <Input
                            value={bentoData.card3?.step1Label || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card3: { ...prev.card3, step1Label: e.target.value },
                              }))
                            }
                            placeholder="Request"
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-600 dark:text-zinc-400 mb-1">
                            Node 2 (Archive Location)
                          </label>
                          <Input
                            value={bentoData.card3?.step2Label || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card3: { ...prev.card3, step2Label: e.target.value },
                              }))
                            }
                            placeholder="Room 1"
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-600 dark:text-zinc-400 mb-1">
                            Node 3 (Personnel)
                          </label>
                          <Input
                            value={bentoData.card3?.step3Label || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card3: { ...prev.card3, step3Label: e.target.value },
                              }))
                            }
                            placeholder="Staff"
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                      </div>
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
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        activeCardTab === 4
                          ? "bg-pup-maroon text-white"
                          : "bg-gray-200/80 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                      )}
                    >
                      <HugeIcon className="ph-bold ph-check-square-offset text-sm" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 truncate">
                        Card 4: What You Need to Prepare
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                        Preparation checklist items required from students and alumni.
                      </p>
                    </div>
                  </div>
                  <HugeIcon
                    className={cn(
                      "ph-bold ph-caret-down text-gray-400 text-sm shrink-0 transition-transform duration-200",
                      activeCardTab === 4 && "rotate-180"
                    )}
                  />
                </button>

                {activeCardTab === 4 && (
                  <div className="px-5 pb-5 pt-2 space-y-5 border-t border-gray-200/60 dark:border-white/5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Heading Title
                      </label>
                      <Input
                        value={bentoData.card4?.title || ""}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card4: { ...prev.card4, title: e.target.value },
                          }))
                        }
                        className="h-10 rounded-xl bg-white dark:bg-card text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Explanatory Description
                      </label>
                      <textarea
                        value={bentoData.card4?.description || ""}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card4: { ...prev.card4, description: e.target.value },
                          }))
                        }
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed dark:border-white/10 dark:bg-card focus:outline-none focus:ring-1 focus:ring-pup-maroon resize-none"
                      />
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white dark:bg-zinc-950 space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 font-mono">
                        Preparation Checklist Items
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-600 dark:text-zinc-400 mb-1">
                            Checklist Item 1
                          </label>
                          <Input
                            value={bentoData.card4?.item1 || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card4: { ...prev.card4, item1: e.target.value },
                              }))
                            }
                            placeholder="Student Number"
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-600 dark:text-zinc-400 mb-1">
                            Checklist Item 2
                          </label>
                          <Input
                            value={bentoData.card4?.item2 || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card4: { ...prev.card4, item2: e.target.value },
                              }))
                            }
                            placeholder="Active Email"
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-600 dark:text-zinc-400 mb-1">
                            Checklist Item 3
                          </label>
                          <Input
                            value={bentoData.card4?.item3 || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card4: { ...prev.card4, item3: e.target.value },
                              }))
                            }
                            placeholder="Campus Clearance"
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                      </div>
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
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        activeCardTab === 5
                          ? "bg-pup-maroon text-white"
                          : "bg-gray-200/80 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                      )}
                    >
                      <HugeIcon className="ph-bold ph-shield-check text-sm" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 truncate">
                        Card 5: Protected by Law (RA 11032)
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                        Ease of Doing Business Act guarantees and anti-red tape commitments.
                      </p>
                    </div>
                  </div>
                  <HugeIcon
                    className={cn(
                      "ph-bold ph-caret-down text-gray-400 text-sm shrink-0 transition-transform duration-200",
                      activeCardTab === 5 && "rotate-180"
                    )}
                  />
                </button>

                {activeCardTab === 5 && (
                  <div className="px-5 pb-5 pt-2 space-y-5 border-t border-gray-200/60 dark:border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                          Card Heading Title
                        </label>
                        <Input
                          value={bentoData.card5?.title || ""}
                          onChange={(e) =>
                            setBentoData((prev) => ({
                              ...prev,
                              card5: { ...prev.card5, title: e.target.value },
                            }))
                          }
                          className="h-10 rounded-xl bg-white dark:bg-card text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                          Shield Badge Label
                        </label>
                        <Input
                          value={bentoData.card5?.badgeLabel || ""}
                          onChange={(e) =>
                            setBentoData((prev) => ({
                              ...prev,
                              card5: { ...prev.card5, badgeLabel: e.target.value },
                            }))
                          }
                          placeholder="RA 11032"
                          className="h-10 rounded-xl bg-white dark:bg-card text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Card Explanatory Description
                      </label>
                      <textarea
                        value={bentoData.card5?.description || ""}
                        onChange={(e) =>
                          setBentoData((prev) => ({
                            ...prev,
                            card5: { ...prev.card5, description: e.target.value },
                          }))
                        }
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed dark:border-white/10 dark:bg-card focus:outline-none focus:ring-1 focus:ring-pup-maroon resize-none"
                      />
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white dark:bg-zinc-950 space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 font-mono">
                        Anti-Red Tape &amp; Efficiency Guarantees
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-600 dark:text-zinc-400 mb-1">
                            Guarantee 1
                          </label>
                          <Input
                            value={bentoData.card5?.item1 || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card5: { ...prev.card5, item1: e.target.value },
                              }))
                            }
                            placeholder="Zero Red Tape"
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-600 dark:text-zinc-400 mb-1">
                            Guarantee 2
                          </label>
                          <Input
                            value={bentoData.card5?.item2 || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card5: { ...prev.card5, item2: e.target.value },
                              }))
                            }
                            placeholder="No Hidden Delays"
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-600 dark:text-zinc-400 mb-1">
                            Guarantee 3
                          </label>
                          <Input
                            value={bentoData.card5?.item3 || ""}
                            onChange={(e) =>
                              setBentoData((prev) => ({
                                ...prev,
                                card5: { ...prev.card5, item3: e.target.value },
                              }))
                            }
                            placeholder="Transparent Tracking"
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Section Header & Overview */}
          {activeTab === "header" && (
            <div className="w-full space-y-6">
              <div className="p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 space-y-5">
                <div className="border-b border-gray-200/80 dark:border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Editorial Header &amp; Subtitle
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Controls the overarching headline and introductory copy displayed at the top of the Bento grid section.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Main Heading (Line 1 - Bold Dark)
                    </label>
                    <Input
                      value={bentoData.headingLine1 || ""}
                      onChange={(e) =>
                        setBentoData((prev) => ({ ...prev, headingLine1: e.target.value }))
                      }
                      placeholder="e.g. Request, track, and"
                      className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Secondary Heading (Line 2 - Muted Gray)
                    </label>
                    <Input
                      value={bentoData.headingLine2 || ""}
                      onChange={(e) =>
                        setBentoData((prev) => ({ ...prev, headingLine2: e.target.value }))
                      }
                      placeholder="e.g. claim your documents"
                      className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 text-sm font-bold text-zinc-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Section Description / Intro Paragraph
                  </label>
                  <textarea
                    rows={3}
                    value={bentoData.description || ""}
                    onChange={(e) =>
                      setBentoData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Submit your request online, track its progress in real time..."
                    className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 text-xs leading-relaxed text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-pup-maroon resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Interactive Bento Live Preview */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Simulated Bento Grid (5-Card Layout)
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400">
                    Live interactive simulation showing Card 1 &amp; 2 in Row 1 (50/50) and Cards 3, 4, 5 in Row 2 (3-Column).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewDarkTheme(!previewDarkTheme)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-white/10 cursor-pointer shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors shrink-0"
                >
                  <HugeIcon className={cn("ph-bold", previewDarkTheme ? "ph-sun text-amber-500" : "ph-moon text-zinc-700")} />
                  <span>{previewDarkTheme ? "Switch to Light View" : "Switch to Dark View"}</span>
                </button>
              </div>

              {/* Stage Container */}
              <div
                className={cn(
                  "relative w-full rounded-2xl border p-6 sm:p-10 overflow-hidden transition-colors select-none font-jakarta",
                  previewDarkTheme ? "bg-zinc-950 border-zinc-800 text-white" : "bg-[#f5f5f7] border-gray-200 text-zinc-900"
                )}
              >
                {/* Header Preview */}
                <div className="max-w-4xl mb-8">
                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-[1.1]">
                    {bentoData.headingLine1 || "Request, track, and"}<br />
                    <span className="text-zinc-400">{bentoData.headingLine2 || "claim your documents"}</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xl leading-relaxed">
                    {bentoData.description}
                  </p>
                </div>

                {/* 2-Row Bento Grid Container */}
                <div className="w-full flex flex-col gap-4 sm:gap-5">
                  {/* ROW 1: 2 Large Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                    {/* Card 1 */}
                    <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/10 p-5 sm:p-7 flex flex-col justify-between shadow-sm">
                      <div className="rounded-2xl bg-[#f5f5f7] dark:bg-zinc-950 p-4 border-none min-h-[190px] flex flex-col justify-center items-center relative overflow-hidden">
                        <div className="relative z-10 w-full max-w-[180px] flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
                              <HugeIcon className="ph-bold ph-file-text" />
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{bentoData.card1?.step1Label || "Select Document"}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-zinc-400 shrink-0 border border-black/5">
                              <HugeIcon className="ph-bold ph-target" />
                            </div>
                            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{bentoData.card1?.step2Label || "Specify Purpose"}</span>
                          </div>
                          <button className="px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 w-[110px] mx-auto bg-[#800000] text-white shadow-xs">
                            {bentoData.card1?.buttonLabel || "Submit"}
                            <HugeIcon className="ph-bold ph-paper-plane-right text-xs" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                          {bentoData.card1?.title || "Request Online in Minutes"}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {bentoData.card1?.description}
                        </p>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/10 p-5 sm:p-7 flex flex-col justify-between shadow-sm">
                      <div className="rounded-2xl bg-[#f5f5f7] dark:bg-zinc-950 p-4 border-none min-h-[190px] flex flex-col justify-center items-center relative overflow-hidden">
                        <div className="relative z-10 w-full max-w-[190px] flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-[#800000] dark:text-red-400 border border-black/5 shrink-0">
                              <HugeIcon className="ph-bold ph-calendar-check text-xs" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{bentoData.card2?.step1Title || "Clear Schedule"}</div>
                              <div className="text-[10px] text-zinc-500">{bentoData.card2?.step1Subtitle || "Based on document type"}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-[#800000] dark:text-red-400 border border-black/5 shrink-0">
                              <HugeIcon className="ph-bold ph-bell-ringing text-xs" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{bentoData.card2?.step2Title || "Live Notifications"}</div>
                              <div className="text-[10px] text-zinc-500">{bentoData.card2?.step2Subtitle || "Track progress instantly"}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#800000] text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
                              <HugeIcon className="ph-bold ph-handshake" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-[#800000] dark:text-red-400">{bentoData.card2?.step3Title || "Visit Counter"}</div>
                              <div className="text-[10px] text-[#800000]/70 dark:text-red-300">{bentoData.card2?.step3Subtitle || "No waiting in lines"}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                          {bentoData.card2?.title || "Know Exactly When It's Ready"}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {bentoData.card2?.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ROW 2: 3 Medium Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                    {/* Card 3 */}
                    <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/10 p-5 flex flex-col justify-between shadow-sm">
                      <div className="rounded-2xl bg-[#f5f5f7] dark:bg-zinc-950 p-4 border-none min-h-[160px] flex items-center justify-center relative overflow-hidden">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-[#800000] dark:text-red-400 border border-black/5">
                              <HugeIcon className="ph-bold ph-laptop text-sm" />
                            </div>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">{bentoData.card3?.step1Label || "Request"}</span>
                          </div>
                          <div className="w-6 h-0 border-t-2 border-dashed border-zinc-300 -translate-y-2" />
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="w-10 h-10 rounded-full bg-[#800000] text-white flex items-center justify-center shadow-md">
                              <HugeIcon className="ph-bold ph-archive text-base" />
                            </div>
                            <span className="text-[9px] font-bold text-[#800000] dark:text-red-400 uppercase">{bentoData.card3?.step2Label || "Room 1"}</span>
                          </div>
                          <div className="w-6 h-0 border-t-2 border-dashed border-zinc-300 -translate-y-2" />
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-[#800000] dark:text-red-400 border border-black/5">
                              <HugeIcon className="ph-bold ph-users text-sm" />
                            </div>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">{bentoData.card3?.step3Label || "Staff"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                          {bentoData.card3?.title || "Direct from Campus Archives"}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {bentoData.card3?.description}
                        </p>
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/10 p-5 flex flex-col justify-between shadow-sm">
                      <div className="rounded-2xl bg-[#f5f5f7] dark:bg-zinc-950 p-4 border-none min-h-[160px] flex flex-col justify-center items-center">
                        <div className="w-full max-w-[170px] flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-emerald-600 border border-black/5 shrink-0">
                              <HugeIcon className="ph-bold ph-check text-xs" />
                            </div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{bentoData.card4?.item1 || "Student Number"}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-emerald-600 border border-black/5 shrink-0">
                              <HugeIcon className="ph-bold ph-check text-xs" />
                            </div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{bentoData.card4?.item2 || "Active Email"}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-emerald-600 border border-black/5 shrink-0">
                              <HugeIcon className="ph-bold ph-check text-xs" />
                            </div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{bentoData.card4?.item3 || "Campus Clearance"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                          {bentoData.card4?.title || "What You Need to Prepare"}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {bentoData.card4?.description}
                        </p>
                      </div>
                    </div>

                    {/* Card 5 */}
                    <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/10 p-5 flex flex-col justify-between shadow-sm">
                      <div className="rounded-2xl bg-[#f5f5f7] dark:bg-zinc-950 p-4 border-none min-h-[160px] flex items-center justify-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm flex flex-col items-center justify-center text-[#800000] dark:text-red-400 border border-black/5 shrink-0 relative">
                          <HugeIcon className="ph-bold ph-shield-check text-2xl" />
                          <span className="absolute -bottom-2 bg-[#800000] text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                            {bentoData.card5?.badgeLabel || "RA 11032"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <HugeIcon className="ph-bold ph-check text-emerald-600 text-xs" />
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{bentoData.card5?.item1 || "Zero Red Tape"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HugeIcon className="ph-bold ph-check text-emerald-600 text-xs" />
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{bentoData.card5?.item2 || "No Hidden Delays"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HugeIcon className="ph-bold ph-check text-emerald-600 text-xs" />
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{bentoData.card5?.item3 || "Transparent Tracking"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                          {bentoData.card5?.title || "Protected by Law (RA 11032)"}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {bentoData.card5?.description}
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

      <ConfirmModal
        open={resetModalOpen}
        onOpenChange={setResetModalOpen}
        title="Reset Bento Grid Settings?"
        description="Are you sure you want to reset all bento grid features, editorial headlines, and simulation labels back to institutional defaults? This action cannot be undone."
        confirmText="Reset to Defaults"
        confirmVariant="destructive"
        onConfirm={handleReset}
      />
    </div>
  )
}
