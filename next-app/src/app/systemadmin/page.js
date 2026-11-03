"use client"

import { useEffect, useState, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { toast } from "sonner"

import Sidebar from "@/components/shared/Sidebar"
import MyActivityPanel from "@/components/shared/MyActivityPanel"
import AccountSettingsPanel from "@/components/shared/AccountSettingsPanel"
import { SystemAdminGuard, useAuthUser } from "@/components/shared/AuthGuard"
import { useLayoutZoom } from "@/hooks/useLayoutZoom"
import InstitutionalBrandingSkeleton from "@/components/systemadmin/skeletons/InstitutionalBrandingSkeleton"
import ConfirmModal from "@/components/shared/ConfirmModal"
import ModuleConfigTab from "@/components/systemadmin/ModuleConfigTab"
import CampusOperationsSkeleton from "@/components/systemadmin/skeletons/CampusOperationsSkeleton"
import GlobalStaffSkeleton from "@/components/systemadmin/skeletons/GlobalStaffSkeleton"
import SecurityQuestionsSkeleton from "@/components/systemadmin/skeletons/SecurityQuestionsSkeleton"
import GlobalAuditLogsSkeleton from "@/components/systemadmin/skeletons/GlobalAuditLogsSkeleton"
import SystemBackupsSkeleton from "@/components/systemadmin/skeletons/SystemBackupsSkeleton"
import OfficeManagementPageSkeleton from "@/components/systemadmin/skeletons/OfficeManagementPageSkeleton"
import LandingCmsLoadingSkeleton from "@/components/systemadmin/skeletons/LandingCmsLoadingSkeleton"
import { getClientSession } from "@/lib/clientAuth"
import { formatErrorMessage } from "@/lib/errorUtils"
import { getRoleBranding } from "@/lib/roleBranding"

import DashboardShellSkeleton from "@/components/shared/DashboardShellSkeleton"

const SYSTEMADMIN_NAV_ITEMS = [
  { type: "header", label: "Institutional Governance" },
  { key: "offices", label: "Departments & Stations", iconClass: " Building01Icon" },
  { key: "modules", label: "Department Features", iconClass: " LayoutGridIcon" },

  { type: "header", label: "Campus Operations" },
  { key: "health", label: "Campus Operations", iconClass: " Activity01Icon" },

  { type: "header", label: "Public Portal & Identity" },
  { key: "branding", label: "Institutional Identity", iconClass: " Certificate01Icon" },
  { key: "landing", label: "Landing Page CMS", iconClass: " DashboardSquare01Icon" },

  { type: "header", label: "Personnel & Access" },
  { key: "staff", label: "Global Directory", iconClass: " UserSearch01Icon" },
  { key: "security", label: "Security Questions", iconClass: " Shield01Icon" },

  { type: "header", label: "System & Security" },
  { key: "logs", label: "Platform Activity History", iconClass: " Time01Icon" },
  { key: "backups", label: "Platform Backups", iconClass: " CloudUploadIcon" },
]

const OfficeManagementTab = dynamic(() => import("@/components/systemadmin/OfficeManagementTab"), {
  loading: () => <OfficeManagementPageSkeleton />,
})
const InstitutionalBrandingTab = dynamic(() => import("@/components/systemadmin/InstitutionalBrandingTab"), {
  loading: () => <InstitutionalBrandingSkeleton />,
})
const GlobalStaffTab = dynamic(() => import("@/components/systemadmin/GlobalStaffTab"), {
  loading: () => <GlobalStaffSkeleton />,
})
const GlobalAuditLogsTab = dynamic(() => import("@/components/systemadmin/GlobalAuditLogsTab"), {
  loading: () => <GlobalAuditLogsSkeleton />,
})
const CampusOperationsTab = dynamic(() => import("@/components/systemadmin/CampusOperationsTab"), {
  loading: () => <CampusOperationsSkeleton />,
})
const SystemBackupsTab = dynamic(() => import("@/components/systemadmin/SystemBackupsTab"), {
  loading: () => <SystemBackupsSkeleton rowCount={20} />,
})
const LandingPageCmsTab = dynamic(() => import("@/components/systemadmin/LandingPageCmsTab"), {
  loading: () => <LandingCmsDynamicFallback />,
})

function LandingCmsDynamicFallback() {
  const searchParams = useSearchParams()
  return <LandingCmsLoadingSkeleton section={searchParams?.get("section")} />
}
const SecurityQuestionsTab = dynamic(() => import("@/components/systemadmin/SecurityQuestionsTab"), {
  loading: () => <SecurityQuestionsSkeleton />,
})

const VALID_VIEWS = ["offices", "branding", "modules", "standards", "staff", "security", "logs", "health", "backups", "landing", "activity", "settings"]

function SystemAdminLoadingSkeleton() {
  return (
    <DashboardShellSkeleton items={SYSTEMADMIN_NAV_ITEMS}>
      <OfficeManagementPageSkeleton />
    </DashboardShellSkeleton>
  )
}

function SystemAdminPageContent({ authUser: propAuthUser }) {
  const contextUser = useAuthUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialAuth = propAuthUser || contextUser || null
  const [authUser, setAuthUser] = useState(initialAuth)
  const [loading, setLoading] = useState(!initialAuth)
  const { zoomNode, setZoomNode, handleZoomMouseDown, zoomStyle } = useLayoutZoom(authUser)

  const initialView = VALID_VIEWS.includes(searchParams?.get("view"))
    ? searchParams.get("view")
    : "offices"

  const [view, setView] = useState(initialView)
  const [selectedOfficeId, setSelectedOfficeId] = useState(() => searchParams?.get("office") || "")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [brandingDirty, setBrandingDirty] = useState(false)
  const [pendingBrandingView, setPendingBrandingView] = useState(null)
  const currentViewRef = useRef(view)
  const brandingDirtyRef = useRef(brandingDirty)
  useEffect(() => { currentViewRef.current = view }, [view])
  useEffect(() => { brandingDirtyRef.current = brandingDirty }, [brandingDirty])

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((prev) => !prev)
    window.addEventListener("toggle-sidebar", handleToggle)
    return () => window.removeEventListener("toggle-sidebar", handleToggle)
  }, [])

  useEffect(() => {
    const handleSwitch = (e) => {
      const { view: targetView, officeId, section } = e.detail || {}
      if (targetView) {
        if (view === "branding" && brandingDirty && targetView !== "branding") {
          setPendingBrandingView({ view: targetView, officeId, section })
          return
        }
        setView(targetView)
        if (officeId) {
          setSelectedOfficeId(officeId)
        }
        const params = new URLSearchParams()
        params.set("view", targetView)
        if (officeId) {
          params.set("office", officeId)
        }
        if (section) {
          params.set("section", section)
        }
        router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
      }
    }
    window.addEventListener("switch-view", handleSwitch)
    return () => window.removeEventListener("switch-view", handleSwitch)
  }, [router, view, brandingDirty])

  const showToast = useCallback((msg, typeOrIsError = false, autoHide = true) => {
    if (msg instanceof Error) {
      const normalized = formatErrorMessage(msg);
      return toast.error(normalized.title, {
        description: normalized.description,
        action: normalized.action,
        duration: 6000,
      });
    }

    const isError =
      typeOrIsError === true ||
      typeOrIsError === "error" ||
      (msg && typeof msg === "object" && (msg.variant === "destructive" || msg.variant === "error"));
    const isWarning =
      typeOrIsError === "warning" ||
      (msg && typeof msg === "object" && msg.variant === "warning");
    const isLoading =
      typeOrIsError === "loading" ||
      (msg && typeof msg === "object" && msg.variant === "loading");

    if (msg && typeof msg === "object") {
      const opts = {};
      if (msg.description) opts.description = msg.description;
      if (msg.action) opts.action = msg.action;

      if (isError) {
        const normalized = formatErrorMessage(msg.description || msg.title || "", {
          title: msg.title || "Operation Failed",
          description: msg.description,
        });
        return toast.error(normalized.title, {
          description: normalized.description,
          action: msg.action || normalized.action,
          duration: 6000,
        });
      }
      if (isWarning) {
        return toast.warning(msg.title || "", { ...opts, duration: 6000 });
      }
      if (isLoading) {
        return toast.loading(msg.title || "", opts);
      }
      if (!autoHide) {
        return toast.message(msg.title || "", { ...opts, duration: 5000 });
      }
      return toast.success(msg.title || "", { ...opts, duration: 3000 });
    }

    const str = String(msg || "");
    if (isError) {
      const normalized = formatErrorMessage(str);
      return toast.error(normalized.title, {
        description: normalized.description,
        action: normalized.action,
        duration: 6000,
      });
    }
    if (isWarning) {
      return toast.warning(str, { duration: 6000 });
    }
    if (isLoading) {
      return toast.loading(str);
    }
    if (!autoHide) {
      return toast.message(str, { duration: 5000 });
    }
    return toast.success(str, { duration: 3000 });
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
    const rawTab = searchParams?.get("view")
    const tab = VALID_VIEWS.includes(rawTab) ? rawTab : "offices"
    if (currentViewRef.current === "branding" && brandingDirtyRef.current && tab !== "branding") {
      setPendingBrandingView({ view: tab })
      router.replace(`${window.location.pathname}?view=branding`, { scroll: false })
      return
    }
    setView(tab)
  }, [searchParams, router])

  useEffect(() => {
    if (initialAuth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthUser(initialAuth)
      setLoading(false)
      return
    }
    ; (async () => {
      try {
        const session = await getClientSession()
        if (!session.ok || !session.data) {
          if (session.status === 401) {
            router.replace("/login")
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

  const switchView = useCallback((nextView, officeId) => {
    if (view === "branding" && brandingDirty && nextView !== "branding") {
      setPendingBrandingView({ view: nextView, officeId })
      return
    }
    setView(nextView)
    if (officeId) {
      setSelectedOfficeId(officeId)
    }
    const params = new URLSearchParams()
    params.set("view", nextView)
    if (officeId) {
      params.set("office", officeId)
    }
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
  }, [router, view, brandingDirty])

  const discardBrandingChanges = useCallback(() => {
    if (!pendingBrandingView) return
    const { view: nextView, officeId, section } = pendingBrandingView
    setBrandingDirty(false)
    setPendingBrandingView(null)
    setView(nextView)
    if (officeId) setSelectedOfficeId(officeId)
    const params = new URLSearchParams()
    params.set("view", nextView)
    if (officeId) params.set("office", officeId)
    if (section) params.set("section", section)
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
  }, [pendingBrandingView, router])

  const sidebarItems = SYSTEMADMIN_NAV_ITEMS

  if (loading) {
    return <SystemAdminLoadingSkeleton />
  }

  return (
    <div className="systemadmin-dashboard font-jakarta flex h-dvh overflow-hidden flex-col bg-slate-50/30 dark:bg-zinc-950/30 relative transition-colors duration-300" style={{ "--brand-accent": getRoleBranding(authUser).color, "--brand-foreground": getRoleBranding(authUser).foreground }}>
      {/* Dynamic Glassmorphism Blobs */}
      <div className="liquid-container">
        <div className="liquid-blob liquid-blob-1 bg-blue-400/20 dark:bg-blue-600/10"></div>
        <div className="liquid-blob liquid-blob-2 bg-indigo-400/20 dark:bg-indigo-600/10"></div>
        <div className="liquid-blob liquid-blob-3 bg-purple-400/20 dark:bg-purple-600/10"></div>
      </div>



      <div
        className="flex min-h-0 overflow-hidden flex-col md:flex-row"
        style={zoomStyle}
      >
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

        <main className="relative w-full min-w-0 min-h-0 flex-1 bg-white/25 dark:bg-zinc-950/25 overflow-y-auto backdrop-blur-xl flex flex-col">
          <div
            className="p-2 md:pl-1 flex flex-[1_0_auto] flex-col w-full [&>*]:flex-[1_0_auto]"
          >
            {view === "offices" && <OfficeManagementTab showToast={showToast} onSwitchTab={switchView} />}
            {view === "branding" && <InstitutionalBrandingTab showToast={showToast} onDirtyChange={setBrandingDirty} />}
            {view === "modules" && <ModuleConfigTab showToast={showToast} initialOfficeId={selectedOfficeId} />}
            {view === "staff" && <GlobalStaffTab authUser={authUser} showToast={showToast} />}
            {view === "security" && <SecurityQuestionsTab showToast={showToast} />}
            {view === "logs" && <GlobalAuditLogsTab showToast={showToast} />}
            {(view === "health" || view === "standards") && (
              <CampusOperationsTab
                showToast={showToast}
                initialStandardsOpen={view === "standards"}
              />
            )}
            {view === "backups" && <SystemBackupsTab showToast={showToast} />}
            {view === "landing" && <LandingPageCmsTab showToast={showToast} initialSection={searchParams?.get("section")} />}
            {view === "activity" && <MyActivityPanel />}
            {view === "settings" && <AccountSettingsPanel />}
          </div>
        </main>
      </div>
      <ConfirmModal open={Boolean(pendingBrandingView)} title="Unsaved Changes" message="You have unsaved institutional identity changes. Navigating away will discard them." confirmLabel="Discard" variant="warning" onConfirm={discardBrandingChanges} onCancel={() => setPendingBrandingView(null)} isUnsavedChangesModal={true} />
    </div>
  )
}

export default function SystemAdminPage() {
  return (
    <SystemAdminGuard fallback={<SystemAdminLoadingSkeleton />}>
      <Suspense fallback={<SystemAdminLoadingSkeleton />}>
        <SystemAdminPageContent />
      </Suspense>
    </SystemAdminGuard>
  )
}
