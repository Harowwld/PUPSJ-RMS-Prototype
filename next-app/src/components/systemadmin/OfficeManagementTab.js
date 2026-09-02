"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import PageHeader from "@/components/shared/PageHeader"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Predefined icon palette so SuperAdmins can click an icon instead of typing a
// raw class string. Values are full icon classes consumed by LucideIconTranslator
// (the "ti ti-<name>" form is mapped to a Lucide glyph at runtime).
const PRESET_ICONS = [
  { value: "ti ti-building", label: "Building" },
  { value: "ti ti-building-2", label: "Building (alt)" },
  { value: "ti ti-landmark", label: "Institution" },
  { value: "ti ti-school", label: "School" },
  { value: "ti ti-graduation-cap", label: "Graduation" },
  { value: "ti ti-scroll-text", label: "Certificate" },
  { value: "ti ti-award", label: "Award" },
  { value: "ti ti-shield-check", label: "Clearance" },
  { value: "ti ti-users", label: "Staff" },
  { value: "ti ti-user", label: "Student" },
  { value: "ti ti-clipboard-list", label: "Records" },
  { value: "ti ti-file-text", label: "Documents" },
  { value: "ti ti-folder", label: "Folder" },
  { value: "ti ti-archive", label: "Archive" },
  { value: "ti ti-book", label: "Library" },
  { value: "ti ti-library", label: "Catalog" },
  { value: "ti ti-calendar", label: "Calendar" },
  { value: "ti ti-mail", label: "Mail" },
  { value: "ti ti-banknote", label: "Finance" },
  { value: "ti ti-wallet", label: "Cashier" },
  { value: "ti ti-stethoscope", label: "Clinic" },
  { value: "ti ti-heart-pulse", label: "Health" },
  { value: "ti ti-flask-conical", label: "Laboratory" },
  { value: "ti ti-database", label: "Data" },
]

export default function OfficeManagementTab({ showToast }) {
  const [offices, setOffices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Form State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedOfficeId, setSelectedOfficeId] = useState(null)
  const [showCustomIcon, setShowCustomIcon] = useState(false)
  
  const [form, setForm] = useState({
    id: "",
    name: "",
    short_name: "",
    description: "",
    icon: "ti ti-building",
    accent_color: "#800000",
    status: "Active",
  })
  
  const [submitLoading, setSubmitLoading] = useState(false)

  const fetchOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/offices?stats=true")
      const json = await res.json()
      if (res.ok && json.ok) {
        setOffices(json.data)
      } else {
        showToast(json.error || "Failed to fetch offices", true)
      }
    } catch (err) {
      showToast("Network error fetching offices", true)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchOffices()
  }, [fetchOffices])

  const handleOpenCreate = () => {
    setIsEditing(false)
    setSelectedOfficeId(null)
    setShowCustomIcon(false)
    setForm({
      id: "",
      name: "",
      short_name: "",
      description: "",
      icon: "ti ti-building",
      accent_color: "#800000",
      status: "Active",
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (office) => {
    setIsEditing(true)
    setSelectedOfficeId(office.id)
    const icon = office.icon || "ti ti-building"
    setShowCustomIcon(!PRESET_ICONS.some(p => p.value === icon))
    setForm({
      id: office.id,
      name: office.name,
      short_name: office.short_name,
      description: office.description || "",
      icon,
      accent_color: office.accent_color || "#800000",
      status: office.status || "Active",
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.id.trim() || !form.name.trim() || !form.short_name.trim()) {
      showToast("Please fill in all required fields", true)
      return
    }

    setSubmitLoading(true)
    try {
      const url = isEditing ? `/api/offices/${selectedOfficeId}` : "/api/offices"
      const method = isEditing ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id.trim().toLowerCase(),
          name: form.name.trim(),
          short_name: form.short_name.trim(),
          description: form.description.trim(),
          icon: form.icon.trim(),
          accent_color: form.accent_color,
          status: form.status,
        }),
      })

      const json = await res.json()
      if (res.ok && json.ok) {
        if (isEditing) {
          showToast("Office updated successfully")
        } else if (json.admin && json.admin.created) {
          showToast(
            `Office created. Default admin ${json.admin.id} (password: ${json.admin.defaultPassword}) — change it on first login.`
          )
        } else {
          showToast("Office created successfully")
        }
        setDialogOpen(false)
        fetchOffices()
      } else {
        showToast(json.error || "Failed to save office", true)
      }
    } catch (err) {
      showToast("Network error saving office", true)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleToggleStatus = async (office) => {
    const nextStatus = office.status === "Active" ? "Inactive" : "Active"
    try {
      const res = await fetch(`/api/offices/${office.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        showToast(`Office set to ${nextStatus}`)
        fetchOffices()
      } else {
        showToast(json.error || "Failed to toggle status", true)
      }
    } catch (err) {
      showToast("Network error toggling status", true)
    }
  }

  const filteredOffices = offices.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.short_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const PRESET_COLORS = ["#800000", "#1e3a8a", "#15803d", "#b45309", "#6b21a8", "#0f766e", "#374151"]

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <PageHeader
        title="Office Management"
        description="Add, configure, and monitor multi-tenant administrative offices."
        actions={
          <Button 
            onClick={handleOpenCreate}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl h-10 px-4 flex items-center gap-2 cursor-pointer dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
          >
            <i className="ti ti-plus text-base"></i>
            Create Office
          </Button>
        }
      />

      {/* Toolbar / Search */}
      <div className="flex items-center justify-between bg-white/40 dark:bg-zinc-900/30 p-3 rounded-2xl border border-gray-200/50 dark:border-white/5 backdrop-blur-xs">
        <div className="relative w-72">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500"></i>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search offices..."
            className="pl-9 h-9 w-full bg-white/70 dark:bg-zinc-900/40 border border-gray-200 dark:border-white/5 rounded-xl text-xs"
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
          Total Tenants: <strong>{offices.length}</strong>
        </div>
      </div>

      {/* Offices Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <Card key={n} className="overflow-hidden border border-gray-200/50 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOffices.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-white/5 rounded-2xl bg-white/10">
          <div className="w-12 h-12 rounded-full bg-white border border-gray-100 flex items-center justify-center mb-3 shadow-xs dark:bg-zinc-900 dark:border-white/5">
            <i className="ti ti-building text-xl text-gray-400"></i>
          </div>
          <span className="font-semibold text-gray-700 dark:text-zinc-300">No offices found</span>
          <span className="text-xs text-gray-500 mt-1">Try refining your search terms.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffices.map((office) => {
            const accent = office.accent_color || "#800000"
            const isActive = office.status === "Active"
            return (
              <Card 
                key={office.id} 
                className="overflow-hidden border border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] relative shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 rounded-2xl"
              >
                <CardContent className="p-6 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-10 w-10 rounded-xl flex items-center justify-center border text-lg shadow-sm"
                          style={{ borderColor: `${accent}20`, backgroundColor: `${accent}08`, color: accent }}
                        >
                          <i className={office.icon || "ti ti-building"}></i>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-zinc-50 leading-tight">
                            {office.short_name}
                          </h3>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                            ID: {office.id}
                          </span>
                        </div>
                      </div>

                      <Badge 
                        className={cn(
                          "rounded-full border-0 px-2 py-0.5 text-[10px] font-bold shadow-none",
                          isActive 
                            ? "bg-[#34c759]/10 text-[#34c759] dark:bg-[#30d158]/20 dark:text-[#30d158]"
                            : "bg-[#8e8e93]/10 text-[#8e8e93] dark:bg-[#8e8e93]/20 dark:text-[#aeaeb2]"
                        )}
                      >
                        {office.status}
                      </Badge>
                    </div>

                    <h4 className="text-xs font-semibold text-gray-900 dark:text-[#f2f2f7] mb-1.5 leading-snug">
                      {office.name}
                    </h4>
                    
                    <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                      {office.description || "No description provided."}
                    </p>
                  </div>

                  {/* Office Metrics */}
                  <div className="border-t border-gray-100 dark:border-zinc-800 pt-4 mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 font-medium">
                      <i className="ti ti-users text-gray-400"></i>
                      <span>Staff: <strong className="text-gray-900 dark:text-zinc-100 font-bold">{office.staff_count || 0}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <i className="ti ti-layout-grid text-gray-400"></i>
                      <span>Modules: <strong className="text-gray-900 dark:text-zinc-100 font-bold">{office.module_count || 0}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-5 pt-3 border-t border-gray-100 dark:border-zinc-800">
                    <Button 
                      onClick={() => handleOpenEdit(office)}
                      className="flex-1 bg-[#f2f2f7] hover:bg-[#e5e5ea] dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] text-gray-800 dark:text-[#f2f2f7] font-semibold text-xs h-8 cursor-pointer rounded-lg border-0 shadow-none"
                    >
                      Configure
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleToggleStatus(office)}
                      className={cn(
                        "h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer border-0 shadow-none transition-colors",
                        isActive 
                          ? "text-[#ff3b30] hover:bg-[#ff3b30]/10 dark:text-[#ff453a] dark:hover:bg-[#ff453a]/15"
                          : "text-[#34c759] hover:bg-[#34c759]/10 dark:text-[#30d158] dark:hover:bg-[#30d158]/15"
                      )}
                    >
                      {isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white border border-gray-200 dark:bg-zinc-900 dark:border-white/10 p-0 shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-white/5">
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">
                {isEditing ? "Edit Office Configuration" : "Create Administrative Office"}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-1 dark:text-zinc-400">
                Define the metadata and theme color for this tenant database partition.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* ID */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Office Identifier (Database Name) *
                </label>
                <Input
                  value={form.id}
                  onChange={(e) => setForm(prev => ({ ...prev, id: e.target.value }))}
                  disabled={isEditing}
                  placeholder="e.g. registrar, osas, coed"
                  className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                  required
                />
                {!isEditing && (
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Letters/numbers only. Creates a separate database + a default admin (e.g. <span>PUP{(form.id || "OFFICE").trim().toUpperCase()}-001</span>).
                  </span>
                )}
              </div>

              {/* Short Name */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Short/Acronym Name *
                </label>
                <Input
                  value={form.short_name}
                  onChange={(e) => setForm(prev => ({ ...prev, short_name: e.target.value }))}
                  placeholder="e.g. Registrar, OSAS"
                  className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                  required
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Full Name of the Office *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Office of the Registrar"
                  className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the department's role..."
                  className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                />
              </div>

              {/* Icon Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Office Icon
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomIcon(v => !v)}
                    className="text-[10px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showCustomIcon ? "Use picker" : "Custom class"}
                  </button>
                </div>

                {!showCustomIcon ? (
                  <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl border border-gray-200 bg-white dark:bg-zinc-950 dark:border-white/10">
                    {PRESET_ICONS.map((opt) => {
                      const selected = form.icon === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          title={opt.label}
                          onClick={() => setForm(prev => ({ ...prev, icon: opt.value }))}
                          className={cn(
                            "h-8 w-8 flex items-center justify-center rounded-lg border text-base transition-all cursor-pointer",
                            selected
                              ? "border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                              : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                          )}
                        >
                          <i className={opt.value}></i>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <Input
                    value={form.icon}
                    onChange={(e) => setForm(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="e.g. ti ti-building, ph-bold ph-certificate"
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                  />
                )}
                <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1.5">
                  Selected: <i className={form.icon}></i> <span className="font-mono">{form.icon}</span>
                </span>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Accent Color / Branding Theme
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.accent_color}
                    onChange={(e) => setForm(prev => ({ ...prev, accent_color: e.target.value }))}
                    className="w-10 h-10 border rounded-lg overflow-hidden cursor-pointer bg-transparent"
                  />
                  <Input
                    value={form.accent_color}
                    onChange={(e) => setForm(prev => ({ ...prev, accent_color: e.target.value }))}
                    className="h-10 rounded-xl flex-1 bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, accent_color: c }))}
                      className="w-6 h-6 rounded-full border border-gray-300 dark:border-white/20 transition-transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 bg-gray-50 dark:bg-zinc-950/40 border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="text-xs text-gray-500 dark:text-zinc-400 font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitLoading}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl h-9 px-4 cursor-pointer dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
              >
                {submitLoading ? "Saving..." : isEditing ? "Save Changes" : "Create Office"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
