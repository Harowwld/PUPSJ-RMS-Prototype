"use client"

import LucideIcon from "@/components/shared/LucideIcon";
import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import LandingFaqSkeleton from "@/components/systemadmin/skeletons/LandingFaqSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import ConfirmModal from "@/components/shared/ConfirmModal"
import { cn } from "@/lib/utils"

export const MAX_FAQ_ITEMS = 16
export const MIN_FAQ_ITEMS = 2

const DEFAULT_FAQ_CONTENT = {
  eyebrow: "Clear & Direct University Guidelines",
  heading: "Frequently Asked Questions",
  description:
    "Quick answers on requesting, tracking, and claiming your official school records.",
  supportCardEnabled: false,
  supportTitle: "",
  supportDescription: "",
  supportButtonText: "",
  supportButtonLink: "#",
  supportLocation: "",
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

export default function LandingFaqCmsView({ showToast }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("faqs") // 'faqs' | 'narrative' | 'preview'
  const [faqData, setFaqData] = useState(DEFAULT_FAQ_CONTENT)

  // Item Editor State
  const [expandedIdx, setExpandedIdx] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [deleteFaqIdx, setDeleteFaqIdx] = useState(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)

  // Live Preview State
  const [previewOpenIdx, setPreviewOpenIdx] = useState(0)
  const [previewFilter, setPreviewFilter] = useState("all")

  const notify = useCallback(
    (msg, isError = false) => {
      if (showToast) showToast(msg, isError)
    },
    [showToast]
  )

  // Fetch current FAQ configuration
  const fetchFaqData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/landing/faq", { cache: "no-store" })
      const json = await res.json()
      if (res.ok && json.ok && json.data) {
        setFaqData(json.data)
      } else {
        notify(json.error || "Failed to load FAQ configuration", true)
      }
    } catch (err) {
      console.error("[LandingFaqCmsView] Fetch error:", err)
      notify("Network error fetching FAQ settings", true)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    fetchFaqData()
  }, [fetchFaqData])

  // Save changes
  const handleSave = async () => {
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
      if (categoryFilter === "all") return true
      return (item.category || "General").toLowerCase() === categoryFilter.toLowerCase()
    })

  // Unique categories list for filters
  const uniqueCategories = Array.from(
    new Set(faqData.faqs.map((f) => f.category || "General"))
  )

  if (loading) {
    return <LandingFaqSkeleton />
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        {/* Page Header */}
        <PageHeader
          icon="ph-bold ph-question"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Landing Page CMS</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · FAQ Section
              </span>
            </div>
          }
          description="Manage frequently asked questions, detailed answers, category tags, and registrar support desk assistance."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("/#faq", "_blank")}
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
                    <LucideIcon  className="ph-bold ph-spinner animate-spin mr-1.5 text-[14px]" />
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
        <div className="flex items-center gap-6 shrink-0 h-10 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card select-none overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("faqs")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent shrink-0",
              activeTab === "faqs"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Questions &amp; Answers ({faqData.faqs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("narrative")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent shrink-0",
              activeTab === "narrative"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Section Header &amp; Subtitle
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent shrink-0",
              activeTab === "preview"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Interactive Live Preview
          </button>
        </div>

        {/* Content Body */}
        <CardContent className="font-jakarta bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-6">
          {/* TAB 1: Questions & Answers Management */}
          {activeTab === "faqs" && (
            <div className="space-y-5">
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                    <span>Questions &amp; Answers List</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-mono">
                      {faqData.faqs.length}/{MAX_FAQ_ITEMS}
                    </span>
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400">
                    Expand any question below to edit its text, category, or order.
                  </p>
                </div>

                {/* Add Question Button */}
                <Button
                  type="button"
                  disabled={faqData.faqs.length >= MAX_FAQ_ITEMS}
                  onClick={addNewFaq}
                  className="flex h-9 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs disabled:opacity-40"
                  title={faqData.faqs.length >= MAX_FAQ_ITEMS ? `Maximum limit of ${MAX_FAQ_ITEMS} questions reached` : "Add question"}
                >
                  Add
                </Button>
              </div>

              {/* Category Filter Bar */}
              <div className="flex items-center gap-1.5 flex-wrap select-none pt-1">
                <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 mr-1 uppercase tracking-wider">
                  Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border-0",
                    categoryFilter === "all"
                      ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-950"
                      : "bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  )}
                >
                  All ({faqData.faqs.length})
                </button>
                {uniqueCategories.map((cat) => {
                  const count = faqData.faqs.filter(
                    (f) => (f.category || "General").toLowerCase() === cat.toLowerCase()
                  ).length
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border-0",
                        categoryFilter.toLowerCase() === cat.toLowerCase()
                          ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-950"
                          : "bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                      )}
                    >
                      {cat} ({count})
                    </button>
                  )
                })}
              </div>

              {/* FAQ Items Accordion Cards */}
              <div className="space-y-3">
                {filteredFaqs.map(({ item, originalIdx }) => {
                  const isExpanded = expandedIdx === originalIdx
                  return (
                    <div
                      key={item.id || originalIdx}
                      className={cn(
                        "rounded-xl border transition-all overflow-hidden",
                        isExpanded
                          ? "border-pup-maroon/30 dark:border-red-500/30 bg-white dark:bg-zinc-900/60 shadow-xs"
                          : "border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/30 hover:border-gray-300 dark:hover:border-white/20"
                      )}
                    >
                      {/* Accordion Bar / Header */}
                      <div
                        onClick={() =>
                          setExpandedIdx((prev) => (prev === originalIdx ? null : originalIdx))
                        }
                        className="px-4 py-3 bg-gray-50/70 dark:bg-zinc-950/40 flex items-center justify-between cursor-pointer select-none gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-pup-maroon text-white text-[11px] font-bold font-mono flex items-center justify-center shrink-0">
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
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 bg-transparent p-0"
                          >
                            <LucideIcon  className="ph-bold ph-caret-up text-xs" />
                          </button>

                          <button
                            type="button"
                            disabled={originalIdx === faqData.faqs.length - 1}
                            onClick={() => moveFaq(originalIdx, 1)}
                            title="Move Later"
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 bg-transparent p-0"
                          >
                            <LucideIcon  className="ph-bold ph-caret-down text-xs" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicate(originalIdx)}
                            title="Duplicate Question"
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-0 bg-transparent p-0"
                          >
                            <LucideIcon  className="ph-bold ph-copy text-xs" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteFaqIdx(originalIdx)}
                            title="Delete Question"
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer border-0 bg-transparent p-0 ml-0.5"
                          >
                            <LucideIcon  className="ph-bold ph-trash text-xs" />
                          </button>

                          <div className="w-[1px] h-4 bg-gray-200 dark:bg-white/10 mx-1" />

                          <LucideIcon 
                            className={cn(
                              "ph-bold ph-caret-down text-xs text-gray-400 transition-transform duration-200",
                              isExpanded && "rotate-180 text-gray-700 dark:text-zinc-200"
                            )}
                          />
                        </div>
                      </div>

                      {/* Expandable Form Body */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-white/5 space-y-4 bg-white dark:bg-zinc-900/40">
                          {/* Question Input */}
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Question Text
                              </label>
                              <span className="text-[11px] text-gray-400 font-mono">
                                {item.q.length}/140
                              </span>
                            </div>
                            <Input
                              value={item.q}
                              onChange={(e) => updateFaqItem(originalIdx, "q", e.target.value)}
                              placeholder="e.g. How do I request my school records?"
                              maxLength={140}
                              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold dark:border-white/10 dark:bg-zinc-950 focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                            />
                          </div>

                          {/* Answer Textarea */}
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Answer Explanation
                              </label>
                              <span className="text-[11px] text-gray-400 font-mono">
                                {item.a.length}/400
                              </span>
                            </div>
                            <textarea
                              value={item.a}
                              onChange={(e) => updateFaqItem(originalIdx, "a", e.target.value)}
                              rows={3}
                              maxLength={400}
                              placeholder="Provide clear, direct guidance for this inquiry..."
                              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs font-normal leading-relaxed dark:border-white/10 dark:bg-zinc-950 focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 focus:outline-hidden"
                            />
                          </div>

                          {/* Category Tag Section */}
                          <div className="pt-1">
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Category Tag
                              </label>
                              <span className="text-[11px] text-gray-400 font-mono">
                                {(item.category || "").length}/30
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-[155px] shrink-0">
                                  <Select
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
                                    className="h-9 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 text-xs font-normal text-gray-800 dark:text-zinc-200 cursor-pointer shadow-none px-3"
                                    menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                                    optionClassName="rounded-lg text-xs font-normal py-2 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800"
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
                                  value={item.category || ""}
                                  onChange={(e) =>
                                    updateFaqItem(originalIdx, "category", e.target.value)
                                  }
                                  placeholder="Type or customize category tag (e.g. Requests, Clearance, Graduation)"
                                  maxLength={30}
                                  className="h-9 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-xs dark:border-white/10 dark:bg-zinc-950 focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                                />
                              </div>

                              {/* Quick Presets row */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono uppercase tracking-wider mr-1">
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
                                        "px-2.5 py-0.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer border",
                                        isSelected
                                          ? "bg-pup-maroon text-white border-pup-maroon font-bold shadow-xs"
                                          : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-transparent hover:border-gray-300 dark:hover:border-zinc-700"
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
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Bottom Add Question Big Dashed Button */}
              {faqData.faqs.length < MAX_FAQ_ITEMS ? (
                <button
                  type="button"
                  onClick={addNewFaq}
                  className="w-full py-3.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-pup-maroon/40 hover:bg-pup-maroon/5 dark:hover:bg-red-500/5 transition-all flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 cursor-pointer select-none"
                >
                  <LucideIcon  className="ph-bold ph-plus text-sm" />
                  <span>Add Another Question ({faqData.faqs.length}/{MAX_FAQ_ITEMS})</span>
                </button>
              ) : (
                <div className="w-full py-3 px-3.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-zinc-900/30 text-center text-xs text-gray-500 dark:text-zinc-400 flex items-center justify-center gap-2">
                  <LucideIcon  className="ph-bold ph-info text-pup-maroon dark:text-red-400" />
                  <span>Maximum limit reached ({MAX_FAQ_ITEMS} of {MAX_FAQ_ITEMS} questions). FAQ section is capped at {MAX_FAQ_ITEMS} questions for layout stability and concise reading.</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Section Header & Subtitle */}
          {activeTab === "narrative" && (
            <div className="w-full space-y-6">
              {/* Section Header Card */}
              <div className="w-full rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 sm:p-6 space-y-5">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Section Title &amp; Description
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                    Main heading and explanatory copy displayed above the FAQ accordion.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                          Eyebrow / Sub-badge Text
                        </label>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {(faqData.eyebrow || "").length}/50
                        </span>
                      </div>
                      <Input
                        value={faqData.eyebrow}
                        onChange={(e) =>
                          setFaqData((prev) => ({
                            ...prev,
                            eyebrow: e.target.value,
                          }))
                        }
                        placeholder="e.g. Clear & Direct University Guidelines"
                        maxLength={50}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                          Main Section Heading
                        </label>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {faqData.heading.length}/60
                        </span>
                      </div>
                      <Input
                        value={faqData.heading}
                        onChange={(e) =>
                          setFaqData((prev) => ({
                            ...prev,
                            heading: e.target.value,
                          }))
                        }
                        placeholder="Frequently Asked Questions"
                        maxLength={60}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Section Subtitle Description
                      </label>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {faqData.description.length}/200
                      </span>
                    </div>
                    <textarea
                      value={faqData.description}
                      onChange={(e) =>
                        setFaqData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      maxLength={200}
                      placeholder="Quick answers on requesting, tracking, and claiming your official school records."
                      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Interactive Live Preview */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Simulated Public FAQ Section
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400">
                    Live interactive preview showing exact layout, accordion animations, category filters, and liquid glass styling.
                  </p>
                </div>

                <span className="text-xs font-mono text-gray-400">
                  {faqData.faqs.length} Total Questions
                </span>
              </div>

              {/* Simulated Public Portal Section */}
              <div className="rounded-[2.5rem] bg-zinc-950 text-white border border-white/[0.08] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6)] overflow-hidden p-6 sm:p-12 relative select-none">
                {/* Ambient lighting */}
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#800000]/15 rounded-full blur-[140px] pointer-events-none" />
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-zinc-800/30 rounded-full blur-[140px] pointer-events-none" />

                {/* Section Header */}
                <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 relative z-10">
                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                    {faqData.heading || "Frequently Asked Questions"}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-3 leading-relaxed font-normal">
                    {faqData.description ||
                      "Quick answers on requesting, tracking, and claiming your official school records."}
                  </p>

                  {/* Preview Category Filter Pills */}
                  {uniqueCategories.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 flex-wrap mt-6">
                      <button
                        type="button"
                        onClick={() => setPreviewFilter("all")}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border",
                          previewFilter === "all"
                            ? "bg-white text-zinc-950 border-white shadow-sm"
                            : "bg-white/5 text-zinc-400 border-white/10 hover:border-white/25 hover:text-white"
                        )}
                      >
                        All
                      </button>
                      {uniqueCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPreviewFilter(cat)}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border",
                            previewFilter.toLowerCase() === cat.toLowerCase()
                              ? "bg-white text-zinc-950 border-white shadow-sm"
                              : "bg-white/5 text-zinc-400 border-white/10 hover:border-white/25 hover:text-white"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Accordion List */}
                <div className="max-w-3xl mx-auto space-y-3 relative z-10">
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
                            "rounded-2xl transition-all duration-200 overflow-hidden border",
                            isOpen
                              ? "bg-zinc-900/80 border-white/20 shadow-md shadow-black/40"
                              : "bg-zinc-900/30 border-white/[0.08] hover:border-white/15"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setPreviewOpenIdx(isOpen ? null : idx)}
                            className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer select-none transition-colors border-0 bg-transparent"
                          >
                            <div className="flex items-center gap-3.5 pr-3 min-w-0">
                              <span className="font-mono text-[11px] font-bold text-red-400 shrink-0">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug">
                                {faq.q}
                              </span>
                            </div>

                            <div
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300",
                                isOpen
                                  ? "bg-[#800000] text-white rotate-180"
                                  : "bg-white/10 text-zinc-400"
                              )}
                            >
                              <LucideIcon  className="ph-bold ph-caret-down text-xs" />
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
                                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/[0.08] font-normal">
                                  <p className="pt-3">{faq.a}</p>
                                  {faq.category && (
                                    <div className="mt-3 flex items-center gap-2">
                                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                                        Category:
                                      </span>
                                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-zinc-400 font-mono">
                                        {faq.category}
                                      </span>
                                    </div>
                                  )}
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
        confirmLabel="Reset"
        icon="ph-duotone ph-arrow-counter-clockwise"
        buttonIcon="ph-bold ph-arrow-counter-clockwise"
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
        confirmLabel="Remove"
        icon="ph-duotone ph-trash"
        buttonIcon="ph-bold ph-trash"
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
