"use client"

import InitialDashboardLoader from "@/components/shared/InitialDashboardLoader";
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
import ModuleConfigSkeleton from "@/components/systemadmin/skeletons/ModuleConfigSkeleton"
import GlobalStaffSkeleton from "@/components/systemadmin/skeletons/GlobalStaffSkeleton"
import SecurityQuestionsSkeleton from "@/components/systemadmin/skeletons/SecurityQuestionsSkeleton"
import GlobalAuditLogsSkeleton from "@/components/systemadmin/skeletons/GlobalAuditLogsSkeleton"
import SystemBackupsSkeleton from "@/components/systemadmin/skeletons/SystemBackupsSkeleton"
import OfficeManagementPageSkeleton from "@/components/systemadmin/skeletons/OfficeManagementPageSkeleton"
import LandingCmsLoadingSkeleton from "@/components/systemadmin/skeletons/LandingCmsLoadingSkeleton"
import { formatErrorMessage } from "@/lib/errorUtils"
import { getRoleBranding } from "@/lib/roleBranding"
import { ContentSwap } from "@/components/ui/motion"

import OdrsPortalAccountsTab from "@/components/systemadmin/OdrsPortalAccountsTab"
import DashboardShellSkeleton from "@/components/shared/DashboardShellSkeleton"

const SYSTEMADMIN_NAV_ITEMS = [
  { type: "header", label: "Campus Operations" },
  { key: "health", label: "Campus Operations", iconClass: " Activity01Icon" },

  { type: "header", label: "Institutional Governance" },
  { key: "offices", label: "Departments & Stations", iconClass: " Building01Icon" },
  { key: "modules", label: "Department Features", iconClass: " LayoutGridIcon" },

  { type: "header", label: "Public Portal & Identity" },
  { key: "branding", label: "Institutional Identity", iconClass: " Certificate01Icon" },
  { key: "landing", label: "Landing Page CMS", iconClass: " DashboardSquare01Icon" },

  { type: "header", label: "Personnel & Access" },
  { key: "staff", label: "Global Directory", iconClass: " UserSearch01Icon" },
  { key: "portal_accounts", label: "ODRS Portal Accounts", iconClass: " UserSettings01Icon" },
  { key: "security", label: "Security Questions", iconClass: " Shield01Icon" },

  { type: "header", label: "System & Security" },
  { key: "logs", label: "Platform Activity History", iconClass: " Time01Icon" },
  { key: "backups", label: "Platform Backups", iconClass: " CloudUploadIcon" },
]

const OfficeManagementTab = dynamic(() => import("@/components/systemadmin/OfficeManagementTab"), {
  loading: () => renderSystemAdminSkeleton("offices"),
})
const InstitutionalBrandingTab = dynamic(() => import("@/components/systemadmin/InstitutionalBrandingTab"), {
  loading: () => renderSystemAdminSkeleton("branding"),
})
const GlobalStaffTab = dynamic(() => import("@/components/systemadmin/GlobalStaffTab"), {
  loading: () => renderSystemAdminSkeleton("staff"),
})
const GlobalAuditLogsTab = dynamic(() => import("@/components/systemadmin/GlobalAuditLogsTab"), {
  loading: () => renderSystemAdminSkeleton("logs"),
})
const CampusOperationsTab = dynamic(() => import("@/components/systemadmin/CampusOperationsTab"), {
  loading: () => renderSystemAdminSkeleton("health"),
})
const SystemBackupsTab = dynamic(() => import("@/components/systemadmin/SystemBackupsTab"), {
  loading: () => renderSystemAdminSkeleton("backups"),
})
const LandingPageCmsTab = dynamic(() => import("@/components/systemadmin/LandingPageCmsTab"), {
  loading: () => <LandingCmsDynamicFallback />,
})

function LandingCmsDynamicFallback() {
  const searchParams = useSearchParams()
  return renderSystemAdminSkeleton("landing", searchParams?.get("section"))
}
const SecurityQuestionsTab = dynamic(() => import("@/components/systemadmin/SecurityQuestionsTab"), {
  loading: () => renderSystemAdminSkeleton("security"),
})

const VALID_VIEWS = ["offices", "branding", "modules", "standards", "staff", "portal_accounts", "security", "logs", "health", "backups", "landing", "activity", "settings"]

const SUPERADMIN_VIEW_ALIASES = {
  campus_operations: "health",
  campus_health: "health",
  operations: "health",
  departments: "offices",
  stations: "offices",
}

function resolveRequestedView(rawView) {
  const normalized = SUPERADMIN_VIEW_ALIASES[rawView] || rawView
  return VALID_VIEWS.includes(normalized) ? normalized : null
}

function resolveSuperAdminView(rawView, defaultPref = null) {
  return resolveRequestedView(rawView) || resolveRequestedView(defaultPref) || "health"
}

function hasUnsavedChanges(activeView, brandingDirty, securityDirty, landingDirty) {
  return (activeView === "branding" && brandingDirty) || (activeView === "security" && securityDirty) || (activeView === "landing" && landingDirty)
}

function renderSystemAdminSkeleton(view, section) {
  switch (view) {
    case "offices": return <OfficeManagementPageSkeleton />
    case "branding": return <InstitutionalBrandingSkeleton />
    case "staff": return <GlobalStaffSkeleton />
    case "modules": return <ModuleConfigSkeleton />
    case "security": return <SecurityQuestionsSkeleton />
    case "logs": return <GlobalAuditLogsSkeleton />
    case "health":
    case "standards": return <CampusOperationsSkeleton />
    case "backups": return <SystemBackupsSkeleton rowCount={20} />
    case "landing": return <LandingCmsLoadingSkeleton section={section} />
    default: return null
  }
}

function SystemAdminPageContent() {
  const authUser = useAuthUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { zoomNode, setZoomNode, handleZoomMouseDown, zoomStyle } = useLayoutZoom(authUser)

  const initialView = resolveSuperAdminView(
    searchParams?.get("view"),
    authUser?.preferences?.default_home_view
  )

  const [view, setView] = useState(initialView)
  const [selectedOfficeId, setSelectedOfficeId] = useState(() => searchParams?.get("office") || "")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [brandingDirty, setBrandingDirty] = useState(false)
  const [securityDirty, setSecurityDirty] = useState(false)
  const [landingDirty, setLandingDirty] = useState(false)
  const [pendingView, setPendingView] = useState(null)
  const currentViewRef = useRef(view)
  const brandingDirtyRef = useRef(brandingDirty)
  const securityDirtyRef = useRef(securityDirty)
  const landingDirtyRef = useRef(landingDirty)
  useEffect(() => { currentViewRef.current = view }, [view])
  useEffect(() => { brandingDirtyRef.current = brandingDirty }, [brandingDirty])
  useEffect(() => { securityDirtyRef.current = securityDirty }, [securityDirty])
  useEffect(() => { landingDirtyRef.current = landingDirty }, [landingDirty])

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((prev) => !prev)
    window.addEventListener("toggle-sidebar", handleToggle)
    return () => window.removeEventListener("toggle-sidebar", handleToggle)
  }, [])

  useEffect(() => {
    const handleSwitch = (e) => {
      const { view: targetView, officeId, section } = e.detail || {}
      if (targetView) {
        if (hasUnsavedChanges(view, brandingDirty, securityDirty, landingDirty) && targetView !== view) {
          setPendingView({ view: targetView, officeId, section })
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
  }, [router, view, brandingDirty, securityDirty, landingDirty])

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
    const tab = resolveSuperAdminView(rawTab, authUser?.preferences?.default_home_view)
    const activeView = currentViewRef.current
    const activeViewDirty = (activeView === "branding" && brandingDirtyRef.current)
      || (activeView === "security" && securityDirtyRef.current)
      || (activeView === "landing" && landingDirtyRef.current)
    if (activeViewDirty && tab !== activeView) {
      setPendingView({ view: tab })
      router.replace(`${window.location.pathname}?view=${activeView}`, { scroll: false })
      return
    }
    setView(tab)
  }, [searchParams, router, authUser?.preferences?.default_home_view])

  const switchView = useCallback((nextView, officeId) => {
    if (hasUnsavedChanges(view, brandingDirty, securityDirty, landingDirty) && nextView !== view) {
      setPendingView({ view: nextView, officeId })
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
  }, [router, view, brandingDirty, securityDirty, landingDirty])

  const discardChanges = useCallback(() => {
    if (!pendingView) return
    const { view: nextView, officeId, section } = pendingView
    setBrandingDirty(false)
    setSecurityDirty(false)
    setLandingDirty(false)
    setPendingView(null)
    setView(nextView)
    if (officeId) setSelectedOfficeId(officeId)
    const params = new URLSearchParams()
    params.set("view", nextView)
    if (officeId) params.set("office", officeId)
    if (section) params.set("section", section)
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
  }, [pendingView, router])

  const sidebarItems = SYSTEMADMIN_NAV_ITEMS

  return (
    <div className="systemadmin-dashboard font-jakarta flex h-dvh overflow-hidden flex-col bg-slate-50/30 dark:bg-zinc-950/30 relative transition-colors duration-300" style={{ "--brand-accent": getRoleBranding(authUser).color, "--brand-foreground": getRoleBranding(authUser).foreground }}>
      {/* Dynamic Glassmorphism Blobs */}
      <div className="liquid-container">
        <div className="liquid-blob liquid-blob-1 bg-blue-400/20 dark:bg-blue-600/10"></div>
        <div className="liquid-blob liquid-blob-2 bg-indigo-400/20 dark:bg-indigo-600/10"></div>
        <div className="liquid-blob liquid-blob-3 bg-purple-400/20 dark:bg-purple-600/10"></div>
      </div>



      <div
        className="flex-1 h-full w-full flex min-h-0 overflow-hidden flex-col md:flex-row"
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

        <main className="relative w-full min-w-0 min-h-0 flex-1 bg-white dark:bg-zinc-950/50 overflow-y-auto flex flex-col">
          <div
            className="p-2 md:pl-1 flex flex-[1_0_auto] min-h-full flex-col w-full [&>*]:flex-[1_0_auto]"
          >
            <ContentSwap id={view} className="flex flex-[1_0_auto] flex-col w-full [&>*]:flex-[1_0_auto]">
              {view === "offices" && <OfficeManagementTab showToast={showToast} onSwitchTab={switchView} />}
              {view === "branding" && <InstitutionalBrandingTab showToast={showToast} onDirtyChange={setBrandingDirty} />}
              {view === "modules" && <ModuleConfigTab showToast={showToast} initialOfficeId={selectedOfficeId} />}
              {view === "staff" && <GlobalStaffTab authUser={authUser} showToast={showToast} />}
              {view === "portal_accounts" && <OdrsPortalAccountsTab />}
              {view === "security" && <SecurityQuestionsTab showToast={showToast} onDirtyChange={setSecurityDirty} />}
              {view === "logs" && <GlobalAuditLogsTab showToast={showToast} />}
              {(view === "health" || view === "standards") && (
                <CampusOperationsTab
                  showToast={showToast}
                  initialStandardsOpen={view === "standards"}
                />
              )}
              {view === "backups" && <SystemBackupsTab showToast={showToast} />}
              {view === "landing" && <LandingPageCmsTab showToast={showToast} initialSection={searchParams?.get("section")} onDirtyChange={setLandingDirty} />}
              {view === "activity" && <MyActivityPanel />}
              {view === "settings" && <AccountSettingsPanel />}
            </ContentSwap>
          </div>
        </main>
      </div>
      <ConfirmModal open={Boolean(pendingView)} title="Unsaved Changes" message={`You have unsaved ${view === "security" ? "security question" : view === "landing" ? "landing page" : "institutional identity"} changes. Navigating away will discard them.`} confirmLabel="Discard Changes" variant="warning" onConfirm={discardChanges} onCancel={() => setPendingView(null)} isUnsavedChangesModal={true} />
    </div>
  )
}

function SystemAdminPageWithView() {
  const searchParams = useSearchParams()
  const view = resolveRequestedView(searchParams?.get("view"))
  const fallback = (
    <InitialDashboardLoader>
      <DashboardShellSkeleton>
        {renderSystemAdminSkeleton(view, searchParams?.get("section"))}
      </DashboardShellSkeleton>
    </InitialDashboardLoader>
  )

  return (
    <SystemAdminGuard fallback={fallback}>
      <SystemAdminPageContent />
    </SystemAdminGuard>
  )
}

export default function SystemAdminPage() {
  return (
    <Suspense fallback={<InitialDashboardLoader />}>
      <SystemAdminPageWithView />
    </Suspense>
  )
}
