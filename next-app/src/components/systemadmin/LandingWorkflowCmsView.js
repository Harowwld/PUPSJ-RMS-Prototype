"use client"
import useViewPreference from "@/hooks/useViewPreference"
import { Textarea } from "@/components/ui/textarea";


import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAppReducedMotion, EASE_OUT } from "@/lib/motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import LandingWorkflowSkeleton from "@/components/systemadmin/skeletons/LandingWorkflowSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import LandingCmsViewTabs from "./LandingCmsViewTabs"
import ConfirmModal from "@/components/shared/ConfirmModal"
import useCmsDraft from "@/hooks/useCmsDraft"
import LandingCmsDraftStatus from "./LandingCmsDraftStatus"
import { cn } from "@/lib/utils"
import { ArrowDown01Icon, ArrowRight02Icon, ArrowUp01Icon, Cancel01Icon, CovidInfoIcon, Delete01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";


const DEFAULT_WORKFLOW = {
  eyebrow: "",
  headingLine1: "How to Request",
  headingLine2: "Your Documents.",
  description:
    "A straightforward guide for students and alumni. See how your document request is submitted online, authenticated from our digital records, and prepared for pick-up at the Registrar counter.",
  primaryButtonText: "Request Document",
  primaryButtonLink: "/login",
  primaryButtonEnabled: true,
  secondaryButtonText: "Explore Services (8)",
  secondaryButtonTarget: "catalog",
  secondaryButtonEnabled: true,
  autoCurve: true,
  curveStyle: "gentle",
  steps: [
    {
      num: "01",
      title: "Sign In to Portal",
      desc: "Log in to the eManage portal using your official Student Number (format: YYYY-XXXXX-SJ-0). Both currently enrolled students and alumni can access the request system directly.",
      tags: ["Student Portal", "Student Number Login", "Current & Alumni"],
      actionLabel: "Open Portal",
      actionType: "link",
      actionTarget: "/login",
      actionIcon: "ArrowRight02Icon",
    },
    {
      num: "02",
      title: "Select Your Document",
      desc: "Browse the available documents and select what you need, such as a Transcript of Records (TOR), Certificate of Grades, Certificate of Registration, or Diploma.",
      tags: ["8 Document Types", "Official Records", "Clear Requirements"],
      actionLabel: "View Catalog",
      actionType: "scroll",
      actionTarget: "catalog",
      actionIcon: "ArrowDown01Icon",
    },
    {
      num: "03",
      title: "Submit Your Request",
      desc: "Indicate why you need the document (for employment, scholarship, transfer, or board exams) and submit your request form right from your phone or computer.",
      tags: ["Online Submission", "Purpose of Request", "No Paper Forms"],
      actionLabel: "",
      actionType: "none",
      actionTarget: "",
      actionIcon: "",
    },
    {
      num: "04",
      title: "Digital Record Retrieval",
      desc: "Registrar personnel retrieve your digitized student files directly from the system. Your grades, earned units, and credentials are authenticated without having to search physical folders.",
      tags: ["Digitized Database", "Fast System Pull", "Staff Authentication"],
      actionLabel: "",
      actionType: "none",
      actionTarget: "",
      actionIcon: "",
    },
    {
      num: "05",
      title: "Pick Up at Registrar Counter",
      desc: "Once your document is printed and stamped with the university's official dry seal, you'll be notified that it's ready for pick-up at the Ground Floor Registrar counter.",
      tags: ["Official Dry Seal", "Registrar Counter", "Campus Pick-Up"],
      actionLabel: "",
      actionType: "none",
      actionTarget: "",
      actionIcon: "",
    },
  ],
}


function getStepCurveClass(idx, total, curveStyle = "gentle", autoCurve = true) {
  if (!autoCurve || curveStyle === "none" || total <= 1) {
    return "lg:ml-0 sm:ml-0"
  }
  const progress = idx / (total - 1)
  const factor = Math.sin(progress * Math.PI)

  if (curveStyle === "pronounced") {
    if (factor > 0.85) return "lg:ml-28 sm:ml-14"
    if (factor > 0.55) return "lg:ml-20 sm:ml-10"
    if (factor > 0.25) return "lg:ml-10 sm:ml-5"
    return "lg:ml-0 sm:ml-0"
  }

  if (factor > 0.85) return "lg:ml-20 sm:ml-10"
  if (factor > 0.55) return "lg:ml-14 sm:ml-7"
  if (factor > 0.25) return "lg:ml-6 sm:ml-3"
  return "lg:ml-0 sm:ml-0"
}

export const MAX_STEPS = 7
export const MIN_STEPS = 2

export default function LandingWorkflowCmsView({ showToast, onDirtyChange }) {
  const shouldReduceMotion = useAppReducedMotion()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useViewPreference("cms-workflow", "activeTab", "content") // 'content' | 'preview'
  const [workflowData, setWorkflowData] = useState(DEFAULT_WORKFLOW)
  const { isDirty, savedData, markSaved } = useCmsDraft(workflowData, onDirtyChange)

  // Step deletion & reset modal states
  const [deleteStepIndex, setDeleteStepIndex] = useState(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [expandedStepIndex, setExpandedStepIndex] = useState(0)

  // Preview interactive state
  const [previewActiveStep, setPreviewActiveStep] = useState(0)


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
        const res = await fetch("/api/landing/workflow", { cache: "no-store" })
        const json = await res.json()
        if (ignore) return
        if (res.ok && json.ok && json.data) {
          setWorkflowData(json.data)
          markSaved(json.data)
        } else {
          notify(json.error || "Failed to load workflow configuration", true)
        }
      } catch (err) {
        if (ignore) return
        console.error("[LandingWorkflowCmsView] Fetch error:", err)
        notify("Network error fetching workflow settings", true)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [notify, markSaved])

  const handleSave = async () => {
    if (!isDirty || saving) return
    if (!workflowData.headingLine1.trim() || !workflowData.headingLine2.trim()) {
      notify("Section heading lines cannot be blank", true)
      return
    }
    if (!workflowData.steps || workflowData.steps.length === 0) {
      notify("At least one process step is required", true)
      return
    }

    try {
      setSaving(true)
      const payload = {
        ...workflowData,
        steps: (workflowData.steps || []).map((step, idx) => ({
          ...step,
          num: String(idx + 1).padStart(2, "0"),
        })),
      }
      const res = await fetch("/api/landing/workflow", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setWorkflowData(json.data)
        markSaved(json.data)
        notify("Workflow & How-to-Request configuration saved successfully")
      } else {
        notify(json.error || "Failed to save workflow settings", true)
      }
    } catch (err) {
      console.error("[LandingWorkflowCmsView] Save error:", err)
      notify("Network error saving workflow configuration", true)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/landing/workflow", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setWorkflowData(json.data)
        markSaved(json.data)
        notify("Workflow steps reverted to institutional defaults")
      } else {
        notify(json.error || "Failed to reset workflow settings", true)
      }
    } catch (err) {
      console.error("[LandingWorkflowCmsView] Reset error:", err)
      notify("Network error resetting configuration", true)
    } finally {
      setSaving(false)
      setResetModalOpen(false)
    }
  }

  // Step operations: Move, Delete, Add, Update
  const moveStep = (idx, direction) => {
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= workflowData.steps.length) return

    setWorkflowData((prev) => {
      const nextSteps = [...prev.steps]
      const temp = nextSteps[idx]
      nextSteps[idx] = nextSteps[targetIdx]
      nextSteps[targetIdx] = temp
      // re-number nicely
      const renumbered = nextSteps.map((s, i) => ({
        ...s,
        num: String(i + 1).padStart(2, "0"),
      }))
      return { ...prev, steps: renumbered }
    })
    setExpandedStepIndex(targetIdx)
  }

  const deleteStep = (idx) => {
    if (workflowData.steps.length <= MIN_STEPS) {
      notify(`A minimum of ${MIN_STEPS} steps is required to maintain a complete workflow`, true)
      return
    }

    setWorkflowData((prev) => {
      const remaining = prev.steps.filter((_, i) => i !== idx)
      const renumbered = remaining.map((s, i) => ({
        ...s,
        num: String(i + 1).padStart(2, "0"),
      }))
      return { ...prev, steps: renumbered }
    })
    setDeleteStepIndex(null)
    setExpandedStepIndex(Math.max(0, idx - 1))
    notify("Step removed successfully")
  }

  const addNewStep = () => {
    if (workflowData.steps.length >= MAX_STEPS) {
      notify(`Maximum of ${MAX_STEPS} steps allowed to maintain clear student readability`, true)
      return
    }

    const nextIdx = workflowData.steps.length + 1
    const newStep = {
      num: String(nextIdx).padStart(2, "0"),
      title: `New Workflow Step ${nextIdx}`,
      desc: "Provide clear, detailed instructions for students and alumni regarding what to do, what records are required, or where to proceed next.",
      tags: ["Official Records", "Student Portal"],
      actionLabel: "",
      actionType: "none",
      actionTarget: "",
      actionIcon: "",
    }
    setWorkflowData((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }))
    setExpandedStepIndex(workflowData.steps.length)
    notify(`Added Step ${String(nextIdx).padStart(2, "0")}`)
  }


  const updateStep = (idx, field, value) => {
    setWorkflowData((prev) => {
      const nextSteps = [...prev.steps]
      nextSteps[idx] = { ...nextSteps[idx], [field]: value }
      return { ...prev, steps: nextSteps }
    })
  }

  const addTagToStep = (idx, tagText) => {
    const trimmed = String(tagText || "").trim()
    if (!trimmed) return
    const currentTags = workflowData.steps[idx]?.tags || []
    if (currentTags.includes(trimmed)) return
    if (currentTags.length >= 6) {
      notify("Maximum 6 tags per step recommended", true)
      return
    }
    updateStep(idx, "tags", [...currentTags, trimmed])
  }

  const removeTagFromStep = (idx, tagIdx) => {
    const currentTags = workflowData.steps[idx]?.tags || []
    updateStep(
      idx,
      "tags",
      currentTags.filter((_, i) => i !== tagIdx)
    )
  }

  if (loading) {
    return <LandingWorkflowSkeleton />
  }

  const currentSteps = workflowData.steps || []

  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex min-w-0 flex-[1_0_auto] h-auto w-full flex-col gap-0 overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none isolate font-jakarta">
        <PageHeader
          icon="GitMergeIcon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Landing Page CMS</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">{workflowData.steps.length} steps · Workflow &amp; Steps</span>
              <LandingCmsDraftStatus isDirty={isDirty} />
            </div>
          }
          description="Manage public portal process workflow, student application steps, and left-column narrative."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex shrink-0 items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("/#workflow", "_blank")}
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
                {saving ? "Saving Changes..." : "Save Workflow Content"}
              </Button>
            </div>
          }
          secondaryActions={
            <>
              <Button type="button" variant="outline" onClick={() => setResetModalOpen(true)} disabled={saving} className="h-9 px-4">Restore Defaults</Button>
              {isDirty && <Button type="button" variant="outline" onClick={() => { setWorkflowData(savedData); notify("Draft changes discarded. Reverted to saved workflow content.") }} disabled={saving} className="h-9 px-4">Discard Draft</Button>}
            </>
          }
        />

        {/* Standard Navigation Segmented Tabs */}
        <LandingCmsViewTabs activeTab={activeTab} onChange={setActiveTab} contentLabel="Workflow Content" contentCount={workflowData.steps.length} />

        <CardContent className="font-jakarta p-6 flex flex-[1_0_auto] flex-col gap-6 rounded-b-2xl">

          {/* TAB 1: WORKFLOW CONTENT (Editorial + Sequential Steps) */}
          {activeTab === "content" && (
            <div className="space-y-6">
              {/* Section Title & Narrative Copy */}
              <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-5">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Section Title &amp; Narrative Copy
                  </h3>
                  <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300 mt-0.5">
                    Displayed in the sticky editorial left column beside the curved timeline.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label htmlFor="workflow-heading-one" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          Main Heading Line 1
                        </label>
                        <span className="text-[11px] text-gray-400 font-sans tabular-nums">
                          {workflowData.headingLine1.length}/40
                        </span>
                      </div>
                      <Input
                        id="workflow-heading-one"
                        value={workflowData.headingLine1}
                        onChange={(e) =>
                          setWorkflowData((prev) => ({
                            ...prev,
                            headingLine1: e.target.value,
                          }))
                        }
                        placeholder="e.g. How to Request"
                        maxLength={40}
                        className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-normal placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label htmlFor="workflow-heading-two" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          Main Heading Line 2
                        </label>
                        <span className="text-[11px] text-gray-400 font-sans tabular-nums">
                          {workflowData.headingLine2.length}/40
                        </span>
                      </div>
                      <Input
                        id="workflow-heading-two"
                        value={workflowData.headingLine2}
                        onChange={(e) =>
                          setWorkflowData((prev) => ({
                            ...prev,
                            headingLine2: e.target.value,
                          }))
                        }
                        placeholder="e.g. Your Documents."
                        maxLength={40}
                        className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-normal placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor="workflow-description" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                        Section Narrative &amp; Subtitle
                      </label>
                      <span className="text-[11px] text-gray-400 font-sans tabular-nums">
                        {workflowData.description.length}/320
                      </span>
                    </div>
                    <Textarea
                      id="workflow-description"
                      value={workflowData.description}
                      onChange={(e) =>
                        setWorkflowData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      maxLength={320}
                      placeholder="A straightforward guide for students and alumni..."
                      className="w-full resize-y rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs font-normal placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Header Bar with Curve Style & Add Step Buttons */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                    <span>Sequential Application Process</span>
                    <span className="text-xs font-sans tabular-nums font-medium text-pup-maroon dark:text-red-400 bg-pup-maroon/10 dark:bg-red-500/10 px-2 py-0.5 rounded-full">
                      {currentSteps.length} of {MAX_STEPS} Steps
                    </span>
                  </h3>
                  <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300">
                    Reorder, rename, or customize step requirements. Numbers are assigned automatically in sequential order.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Arc Curve Selector (Non-tech friendly!) */}
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-zinc-300">
                    <span>Curve Arc:</span>
                    <div className="w-[195px]">
                      <Select
                        value={workflowData.curveStyle}
                        aria-label="Curve arc"
                        onChange={(e) =>
                          setWorkflowData((prev) => ({
                            ...prev,
                            curveStyle: e.target.value,
                          }))
                        }
                        className="h-9 rounded-xl border border-gray-200 bg-white text-xs font-normal text-gray-700 shadow-none dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        <option value="gentle">Gentle Arc (Default)</option>
                        <option value="pronounced">Pronounced Arc</option>
                        <option value="none">Straight Vertical (Minimalist)</option>
                      </Select>
                    </div>
                  </div>

                  {/* Add Blank Step */}
                  <Button
                    type="button"
                    disabled={currentSteps.length >= MAX_STEPS}
                    onClick={addNewStep}
                    className="h-9 px-4 cursor-pointer disabled:opacity-40"
                    title={currentSteps.length >= MAX_STEPS ? `Maximum of ${MAX_STEPS} steps reached` : "Add blank step"}
                  >
                    Add Step
                  </Button>
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-4">
                {currentSteps.map((step, idx) => {
                  const isExpanded = expandedStepIndex === idx
                  const isFirst = idx === 0
                  const isLast = idx === currentSteps.length - 1

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-2xl border transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 bg-white dark:bg-card overflow-hidden shadow-2xs",
                        isExpanded
                          ? "border-gray-950 dark:border-white shadow-xs ring-1 ring-black/10 dark:ring-white/20"
                          : "border-border dark:border-border hover:border-border dark:hover:border-white/20"
                      )}
                    >
                      {/* Step Header Accordion Bar */}
                      <div
                        onClick={() => setExpandedStepIndex(isExpanded ? null : idx)}
                        className={cn(
                          "flex items-center justify-between p-4 cursor-pointer select-none transition-colors",
                          isExpanded
                            ? "bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50"
                            : "bg-gray-50/40 dark:bg-zinc-900/20 hover:bg-gray-50/80 dark:hover:bg-zinc-800/50"
                        )}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Step Number Badge */}
                          <div
                            className={cn(
                              "w-9 h-9 rounded-full font-sans tabular-nums text-xs font-bold flex items-center justify-center shrink-0 transition-colors",
                              isExpanded
                                ? "bg-gray-950 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                                : "bg-gray-200/80 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300"
                            )}
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate">
                                {step.title || `Step ${idx + 1}`}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-900 dark:text-zinc-300 truncate mt-0.5">
                              {step.desc || "Click to configure step details"}
                            </p>
                          </div>
                        </div>

                        {/* Order & Action Buttons */}
                        <div
                          className="flex items-center gap-1 shrink-0 ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isFirst}
                            onClick={() => moveStep(idx, -1)}
                            className="h-8 w-8 p-0 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Move Step Up"
                          >
                            <ArrowUp01Icon size="1em"  className="text-sm" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isLast}
                            onClick={() => moveStep(idx, 1)}
                            className="h-8 w-8 p-0 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Move Step Down"
                          >
                            <ArrowDown01Icon size="1em"  className="text-sm" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={currentSteps.length <= MIN_STEPS}
                            onClick={() => setDeleteStepIndex(idx)}
                            className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 cursor-pointer"
                            title={currentSteps.length <= MIN_STEPS ? `Minimum of ${MIN_STEPS} steps required` : "Delete Step"}
                          >
                            <Delete01Icon size="1em"  className="text-sm" />
                          </Button>

                          <div className="h-4 w-px bg-gray-200 dark:bg-white/10 mx-1" />

                          <AppIcon
                            className={cn(
                              "text-gray-400 text-xs transition-transform duration-200",
                              isExpanded ? "ArrowUp01Icon" : "ArrowDown01Icon"
                            )}
                          />
                        </div>
                      </div>

                      {/* Step Details Body */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT }}
                            className="overflow-hidden"
                          >
                            <div className="p-5 border-t border-border dark:border-border space-y-4">
                          {/* Step Main Title */}
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label htmlFor={`workflow-step-title-${idx}`} className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                Step Main Title
                              </label>
                              <span className="text-[10px] text-gray-400 font-sans tabular-nums">
                                {step.title?.length || 0}/60
                              </span>
                            </div>
                            <Input
                              id={`workflow-step-title-${idx}`}
                              value={step.title}
                              onChange={(e) => updateStep(idx, "title", e.target.value)}
                              placeholder="e.g. Sign In to Portal"
                              maxLength={60}
                              className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-normal placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                            />
                          </div>

                          {/* Full Step Narrative Description */}
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label htmlFor={`workflow-step-description-${idx}`} className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                Detailed Step Instructions
                              </label>
                              <span className="text-[10px] text-gray-400 font-sans tabular-nums">
                                {step.desc?.length || 0}/280
                              </span>
                            </div>
                            <Textarea
                              id={`workflow-step-description-${idx}`}
                              value={step.desc}
                              onChange={(e) => updateStep(idx, "desc", e.target.value)}
                              rows={3}
                              maxLength={280}
                              placeholder="Explain what the student or personnel does at this phase..."
                              className="w-full resize-y rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs font-normal placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                            />
                          </div>

                          {/* Tag Chips Manager */}
                          <div className="space-y-2 pt-1">
                            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                              Requirement Tags &amp; Metadata Badges <span className="text-gray-400 dark:text-zinc-500 font-normal">(Optional)</span>
                            </label>

                            {/* Active tags pills */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(step.tags || []).map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sans tabular-nums font-medium bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-border dark:border-border"
                                >
                                  <span>{tag}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeTagFromStep(idx, tIdx)}
                                    className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer ml-0.5"
                                  >
                                    <Cancel01Icon size="1em"  className="text-[10px]" />
                                  </button>
                                </span>
                              ))}

                              {/* Inline tag input */}
                              <StepTagInput onAddTag={(val) => addTagToStep(idx, val)} />
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

              {/* Bottom Add Step Big Dashed Button */}
              {currentSteps.length < MAX_STEPS ? (
                <button
                  type="button"
                  onClick={addNewStep}
                  title={`Add Another Workflow Step (${currentSteps.length}/${MAX_STEPS})`}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-border dark:border-border hover:border-gray-900/40 dark:hover:border-white/30 hover:bg-gray-100/60 dark:hover:bg-zinc-800/50 transition-[color,background-color,border-color,box-shadow,opacity,transform] flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-950 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer select-none shadow-2xs"
                >
                  Add Step
                </button>
              ) : (
                <div className="w-full py-3.5 px-4 rounded-2xl border border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/30 text-center text-xs text-gray-900 dark:text-zinc-300 flex items-center justify-center gap-2 shadow-2xs">
                  <CovidInfoIcon size={16}  className="text-pup-maroon dark:text-red-400" />
                  <span>Maximum limit reached ({MAX_STEPS} of {MAX_STEPS} steps). Process workflows are capped at {MAX_STEPS} steps for optimal student readability and mobile layout stability.</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTERACTIVE LIVE PREVIEW */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Simulated Workflow Section Preview
                  </h3>
                  <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300">
                    Live interactive canvas showing the left sticky column, curved arc progression, step tags, and glowing step rings.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-sans tabular-nums text-gray-900 dark:text-zinc-300">
                    Viewing {currentSteps.length} Steps · Arc: {workflowData.curveStyle}
                  </span>
                </div>
              </div>

              {/* Miniature Workflow Simulator Matching ProcessWorkflow.js */}
              <div className="relative w-full rounded-2xl overflow-hidden border border-border dark:border-border bg-zinc-950 shadow-lg p-6 sm:p-12 select-none text-white">
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                  {/* Left Column Preview (Centered relative to steps) */}
                  <div className="lg:col-span-5 space-y-5 flex flex-col justify-center my-auto">
                    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-[1.1] max-w-[320px]">
                      {workflowData.headingLine1 || "How to Request"}<br />
                      {workflowData.headingLine2 || "Your Documents."}
                    </h3>

                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal max-w-md">
                      {workflowData.description}
                    </p>
                  </div>

                  {/* Right Column Steps Preview */}
                  <div className="lg:col-span-7 space-y-8 relative">
                    {currentSteps.map((step, sIdx) => {
                      const isSelected = previewActiveStep === sIdx
                      const curveClass = getStepCurveClass(
                        sIdx,
                        currentSteps.length,
                        workflowData.curveStyle || "gentle",
                        workflowData.autoCurve !== false
                      )

                      return (
                        <div
                          key={sIdx}
                          onClick={() => setPreviewActiveStep(sIdx)}
                          className={cn(
                            "relative pl-14 sm:pl-16 group transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 cursor-pointer",
                            curveClass
                          )}
                        >
                          {/* Circle & Stem */}
                          <div className="absolute left-0 top-0">
                            <div
                              className={cn(
                                "w-11 h-11 rounded-full flex items-center justify-center font-sans tabular-nums text-sm transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300",
                                isSelected
                                  ? "bg-[#800000] text-white shadow-md"
                                  : "bg-white/5 border border-white/10 text-zinc-400 group-hover:text-white"
                              )}
                            >
                              {step.num || String(sIdx + 1).padStart(2, "0")}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="pt-0.5">
                            <h4 className="text-base sm:text-lg font-medium text-white tracking-tight mb-1.5 group-hover:text-red-200 transition-colors">
                              {step.title}
                            </h4>

                            {step.desc && (
                              <p className="text-xs text-zinc-400 leading-relaxed font-normal max-w-xl mb-3">
                                {step.desc}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                              {(step.tags || []).map((t, ti) => (
                                <span
                                  key={ti}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-medium bg-transparent border border-white/10 text-zinc-400"
                                >
                                  {t}
                                </span>
                              ))}

                              {step.actionLabel && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-500 ml-2">
                                  <span>{step.actionLabel}</span>
                                  <ArrowRight02Icon size="1em" className="text-[10px]" />
                                </span>
                              )}
                            </div>
                          </div>
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

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        onConfirm={handleReset}
        isLoading={saving}
        title="Reset Workflow to Institutional Defaults"
        message="Are you sure you want to revert all workflow headlines, application steps, and requirement tags back to the official PUP San Juan institutional template?"
        confirmLabel="Restore Defaults"
        cancelLabel="Cancel"
        icon="ReloadIcon"
        buttonIcon="ReloadIcon"
        selectedItems={[
          "Reset custom workflow headline, subtitle, and layout curvature",
          "Restore official 5-step PUP San Juan document application sequence",
          "Revert all step descriptions, guidelines, and requirement tags",
        ]}
        isPersonnelModal={true}
        isAppleStyled={true}
        isArchiveModal={true}
      />

      {/* Delete Step Confirmation Modal */}
      <ConfirmModal
        open={deleteStepIndex !== null}
        onCancel={() => setDeleteStepIndex(null)}
        onConfirm={() => {
          if (deleteStepIndex !== null) {
            deleteStep(deleteStepIndex)
          }
        }}
        title={
          deleteStepIndex !== null && currentSteps[deleteStepIndex]
            ? `Delete Step ${currentSteps[deleteStepIndex]?.num || deleteStepIndex + 1}: ${currentSteps[deleteStepIndex]?.title || "Application Step"}`
            : "Delete Application Step"
        }
        message="Are you sure you want to permanently remove this application step from the student portal workflow?"
        confirmLabel="Delete Step"
        cancelLabel="Cancel"
        icon="Delete01Icon"
        buttonIcon="Delete01Icon"
        selectedItems={
          deleteStepIndex !== null && currentSteps[deleteStepIndex]
            ? [
                `Step ${currentSteps[deleteStepIndex].num || deleteStepIndex + 1}: ${currentSteps[deleteStepIndex].title || "Untitled Step"}`,
                currentSteps[deleteStepIndex].desc
                  ? `Description: ${currentSteps[deleteStepIndex].desc.length > 70 ? currentSteps[deleteStepIndex].desc.slice(0, 70) + "..." : currentSteps[deleteStepIndex].desc}`
                  : "Description: (No instructions provided)",
                currentSteps[deleteStepIndex].tags?.length
                  ? `Requirements: ${currentSteps[deleteStepIndex].tags.join(", ")}`
                  : "Requirements: None specified",
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

// Sub-component for adding tags via Enter key or button
function StepTagInput({ onAddTag }) {
  const [val, setVal] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef(null)

  const handleCommit = () => {
    if (val.trim()) {
      onAddTag(val.trim())
      setVal("")
    }
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        title="Add Tag"
        className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-medium text-gray-500 hover:text-pup-maroon dark:hover:text-red-400 border border-dashed border-border dark:border-border hover:border-pup-maroon cursor-pointer transition-colors"
      >
        Add Tag
      </button>
    )
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            handleCommit()
          } else if (e.key === "Escape") {
            setIsOpen(false)
            setVal("")
          }
        }}
        onBlur={handleCommit}
        placeholder="Type tag & Enter"
        className="h-7 px-2.5 rounded-full text-[11px] bg-white dark:bg-zinc-950 border border-border dark:border-border focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
      />
    </div>
  )
}
