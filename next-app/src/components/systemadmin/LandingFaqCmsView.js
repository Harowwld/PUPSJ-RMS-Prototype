"use client"
import useViewPreference from "@/hooks/useViewPreference"
import DashboardSearch from "@/components/systemadmin/DashboardSearch"
import { Textarea } from "@/components/ui/textarea";


import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAppReducedMotion, EASE_OUT } from "@/lib/motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import LandingFaqSkeleton from "@/components/systemadmin/skeletons/LandingFaqSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import LandingCmsViewTabs from "./LandingCmsViewTabs"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import { FilterPopover } from "./OfficeTableControls"
import ConfirmModal from "@/components/shared/ConfirmModal"
import useCmsDraft from "@/hooks/useCmsDraft"
import LandingCmsDraftStatus from "./LandingCmsDraftStatus"
import { cn } from "@/lib/utils"
import { Add01Icon, ArrowDown01Icon, ArrowUp01Icon, Copy01Icon, CovidInfoIcon, Delete01Icon, LayoutGridIcon, MinusSignIcon } from "hugeicons-react";


export const MAX_FAQ_ITEMS = 16
export const MIN_FAQ_ITEMS = 2

const DEFAULT_FAQ_CONTENT = {
  heading: "Frequently Asked Questions",
  description:
    "Quick answers on requesting, tracking, and claiming your official school records.",
  faqs: [
    {
      id: "how-to-request",
      q: "How do I request my school records?",
      a: "Log in with your Student Number, choose the document you need (like your TOR, grades, or diploma), and submit your request online. No paper forms needed.",
      category: "Requests",
    },
    {
      id: "forgot-student-number",
      q: "I forgot my student number. Can I still request?",
      a: "Yes! You can skip the student number and enter your full name, course, and years attended. Our staff will find your file in the records archive.",
      category: "Requests",
    },
    {
      id: "processing-time",
      q: "How long does it take to process my request?",
      a: "Regular certificates take 3 working days. Clearances take 7 days, and full transcripts (TOR) take up to 20 days. You will be notified when it is ready for pickup.",
      category: "Processing",
    },
    {
      id: "representative-pickup",
      q: "Can someone else pick up my document for me?",
      a: "Yes. They just need to bring: (1) an authorization letter signed by you, (2) a copy of your valid ID, and (3) their own valid ID.",
      category: "Pickup",
    },
    {
      id: "cutoff-time",
      q: "What time does daily evaluation cut off?",
      a: "Cut-off is 3:00 PM on weekdays (Monday to Friday). Requests submitted after 3:00 PM are evaluated the next working morning.",
      category: "Processing",
    },
    {
      id: "claiming-deadline",
      q: "How long do I have to claim my document?",
      a: "Please claim your document within 90 days after notification. Unclaimed documents are safely disposed of after 90 days to protect your privacy.",
      category: "Pickup",
    },
  ],
}

const STANDARD_CATEGORIES = [
  "Requests",
  "Processing",
  "Pickup",
  "Clearance",
  "Alumni",
  "Fees",
  "General",
]

export default function LandingFaqCmsView({ showToast, onDirtyChange }) {
  const shouldReduceMotion = useAppReducedMotion()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useViewPreference("cms-faq", "activeTab", "content") // 'content' | 'preview'
  const [faqData, setFaqData] = useState(DEFAULT_FAQ_CONTENT)
  const { isDirty, savedData, markSaved } = useCmsDraft(faqData, onDirtyChange)

  // Item Editor State
  const [expandedIdx, setExpandedIdx] = useState(0)
  const [categoryFilters, setCategoryFilters] = useViewPreference("cms-faq", "categoryFilters", [])
  const [questionSearch, setQuestionSearch] = useViewPreference("cms-faq", "questionSearch", "")
  const [deleteFaqIdx, setDeleteFaqIdx] = useState(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)

  // Live Preview State
  const [previewOpenIdx, setPreviewOpenIdx] = useState(0)
  const [previewFilter, setPreviewFilter] = useViewPreference("cms-faq", "previewFilter", "all")

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
        const res = await fetch("/api/landing/faq", { cache: "no-store" })
        const json = await res.json()
        if (ignore) return
        if (res.ok && json.ok && json.data) {
          setFaqData(json.data)
          markSaved(json.data)
        } else {
          notify(json.error || "Failed to load FAQ configuration", true)
        }
      } catch (err) {
        if (ignore) return
        console.error("[LandingFaqCmsView] Fetch error:", err)
        notify("Network error fetching FAQ settings", true)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [notify, markSaved])

  // Save changes
  const handleSave = async () => {
    if (!isDirty || saving) return
    if (!faqData.heading?.trim()) {
      notify("Section heading cannot be blank", true)
      return
    }
    if (!faqData.faqs || faqData.faqs.length < MIN_FAQ_ITEMS) {
      notify(`At least ${MIN_FAQ_ITEMS} questions are required`, true)
      return
    }
    for (let i = 0; i < faqData.faqs.length; i++) {
      const item = faqData.faqs[i]
      if (!item.q?.trim()) {
        notify(`Question ${i + 1} cannot be blank`, true)
        return
      }
      if (!item.a?.trim()) {
        notify(`Answer for question ${i + 1} cannot be blank`, true)
        return
      }
    }

    try {
      setSaving(true)
      const res = await fetch("/api/landing/faq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(faqData),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setFaqData(json.data)
        markSaved(json.data)
        notify("FAQ section configuration saved successfully")
      } else {
        notify(json.error || "Failed to update FAQ configuration", true)
      }
    } catch (err) {
      console.error("[LandingFaqCmsView] Save error:", err)
      notify("Network error saving configuration", true)
    } finally {
      setSaving(false)
    }
  }

  // Reset to defaults
  const handleReset = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/landing/faq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setFaqData(json.data)
        markSaved(json.data)
        setExpandedIdx(0)
        notify("FAQ section reverted to institutional defaults")
      } else {
        notify(json.error || "Failed to reset FAQ section", true)
      }
    } catch (err) {
      console.error("[LandingFaqCmsView] Reset error:", err)
      notify("Network error resetting configuration", true)
    } finally {
      setSaving(false)
      setResetModalOpen(false)
    }
  }

  // Update specific question field
  const updateFaqItem = (idx, field, value) => {
    setFaqData((prev) => {
      const next = [...prev.faqs]
      next[idx] = { ...next[idx], [field]: value }
      return { ...prev, faqs: next }
    })
  }

  // Add new question directly
  const addNewFaq = () => {
    if (faqData.faqs.length >= MAX_FAQ_ITEMS) {
      notify(`Maximum limit of ${MAX_FAQ_ITEMS} questions reached`, true)
      return
    }

    const nextNum = faqData.faqs.length + 1
    const newId = `faq_${Date.now().toString(36)}`
    const newItem = {
      id: newId,
      q: `New Frequently Asked Question ${nextNum}`,
      a: "Provide clear, direct guidance for students and alumni regarding university procedures and records keeping.",
      category: "General",
    }

    setFaqData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, newItem],
    }))

    setExpandedIdx(faqData.faqs.length)
    notify(`Added "${newItem.q}"`)
  }

  // Duplicate question
  const handleDuplicate = (idx) => {
    if (faqData.faqs.length >= MAX_FAQ_ITEMS) {
      notify(`Maximum limit of ${MAX_FAQ_ITEMS} questions reached`, true)
      return
    }
    const source = faqData.faqs[idx]
    const cloned = {
      ...source,
      id: `${source.id}_copy_${Date.now().toString(36).slice(-3)}`,
      q: `${source.q} (Copy)`,
    }

    setFaqData((prev) => {
      const next = [...prev.faqs]
      next.splice(idx + 1, 0, cloned)
      return { ...prev, faqs: next }
    })

    setExpandedIdx(idx + 1)
    notify("Question duplicated")
  }

  // Delete question
  const handleDeleteConfirm = () => {
    if (deleteFaqIdx === null) return
    if (faqData.faqs.length <= MIN_FAQ_ITEMS) {
      notify(`You must keep at least ${MIN_FAQ_ITEMS} questions`, true)
      setDeleteFaqIdx(null)
      return
    }

    setFaqData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== deleteFaqIdx),
    }))

    if (expandedIdx >= faqData.faqs.length - 1) {
      setExpandedIdx(Math.max(0, faqData.faqs.length - 2))
    }
    setDeleteFaqIdx(null)
    notify("Question removed")
  }

  // Move up/down
  const moveFaq = (idx, direction) => {
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= faqData.faqs.length) return

    setFaqData((prev) => {
      const next = [...prev.faqs]
      const temp = next[idx]
      next[idx] = next[targetIdx]
      next[targetIdx] = temp
      return { ...prev, faqs: next }
    })

    setExpandedIdx(targetIdx)
  }

  // Filtered FAQs for CMS list
  const filteredFaqs = faqData.faqs
    .map((item, originalIdx) => ({ item, originalIdx }))
    .filter(({ item }) => {
      const matchesCategory = categoryFilters.every((filter) => {
        const same = (item.category || "General").toLowerCase() === String(filter.value).toLowerCase()
        return filter.operator === "is_not" ? !same : same
      })
      const matchesSearch = `${item.q} ${item.a}`.toLowerCase().includes(questionSearch.trim().toLowerCase())
      return matchesCategory && matchesSearch
    })

  // Unique categories list for filters
  const uniqueCategories = Array.from(
    new Set(faqData.faqs.map((f) => f.category || "General"))
  )

  if (loading) {
    return <LandingFaqSkeleton />
  }

  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex min-w-0 flex-[1_0_auto] h-auto w-full flex-col gap-0 overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none isolate font-jakarta">
        {/* Page Header */}
        <PageHeader
          icon=" HelpCircleIcon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Landing Page CMS</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">{faqData.faqs.length} questions · FAQ Section</span>
              <LandingCmsDraftStatus isDirty={isDirty} />
            </div>
          }
          description="Manage frequently asked questions, detailed answers, and category tags."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex shrink-0 items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("/#faq", "_blank")}
                className="h-9 px-4"
              >
                Preview Portal
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="h-9 px-4 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving Changes..." : "Save FAQ Content"}
              </Button>
            </div>
          }
          secondaryActions={
            <>
              <Button type="button" variant="outline" onClick={() => setResetModalOpen(true)} disabled={saving} className="h-9 px-4">Restore Defaults</Button>
              {isDirty && <Button type="button" variant="outline" onClick={() => { setFaqData(savedData); notify("Draft changes discarded. Reverted to saved FAQ content.") }} disabled={saving} className="h-9 px-4">Discard Draft</Button>}
            </>
          }
        />

        {/* Standardized SuperAdmin Navigation Segmented Tabs */}
        <LandingCmsViewTabs activeTab={activeTab} onChange={setActiveTab} contentLabel="FAQ Content" contentCount={faqData.faqs.length} />

        <CardContent className="font-jakarta p-6 flex flex-[1_0_auto] flex-col gap-6 rounded-b-2xl">
          {/* TAB 1: FAQ Content Management */}
          {activeTab === "content" && (
            <div className="space-y-5">
              {/* Section Header & Subtitle Card */}
              <div className="w-full rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-5">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Section Header &amp; Description
                  </h3>
                  <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300 mt-0.5">
                    Main heading and explanatory copy displayed at the top of the public FAQ section.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor="faq-heading" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        Section Heading
                      </label>
                      <span className="text-[11px] text-gray-400 font-sans tabular-nums">
                        {(faqData.heading || "").length}/60
                      </span>
                    </div>
                    <Input
                      id="faq-heading"
                      value={faqData.heading}
                      onChange={(e) =>
                        setFaqData((prev) => ({
                          ...prev,
                          heading: e.target.value,
                        }))
                      }
                      placeholder="Frequently Asked Questions"
                      maxLength={60}
                      className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-normal placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor="faq-description" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        Section Subtitle Description
                      </label>
                      <span className="text-[11px] text-gray-400 font-sans tabular-nums">
                        {(faqData.description || "").length}/200
                      </span>
                    </div>
                    <Textarea
                      rows={3}
                      id="faq-description"
                      value={faqData.description || ""}
                      onChange={(e) =>
                        setFaqData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Clear, authoritative answers to common inquiries..."
                      maxLength={200}
                      className="w-full min-h-[72px] resize-y rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs font-normal placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                    />
                  </div>
                </div>
              </div>
              {/* Header Action Bar */}
              <div className="flex min-w-0 flex-col rounded-2xl border border-border dark:border-border bg-white dark:bg-card overflow-hidden shadow-2xs">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="shrink-0">
                    <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                      <span>Questions &amp; Answers List</span>
                      <span className="text-[11px] font-normal text-gray-500 dark:text-zinc-400 font-sans tabular-nums">
                        {faqData.faqs.length}/{MAX_FAQ_ITEMS}
                      </span>
                    </h3>
                    <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300 mt-0.5">
                      Expand any question below to edit its text, category, or order.
                    </p>
                  </div>

                  <Button
                    type="button"
                    disabled={faqData.faqs.length >= MAX_FAQ_ITEMS}
                    onClick={addNewFaq}
                    className="h-9 shrink-0 px-4 cursor-pointer disabled:opacity-40"
                    title={faqData.faqs.length >= MAX_FAQ_ITEMS ? `Maximum limit of ${MAX_FAQ_ITEMS} questions reached` : "Add question"}
                  >
                    Add Question
                  </Button>
                </div>

                <DataViewToolbar label="FAQ search and category filter" className="w-full gap-2 border-t border-border dark:border-border bg-white px-4 py-3 dark:bg-card">
                  <DashboardSearch value={questionSearch} onChange={setQuestionSearch} count={filteredFaqs.length} label="Search questions and answers" placeholder="Search questions and answers" />
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <FilterPopover
                      fields={[{ key: "category", label: "Category", options: uniqueCategories.map((category) => ({ value: category, label: category })) }]}
                      filters={categoryFilters}
                      onFiltersChange={setCategoryFilters}
                      entityLabel="questions"
                    />
                  </div>
                </DataViewToolbar>
              </div>

              {/* FAQ Items Accordion Cards */}
              <div className="space-y-3">
                {filteredFaqs.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-gray-500 dark:text-zinc-400">
                    No questions match this search or category.
                  </p>
                )}
                {filteredFaqs.map(({ item, originalIdx }) => {
                  const isExpanded = expandedIdx === originalIdx
                  return (
                    <div
                      key={item.id || originalIdx}
                      className={cn(
                        "rounded-xl border transition-[color,background-color,border-color,box-shadow,opacity,transform] overflow-hidden",
                        isExpanded
                          ? "border-gray-950 dark:border-white bg-white dark:bg-zinc-900/60 shadow-xs ring-1 ring-black/10 dark:ring-white/20"
                          : "border-border dark:border-border bg-white dark:bg-zinc-900/30 hover:border-border dark:hover:border-white/20"
                      )}
                    >
                      {/* Accordion Bar / Header */}
                      <div
                        onClick={() =>
                          setExpandedIdx((prev) => (prev === originalIdx ? null : originalIdx))
                        }
                        className={cn(
                          "px-4 py-3 flex items-center justify-between cursor-pointer select-none gap-3 transition-colors",
                          isExpanded
                            ? "bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50"
                            : "bg-gray-50/70 dark:bg-zinc-950/40 hover:bg-gray-100/60 dark:hover:bg-zinc-800/50"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span
                            className={cn(
                              "w-6 h-6 rounded-full text-[11px] font-bold font-sans tabular-nums flex items-center justify-center shrink-0 transition-colors",
                              isExpanded
                                ? "bg-gray-950 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                                : "bg-gray-200/80 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300"
                            )}
                          >
                            {String(originalIdx + 1).padStart(2, "0")}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                            {item.q || "Untitled Question"}
                          </span>
                          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200/80 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 shrink-0">
                            {item.category || "General"}
                          </span>
                        </div>

                        {/* Control Actions */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={originalIdx === 0}
                            onClick={() => moveFaq(originalIdx, -1)}
                            title="Move Earlier"
                            className="h-7 w-7 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 bg-transparent p-0"
                          >
                            <ArrowUp01Icon size="1em"  className="text-xs" />
                          </button>

                          <button
                            type="button"
                            disabled={originalIdx === faqData.faqs.length - 1}
                            onClick={() => moveFaq(originalIdx, 1)}
                            title="Move Later"
                            className="h-7 w-7 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 bg-transparent p-0"
                          >
                            <ArrowDown01Icon size="1em"  className="text-xs" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicate(originalIdx)}
                            title="Duplicate Question"
                            className="h-7 w-7 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-0 bg-transparent p-0"
                          >
                            <Copy01Icon size="1em"  className="text-xs" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteFaqIdx(originalIdx)}
                            title="Delete Question"
                            className="h-7 w-7 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer border-0 bg-transparent p-0 ml-0.5"
                          >
                            <Delete01Icon size="1em"  className="text-xs" />
                          </button>

                          <div className="w-[1px] h-4 bg-gray-200 dark:bg-white/10 mx-1" />

                          <ArrowDown01Icon size="1em"
                            className={cn(
                              "text-xs text-gray-400 transition-transform duration-200",
                              isExpanded && "rotate-180 text-gray-700 dark:text-zinc-200"
                            )}
                          />
                        </div>
                      </div>

                      {/* Expandable Form Body */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 sm:p-5 border-t border-border dark:border-border space-y-4 bg-white dark:bg-zinc-900/40">
                          {/* Question Input */}
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label htmlFor={`faq-question-${originalIdx}`} className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                Question Text
                              </label>
                              <span className="text-[11px] text-gray-400 font-sans tabular-nums">
                                {item.q.length}/140
                              </span>
                            </div>
                            <Input
                              id={`faq-question-${originalIdx}`}
                              value={item.q}
                              onChange={(e) => updateFaqItem(originalIdx, "q", e.target.value)}
                              placeholder="e.g. How do I request my school records?"
                              maxLength={140}
                              className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-medium placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                            />
                          </div>

                          {/* Answer Textarea */}
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label htmlFor={`faq-answer-${originalIdx}`} className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                Answer Explanation
                              </label>
                              <span className="text-[11px] text-gray-400 font-sans tabular-nums">
                                {item.a.length}/400
                              </span>
                            </div>
                            <Textarea
                              id={`faq-answer-${originalIdx}`}
                              value={item.a}
                              onChange={(e) => updateFaqItem(originalIdx, "a", e.target.value)}
                              rows={3}
                              maxLength={400}
                              placeholder="Provide clear, direct guidance for this inquiry..."
                              className="w-full resize-y rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs font-normal placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                            />
                          </div>

                          {/* Category Tag Section */}
                          <div className="pt-1">
                            <div className="flex justify-between items-center mb-1.5">
                              <label htmlFor={`faq-category-${originalIdx}`} className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                Category Tag
                              </label>
                              <span className="text-[11px] text-gray-400 font-sans tabular-nums">
                                {(item.category || "").length}/30
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-[155px] shrink-0">
                                  <Select
                                    id={`faq-category-${originalIdx}`}
                                    aria-label={`Question ${originalIdx + 1} category tag`}
                                    value={
                                      STANDARD_CATEGORIES.includes(item.category)
                                        ? item.category
                                        : "Custom"
                                    }
                                    onChange={(e) => {
                                      if (e.target.value === "Custom") {
                                        if (STANDARD_CATEGORIES.includes(item.category)) {
                                          updateFaqItem(originalIdx, "category", "")
                                        }
                                      } else {
                                        updateFaqItem(originalIdx, "category", e.target.value)
                                      }
                                    }}
                                    className="h-9 rounded-xl border border-gray-200 bg-white text-xs font-normal text-gray-700 shadow-none dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
                                  >
                                    {STANDARD_CATEGORIES.map((cat) => (
                                      <option key={cat} value={cat}>
                                        {cat}
                                      </option>
                                    ))}
                                    <option value="Custom">Custom Tag...</option>
                                  </Select>
                                </div>

                                <Input
                                  aria-label={`Question ${originalIdx + 1} custom category tag`}
                                  value={item.category || ""}
                                  onChange={(e) =>
                                    updateFaqItem(originalIdx, "category", e.target.value)
                                  }
                                  placeholder="Type or customize category tag (e.g. Requests, Clearance, Graduation)"
                                  maxLength={30}
                                  className="h-9 flex-1 rounded-xl border border-border bg-white px-3 text-xs placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                                />
                              </div>

                              {/* Quick Presets row */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums uppercase tracking-wider mr-1">
                                  Presets:
                                </span>
                                {STANDARD_CATEGORIES.map((cat) => {
                                  const isSelected =
                                    (item.category || "").toLowerCase() === cat.toLowerCase()
                                  return (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => updateFaqItem(originalIdx, "category", cat)}
                                      className={cn(
                                        "px-2.5 py-0.5 rounded-lg text-[10px] font-sans tabular-nums transition-[color,background-color,border-color,box-shadow,opacity,transform] cursor-pointer border",
                                        isSelected
                                          ? "border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 font-semibold shadow-xs ring-1 ring-black/10 dark:ring-white/20"
                                          : "bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-border dark:border-border hover:bg-gray-50 dark:hover:bg-zinc-800"
                                      )}
                                    >
                                      {cat}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                    </div>
                  )
                })}
              </div>

              {/* Bottom Add Question Big Dashed Button */}
              {faqData.faqs.length < MAX_FAQ_ITEMS ? (
                <button
                  type="button"
                  onClick={addNewFaq}
                  title={`Add Another Question (${faqData.faqs.length}/${MAX_FAQ_ITEMS})`}
                  className="w-full py-3.5 rounded-xl border-2 border-dashed border-border dark:border-border hover:border-gray-900/40 dark:hover:border-white/30 hover:bg-gray-100/60 dark:hover:bg-zinc-800/50 transition-[color,background-color,border-color,box-shadow,opacity,transform] flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-950 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer select-none"
                >
                  Add Question
                </button>
              ) : (
                <div className="w-full py-3 px-3.5 rounded-xl border border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/30 text-center text-xs text-gray-900 dark:text-zinc-300 flex items-center justify-center gap-2">
                  <CovidInfoIcon size={16}  className="text-pup-maroon dark:text-red-400" />
                  <span>Maximum limit reached ({MAX_FAQ_ITEMS} of {MAX_FAQ_ITEMS} questions). FAQ section is capped at {MAX_FAQ_ITEMS} questions for layout stability and concise reading.</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Interactive Live Preview */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Simulated Public FAQ Section
                  </h3>
                  <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300">
                    Live interactive preview showing exact layout, accordion animations, category filters, and styling.
                  </p>
                </div>

                <span className="text-xs font-sans tabular-nums text-gray-400">
                  {faqData.faqs.length} Total Questions
                </span>
              </div>

              {/* Simulated Public Portal Section Matching FAQSection.js */}
              <div className="rounded-[2.5rem] bg-[#dadddf] dark:bg-zinc-900/60 p-4 sm:p-8 select-none">
                <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-950 rounded-[2rem] p-6 sm:p-10 shadow-xs">
                  {/* Section Header */}
                  <div className="text-center mb-6 sm:mb-8 max-w-xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black dark:text-white tracking-tight">
                      {faqData.heading || "Frequently Asked Questions"}
                    </h2>
                    {faqData.description && (
                      <p className="mt-2 text-xs sm:text-sm text-gray-900 dark:text-zinc-300">
                        {faqData.description}
                      </p>
                    )}
                  </div>

                  {/* Preview Category Filter Pills Matching FAQSection.js */}
                  {uniqueCategories.length > 1 && (
                    <div className="flex justify-center mb-8">
                      <div className="flex items-center p-1 border border-border dark:border-border rounded-full bg-white dark:bg-zinc-900 shadow-xs overflow-x-auto gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewFilter("all")}
                          className={cn(
                            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-[color,background-color,border-color,box-shadow,opacity,transform] whitespace-nowrap cursor-pointer",
                            previewFilter === "all"
                              ? "bg-[#800000] text-white"
                              : "bg-transparent text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                          )}
                        >
                          <LayoutGridIcon size="1em" className={cn("text-sm", previewFilter === "all" ? "text-white" : "text-gray-400")} />
                          All Questions
                        </button>
                        {uniqueCategories.map((cat) => {
                          const isActive = previewFilter.toLowerCase() === cat.toLowerCase()
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setPreviewFilter(cat)}
                              className={cn(
                                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-[color,background-color,border-color,box-shadow,opacity,transform] whitespace-nowrap cursor-pointer",
                                isActive
                                  ? "bg-[#800000] text-white"
                                  : "bg-transparent text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                              )}
                            >
                              {cat}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Accordion List Matching FAQSection.js */}
                  <div className="max-w-2xl mx-auto space-y-3">
                    {faqData.faqs
                      .filter((f) => {
                        if (previewFilter === "all") return true
                        return (f.category || "General").toLowerCase() === previewFilter.toLowerCase()
                      })
                      .map((faq, idx) => {
                        const isOpen = previewOpenIdx === idx
                        return (
                          <div
                            key={faq.id || idx}
                            className={cn(
                              "rounded-2xl transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 overflow-hidden",
                              isOpen ? "bg-[#09090b] text-white" : "bg-[#f4f4f5] dark:bg-zinc-800/60 text-black dark:text-zinc-100"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => setPreviewOpenIdx(isOpen ? null : idx)}
                              className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer select-none transition-colors border-0 bg-transparent"
                            >
                              <span className={cn("text-xs sm:text-sm font-medium pr-4", isOpen ? "text-white" : "text-black dark:text-zinc-100")}>
                                {faq.q}
                              </span>

                              <div className="shrink-0 ml-4">
                                {isOpen ? (
                                  <MinusSignIcon size="1em" className="text-white text-base" />
                                ) : (
                                  <Add01Icon size="1em" className="text-gray-900 dark:text-zinc-300 text-base" />
                                )}
                              </div>
                            </button>

                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  key="content"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 sm:px-5 pb-5 pt-0 text-xs sm:text-[13px] text-gray-300 leading-relaxed font-normal">
                                    <p>{faq.a}</p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Defaults Confirmation Modal */}
      <ConfirmModal
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        onConfirm={handleReset}
        isLoading={saving}
        title="Reset FAQ Section to Defaults"
        message="Are you sure you want to revert the Frequently Asked Questions to PUP institutional defaults? All custom questions and section narrative copy will be replaced."
        confirmLabel="Restore Defaults"
        cancelLabel="Cancel"
        icon=" ReloadIcon"
        buttonIcon=" ReloadIcon"
        selectedItems={[
          "Reset all questions to standard institutional records inquiries",
          "Reset section heading and descriptive copy",
          "Restore default category groupings and ordering",
        ]}
        isPersonnelModal={true}
        isAppleStyled={true}
        isArchiveModal={true}
      />

      {/* Delete FAQ Question Confirmation Modal */}
      <ConfirmModal
        open={deleteFaqIdx !== null}
        onCancel={() => setDeleteFaqIdx(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove Question"
        message="Are you sure you want to remove this question from the public landing page FAQ list?"
        confirmLabel="Remove Question"
        cancelLabel="Cancel"
        icon=" Delete01Icon"
        buttonIcon=" Delete01Icon"
        selectedItems={
          deleteFaqIdx !== null && faqData?.faqs?.[deleteFaqIdx]
            ? [
                `Question ${deleteFaqIdx + 1}: ${faqData.faqs[deleteFaqIdx].q || "Untitled"}`,
                `Category: ${faqData.faqs[deleteFaqIdx].category || "General"}`,
              ]
            : []
        }
        isPersonnelModal={true}
        isAppleStyled={true}
        variant="danger"
        isDeleteModal={true}
      />
    </div>
  )
}
