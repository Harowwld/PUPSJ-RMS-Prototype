"use client"

import { useEffect, useState, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { toast } from "sonner"

import Header from "@/components/layout/Header"
import Sidebar from "@/components/shared/Sidebar"
import ConfirmModal from "@/components/shared/ConfirmModal"
import { SystemAdminGuard, useAuthUser } from "@/components/shared/AuthGuard"
import { useLayoutZoom } from "@/hooks/useLayoutZoom"
import { Skeleton } from "@/components/ui/skeleton"
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton"
import InstitutionalBrandingSkeleton from "@/components/systemadmin/skeletons/InstitutionalBrandingSkeleton"
import ModuleConfigSkeleton from "@/components/systemadmin/skeletons/ModuleConfigSkeleton"
import ServiceStandardsSkeleton from "@/components/systemadmin/skeletons/ServiceStandardsSkeleton"
import { cn } from "@/lib/utils"
import { getClientSession } from "@/lib/clientAuth"

function TabLoadingSkeleton() {
  return (
    <div className="flex flex-1 flex-col h-full min-h-0 w-full gap-6 animate-fade-up font-jakarta">
      {/* ONE Single Container Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card flex flex-col flex-1 min-h-[500px] mb-4 isolate">
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48 rounded dark:bg-muted" />
            <Skeleton className="h-3.5 w-72 rounded dark:bg-muted" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* Top KPI Stat Cards */}
        <div className="px-6 pb-6">
          <KpiStatCardsSkeleton count={3} />
        </div>

        {/* Toolbar Row */}
        <div className="h-14 border-t border-border dark:border-border p-4 px-6 flex items-center justify-between bg-gray-50/40 dark:bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-64 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
          </div>
          <Skeleton className="h-9 w-20 rounded-xl dark:bg-muted" />
        </div>

        {/* Table Body Rows */}
        <div className="p-6 space-y-4 flex-1 rounded-b-2xl">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 border-b border-border dark:border-border flex items-center justify-between last:border-b-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
                <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
              </div>
              <Skeleton className="h-4 w-24 rounded dark:bg-muted" />
              <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const OfficeManagementTab = dynamic(() => import("@/components/systemadmin/OfficeManagementTab"), {
  loading: () => <TabLoadingSkeleton />,
})
const InstitutionalBrandingTab = dynamic(() => import("@/components/systemadmin/InstitutionalBrandingTab"), {
  loading: () => <InstitutionalBrandingSkeleton />,
})
const ModuleConfigTab = dynamic(() => import("@/components/systemadmin/ModuleConfigTab"), {
  loading: () => <ModuleConfigSkeleton />,
})
const GlobalStaffTab = dynamic(() => import("@/components/systemadmin/GlobalStaffTab"), {
  loading: () => <TabLoadingSkeleton />,
})
const GlobalAuditLogsTab = dynamic(() => import("@/components/systemadmin/GlobalAuditLogsTab"), {
  loading: () => <TabLoadingSkeleton />,
})
const CampusOperationsTab = dynamic(() => import("@/components/systemadmin/CampusOperationsTab"), {
  loading: () => <TabLoadingSkeleton />,
})
const SystemBackupsTab = dynamic(() => import("@/components/systemadmin/SystemBackupsTab"), {
  loading: () => <TabLoadingSkeleton />,
})
const LandingPageCmsTab = dynamic(() => import("@/components/systemadmin/LandingPageCmsTab"), {
  loading: () => <TabLoadingSkeleton />,
})
const SecurityQuestionsTab = dynamic(() => import("@/components/systemadmin/SecurityQuestionsTab"), {
  loading: () => <TabLoadingSkeleton />,
})
const ServiceStandardsTab = dynamic(() => import("@/components/systemadmin/ServiceStandardsTab"), {
  loading: () => <ServiceStandardsSkeleton />,
})

const VALID_VIEWS = ["offices", "branding", "modules", "standards", "staff", "security", "logs", "health", "backups", "landing"]

function SystemAdminPageContent({ authUser: propAuthUser }) {
  const contextUser = useAuthUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialAuth = propAuthUser || contextUser || null
  const [authUser, setAuthUser] = useState(initialAuth)
  const [loading, setLoading] = useState(!initialAuth)
  const { zoomNode, setZoomNode, handleZoomMouseDown, zoomFactor, zoomStyle } = useLayoutZoom(authUser)
  
  const initialView = VALID_VIEWS.includes(searchParams?.get("view"))
    ? searchParams.get("view")
    : "offices"

  const [view, setView] = useState(initialView)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.style.setProperty("--brand-accent", "#000000")
      document.documentElement.style.setProperty("--brand-foreground", "#FFFFFF")
    }
    return () => {
      if (typeof window !== "undefined") {
        document.documentElement.style.setProperty("--brand-accent", "#800000")
        document.documentElement.style.setProperty("--brand-foreground", "#FFFFFF")
      }
    }
  }, [])

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((prev) => !prev)
    window.addEventListener("toggle-sidebar", handleToggle)
    return () => window.removeEventListener("toggle-sidebar", handleToggle)
  }, [])

  useEffect(() => {
    const handleSwitch = (e) => {
      const { view: targetView, officeId, section } = e.detail || {}
      if (targetView) {
        setView(targetView)
        const params = new URLSearchParams(window.location.search)
        params.set("view", targetView)
        if (officeId) {
          params.set("office", officeId)
        } else {
          params.delete("office")
        }
        if (section) {
          params.set("section", section)
        } else {
          params.delete("section")
        }
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
      }
    }
    window.addEventListener("switch-view", handleSwitch)
    return () => window.removeEventListener("switch-view", handleSwitch)
  }, [router])

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
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      /* ignore network errors */
    }
    localStorage.setItem("pup-logout", Date.now().toString())
    window.location.href = "/login"
  }, [])

  useEffect(() => {
    const tab = String(searchParams?.get("view") || "").trim()
    if (VALID_VIEWS.includes(tab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView(tab)
    }
  }, [searchParams])

  useEffect(() => {
    if (initialAuth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthUser(initialAuth)
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const session = await getClientSession()
        if (!session.ok || !session.data) {
          if (session.status === 401) {
            router.push("/login")
          }
          return
        }
        setAuthUser(session.data)
        setLoading(false)
      } catch (err) {
        console.error("[SuperAdminPage] Profile fetch failed:", err)
      }
    })()
  }, [initialAuth, router])

  const switchView = useCallback((nextView) => {
    setView(nextView)
    const params = new URLSearchParams(window.location.search)
    params.set("view", nextView)
    params.delete("office")
    params.delete("section")
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
  }, [router])

  const sidebarItems = [
    { type: "header", label: "Institutional Governance" },
    { key: "offices", label: "Departments & Stations", iconClass: "ph-bold ph-buildings" },
    { key: "modules", label: "Department Features", iconClass: "ph-bold ph-squares-four" },

    { type: "header", label: "Campus Operations" },
    { key: "standards", label: "Service Standards & SLA", iconClass: "ph-bold ph-clock-countdown" },
    { key: "health", label: "Campus Operations", iconClass: "ph-bold ph-activity" },

    { type: "header", label: "Public Portal & Identity" },
    { key: "branding", label: "Institutional Identity", iconClass: "ph-bold ph-certificate" },
    { key: "landing", label: "Landing Page CMS", iconClass: "ph-bold ph-layout" },

    { type: "header", label: "Personnel & Access" },
    { key: "staff", label: "Global Directory", iconClass: "ph-bold ph-users" },
    { key: "security", label: "Security Questions", iconClass: "ph-bold ph-shield-check" },

    { type: "header", label: "System & Security" },
    { key: "logs", label: "Platform Audit Trail", iconClass: "ph-bold ph-history" },
    { key: "backups", label: "Platform Backups", iconClass: "ph-bold ph-cloud-arrow-up" },
  ]

  if (loading) {
    return (
      <div className="font-jakarta flex min-h-screen flex-col gap-4 bg-gray-50 p-4 transition-colors duration-300 dark:bg-background">
        <Skeleton className="h-16 w-full shrink-0 rounded-brand" />
        <div className="flex flex-1 gap-4">
          <Skeleton className="h-full w-[275px] rounded-brand" />
          <Skeleton className="h-full flex-1 rounded-brand" />
        </div>
      </div>
    )
  }

  return (
    <div className="font-jakarta flex h-screen overflow-hidden flex-col bg-slate-50/30 dark:bg-zinc-950/30 relative transition-colors duration-300" style={{ "--brand-accent": "#000000", "--brand-foreground": "#FFFFFF" }}>
      {/* Dynamic Glassmorphism Blobs */}
      <div className="liquid-container">
        <div className="liquid-blob liquid-blob-1 bg-blue-400/20 dark:bg-blue-600/10"></div>
        <div className="liquid-blob liquid-blob-2 bg-indigo-400/20 dark:bg-indigo-600/10"></div>
        <div className="liquid-blob liquid-blob-3 bg-purple-400/20 dark:bg-purple-600/10"></div>
      </div>

      <Header authUser={authUser} onLogout={handleLogout} />

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
          authUser={authUser}
        />
        
        <main className="relative w-full min-w-0 min-h-0 flex-1 bg-white/25 dark:bg-zinc-950/25 overflow-y-auto backdrop-blur-xs">
          <div 
            className="flex-1 p-4 flex flex-col min-h-0 w-full"
            style={zoomStyle}
          >
            {view === "offices" && <OfficeManagementTab showToast={showToast} onSwitchTab={switchView} />}
            {view === "branding" && <InstitutionalBrandingTab showToast={showToast} />}
            {view === "modules" && <ModuleConfigTab showToast={showToast} />}
            {view === "standards" && <ServiceStandardsTab showToast={showToast} />}
            {view === "staff" && <GlobalStaffTab authUser={authUser} showToast={showToast} />}
            {view === "security" && <SecurityQuestionsTab showToast={showToast} />}
            {view === "logs" && <GlobalAuditLogsTab showToast={showToast} />}
            {view === "health" && <CampusOperationsTab showToast={showToast} />}
            {view === "backups" && <SystemBackupsTab showToast={showToast} />}
            {view === "landing" && <LandingPageCmsTab showToast={showToast} />}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function SystemAdminPage() {
  return (
    <SystemAdminGuard>
      <Suspense fallback={
        <div className="font-jakarta flex min-h-screen flex-col gap-4 bg-gray-50 p-4 dark:bg-background">
          <Skeleton className="h-16 w-full shrink-0 rounded-brand" />
          <div className="flex flex-1 gap-4">
            <Skeleton className="h-full w-[275px] rounded-brand" />
            <Skeleton className="h-full flex-1 rounded-brand" />
          </div>
        </div>
      }>
        <SystemAdminPageContent />
      </Suspense>
    </SystemAdminGuard>
  )
}
