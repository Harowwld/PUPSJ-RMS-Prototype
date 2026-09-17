"use client"

import LucideIcon from "@/components/shared/LucideIcon";
import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import PageHeader from "@/components/shared/PageHeader"
import ConfirmModal from "@/components/shared/ConfirmModal"
import LandingFooterSkeleton from "./skeletons/LandingFooterSkeleton"
import { cn } from "@/lib/utils"

export const MAX_SCHEDULE_ITEMS = 3
export const MAX_CONTACT_ITEMS = 3

const DEFAULT_FOOTER_CONTENT = {
  brandName: "eManage",
  brandSubtitle:
    "Polytechnic University of the Philippines — San Juan Campus Records Keeping & Online Document Request Platform.",
  locationHall: "Ground Floor, Admin & Records Hall",
  locationAddress:
    "223 Ortega Street, cor. A. Mabini Street, Barangay Addition Hills, San Juan City, Metro Manila 1500",
  mapsEnabled: true,
  mapsLabel: "Google Maps Directions",
  mapsUrl:
    "https://maps.google.com/?q=Polytechnic+University+of+the+Philippines+San+Juan+Campus",

  scheduleEyebrow: "Registrar Schedule",
  scheduleHeading: "Regular Office Hours",
  scheduleItems: [
    { label: "Monday – Friday", value: "8:00 AM – 5:00 PM", status: "open" },
    { label: "Noon Break Shift", value: "12:00 PM – 1:00 PM", status: "break" },
    { label: "Weekends & Holidays", value: "Closed", status: "closed" },
  ],

  contactsEyebrow: "Official Desk",
  contactsHeading: "Direct Contact Channels",
  contactItems: [
    {
      label: "Registrar Inquiries",
      value: "registrar.sanjuan@pup.edu.ph",
      type: "email",
    },
    {
      label: "Student Affairs (OSAS)",
      value: "osas.sanjuan@pup.edu.ph",
      type: "email",
    },
    {
      label: "Campus Trunklines",
      value: "(02) 8724-4112 / (02) 8724-4113",
      type: "phone",
    },
  ],

  watermarkEnabled: true,
  watermarkText: "EMANAGE",

  copyrightText: "© 2026 PUP San Juan Campus · All rights reserved.",
}

const SCHEDULE_STATUS_OPTIONS = [
  { value: "open", label: "Open / Regular Hours" },
  { value: "break", label: "Break Shift / Intermediate" },
  { value: "closed", label: "Closed / Holiday" },
]

const CONTACT_TYPE_OPTIONS = [
  { value: "email", label: "Email Address (auto mailto)" },
  { value: "phone", label: "Phone Number / Trunkline" },
]

export default function LandingFooterCmsView({ showToast }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("identity") // 'identity' | 'schedule' | 'preview'
  const [footerData, setFooterData] = useState(DEFAULT_FOOTER_CONTENT)

  // Modals
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [deleteScheduleIdx, setDeleteScheduleIdx] = useState(null)
  const [deleteContactIdx, setDeleteContactIdx] = useState(null)

  const notify = useCallback(
    (msg, isError = false) => {
      if (showToast) showToast(msg, isError)
    },
    [showToast]
  )

  // Fetch current footer configuration
  const fetchFooterData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/landing/footer", { cache: "no-store" })
      const json = await res.json()
      if (res.ok && json.ok && json.data) {
        setFooterData(json.data)
      } else {
        notify(json.error || "Failed to load footer configuration", true)
      }
    } catch (err) {
      console.error("[LandingFooterCmsView] Fetch error:", err)
      notify("Network error fetching footer settings", true)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    fetchFooterData()
  }, [fetchFooterData])

  // Save changes
  const handleSave = async () => {
    if (!footerData.locationHall?.trim() || !footerData.locationAddress?.trim()) {
      notify("Campus hall and street address cannot be blank", true)
      return
    }
    if (!footerData.scheduleItems || footerData.scheduleItems.length === 0) {
      notify("At least one schedule row is required", true)
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/landing/footer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...footerData,
          brandName: "eManage", // Always locked to permanent name
        }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setFooterData(json.data)
        notify("Landing page footer configuration saved successfully")
      } else {
        notify(json.error || "Failed to update footer configuration", true)
      }
    } catch (err) {
      console.error("[LandingFooterCmsView] Save error:", err)
      notify("Network error saving configuration", true)
    } finally {
      setSaving(false)
    }
  }

  // Reset to defaults
  const handleReset = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/landing/footer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setFooterData(json.data)
        notify("Landing page footer reverted to institutional defaults")
      } else {
        notify(json.error || "Failed to reset footer", true)
      }
    } catch (err) {
      console.error("[LandingFooterCmsView] Reset error:", err)
      notify("Network error resetting configuration", true)
    } finally {
      setSaving(false)
      setResetModalOpen(false)
    }
  }

  // Schedule row actions
  const addScheduleRow = () => {
    if (footerData.scheduleItems.length >= MAX_SCHEDULE_ITEMS) {
      notify(`Maximum of ${MAX_SCHEDULE_ITEMS} schedule rows allowed`, true)
      return
    }
    setFooterData((prev) => ({
      ...prev,
      scheduleItems: [
        ...prev.scheduleItems,
        {
          label: "Special Window",
          value: "1:00 PM – 4:00 PM",
          status: "open",
        },
      ],
    }))
  }

  const updateScheduleItem = (idx, field, value) => {
    setFooterData((prev) => {
      const next = [...prev.scheduleItems]
      next[idx] = { ...next[idx], [field]: value }
      return { ...prev, scheduleItems: next }
    })
  }

  const moveScheduleRow = (idx, direction) => {
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= footerData.scheduleItems.length) return
    setFooterData((prev) => {
      const next = [...prev.scheduleItems]
      const temp = next[idx]
      next[idx] = next[targetIdx]
      next[targetIdx] = temp
      return { ...prev, scheduleItems: next }
    })
  }

  const removeScheduleRow = (idx) => {
    if (footerData.scheduleItems.length <= 1) {
      notify("You must keep at least one schedule row", true)
      return
    }
    setFooterData((prev) => ({
      ...prev,
      scheduleItems: prev.scheduleItems.filter((_, i) => i !== idx),
    }))
    setDeleteScheduleIdx(null)
    notify("Schedule row removed")
  }

  // Contact item actions
  const addContactChannel = () => {
    if (footerData.contactItems.length >= MAX_CONTACT_ITEMS) {
      notify(`Maximum of ${MAX_CONTACT_ITEMS} contact channels allowed`, true)
      return
    }
    setFooterData((prev) => ({
      ...prev,
      contactItems: [
        ...prev.contactItems,
        {
          label: "Helpdesk Channel",
          value: "helpdesk.sanjuan@pup.edu.ph",
          type: "email",
        },
      ],
    }))
  }

  const updateContactItem = (idx, field, value) => {
    setFooterData((prev) => {
      const next = [...prev.contactItems]
      next[idx] = { ...next[idx], [field]: value }
      return { ...prev, contactItems: next }
    })
  }

  const moveContactChannel = (idx, direction) => {
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= footerData.contactItems.length) return
    setFooterData((prev) => {
      const next = [...prev.contactItems]
      const temp = next[idx]
      next[idx] = next[targetIdx]
      next[targetIdx] = temp
      return { ...prev, contactItems: next }
    })
  }

  const removeContactChannel = (idx) => {
    if (footerData.contactItems.length <= 1) {
      notify("You must keep at least one contact channel", true)
      return
    }
    setFooterData((prev) => ({
      ...prev,
      contactItems: prev.contactItems.filter((_, i) => i !== idx),
    }))
    setDeleteContactIdx(null)
    notify("Contact channel removed")
  }

  if (loading) {
    return <LandingFooterSkeleton />
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      {/* Main Card */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bold ph-panel-bottom"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Landing Page CMS</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · Footer Section
              </span>
            </div>
          }
          description="Manage campus archive location, registrar office schedules, inquiry channels, and giant watermark."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("/#office", "_blank")}
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
        <div className="flex items-center gap-6 shrink-0 h-10 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card select-none">
          <button
            type="button"
            onClick={() => setActiveTab("identity")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
              activeTab === "identity"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Identity &amp; Watermark
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
              activeTab === "schedule"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Schedule &amp; Inquiries ({footerData.scheduleItems.length + footerData.contactItems.length})
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
        <CardContent className="font-inter bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-6">
          {/* TAB 1: Campus Identity, Watermark & Sub-Footer */}
          {activeTab === "identity" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (lg:col-span-7): Location, Mission & Maps */}
              <div className="lg:col-span-7 space-y-5">
                {/* Physical Archive Location & Mission */}
                <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-5">
                  <div>
                    <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                      Physical Archive Location &amp; Mission
                    </h3>
                    <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                      Credentials and archive hall details displayed in Column 1.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                          Platform Subtitle / Description
                        </label>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {footerData.brandSubtitle.length}/250
                        </span>
                      </div>
                      <textarea
                        value={footerData.brandSubtitle}
                        onChange={(e) =>
                          setFooterData((prev) => ({
                            ...prev,
                            brandSubtitle: e.target.value,
                          }))
                        }
                        rows={3}
                        maxLength={250}
                        placeholder="Polytechnic University of the Philippines — San Juan Campus Records Keeping & Online Document Request Platform."
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs font-normal leading-relaxed placeholder:text-gray-400 dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                          Archive Room / Hall Name
                        </label>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {footerData.locationHall.length}/80
                        </span>
                      </div>
                      <div className="relative">
                        <LucideIcon  className="ph-bold ph-map-pin absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <Input
                          value={footerData.locationHall}
                          onChange={(e) =>
                            setFooterData((prev) => ({
                              ...prev,
                              locationHall: e.target.value,
                            }))
                          }
                          placeholder="Ground Floor, Admin & Records Hall"
                          maxLength={80}
                          className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-xs font-medium dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                          Campus Street Address
                        </label>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {footerData.locationAddress.length}/200
                        </span>
                      </div>
                      <Input
                        value={footerData.locationAddress}
                        onChange={(e) =>
                          setFooterData((prev) => ({
                            ...prev,
                            locationAddress: e.target.value,
                          }))
                        }
                        placeholder="223 Ortega Street, cor. A. Mabini Street, Barangay Addition Hills, San Juan City, Metro Manila 1500"
                        maxLength={200}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                      />
                    </div>
                  </div>
                </div>

                {/* Google Maps Configuration */}
                <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                        Map Directions Link
                      </h3>
                      <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                        Shortcut for visitors traveling to campus archives.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={footerData.mapsEnabled}
                        onChange={(e) =>
                          setFooterData((prev) => ({
                            ...prev,
                            mapsEnabled: e.target.checked,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-hidden dark:bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:bg-zinc-900 dark:after:border-zinc-700 peer-checked:bg-pup-maroon dark:peer-checked:bg-red-600" />
                    </label>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Button Label
                      </label>
                      <Input
                        value={footerData.mapsLabel}
                        disabled={!footerData.mapsEnabled}
                        onChange={(e) =>
                          setFooterData((prev) => ({
                            ...prev,
                            mapsLabel: e.target.value,
                          }))
                        }
                        placeholder="Google Maps Directions"
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal dark:border-white/10 dark:bg-card disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Google Maps Destination URL
                      </label>
                      <div className="relative">
                        <LucideIcon  className="ph-bold ph-link absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <Input
                          value={footerData.mapsUrl}
                          disabled={!footerData.mapsEnabled}
                          onChange={(e) =>
                            setFooterData((prev) => ({
                              ...prev,
                              mapsUrl: e.target.value,
                            }))
                          }
                          placeholder="https://maps.google.com/?q=..."
                          className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-xs font-mono dark:border-white/10 dark:bg-card disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (lg:col-span-5): Giant Brand Watermark & Sub-Footer */}
              <div className="lg:col-span-5 space-y-5">
                {/* Giant Brand Watermark */}
                <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                        Giant Brand Watermark
                      </h3>
                      <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                        Ambient brand typography rising from underneath the sub-footer.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={footerData.watermarkEnabled}
                        onChange={(e) =>
                          setFooterData((prev) => ({
                            ...prev,
                            watermarkEnabled: e.target.checked,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-hidden dark:bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:bg-zinc-900 dark:after:border-zinc-700 peer-checked:bg-pup-maroon dark:peer-checked:bg-red-600" />
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                      Watermark Typography
                    </label>
                    <Input
                      value={footerData.watermarkText}
                      disabled={!footerData.watermarkEnabled}
                      onChange={(e) =>
                        setFooterData((prev) => ({
                          ...prev,
                          watermarkText: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="EMANAGE"
                      maxLength={20}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-mono font-bold uppercase tracking-wider dark:border-white/10 dark:bg-card disabled:opacity-50"
                    />
                  </div>

                  <div className="h-28 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden relative select-none">
                    <span className="text-4xl font-black text-white/15 tracking-tighter uppercase select-none">
                      {footerData.watermarkEnabled ? footerData.watermarkText || "EMANAGE" : "WATERMARK DISABLED"}
                    </span>
                  </div>
                </div>

                {/* Sub-Footer & Copyright */}
                <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                  <div>
                    <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                      Sub-Footer &amp; Copyright
                    </h3>
                    <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                      Official copyright statement displayed alongside the Back to Top button.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Copyright Statement
                      </label>
                      <Input
                        value={footerData.copyrightText}
                        onChange={(e) =>
                          setFooterData((prev) => ({
                            ...prev,
                            copyrightText: e.target.value,
                          }))
                        }
                        placeholder="© 2026 PUP San Juan Campus · All rights reserved."
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal dark:border-white/10 dark:bg-card"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Office Hours, Inquiries & Personnel Desk */}
          {activeTab === "schedule" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT COLUMN (6 cols): Schedule & Hours */}
              <div className="lg:col-span-6 space-y-5">
                <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                        Registrar Window Schedule ({footerData.scheduleItems.length}/{MAX_SCHEDULE_ITEMS})
                      </h3>
                      <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                        Operating hours and shift windows displayed in the center column.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={addScheduleRow}
                      disabled={footerData.scheduleItems.length >= MAX_SCHEDULE_ITEMS}
                      className="h-8 rounded-xl bg-pup-maroon hover:bg-[#600000] text-white text-xs font-semibold px-3 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-40"
                    >
                      Add
                    </Button>
                  </div>

                  {/* Section Eyebrow & Heading */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                        Eyebrow Label
                      </label>
                      <Input
                        value={footerData.scheduleEyebrow}
                        onChange={(e) =>
                          setFooterData((prev) => ({
                            ...prev,
                            scheduleEyebrow: e.target.value,
                          }))
                        }
                        placeholder="Registrar Schedule"
                        className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs dark:border-white/10 dark:bg-card"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                        Section Heading
                      </label>
                      <Input
                        value={footerData.scheduleHeading}
                        onChange={(e) =>
                          setFooterData((prev) => ({
                            ...prev,
                            scheduleHeading: e.target.value,
                          }))
                        }
                        placeholder="Regular Office Hours"
                        className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs dark:border-white/10 dark:bg-card"
                      />
                    </div>
                  </div>

                  {/* Schedule Items List */}
                  <div className="space-y-3 pt-2">
                    {footerData.scheduleItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between select-none">
                          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-200 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/50 dark:text-red-300 text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span>Shift / Window {idx + 1}</span>
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveScheduleRow(idx, -1)}
                              title="Move up"
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer border-0 bg-transparent p-0"
                            >
                              <LucideIcon  className="ph-bold ph-arrow-up text-xs" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === footerData.scheduleItems.length - 1}
                              onClick={() => moveScheduleRow(idx, 1)}
                              title="Move down"
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer border-0 bg-transparent p-0"
                            >
                              <LucideIcon  className="ph-bold ph-arrow-down text-xs" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteScheduleIdx(idx)}
                              title="Remove row"
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer border-0 bg-transparent p-0 ml-1"
                            >
                              <LucideIcon  className="ph-bold ph-trash text-xs" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] text-gray-500 mb-1">
                              Day Range / Description
                            </label>
                            <Input
                              value={item.label}
                              onChange={(e) =>
                                updateScheduleItem(idx, "label", e.target.value)
                              }
                              placeholder="e.g. Monday – Friday"
                              className="h-8 rounded-lg text-xs"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[10px] text-gray-500 mb-1">
                              Hours / Value
                            </label>
                            <Input
                              value={item.value}
                              onChange={(e) =>
                                updateScheduleItem(idx, "value", e.target.value)
                              }
                              placeholder="e.g. 8:00 AM – 5:00 PM"
                              className="h-8 rounded-lg text-xs font-mono"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] text-gray-500 mb-1">
                              Status Highlight
                            </label>
                            <Select
                              value={item.status}
                              onChange={(e) =>
                                updateScheduleItem(idx, "status", e.target.value)
                              }
                              className="h-8 rounded-lg text-xs"
                              menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1"
                              optionClassName="rounded-lg text-xs py-1.5 px-2.5"
                            >
                              {SCHEDULE_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (6 cols): Direct Contact Channels & Personnel Sign-In */}
              <div className="lg:col-span-6 space-y-5">
                <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                        Direct Inquiry Channels ({footerData.contactItems.length}/{MAX_CONTACT_ITEMS})
                      </h3>
                      <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                        Official communications channels listed in Column 3.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={addContactChannel}
                      disabled={footerData.contactItems.length >= MAX_CONTACT_ITEMS}
                      className="h-8 rounded-xl bg-pup-maroon hover:bg-[#600000] text-white text-xs font-semibold px-3 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-40"
                    >
                      Add
                    </Button>
                  </div>

                  {/* Section Eyebrow & Heading */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                        Eyebrow Label
                      </label>
                      <Input
                        value={footerData.contactsEyebrow}
                        onChange={(e) =>
                          setFooterData((prev) => ({
                            ...prev,
                            contactsEyebrow: e.target.value,
                          }))
                        }
                        placeholder="Official Desk"
                        className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs dark:border-white/10 dark:bg-card"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                        Section Heading
                      </label>
                      <Input
                        value={footerData.contactsHeading}
                        onChange={(e) =>
                          setFooterData((prev) => ({
                            ...prev,
                            contactsHeading: e.target.value,
                          }))
                        }
                        placeholder="Direct Contact Channels"
                        className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs dark:border-white/10 dark:bg-card"
                      />
                    </div>
                  </div>

                  {/* Contacts List */}
                  <div className="space-y-3 pt-2">
                    {footerData.contactItems.map((contact, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between select-none">
                          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-200 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/50 dark:text-red-300 text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span>Channel {idx + 1}</span>
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveContactChannel(idx, -1)}
                              title="Move up"
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer border-0 bg-transparent p-0"
                            >
                              <LucideIcon  className="ph-bold ph-arrow-up text-xs" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === footerData.contactItems.length - 1}
                              onClick={() => moveContactChannel(idx, 1)}
                              title="Move down"
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer border-0 bg-transparent p-0"
                            >
                              <LucideIcon  className="ph-bold ph-arrow-down text-xs" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteContactIdx(idx)}
                              title="Remove channel"
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer border-0 bg-transparent p-0 ml-1"
                            >
                              <LucideIcon  className="ph-bold ph-trash text-xs" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] text-gray-500 mb-1">
                              Channel Label / Department
                            </label>
                            <Input
                              value={contact.label}
                              onChange={(e) =>
                                updateContactItem(idx, "label", e.target.value)
                              }
                              placeholder="e.g. Registrar Inquiries"
                              className="h-8 rounded-lg text-xs"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[10px] text-gray-500 mb-1">
                              Email Address or Phone
                            </label>
                            <Input
                              value={contact.value}
                              onChange={(e) =>
                                updateContactItem(idx, "value", e.target.value)
                              }
                              placeholder="e.g. info@pup.edu.ph"
                              className="h-8 rounded-lg text-xs font-mono"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] text-gray-500 mb-1">
                              Channel Type
                            </label>
                            <Select
                              value={contact.type}
                              onChange={(e) =>
                                updateContactItem(idx, "type", e.target.value)
                              }
                              className="h-8 rounded-lg text-xs"
                              menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1"
                              optionClassName="rounded-lg text-xs py-1.5 px-2.5"
                            >
                              {CONTACT_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
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
                    Live Portal Footer Simulator
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400">
                    Accurate live representation of how the public footer renders on the student portal.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/#office", "_blank")}
                  className="rounded-xl! text-xs font-semibold"
                >
                  Test
                </Button>
              </div>

              {/* Simulated Footer Window */}
              <div className="w-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 text-zinc-400 p-6 sm:p-8 select-none relative font-inter text-xs">
                {/* 3-Column Grid */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-zinc-800/80">
                  {/* Col 1 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <Image
                          src="/assets/branding/white-icon.png"
                          alt="Logo"
                          width={24}
                          height={24}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-bold text-lg text-white tracking-tight">
                        eManage
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {footerData.brandSubtitle}
                    </p>
                    <div className="pt-2 text-xs space-y-1">
                      <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                        <LucideIcon  className="ph-bold ph-map-pin text-red-400 text-sm" />
                        <span>{footerData.locationHall}</span>
                      </div>
                      <p className="text-zinc-400 text-[11px] pl-5">
                        {footerData.locationAddress}
                      </p>
                      {footerData.mapsEnabled && (
                        <div className="pl-5 pt-1 text-[11px] font-semibold text-red-400 flex items-center gap-1">
                          <span>{footerData.mapsLabel}</span>
                          <LucideIcon  className="ph-bold ph-arrow-square-out text-[10px]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Col 2 */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400 block">
                      {footerData.scheduleEyebrow}
                    </span>
                    <div className="font-bold text-sm text-white">
                      {footerData.scheduleHeading}
                    </div>
                    <div className="space-y-2 text-xs">
                      {(footerData.scheduleItems || []).map((item, i) => (
                        <div key={i} className="flex items-center justify-between pb-1 border-b border-zinc-800">
                          <span className="text-zinc-400">{item.label}</span>
                          <span
                            className={cn(
                              "font-mono",
                              item.status === "closed"
                                ? "font-medium text-rose-400"
                                : item.status === "break"
                                ? "text-zinc-400"
                                : "font-bold text-white"
                            )}
                          >
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Col 3 */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400 block">
                      {footerData.contactsEyebrow}
                    </span>
                    <div className="font-bold text-sm text-white">
                      {footerData.contactsHeading}
                    </div>
                    <div className="space-y-2 text-xs">
                      {(footerData.contactItems || []).map((contact, i) => (
                        <div key={i}>
                          <span className="block text-[10px] font-mono text-zinc-500 uppercase">{contact.label}</span>
                          {contact.type === "email" ? (
                            <span className="font-semibold text-red-400 break-all">{contact.value}</span>
                          ) : (
                            <span className="font-mono text-zinc-300">{contact.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                        <span>Personnel Sign In</span>
                        <LucideIcon  className="ph-bold ph-arrow-right text-[10px] text-zinc-400" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulated Ambient Watermark */}
                {footerData.watermarkEnabled && (
                  <div className="absolute inset-x-0 bottom-0 pointer-events-none select-none overflow-hidden flex justify-center items-end z-0">
                    <span
                      className="block w-full text-center font-black uppercase tracking-tighter leading-none text-white/[0.08] pointer-events-none whitespace-nowrap translate-y-[45%]"
                      style={{
                        fontSize: "clamp(3rem, 12vw, 10rem)",
                        fontWeight: 900,
                        letterSpacing: "-0.05em",
                      }}
                    >
                      {footerData.watermarkText || "EMANAGE"}
                    </span>
                  </div>
                )}

                {/* Streamlined Sub-Footer */}
                <div className="relative z-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{footerData.copyrightText}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400 select-none">
                    <span>Back to Top</span>
                    <LucideIcon  className="ph-bold ph-arrow-up text-[10px]" />
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
        title="Reset Footer Section to Defaults"
        message="Are you sure you want to reset the public landing page footer to default PUP institutional branding, schedules, and inquiry channels?"
        confirmLabel="Reset"
        icon="ph-duotone ph-arrow-counter-clockwise"
        buttonIcon="ph-bold ph-arrow-counter-clockwise"
        selectedItems={[
          "Reset campus mission description and records hall address",
          "Restore standard Monday – Friday registrar office hours",
          "Restore default university email and trunkline contact channels",
          "Restore giant ambient watermark",
        ]}
        isPersonnelModal={true}
        isAppleStyled={true}
        isArchiveModal={true}
      />

      {/* Delete Schedule Row Modal */}
      <ConfirmModal
        open={deleteScheduleIdx !== null}
        onCancel={() => setDeleteScheduleIdx(null)}
        onConfirm={() => {
          if (deleteScheduleIdx !== null) {
            removeScheduleRow(deleteScheduleIdx)
          }
        }}
        title="Remove Schedule Row"
        message="Are you sure you want to remove this office hours schedule row from the public footer?"
        confirmLabel="Remove"
        icon="ph-duotone ph-trash"
        buttonIcon="ph-bold ph-trash"
        selectedItems={
          deleteScheduleIdx !== null && footerData.scheduleItems[deleteScheduleIdx]
            ? [
                `Shift: ${footerData.scheduleItems[deleteScheduleIdx].label}`,
                `Hours: ${footerData.scheduleItems[deleteScheduleIdx].value}`,
              ]
            : []
        }
        isPersonnelModal={true}
        isAppleStyled={true}
        variant="danger"
        isDeleteModal={true}
      />

      {/* Delete Contact Channel Modal */}
      <ConfirmModal
        open={deleteContactIdx !== null}
        onCancel={() => setDeleteContactIdx(null)}
        onConfirm={() => {
          if (deleteContactIdx !== null) {
            removeContactChannel(deleteContactIdx)
          }
        }}
        title="Remove Contact Channel"
        message="Are you sure you want to remove this inquiry channel from the public footer?"
        confirmLabel="Remove"
        icon="ph-duotone ph-trash"
        buttonIcon="ph-bold ph-trash"
        selectedItems={
          deleteContactIdx !== null && footerData.contactItems[deleteContactIdx]
            ? [
                `Channel: ${footerData.contactItems[deleteContactIdx].label}`,
                `Detail: ${footerData.contactItems[deleteContactIdx].value}`,
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
