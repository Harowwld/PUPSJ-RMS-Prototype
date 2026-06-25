"use client"

import { useEffect, useState, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import Sidebar from "@/components/shared/Sidebar"
import ConfirmModal from "@/components/shared/ConfirmModal"
import { SuperAdminGuard } from "@/components/shared/AuthGuard"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import OfficeManagementTab from "@/components/superadmin/OfficeManagementTab"
import ModuleConfigTab from "@/components/superadmin/ModuleConfigTab"
import GlobalStaffTab from "@/components/superadmin/GlobalStaffTab"
import GlobalAuditLogsTab from "@/components/superadmin/GlobalAuditLogsTab"
import SystemHealthTab from "@/components/superadmin/SystemHealthTab"

function SuperAdminPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [authUser, setAuthUser] = useState(null)
  
  const validViews = ["offices", "modules", "staff", "logs", "health"]
  const initialView = validViews.includes(searchParams?.get("view"))
    ? searchParams.get("view")
    : "offices"

  const [view, setView] = useState(initialView)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [zoomNode, setZoomNode] = useState(3) // Apple Photos style zoom

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((prev) => !prev)
    window.addEventListener("toggle-sidebar", handleToggle)
    return () => window.removeEventListener("toggle-sidebar", handleToggle)
  }, [])

  const handleZoomMouseDown = (e) => {
    e.preventDefault()
    const track = e.currentTarget
    
    const updateZoom = (clientX) => {
      const rect = track.getBoundingClientRect()
      const clickX = clientX - rect.left
      const percentage = clickX / rect.width
      const node = Math.max(0, Math.min(6, Math.round(percentage * 6)))
      setZoomNode(node)
    }

    const isTouch = e.type === "touchstart"
    const startX = isTouch ? e.touches[0].clientX : e.clientX
    updateZoom(startX)

    const handleMove = (moveEvent) => {
      const clientX = moveEvent.type === "touchmove" ? moveEvent.touches[0].clientX : moveEvent.clientX
      updateZoom(clientX)
    }

    const handleEnd = () => {
      if (isTouch) {
        document.removeEventListener("touchmove", handleMove)
        document.removeEventListener("touchend", handleEnd)
      } else {
        document.removeEventListener("mousemove", handleMove)
        document.removeEventListener("mouseup", handleEnd)
      }
    }

    if (isTouch) {
      document.addEventListener("touchmove", handleMove, { passive: true })
      document.addEventListener("touchend", handleEnd)
    } else {
      document.addEventListener("mousemove", handleMove)
      document.addEventListener("mouseup", handleEnd)
    }
  }

  const showToast = useCallback((msg, typeOrIsError = false) => {
    const isRich = msg && typeof msg === "object" && msg.title
    const title = isRich ? msg.title : String(msg || "")
    const opts = isRich && msg.description ? { description: msg.description } : {}

    if (typeOrIsError === true || typeOrIsError === "error") {
      return toast.error(title, opts)
    }
    return toast.success(title, opts)
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" })
      if (res.ok) {
        localStorage.setItem("pup-logout", Date.now().toString())
        router.push("/")
      }
    } catch (err) {
      showToast("Sign out failed", true)
    }
  }, [router, showToast])

  useEffect(() => {
    const tab = String(searchParams?.get("view") || "").trim()
    if (validViews.includes(tab)) {
      setView(tab)
    }
  }, [searchParams])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.ok) {
          if (res.status === 401) {
            router.push("/")
          }
          return
        }
        setAuthUser(json.data)
        setLoading(false)
      } catch (err) {
        console.error("[SuperAdminPage] Profile fetch failed:", err)
      }
    })()
  }, [router])

  const switchView = useCallback((nextView) => {
    setView(nextView)
    const params = new URLSearchParams(window.location.search)
    params.set("view", nextView)
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
  }, [router])

  const sidebarItems = [
    { type: "header", label: "Tenant Administration" },
    { key: "offices", label: "Offices & Tenants", iconClass: "ti ti-building-community" },
    { key: "modules", label: "Module Config Matrix", iconClass: "ti ti-layout-grid" },
    
    { type: "header", label: "Access & Audit" },
    { key: "staff", label: "Global Directory", iconClass: "ti ti-users" },
    { key: "logs", label: "Platform Audit Trail", iconClass: "ti ti-history" },
    
    { type: "header", label: "Platform Health" },
    { key: "health", label: "System Health", iconClass: "ti ti-activity-heartbeat" }
  ]

  if (loading) {
    return (
      <div className="font-inter flex min-h-screen flex-col gap-4 bg-gray-50 p-4 transition-colors duration-300 dark:bg-background">
        <Skeleton className="h-16 w-full shrink-0 rounded-brand" />
        <div className="flex flex-1 gap-4">
          <Skeleton className="h-full w-[260px] rounded-brand" />
          <Skeleton className="h-full flex-1 rounded-brand" />
        </div>
      </div>
    )
  }

  const zoomFactor = [0.75, 0.83, 0.92, 1.0, 1.08, 1.17, 1.25][zoomNode]

  return (
    <div className="font-inter flex h-screen overflow-hidden flex-col bg-slate-50/30 dark:bg-zinc-950/30 relative transition-colors duration-300">
      {/* Dynamic Glassmorphism Blobs */}
      <div className="liquid-container">
        <div className="liquid-blob liquid-blob-1 bg-blue-400/20 dark:bg-blue-600/10"></div>
        <div className="liquid-blob liquid-blob-2 bg-indigo-400/20 dark:bg-indigo-600/10"></div>
        <div className="liquid-blob liquid-blob-3 bg-purple-400/20 dark:bg-purple-600/10"></div>
      </div>

      <Header authUser={authUser} onLogout={handleLogout}>
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
            className="flex items-center justify-center border-0 rounded-brand hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 cursor-pointer bg-transparent h-9 w-9"
          >
            <i className="ti ti-panel-left text-[21px]" style={{ color: "#1e293b" }}></i>
          </button>
        )}
      </Header>

      <div className="flex w-full flex-1 min-h-0 overflow-hidden flex-row">
        <Sidebar
          open={sidebarOpen}
          items={sidebarItems}
          activeKey={view}
          onSelect={switchView}
          onLogout={handleLogout}
          zoomNode={zoomNode}
          setZoomNode={setZoomNode}
          handleZoomMouseDown={handleZoomMouseDown}
        />
        
        <main className="relative w-full min-w-0 min-h-0 flex-1 bg-white/25 dark:bg-zinc-950/25 overflow-y-auto backdrop-blur-xs">
          <div 
            className="flex-1 p-6 flex flex-col min-h-0 w-full"
            style={{ zoom: zoomFactor }}
          >
            {view === "offices" && <OfficeManagementTab showToast={showToast} />}
            {view === "modules" && <ModuleConfigTab showToast={showToast} />}
            {view === "staff" && <GlobalStaffTab authUser={authUser} showToast={showToast} />}
            {view === "logs" && <GlobalAuditLogsTab showToast={showToast} />}
            {view === "health" && <SystemHealthTab showToast={showToast} />}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}

export default function SuperAdminPage() {
  return (
    <SuperAdminGuard>
      <Suspense fallback={
        <div className="font-inter flex min-h-screen flex-col gap-4 bg-gray-50 p-4 dark:bg-background">
          <Skeleton className="h-16 w-full shrink-0 rounded-brand" />
          <div className="flex flex-1 gap-4">
            <Skeleton className="h-full w-[260px] rounded-brand" />
            <Skeleton className="h-full flex-1 rounded-brand" />
          </div>
        </div>
      }>
        <SuperAdminPageContent />
      </Suspense>
    </SuperAdminGuard>
  )
}
