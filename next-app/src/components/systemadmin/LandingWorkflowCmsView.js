"use client"

import LucideIcon from "@/components/shared/LucideIcon";
import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import LandingWorkflowSkeleton from "@/components/systemadmin/skeletons/LandingWorkflowSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import ConfirmModal from "@/components/shared/ConfirmModal"
import BevelButton from "@/components/ui/bevel-button"
import MorphButton from "@/components/ui/morph-button"
import { cn } from "@/lib/utils"

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
      summary: "Log in with your official Student Number",
      desc: "Log in to the eManage portal using your official Student Number (format: YYYY-XXXXX-SJ-0). Both currently enrolled students and alumni can access the request system directly.",
      tags: ["Student Portal", "Student Number Login", "Current & Alumni"],
      actionLabel: "Open Portal",
      actionType: "link",
      actionTarget: "/login",
      actionIcon: "ph-arrow-right",
    },
    {
      num: "02",
      title: "Select Your Document",
      summary: "Choose from official academic credentials",
      desc: "Browse the available documents and select what you need—such as a Transcript of Records (TOR), Certificate of Grades, Certificate of Registration, or Diploma.",
      tags: ["8 Document Types", "Official Records", "Clear Requirements"],
      actionLabel: "View Catalog",
      actionType: "scroll",
      actionTarget: "catalog",
      actionIcon: "ph-arrow-down",
    },
    {
      num: "03",
      title: "Submit Your Request",
      summary: "State your purpose and submit online",
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
      summary: "Staff pull your records from the system",
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
      summary: "Claim your official stamped document",
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

export default function LandingWorkflowCmsView({ showToast }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("steps") // 'steps' | 'narrative' | 'preview'
  const [workflowData, setWorkflowData] = useState(DEFAULT_WORKFLOW)

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

  const fetchWorkflowData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/landing/workflow", { cache: "no-store" })
      const json = await res.json()
      if (res.ok && json.ok && json.data) {
        setWorkflowData(json.data)
      } else {
        notify(json.error || "Failed to load workflow configuration", true)
      }
    } catch (err) {
      console.error("[LandingWorkflowCmsView] Fetch error:", err)
      notify("Network error fetching workflow settings", true)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    fetchWorkflowData()
  }, [fetchWorkflowData])

  const handleSave = async () => {
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
      const res = await fetch("/api/landing/workflow", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflowData),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setWorkflowData(json.data)
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
      summary: "Short summary of what happens in this step",
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
    <div className="flex flex-col gap-6 w-full animate-fade-up font-jakarta">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-git-merge"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Landing Page CMS</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · Workflow &amp; Steps
              </span>
            </div>
          }
          description="Manage public portal process workflow, student application steps, and left-column narrative."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("/#workflow", "_blank")}
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

        {/* Standard Underline Tabs */}
        <div className="flex items-center gap-6 shrink-0 h-10 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card select-none">
          <button
            type="button"
            onClick={() => setActiveTab("steps")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
              activeTab === "steps"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Workflow Steps ({currentSteps.length}/{MAX_STEPS})
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
            Section Header &amp; Editorial
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
        <CardContent className="font-jakarta bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-6">
          
          {/* TAB 1: WORKFLOW STEPS MANAGER */}
          {activeTab === "steps" && (
            <div className="space-y-6">
              {/* Header Bar with Curve Style & Add Step Buttons */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                    <span>Sequential Application Process</span>
                    <span className="text-xs font-mono font-medium text-pup-maroon dark:text-red-400 bg-pup-maroon/10 dark:bg-red-500/10 px-2 py-0.5 rounded-full">
                      {currentSteps.length} of {MAX_STEPS} Steps
                    </span>
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400">
                    Reorder, rename, or customize step requirements. Capped at {MAX_STEPS} steps to keep instructions clear and mobile layouts compact.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Arc Curve Selector (Non-tech friendly!) */}
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-zinc-300">
                    <span>Curve Arc:</span>
                    <div className="w-[195px]">
                      <Select
                        value={workflowData.curveStyle}
                        onChange={(e) =>
                          setWorkflowData((prev) => ({
                            ...prev,
                            curveStyle: e.target.value,
                          }))
                        }
                        className="h-9 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-normal text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 cursor-pointer shadow-none px-3"
                        menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                        optionClassName="rounded-lg text-xs font-normal py-2 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800"
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
                    className="flex h-9 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs disabled:opacity-40"
                    title={currentSteps.length >= MAX_STEPS ? `Maximum of ${MAX_STEPS} steps reached` : "Add blank step"}
                  >
                    Add
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
                        "rounded-xl border transition-all duration-200 bg-white dark:bg-card shadow-2xs",
                        isExpanded
                          ? "border-pup-maroon/40 dark:border-red-500/40 shadow-xs"
                          : "border-gray-200/80 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                      )}
                    >
                      {/* Step Header Accordion Bar */}
                      <div
                        onClick={() => setExpandedStepIndex(isExpanded ? null : idx)}
                        className="flex items-center justify-between p-4 cursor-pointer select-none bg-gray-50/40 dark:bg-zinc-900/20 rounded-xl"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Step Number Badge */}
                          <div className="w-9 h-9 rounded-xl bg-pup-maroon dark:bg-red-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                            {step.num || String(idx + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate">
                                {step.title || `Step ${idx + 1}`}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                              {step.summary || step.desc || "Click to configure step details"}
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
                            <LucideIcon  className="ph-bold ph-caret-up text-sm" />
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
                            <LucideIcon  className="ph-bold ph-caret-down text-sm" />
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
                            <LucideIcon  className="ph-bold ph-trash text-sm" />
                          </Button>

                          <div className="h-4 w-px bg-gray-200 dark:bg-white/10 mx-1" />

                          <LucideIcon 
                            className={cn(
                              "ph-bold text-gray-400 text-xs transition-transform duration-200",
                              isExpanded ? "ph-caret-up" : "ph-caret-down"
                            )}
                          />
                        </div>
                      </div>

                      {/* Step Details Body */}
                      {isExpanded && (
                        <div className="p-5 border-t border-gray-100 dark:border-white/10 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                            {/* Step Number & Title */}
                            <div className="sm:col-span-3">
                              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                                Step Badge Number
                              </label>
                              <Input
                                value={step.num}
                                onChange={(e) => updateStep(idx, "num", e.target.value)}
                                placeholder="01"
                                maxLength={6}
                                className="h-10 rounded-xl bg-white dark:bg-zinc-950 font-mono text-xs font-bold"
                              />
                            </div>

                            <div className="sm:col-span-9">
                              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                                Step Main Title
                              </label>
                              <Input
                                value={step.title}
                                onChange={(e) => updateStep(idx, "title", e.target.value)}
                                placeholder="e.g. Sign In to Portal"
                                maxLength={60}
                                className="h-10 rounded-xl bg-white dark:bg-zinc-950 text-xs font-semibold"
                              />
                            </div>
                          </div>

                          {/* Short Summary & Subtitle */}
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Short Subtitle / Summary Line
                              </label>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {step.summary?.length || 0}/90
                              </span>
                            </div>
                            <Input
                              value={step.summary}
                              onChange={(e) => updateStep(idx, "summary", e.target.value)}
                              placeholder="e.g. Log in with your official Student Number"
                              maxLength={90}
                              className="h-10 rounded-xl bg-white dark:bg-zinc-950 text-xs"
                            />
                          </div>

                          {/* Full Step Narrative Description */}
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                Detailed Step Instructions
                              </label>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {step.desc?.length || 0}/280
                              </span>
                            </div>
                            <textarea
                              value={step.desc}
                              onChange={(e) => updateStep(idx, "desc", e.target.value)}
                              rows={3}
                              maxLength={280}
                              placeholder="Explain what the student or personnel does at this phase..."
                              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed dark:border-white/10 dark:bg-zinc-950 focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 dark:focus:ring-pup-maroon/20 focus:outline-hidden"
                            />
                          </div>

                          {/* Tag Chips Manager */}
                          <div className="space-y-2 pt-1">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                              Requirement Tags &amp; Metadata Badges
                            </label>

                            {/* Active tags pills */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(step.tags || []).map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/80 dark:border-white/10"
                                >
                                  <span>{tag}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeTagFromStep(idx, tIdx)}
                                    className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer ml-0.5"
                                  >
                                    <LucideIcon  className="ph-bold ph-x text-[10px]" />
                                  </button>
                                </span>
                              ))}

                              {/* Inline tag input */}
                              <StepTagInput onAddTag={(val) => addTagToStep(idx, val)} />
                            </div>
                          </div>


                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Bottom Add Step Big Dashed Button */}
              {currentSteps.length < MAX_STEPS ? (
                <button
                  type="button"
                  onClick={addNewStep}
                  className="w-full py-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-pup-maroon/40 hover:bg-pup-maroon/5 dark:hover:bg-red-500/5 transition-all flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 cursor-pointer select-none"
                >
                  <LucideIcon  className="ph-bold ph-plus text-sm" />
                  <span>Add Another Workflow Step ({currentSteps.length}/{MAX_STEPS})</span>
                </button>
              ) : (
                <div className="w-full py-3.5 px-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-zinc-900/30 text-center text-xs text-gray-500 dark:text-zinc-400 flex items-center justify-center gap-2">
                  <LucideIcon  className="ph-bold ph-info text-pup-maroon dark:text-red-400" />
                  <span>Maximum limit reached ({MAX_STEPS} of {MAX_STEPS} steps). Process workflows are capped at {MAX_STEPS} steps for optimal student readability and mobile layout stability.</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SECTION HEADER & EDITORIAL */}
          {activeTab === "narrative" && (
            <div className="w-full space-y-6">
              {/* Left Column Text */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 sm:p-6 space-y-5">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Section Title &amp; Narrative Copy
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                    Displayed in the sticky editorial left column beside the curved timeline.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                          Main Heading Line 1
                        </label>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {workflowData.headingLine1.length}/40
                        </span>
                      </div>
                      <Input
                        value={workflowData.headingLine1}
                        onChange={(e) =>
                          setWorkflowData((prev) => ({
                            ...prev,
                            headingLine1: e.target.value,
                          }))
                        }
                        placeholder="e.g. How to Request"
                        maxLength={40}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal placeholder:text-gray-400 dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                          Main Heading Line 2
                        </label>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {workflowData.headingLine2.length}/40
                        </span>
                      </div>
                      <Input
                        value={workflowData.headingLine2}
                        onChange={(e) =>
                          setWorkflowData((prev) => ({
                            ...prev,
                            headingLine2: e.target.value,
                          }))
                        }
                        placeholder="e.g. Your Documents."
                        maxLength={40}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal placeholder:text-gray-400 dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Section Narrative &amp; Subtitle
                      </label>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {workflowData.description.length}/320
                      </span>
                    </div>
                    <textarea
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
                      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs font-normal leading-relaxed placeholder:text-gray-400 dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INTERACTIVE LIVE PREVIEW */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Simulated Workflow Section Preview
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400">
                    Live interactive canvas showing the left sticky column, curved arc progression, step tags, and glowing step rings.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500 dark:text-zinc-400">
                    Viewing {currentSteps.length} Steps · Arc: {workflowData.curveStyle}
                  </span>
                </div>
              </div>

              {/* Miniature Workflow Simulator */}
              <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-zinc-950 shadow-lg p-6 sm:p-10 select-none text-white">
                {/* Ambient glow blobs */}
                <div className="absolute top-0 left-1/4 w-72 h-72 bg-[#800000]/20 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                  {/* Left Column Preview (Centered relative to steps) */}
                  <div className="lg:col-span-5 space-y-4 flex flex-col justify-center my-auto">
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                      {workflowData.headingLine1 || "How to Request"}<br />
                      {workflowData.headingLine2 || "Your Documents."}
                    </h3>

                    <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                      {workflowData.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {workflowData.primaryButtonEnabled !== false && (
                        <BevelButton
                          type="button"
                          className="h-9 px-4 rounded-full font-semibold text-xs tracking-wide shadow-[0_10px_25px_rgba(128,0,0,0.3)] pointer-events-none"
                        >
                          {workflowData.primaryButtonText || "Request Document"}
                        </BevelButton>
                      )}

                      {workflowData.secondaryButtonEnabled !== false && (
                        <MorphButton
                          variant="secondary"
                          className="h-9 px-3.5 rounded-full text-xs font-medium liquid-glass-dark pointer-events-none text-white/90"
                        >
                          <span>{workflowData.secondaryButtonText || "Explore Services"}</span>
                          <span className="opacity-70 text-[10px] ml-1">↓</span>
                        </MorphButton>
                      )}
                    </div>
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
                            "relative pl-14 sm:pl-16 group transition-all duration-200 cursor-pointer",
                            curveClass
                          )}
                        >
                          {/* Circle & Stem */}
                          <div className="absolute left-0 top-0">
                            <div
                              className={cn(
                                "w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-300",
                                isSelected
                                  ? "bg-[#800000] text-white border-2 border-red-400/80 scale-105"
                                  : "liquid-glass-dark text-zinc-400 group-hover:text-white"
                              )}
                            >
                              {step.num || String(sIdx + 1).padStart(2, "0")}
                            </div>

                            {sIdx < currentSteps.length - 1 && (
                              <div className="absolute left-1/2 top-11 sm:top-12 w-[1px] h-8 sm:h-12 -translate-x-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent pointer-events-none" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="pt-0.5">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-mono uppercase tracking-widest text-red-400 font-bold">
                                Step {step.num || String(sIdx + 1).padStart(2, "0")}
                              </span>
                              {step.summary && (
                                <>
                                  
                                  <span className="text-[10px] font-mono text-zinc-400">
                                    {step.summary}
                                  </span>
                                </>
                              )}
                            </div>

                            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight mb-1.5 group-hover:text-red-100 transition-colors">
                              {step.title}
                            </h4>

                            <p className="text-[11px] text-zinc-400 leading-relaxed font-normal max-w-md mb-2">
                              {step.desc}
                            </p>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {(step.tags || []).map((t, ti) => (
                                <span
                                  key={ti}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-medium liquid-glass-dark-pill text-zinc-300"
                                >
                                  {t}
                                </span>
                              ))}

                              {step.actionLabel && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 ml-1">
                                  <span>{step.actionLabel}</span>
                                  <LucideIcon  className="ph-bold ph-arrow-right text-[9px]" />
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
        confirmLabel="Reset"
        icon="ph-duotone ph-arrow-counter-clockwise"
        buttonIcon="ph-bold ph-arrow-counter-clockwise"
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
        confirmLabel="Delete"
        icon="ph-duotone ph-trash"
        buttonIcon="ph-bold ph-trash"
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
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-gray-500 hover:text-pup-maroon dark:hover:text-red-400 border border-dashed border-gray-300 dark:border-white/20 hover:border-pup-maroon cursor-pointer transition-colors"
      >
        <LucideIcon  className="ph-bold ph-plus text-[10px]" />
        <span>Add Tag</span>
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
        className="h-7 px-2.5 rounded-full text-[11px] bg-white dark:bg-zinc-950 border border-pup-maroon focus:outline-hidden"
      />
    </div>
  )
}
