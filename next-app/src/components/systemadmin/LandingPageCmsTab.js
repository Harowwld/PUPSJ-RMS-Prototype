"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/shared/PageHeader"
import ConfirmModal from "@/components/shared/ConfirmModal"
import BevelButton from "@/components/ui/bevel-button"
import LandingBentoCmsView from "./LandingBentoCmsView"
import LandingWorkflowCmsView from "./LandingWorkflowCmsView"
import LandingCatalogCmsView from "./LandingCatalogCmsView"
import LandingFaqCmsView from "./LandingFaqCmsView"
import LandingFooterCmsView from "./LandingFooterCmsView"
import LandingHeroSkeleton from "@/components/systemadmin/skeletons/LandingHeroSkeleton"
import { cn } from "@/lib/utils"

export default function LandingPageCmsTab({ showToast }) {
  const [currentSection, setCurrentSection] = useState("hero") // 'hero' | 'bento' | 'workflow' | 'catalog' | 'faq' | 'footer'
  const [loading, setLoading] = useState(true)

  // Synchronize section from URL or switch-view events (Command Palette & deep linking)
  useEffect(() => {
    const urlSection = new URLSearchParams(window.location.search).get("section")
    if (urlSection && ["hero", "bento", "workflow", "catalog", "faq", "footer"].includes(urlSection)) {
      setCurrentSection(urlSection)
    }

    const handleSwitch = (e) => {
      const targetSec = e.detail?.section
      if (targetSec && ["hero", "bento", "workflow", "catalog", "faq", "footer"].includes(targetSec)) {
        setCurrentSection(targetSec)
      }
    }
    window.addEventListener("switch-view", handleSwitch)
    return () => window.removeEventListener("switch-view", handleSwitch)
  }, [])

  const handleSelectSection = (sec) => {
    setCurrentSection(sec)
    const params = new URLSearchParams(window.location.search)
    params.set("section", sec)
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`)
  }
  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const [isAddingPhoto, setIsAddingPhoto] = useState(false)
  const [activeTab, setActiveTab] = useState("slides") // 'slides' | 'content' | 'preview'
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0)

  // Form State
  const [heroData, setHeroData] = useState({
    headlineLine1: "",
    headlineLine2: "",
    description: "",
    campusAddress: "",
    registrarHours: "",
    operatingDays: "",
    autoRotateInterval: 5500,
    slides: [],
  })

  // Modal States
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [deleteSlideIndex, setDeleteSlideIndex] = useState(null)

  // Drag-and-drop slide reordering state
  const [draggedSlideIdx, setDraggedSlideIdx] = useState(null)
  const [dragOverSlideIdx, setDragOverSlideIdx] = useState(null)

  // File input refs
  const newPhotoInputRef = useRef(null)

  const notify = useCallback(
    (msg, isError = false) => {
      if (showToast) {
        showToast(msg, isError)
      }
    },
    [showToast]
  )

  // Fetch current hero settings
  const fetchHeroData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/landing/hero", { cache: "no-store" })
      const json = await res.json()
      if (res.ok && json.ok && json.data) {
        setHeroData(json.data)
      } else {
        notify(json.error || "Failed to load hero configuration", true)
      }
    } catch (err) {
      console.error("[LandingPageCmsTab] Fetch error:", err)
      notify("Network error fetching hero settings", true)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    fetchHeroData()
  }, [fetchHeroData])

  // Handle Save
  const handleSave = async () => {
    if (!heroData.headlineLine1.trim() || !heroData.headlineLine2.trim()) {
      notify("Headline lines cannot be blank", true)
      return
    }
    if (heroData.slides.length === 0) {
      notify("At least one background photo is required", true)
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/landing/hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(heroData),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setHeroData(json.data)
        notify("Landing page configuration saved successfully")
      } else {
        notify(json.error || "Failed to update landing hero", true)
      }
    } catch (err) {
      console.error("[LandingPageCmsTab] Save error:", err)
      notify("Network error saving configuration", true)
    } finally {
      setSaving(false)
    }
  }

  // Handle Reset to Default
  const handleReset = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/landing/hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setHeroData(json.data)
        notify("Landing page hero reverted to institutional defaults")
      } else {
        notify(json.error || "Failed to reset landing hero", true)
      }
    } catch (err) {
      console.error("[LandingPageCmsTab] Reset error:", err)
      notify("Network error resetting configuration", true)
    } finally {
      setSaving(false)
      setResetModalOpen(false)
    }
  }

  // Handle Image Upload for an existing slide
  const handleFileUpload = async (file, slideIdx) => {
    if (!file) return

    if (!file.type.startsWith("image/")) {
      notify("Please select an image file (JPEG, PNG, WebP, AVIF)", true)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      notify("Image file size must be less than 10MB", true)
      return
    }

    try {
      setUploadingIndex(slideIdx)
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/landing/upload", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()

      if (res.ok && json.ok && json.data?.url) {
        updateSlide(slideIdx, "src", json.data.url)
        notify(`Updated photo with "${file.name}"`)
      } else {
        notify(json.error || "Failed to upload image", true)
      }
    } catch (err) {
      console.error("[LandingPageCmsTab] Upload error:", err)
      notify("Network error uploading image", true)
    } finally {
      setUploadingIndex(null)
    }
  }

  // Handle Uploading a brand new slide
  const handleUploadNewSlide = async (file) => {
    if (!file) return

    if (!file.type.startsWith("image/")) {
      notify("Please select an image file (JPEG, PNG, WebP, AVIF)", true)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      notify("Image file size must be less than 10MB", true)
      return
    }

    try {
      setIsAddingPhoto(true)
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/landing/upload", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()

      if (res.ok && json.ok && json.data?.url) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "")
        setHeroData((prev) => ({
          ...prev,
          slides: [
            ...prev.slides,
            {
              src: json.data.url,
              alt: cleanName || `PUP San Juan Campus Photo ${prev.slides.length + 1}`,
              label: cleanName || `Campus Photo ${prev.slides.length + 1}`,
            },
          ],
        }))
        notify(`Added new photo "${file.name}"`)
      } else {
        notify(json.error || "Failed to upload image", true)
      }
    } catch (err) {
      console.error("[LandingPageCmsTab] Upload error:", err)
      notify("Network error uploading image", true)
    } finally {
      setIsAddingPhoto(false)
    }
  }

  const updateSlide = (idx, field, value) => {
    setHeroData((prev) => {
      const nextSlides = [...prev.slides]
      nextSlides[idx] = { ...nextSlides[idx], [field]: value }
      return { ...prev, slides: nextSlides }
    })
  }

  const removeSlide = (idx) => {
    if (heroData.slides.length <= 1) {
      notify("You must maintain at least one background photo", true)
      return
    }
    setHeroData((prev) => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== idx),
    }))
    if (previewSlideIdx >= heroData.slides.length - 1) {
      setPreviewSlideIdx(0)
    }
    setDeleteSlideIndex(null)
    notify("Photo removed")
  }

  const moveSlide = (idx, direction) => {
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= heroData.slides.length) return

    setHeroData((prev) => {
      const nextSlides = [...prev.slides]
      const temp = nextSlides[idx]
      nextSlides[idx] = nextSlides[targetIdx]
      nextSlides[targetIdx] = temp
      return { ...prev, slides: nextSlides }
    })
  }

  const reorderSlide = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    if (fromIndex >= heroData.slides.length || toIndex >= heroData.slides.length) return

    setHeroData((prev) => {
      const nextSlides = [...prev.slides]
      const [movedItem] = nextSlides.splice(fromIndex, 1)
      nextSlides.splice(toIndex, 0, movedItem)
      return { ...prev, slides: nextSlides }
    })

    setPreviewSlideIdx((prev) => {
      if (prev === fromIndex) return toIndex
      if (fromIndex < toIndex && prev > fromIndex && prev <= toIndex) return prev - 1
      if (fromIndex > toIndex && prev >= toIndex && prev < fromIndex) return prev + 1
      return prev
    })

    notify(`Moved Photo ${fromIndex + 1} to position ${toIndex + 1}`)
  }

  if (loading) {
    return <LandingHeroSkeleton />
  }

  return (
    <div className="flex flex-col gap-4 w-full animate-fade-up font-inter">
      {/* Top Section Switcher Pill */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100/90 dark:bg-zinc-900/80 border border-gray-200/80 dark:border-white/10 w-fit select-none">
        <button
          type="button"
          onClick={() => handleSelectSection("hero")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0",
            currentSection === "hero"
              ? "bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent"
          )}
        >
          <i className="ph-bold ph-image text-sm" />
          <span>Hero Section</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSection("bento")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0",
            currentSection === "bento"
              ? "bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent"
          )}
        >
          <i className="ph-bold ph-squares-four text-sm" />
          <span>Features Bento Grid</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSection("workflow")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0",
            currentSection === "workflow"
              ? "bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent"
          )}
        >
          <i className="ph-bold ph-git-merge text-sm" />
          <span>Workflow &amp; Steps</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSection("catalog")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0",
            currentSection === "catalog"
              ? "bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent"
          )}
        >
          <i className="ph-bold ph-books text-sm" />
          <span>Academic Catalog</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSection("faq")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0",
            currentSection === "faq"
              ? "bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent"
          )}
        >
          <i className="ph-bold ph-question text-sm" />
          <span>FAQ Section</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSection("footer")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-0",
            currentSection === "footer"
              ? "bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent"
          )}
        >
          <i className="ph-bold ph-panel-bottom text-sm" />
          <span>Footer Section</span>
        </button>
      </div>

      {currentSection === "bento" && <LandingBentoCmsView showToast={showToast} />}
      {currentSection === "workflow" && <LandingWorkflowCmsView showToast={showToast} />}
      {currentSection === "catalog" && <LandingCatalogCmsView showToast={showToast} />}
      {currentSection === "faq" && <LandingFaqCmsView showToast={showToast} />}
      {currentSection === "footer" && <LandingFooterCmsView showToast={showToast} />}
      {currentSection === "hero" && (
        <>
          {/* Main Card with Header, Underline Tabs & Form Content */}
          <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-layout"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Landing Page CMS</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · Hero Section
              </span>
            </div>
          }
          description="Manage public portal headlines, descriptive messaging, campus background photography, and operational details."
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
                    <i className="ph-bold ph-spinner animate-spin mr-1.5 text-[14px]" />
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
            onClick={() => setActiveTab("slides")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
              activeTab === "slides"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Carousel Photos ({heroData.slides.length})
          </button>

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
            Messaging Information
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
        <CardContent className="font-inter bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-6 rounded-b-2xl">
          {/* TAB 1: Simplified Carousel Photos (Upload & Preview Centric) */}
          {activeTab === "slides" && (
            <div className="space-y-6">
              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Campus Background Photos ({heroData.slides.length})
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400">
                    Upload campus photos for the landing page carousel. Drag cards to reorder, or click any image to replace it.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Rotation pace selector */}
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-zinc-300">
                    <i className="ph-bold ph-timer text-gray-400" />
                    <span>Slide Pace:</span>
                    <div className="w-[145px]">
                      <Select
                        value={heroData.autoRotateInterval}
                        onChange={(e) =>
                          setHeroData((prev) => ({
                            ...prev,
                            autoRotateInterval: Number(e.target.value),
                          }))
                        }
                        className="h-9 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-normal text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 cursor-pointer shadow-none px-3"
                        menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                        optionClassName="rounded-lg text-xs font-normal py-2 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <option value={3500}>Fast (3.5s)</option>
                        <option value={5500}>Balanced (5.5s)</option>
                        <option value={7500}>Relaxed (7.5s)</option>
                        <option value={10000}>Slow (10s)</option>
                      </Select>
                    </div>
                  </div>

                  {/* Hidden file input for adding a new photo */}
                  <input
                    type="file"
                    ref={newPhotoInputRef}
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleUploadNewSlide(e.target.files[0])
                        e.target.value = ""
                      }
                    }}
                  />

                  <Button
                    type="button"
                    onClick={() => newPhotoInputRef.current?.click()}
                    disabled={isAddingPhoto}
                    className="flex h-9 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs"
                  >
                    {isAddingPhoto ? (
                      <>
                        <i className="ph-bold ph-spinner animate-spin mr-1.5 text-[13px]" />
                        Uploading...
                      </>
                    ) : (
                      "Upload"
                    )}
                  </Button>
                </div>
              </div>

              {/* Photo Cards Grid with Add Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {heroData.slides.map((slide, idx) => (
                  <SlideCard
                    key={`${slide.src || "slide"}-${idx}`}
                    index={idx}
                    total={heroData.slides.length}
                    slide={slide}
                    isUploading={uploadingIndex === idx}
                    isDragging={draggedSlideIdx === idx}
                    isDragTarget={
                      dragOverSlideIdx === idx &&
                      draggedSlideIdx !== null &&
                      draggedSlideIdx !== idx
                    }
                    onUploadFile={(file) => handleFileUpload(file, idx)}
                    onMoveUp={() => moveSlide(idx, -1)}
                    onMoveDown={() => moveSlide(idx, 1)}
                    onDelete={() => setDeleteSlideIndex(idx)}
                    onDragStartCard={(i) => setDraggedSlideIdx(i)}
                    onDragOverCard={(i) => {
                      if (draggedSlideIdx !== null && draggedSlideIdx !== i) {
                        setDragOverSlideIdx(i)
                      }
                    }}
                    onDragLeaveCard={(i) => {
                      if (dragOverSlideIdx === i) {
                        setDragOverSlideIdx(null)
                      }
                    }}
                    onDropCard={(fromIdx, toIdx) => {
                      reorderSlide(fromIdx, toIdx)
                      setDraggedSlideIdx(null)
                      setDragOverSlideIdx(null)
                    }}
                    onDragEndCard={() => {
                      setDraggedSlideIdx(null)
                      setDragOverSlideIdx(null)
                    }}
                  />
                ))}

                {/* Add Photo Dashed Tile */}
                <button
                  type="button"
                  onClick={() => newPhotoInputRef.current?.click()}
                  disabled={isAddingPhoto}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes("application/x-pup-slide-card")) {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = "move"
                    }
                  }}
                  onDrop={(e) => {
                    if (e.dataTransfer.types.includes("application/x-pup-slide-card")) {
                      e.preventDefault()
                      e.stopPropagation()
                      const fromIdx = Number(e.dataTransfer.getData("application/x-pup-slide-card"))
                      if (!isNaN(fromIdx) && fromIdx !== heroData.slides.length - 1) {
                        reorderSlide(fromIdx, heroData.slides.length - 1)
                      }
                      setDraggedSlideIdx(null)
                      setDragOverSlideIdx(null)
                    }
                  }}
                  className="rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-pup-maroon/40 hover:bg-pup-maroon/5 dark:hover:bg-red-500/5 transition-all p-8 flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-pup-maroon dark:hover:text-red-400 min-h-[300px] cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    <i className="ph-bold ph-plus text-gray-500 group-hover:text-pup-maroon dark:group-hover:text-red-400" />
                  </div>
                  <div className="text-center">
                    <span className="block text-xs font-semibold text-gray-800 dark:text-zinc-200">
                      {isAddingPhoto ? "Uploading Photo..." : "Add Campus Photo"}
                    </span>
                    <span className="block text-[11px] text-gray-400 mt-0.5">
                      Click to choose an image from your computer
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Messaging & Information */}
          {activeTab === "content" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Primary Messaging Panel */}
              <div className="lg:col-span-2 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-5">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Hero Headlines &amp; Institutional Philosophy
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                    Primary large display typography rendered over campus background photography.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Headline Line 1 (Upper)
                      </label>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {heroData.headlineLine1.length}/45
                      </span>
                    </div>
                    <Input
                      value={heroData.headlineLine1}
                      onChange={(e) =>
                        setHeroData((prev) => ({
                          ...prev,
                          headlineLine1: e.target.value,
                        }))
                      }
                      placeholder="e.g. Tanglaw ng Bayan,"
                      maxLength={45}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal placeholder:text-gray-400 dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 dark:focus:ring-pup-maroon/20"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Headline Line 2 (Lower Accent)
                      </label>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {heroData.headlineLine2.length}/45
                      </span>
                    </div>
                    <Input
                      value={heroData.headlineLine2}
                      onChange={(e) =>
                        setHeroData((prev) => ({
                          ...prev,
                          headlineLine2: e.target.value,
                        }))
                      }
                      placeholder="e.g. Dambana ng Kagitingan."
                      maxLength={45}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal placeholder:text-gray-400 dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 dark:focus:ring-pup-maroon/20"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Hero Subtitle & Institutional Description
                      </label>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {heroData.description.length}/280
                      </span>
                    </div>
                    <textarea
                      value={heroData.description}
                      onChange={(e) =>
                        setHeroData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      maxLength={280}
                      placeholder="Official institutional records keeping, archive retrieval, and document verification system..."
                      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs font-normal leading-relaxed placeholder:text-gray-400 dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 dark:focus:ring-pup-maroon/20 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Campus Information Side Panel */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Campus Information
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                    Displayed in the bottom accreditation pill across the hero section.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                      Campus Address
                    </label>
                    <div className="relative">
                      <i className="ph-bold ph-map-pin absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                      <Input
                        value={heroData.campusAddress}
                        onChange={(e) =>
                          setHeroData((prev) => ({
                            ...prev,
                            campusAddress: e.target.value,
                          }))
                        }
                        placeholder="223 Ortega St. cor. A. Mabini St., Addition Hills, San Juan City"
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-xs font-normal dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                      Office Working Hours
                    </label>
                    <div className="relative">
                      <i className="ph-bold ph-clock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                      <Input
                        value={heroData.registrarHours}
                        onChange={(e) =>
                          setHeroData((prev) => ({
                            ...prev,
                            registrarHours: e.target.value,
                          }))
                        }
                        placeholder="REGISTRAR: 8:00 AM – 5:00 PM"
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-xs font-mono dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                      Operating Days
                    </label>
                    <div className="relative">
                      <i className="ph-bold ph-calendar absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                      <Input
                        value={heroData.operatingDays}
                        onChange={(e) =>
                          setHeroData((prev) => ({
                            ...prev,
                            operatingDays: e.target.value,
                          }))
                        }
                        placeholder="MON – FRI"
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-xs font-mono dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Interactive Live Hero Preview */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Simulated Hero Portal Preview
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400">
                    Live interactive preview showing exact layout, typography, atmospheric gradients, and slide transitions.
                  </p>
                </div>

                {/* Slide cycler in preview */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500 dark:text-zinc-400">
                    Slide {previewSlideIdx + 1} of {heroData.slides.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewSlideIdx((prev) =>
                          prev === 0 ? heroData.slides.length - 1 : prev - 1
                        )
                      }
                      className="h-8 w-8 p-0 rounded-xl!"
                    >
                      <i className="ph-bold ph-caret-left text-xs" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewSlideIdx((prev) =>
                          (prev + 1) % heroData.slides.length
                        )
                      }
                      className="h-8 w-8 p-0 rounded-xl!"
                    >
                      <i className="ph-bold ph-caret-right text-xs" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Miniature Hero Simulator */}
              <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-zinc-950 shadow-lg min-h-[480px] sm:min-h-[520px] flex flex-col justify-between p-6 sm:p-10 select-none">
                {/* Background Images */}
                <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
                  {heroData.slides.map((s, sIdx) => (
                    <div
                      key={sIdx}
                      className={cn(
                        "absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out",
                        sIdx === previewSlideIdx ? "opacity-100" : "opacity-0"
                      )}
                    >
                      <img
                        src={s.src}
                        alt={s.alt}
                        className="w-full h-full object-cover object-center"
                        onError={(e) => {
                          e.currentTarget.src = "/assets/pup/landing-1.jpg"
                        }}
                      />
                    </div>
                  ))}
                  {/* Atmospheric Gradient Scrims matching LandingHero */}
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-zinc-950/95 via-zinc-950/70 to-zinc-950/30" />
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                  <div className="absolute inset-0 w-full h-full bg-[#800000]/10 mix-blend-overlay" />
                </div>

                {/* Simulated Hero Text Cluster */}
                <div className="relative z-10 w-full max-w-xl my-auto py-6">
                  <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight sm:tracking-tighter mb-4 leading-[1.08]">
                    <span className="block">{heroData.headlineLine1 || "Tanglaw ng Bayan,"}</span>
                    <span className="block text-slate-100">{heroData.headlineLine2 || "Dambana ng Kagitingan."}</span>
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-200/85 leading-relaxed max-w-md mb-6 font-normal">
                    {heroData.description ||
                      "Official institutional records keeping, archive retrieval, and document verification system for Polytechnic University of the Philippines San Juan Campus."}
                  </p>

                  <div>
                    <BevelButton
                      type="button"
                      className="h-10 px-6 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 cursor-pointer shadow-md pointer-events-none"
                    >
                      <span>Request Document</span>
                      <i className="ph-bold ph-arrow-right text-xs" />
                    </BevelButton>
                  </div>
                </div>

                {/* Simulated Bottom Accreditation Pill */}
                <div className="relative z-10 px-4 py-2.5 rounded-xl bg-zinc-950/60 backdrop-blur-md border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/80">
                  <div className="flex items-center gap-2 truncate">
                    <i className="ph-bold ph-map-pin text-white/50 text-xs" />
                    <span className="truncate">
                      {heroData.campusAddress || "223 Ortega St. cor. A. Mabini St., Addition Hills, San Juan City"}
                    </span>
                  </div>

                  {/* Dots indicator */}
                  <div className="flex items-center gap-1.5">
                    {heroData.slides.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        type="button"
                        onClick={() => setPreviewSlideIdx(dotIdx)}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                          dotIdx === previewSlideIdx
                            ? "w-6 bg-white"
                            : "w-1.5 bg-white/40 hover:bg-white/70"
                        )}
                      />
                    ))}
                  </div>

                  <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-white/60">
                    <span>{heroData.registrarHours || "REGISTRAR: 8:00 AM – 5:00 PM"}</span>
                    <span>·</span>
                    <span>{heroData.operatingDays || "MON – FRI"}</span>
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
        title="Reset Hero Section to Defaults"
        message="Are you sure you want to reset all landing page hero content and slides to default PUP institutional branding? Custom text and custom slide sequences will be reverted."
        confirmLabel="Reset"
        icon="ph-duotone ph-arrow-counter-clockwise"
        buttonIcon="ph-bold ph-arrow-counter-clockwise"
        selectedItems={[
          "Reset hero heading, subheadline, and badge chip",
          "Restore default PUP San Juan campus background photo slides",
          "Restore default institutional campus information",
        ]}
        isPersonnelModal={true}
        isAppleStyled={true}
        isArchiveModal={true}
      />

      {/* Delete Slide Confirmation Modal */}
      <ConfirmModal
        open={deleteSlideIndex !== null}
        onCancel={() => setDeleteSlideIndex(null)}
        onConfirm={() => {
          if (deleteSlideIndex !== null) {
            removeSlide(deleteSlideIndex)
          }
        }}
        title="Remove Background Photo"
        message="Are you sure you want to remove this background photo from the hero carousel?"
        confirmLabel="Remove"
        icon="ph-duotone ph-trash"
        buttonIcon="ph-bold ph-trash"
        selectedItems={
          deleteSlideIndex !== null && heroData?.slides?.[deleteSlideIndex]
            ? [
                `Slide ${deleteSlideIndex + 1}: ${heroData.slides[deleteSlideIndex].title || "Untitled Slide"}`,
                `Image URL: ${heroData.slides[deleteSlideIndex].url?.slice(0, 60) || "No URL"}`,
              ]
            : []
        }
        isPersonnelModal={true}
        isAppleStyled={true}
        variant="danger"
        isDeleteModal={true}
      />
        </>
      )}
    </div>
  )
}

/**
 * Radically Simplified SlideCard for Non-Technical Users
 * No file paths, no presets, no alt text inputs.
 * Just the photo, dimension badge, click/drag to change, reorderable card, and order controls.
 */
function SlideCard({
  index,
  total,
  slide,
  isUploading,
  isDragging = false,
  isDragTarget = false,
  onUploadFile,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDragStartCard,
  onDragOverCard,
  onDragLeaveCard,
  onDropCard,
  onDragEndCard,
}) {
  const [imageError, setImageError] = useState(false)
  const [naturalSize, setNaturalSize] = useState(null)
  const [isFileDragOver, setIsFileDragOver] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageError(false)
    setNaturalSize(null)
  }, [slide.src])

  return (
    <div
      draggable={!isUploading}
      onDragStart={(e) => {
        // Prevent drag initiation if clicking buttons, inputs, or other interactive elements
        if (e.target.closest("button, input, label")) {
          e.preventDefault()
          return
        }
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("application/x-pup-slide-card", String(index))
        e.dataTransfer.setData("text/plain", String(index))
        onDragStartCard?.(index)
      }}
      onDragEnd={() => {
        onDragEndCard?.()
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-pup-slide-card")) {
          e.preventDefault()
          e.dataTransfer.dropEffect = "move"
          onDragOverCard?.(index)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          onDragLeaveCard?.(index)
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes("application/x-pup-slide-card")) {
          e.preventDefault()
          e.stopPropagation()
          const fromIdx = Number(e.dataTransfer.getData("application/x-pup-slide-card"))
          if (!isNaN(fromIdx) && fromIdx !== index) {
            onDropCard?.(fromIdx, index)
          }
        }
      }}
      className={cn(
        "group rounded-xl border bg-white dark:bg-zinc-900/50 overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between select-none relative",
        isDragging
          ? "opacity-35 scale-[0.98] border-dashed border-pup-maroon/60 bg-pup-maroon/5 ring-2 ring-pup-maroon/20 cursor-grabbing"
          : isDragTarget
          ? "ring-2 ring-pup-maroon ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 scale-[1.01] border-pup-maroon shadow-md"
          : "border-gray-200/80 dark:border-white/10"
      )}
    >
      {/* Drop Target Position Notice */}
      {isDragTarget && (
        <div className="bg-pup-maroon text-white text-[11px] font-semibold py-1.5 px-3 text-center flex items-center justify-center gap-1.5 animate-pulse shadow-inner">
          <i className="ph-bold ph-arrows-left-right text-xs" />
          <span>Drop to move photo to Position #{index + 1}</span>
        </div>
      )}

      {/* Top Bar: Number, Drag Handle & Order / Delete Controls */}
      <div className="px-4 py-3 bg-gray-50/80 dark:bg-zinc-950/50 border-b border-gray-100 dark:border-white/5 flex items-center justify-between select-none">
        <div
          className="flex items-center gap-2 cursor-grab active:cursor-grabbing group/drag"
          title="Drag card to reorder photos"
        >
          <i className="ph-bold ph-dots-six-vertical text-gray-400 group-hover/drag:text-pup-maroon dark:text-zinc-500 dark:group-hover/drag:text-red-400 text-sm transition-colors" />
          <span className="w-5 h-5 rounded-full bg-pup-maroon text-white text-[10px] font-bold flex items-center justify-center shadow-2xs">
            {index + 1}
          </span>
          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate max-w-[140px]">
            Photo {index + 1}
          </span>
        </div>

        {/* Reordering & Delete */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            onMouseDown={(e) => e.stopPropagation()}
            title="Move earlier"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 bg-transparent p-0"
          >
            <i className="ph-bold ph-caret-left text-xs" />
          </button>

          <button
            type="button"
            disabled={index === total - 1}
            onClick={onMoveDown}
            onMouseDown={(e) => e.stopPropagation()}
            title="Move later"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 bg-transparent p-0"
          >
            <i className="ph-bold ph-caret-right text-xs" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            onMouseDown={(e) => e.stopPropagation()}
            title="Remove photo"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer border-0 bg-transparent p-0 ml-1"
          >
            <i className="ph-bold ph-trash text-xs" />
          </button>
        </div>
      </div>

      {/* Interactive Image Preview Box (External file dropzone only) */}
      <div
        onDragOver={(e) => {
          // If an internal slide is being dragged to reorder, ignore here so card drop works
          if (e.dataTransfer.types.includes("application/x-pup-slide-card")) {
            return
          }
          // Only allow external files from user's OS file manager
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault()
            e.stopPropagation()
            setIsFileDragOver(true)
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsFileDragOver(false)
          }
        }}
        onDrop={(e) => {
          // If internal slide drag, do not treat it as a file upload!
          if (e.dataTransfer.types.includes("application/x-pup-slide-card")) {
            return
          }
          // Only upload if it's an external file
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            e.preventDefault()
            e.stopPropagation()
            setIsFileDragOver(false)
            onUploadFile(e.dataTransfer.files[0])
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative aspect-video w-full bg-zinc-950 overflow-hidden group/img transition-all cursor-pointer",
          isFileDragOver && "ring-2 ring-pup-maroon"
        )}
        title="Click to change photo, or drag an image file from your computer"
      >
        {isUploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 text-white gap-2 z-20">
            <i className="ph-bold ph-spinner animate-spin text-2xl text-pup-maroon" />
            <span className="text-xs font-semibold">Uploading photo...</span>
          </div>
        ) : imageError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-rose-400 p-4 text-center z-10">
            <i className="ph-bold ph-warning-circle text-2xl mb-1" />
            <span className="text-xs font-semibold">Photo unavailable</span>
          </div>
        ) : (
          <img
            src={slide.src}
            alt={slide.alt || "Campus Photo"}
            draggable={false}
            onDragStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onLoad={(e) => {
              setNaturalSize({
                width: e.currentTarget.naturalWidth,
                height: e.currentTarget.naturalHeight,
              })
            }}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover/img:scale-105 transition-transform duration-500 pointer-events-none select-none"
            style={{
              userSelect: "none",
              WebkitUserDrag: "none",
            }}
          />
        )}

        {/* Resolution badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 pointer-events-none select-none">
          <span className="rounded-md bg-zinc-900/80 backdrop-blur-md text-white border border-white/10 text-[10px] font-mono px-2 py-0.5">
            {naturalSize ? `${naturalSize.width} × ${naturalSize.height}` : "16:9"}
          </span>
        </div>

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-zinc-950/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10 pointer-events-none select-none">
          <span className="h-8 px-3 rounded-lg bg-white text-gray-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <i className="ph-bold ph-camera text-xs" />
            Click to Change Photo
          </span>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onUploadFile(e.target.files[0])
            e.target.value = ""
          }
        }}
      />

      {/* Bottom: Change Photo Button */}
      <div className="p-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full flex items-center justify-center h-9 rounded-xl! border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-semibold text-xs hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer shadow-2xs"
        >
          Change
        </Button>
      </div>
    </div>
  )
}
