"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import { toast } from "sonner";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/shared/Sidebar";
import ConfirmModal from "@/components/shared/ConfirmModal";
import PromptModal from "@/components/shared/PromptModal";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import { TOTPChallengeModal } from "@/components/shared/TOTPChallengeModal";
import { AdminGuard } from "@/components/shared/AuthGuard";

import StaffDirectoryTab from "@/components/admin/StaffDirectoryTab";
import RegisterAccountTab from "@/components/admin/RegisterAccountTab";
import AuditLogsTab from "@/components/admin/AuditLogsTab";
import BackupMaintenanceTab from "@/components/admin/BackupMaintenanceTab";
import EditUserModal from "@/components/admin/EditUserModal";
import SystemConfigTab from "@/components/admin/SystemConfigTab";
import DigitalRecordsReviewTab from "@/components/admin/DigitalRecordsReviewTab";
import SystemAnalyticsTab from "@/components/admin/SystemAnalyticsTab";
import SLAAnalyticsTab from "@/components/admin/SLAAnalyticsTab";
import StorageLayoutEditorTab from "@/components/admin/StorageLayoutEditorTab";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { formatPHDateTime } from "@/lib/timeFormat";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import DefaultPasswordModal from "@/components/shared/DefaultPasswordModal";

function AdminPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const loadedViewsRef = useRef({
    directory: false,
    logs: false,
    system: false,
    backup: false,
    review: false,
    request_analytics: false,
    system_data: true,
    create: true,
  });

  const [view, setView] = useState("directory");
  const [viewLoading, setViewLoading] = useState({
    directory: false,
    logs: false,
    system: false,
    backup: false,
    review: false,
    request_analytics: false,
  });

  const [staffData, setStaffData] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logsPerPage, setLogsPerPage] = useState(20);
  const [logSearch, setLogSearch] = useState("");
  const [logsMineOnly, setLogsMineOnly] = useState(false);

  const [systemHealth, setSystemHealth] = useState({
    cpu: 0,
    disk: { total: 0, free: 0, percent: 0 },
    dbSize: "0 KB",
    dbStatus: "Healthy",
  });
  const [backups, setBackups] = useState([]);
  const [reviewRecords, setReviewRecords] = useState([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState("All");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [createForm, setCreateForm] = useState({
    id: "",
    role: "",
    fname: "",
    lname: "",
    email: "",
    status: "Active",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editOriginalId, setEditOriginalId] = useState("");
  const [editForm, setEditForm] = useState({
    id: "",
    role: "",
    fname: "",
    lname: "",
    email: "",
    status: "Active",
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [backupDeleteOpen, setBackupDeleteOpen] = useState(false);
  const [backupDeleteTarget, setBackupDeleteTarget] = useState(null);
  const [backupDeleteLoading, setBackupDeleteLoading] = useState(false);

  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const [totpModalOpen, setTotpModalOpen] = useState(false);
  const [totpModalLoading, setTotpModalLoading] = useState(false);
  const totpPendingActionRef = useRef(null);
  const [totpActionLabel, setTotpActionLabel] = useState("Confirm");
  const [totpModalDescription, setTotpModalDescription] = useState("Enter the 6-digit code from your authenticator app to confirm this action.");

  const [authUser, setAuthUser] = useState(null);

  const [defaultPwOpen, setDefaultPwOpen] = useState(false);
  const [defaultPwUserLabel, setDefaultPwUserLabel] = useState("");
  const [defaultReturnedPw, setDefaultReturnedPw] = useState("");
  const [declinePromptOpen, setDeclinePromptOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [pendingDeclineDocId, setPendingDeclineDocId] = useState(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState({
    docId: null,
    docType: "",
    studentName: "",
    studentNo: "",
    refId: "",
  });

  const showToast = useCallback((msg, typeOrIsError = false, autoHide = true) => {
    const isRich = msg && typeof msg === "object" && msg.title;
    const title = isRich ? msg.title : String(msg || "");
    const opts = isRich && msg.description ? { description: msg.description } : {};

    if (typeOrIsError === true || typeOrIsError === "error") {
      toast.error(title, opts);
      return;
    }
    if (typeOrIsError === "warning") {
      toast.warning(title, opts);
      return;
    }
    if (!autoHide) {
      toast.message(title, { ...opts, duration: 5000 });
      return;
    }
    toast.success(title, opts);
  }, []);

  const executeWithTOTP = useCallback(async (action, actionLabel, hasToken = false) => {
    setTotpActionLabel(actionLabel);
    totpPendingActionRef.current = action;
    setTotpModalOpen(true);
  }, []);

  const handleTOTPConfirm = useCallback(async (token) => {
    if (!totpPendingActionRef.current) return;
    setTotpModalLoading(true);
    try {
      await totpPendingActionRef.current(token);
      setTotpModalOpen(false);
    } catch (err) {
      const msg = err?.message || "Action failed";
      const clean = msg.replace(/^TOTP verification required:\s*/i, "");
      throw new Error(clean);
    } finally {
      setTotpModalLoading(false);
    }
  }, []);

  const refreshStaff = useCallback(async () => {
    setViewLoading((prev) => ({ ...prev, directory: true }));
    try {
      const res = await fetch("/api/staff?limit=500");
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to load staff");
      setStaffData(Array.isArray(json.data) ? json.data : []);
      loadedViewsRef.current.directory = true;
    } catch (err) {
      showToast({ title: "Load Failed", description: err.message }, true);
    } finally {
      setViewLoading((prev) => ({ ...prev, directory: false }));
    }
  }, [showToast]);

  const refreshAuditLogs = useCallback(async () => {
    setViewLoading((prev) => ({ ...prev, logs: true }));
    try {
      const offset = (logPage - 1) * logsPerPage;
      const mineQuery = logsMineOnly ? "&mine=1" : "";
      const resLogs = await fetch(
        `/api/audit-logs?limit=${logsPerPage}&offset=${offset}&search=${encodeURIComponent(logSearch)}${mineQuery}`,
      );
      const jsonLogs = await resLogs.json();
      if (!resLogs.ok || !jsonLogs?.ok)
        throw new Error(jsonLogs?.error || "Failed to load audit logs");

      setLogTotal(jsonLogs.total || 0);
      const rows = Array.isArray(jsonLogs.data) ? jsonLogs.data : [];
      setAuditLogs(
        rows.map((r) => ({
          time: formatPHDateTime(r.created_at),
          user: r.actor,
          role: r.role,
          action: r.action,
          ip: r.ip || "—",
        })),
      );
      loadedViewsRef.current.logs = true;
    } catch (err) {
      // silent
    } finally {
      setViewLoading((prev) => ({ ...prev, logs: false }));
    }
  }, [logPage, logsPerPage, logSearch, logsMineOnly]);

  const refreshSystemHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/system/health", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json?.ok) {
        setSystemHealth(json.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const refreshBackups = useCallback(async () => {
    setViewLoading((prev) => ({ ...prev, system: true, backup: true }));
    try {
      const res = await fetch(`/api/system/backup?t=${Date.now()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        setBackups(Array.isArray(json.data) ? json.data : []);
        loadedViewsRef.current.system = true;
        loadedViewsRef.current.backup = true;
      }
    } catch (err) {
      console.error("Failed to refresh backups:", err);
    } finally {
      setViewLoading((prev) => ({ ...prev, system: false, backup: false }));
    }
  }, []);

  const refreshReviewRecords = useCallback(async () => {
    setViewLoading((prev) => ({ ...prev, review: true }));
    try {
      const approvalStatus =
        reviewStatusFilter === "All" ? "" : `&approvalStatus=${encodeURIComponent(reviewStatusFilter)}`;
      const res = await fetch(`/api/documents?limit=200${approvalStatus}`);
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load review records");
      }
      setReviewRecords(Array.isArray(json.data) ? json.data : []);
      loadedViewsRef.current.review = true;
    } catch (err) {
      showToast({ title: "Load Failed", description: err?.message || "Unable to fetch review records." }, true);
    } finally {
      setViewLoading((prev) => ({ ...prev, review: false }));
    }
  }, [reviewStatusFilter, showToast]);

  const logAdminAction = useCallback(
    async (action) => {
      try {
        await fetch("/api/audit-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor: authUser ? `${authUser.fname} ${authUser.lname}`.trim() : "Admin User",
            role: authUser ? authUser.role : "Admin",
            action,
            ip: "localhost",
          }),
        });
        refreshAuditLogs();
      } catch {
        // ignore
      }
    },
    [refreshAuditLogs, authUser],
  );

  useEffect(() => {
    const tab = String(searchParams?.get("tab") || "").trim();
    const mine = searchParams?.get("mine") === "1";
    const allowedTabs = new Set([
      "directory",
      "create",
      "logs",
      "system_data",
      "review",
      "digitization",
      "request_analytics",
      "system",
      "backup",
      "storage_layout"
    ]);
    if (allowedTabs.has(tab)) setView(tab);
    setLogsMineOnly(mine);
    if (mine) setLogPage(1);
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          router.push("/");
          return;
        }
        setAuthUser(json.data);
        setLoading(false);
        setTimeout(() => {
          refreshStaff();
          refreshSystemHealth();
        }, 0);
      } catch {
        router.push("/");
      }
    })();
  }, [router, refreshStaff, refreshSystemHealth]);

  useEffect(() => {
    const timer = setInterval(refreshSystemHealth, 10000);
    return () => clearInterval(timer);
  }, [refreshSystemHealth]);

  useEffect(() => {
    if (view === "backup" || view === "system") {
      setTimeout(() => {
        refreshBackups();
        refreshSystemHealth();
      }, 0);
    }
  }, [view, refreshBackups, refreshSystemHealth]);

  useEffect(() => {
    if (view === "logs") {
      setTimeout(() => {
        refreshAuditLogs();
      }, 0);
    }
  }, [view, refreshAuditLogs]);

  useEffect(() => {
    if (view === "review") {
      setTimeout(() => {
        refreshReviewRecords();
      }, 0);
    }
  }, [view, refreshReviewRecords]);

  const switchView = useCallback((nextView) => {
    setView(nextView);
    if (nextView === "directory" && !loadedViewsRef.current.directory) {
      setTimeout(() => refreshStaff(), 0);
    }
    if (nextView === "logs" && !loadedViewsRef.current.logs) {
      setTimeout(() => refreshAuditLogs(), 0);
    }
    if ((nextView === "system" || nextView === "backup") && !loadedViewsRef.current.system) {
      setTimeout(() => refreshBackups(), 0);
    }
    if (nextView === "review" && !loadedViewsRef.current.review) {
      setTimeout(() => refreshReviewRecords(), 0);
    }
  }, [refreshAuditLogs, refreshBackups, refreshStaff, refreshReviewRecords]);

  const handleSidebarSelect = useCallback(
    (key) => {
      switchView(key);
    },
    [switchView]
  );

  const reviewDocumentStatus = useCallback(
    async (id, approvalStatus, reviewNote = "") => {
      try {
        const res = await fetch(`/api/documents/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvalStatus, reviewNote }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to review document");
        }
        showToast({ title: "Review Complete", description: `The document has been ${approvalStatus.toLowerCase()}.` });
        refreshReviewRecords();
      } catch (err) {
        showToast({ title: "Review Failed", description: err?.message || "Unable to update document status." }, true);
      }
    },
    [refreshReviewRecords, showToast]
  );

  const openDeclinePrompt = useCallback((id) => {
    setPendingDeclineDocId(id);
    setDeclineReason("");
    setDeclinePromptOpen(true);
  }, []);

  const submitDeclineWithReason = useCallback(async () => {
    if (!pendingDeclineDocId) return;
    const id = pendingDeclineDocId;
    const note = declineReason;
    setDeclinePromptOpen(false);
    setPendingDeclineDocId(null);
    setDeclineReason("");
    await reviewDocumentStatus(id, "Declined", note);
  }, [pendingDeclineDocId, declineReason, reviewDocumentStatus]);

  const handlePreviewDocument = useCallback((preview) => {
    setPreviewData(preview);
    setPreviewOpen(true);
  }, []);

  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = io({ path: "/api/socket", addTrailingSlash: false });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit("adminSubscribe");
    const onStaffLogin = (data) => {
      setStaffData((prev) => {
        const index = prev.findIndex((s) => s.id === data.staffId);
        if (index === -1) return prev;
        const next = [...prev];
        next[index] = {
          ...next[index],
          status: "Active",
          last_active: data.last_active || new Date().toISOString(),
        };
        return next;
      });
    };
    const onStaffLogout = (data) => {
      setStaffData((prev) => {
        const index = prev.findIndex((s) => s.id === data.staffId);
        if (index === -1) return prev;
        const next = [...prev];
        next[index] = { ...next[index], status: "Inactive" };
        return next;
      });
    };
    socket.on("staffLogin", onStaffLogin);
    socket.on("staffLogout", onStaffLogout);
    return () => {
      socket.off("staffLogin", onStaffLogin);
      socket.off("staffLogout", onStaffLogout);
    };
  }, [socket, showToast, refreshBackups]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    router.push("/");
  };

  const handleCreate = async (e, totpToken = null) => {
    if (e) e.preventDefault();
    const section = createForm.role === "Admin" ? "Administrative" : "Records";
    const headers = { "Content-Type": "application/json" };
    if (totpToken) headers["x-totp-token"] = totpToken;
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...createForm, section }),
      });
      const json = await res.json();
      if (res.status === 403 && json?.requiresTOTP) {
        if (totpToken) throw new Error(json.error || "Invalid verification code");
        await executeWithTOTP((token) => handleCreate(null, token), "Create Staff", true);
        return;
      }
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to create staff");
      setStaffData((prev) => [json.data, ...prev]);
      showToast({ title: "Account Created", description: `Staff account for ${createForm.fname} ${createForm.lname} is now active.` });
      setDefaultPwUserLabel(`${createForm.fname} ${createForm.lname}`.trim() || createForm.id);
      setDefaultReturnedPw(json.defaultPassword || "pupstaff");
      setDefaultPwOpen(true);
      setCreateForm({ id: "", role: "", fname: "", lname: "", email: "", status: "Active" });
      switchView("directory");
    } catch (err) {
      if (totpToken) throw err;
      showToast({ title: "Creation Failed", description: err.message }, true);
    }
  };

  const handleEditSubmit = async (e, totpToken = null) => {
    if (e) e.preventDefault();
    const section = editForm.role === "Admin" ? "Administrative" : "Records";
    const headers = { "Content-Type": "application/json" };
    if (totpToken) headers["x-totp-token"] = totpToken;
    try {
      const res = await fetch(`/api/staff/${editOriginalId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ ...editForm, section }),
      });
      const json = await res.json();
      if (res.status === 403 && json?.requiresTOTP) {
        if (totpToken) throw new Error(json.error || "Invalid verification code");
        await executeWithTOTP((token) => handleEditSubmit(null, token), "Update Staff", true);
        return;
      }
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to update staff");
      setStaffData((prev) => prev.map((u) => (u.id === editOriginalId ? json.data : u)));
      showToast({ title: "Account Updated", description: "Staff profile changes have been saved." });
      setEditOpen(false);
    } catch (err) {
      if (totpToken) throw err;
      showToast({ title: "Update Failed", description: err.message }, true);
    }
  };

  const confirmDelete = async (tokenOrEvent = null, targetId = null, targetName = null) => {
    const totpToken = typeof tokenOrEvent === "string" ? tokenOrEvent : null;
    const id = targetId || deleteTarget?.id;
    if (!id || deleteLoading) return;
    setDeleteLoading(true);
    const headers = {};
    if (totpToken) headers["x-totp-token"] = totpToken;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE", headers });
      const json = await res.json();
      if (res.status === 403 && json?.requiresTOTP) {
        if (totpToken) throw new Error(json.error || "Invalid verification code");
        setDeleteLoading(false);
        await executeWithTOTP((token) => confirmDelete(token, id, targetName), "Delete Staff", true);
        return;
      }
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to delete staff");
      setStaffData((prev) => prev.filter((s) => s.id !== id));
      showToast({ title: "Account Removed", description: "The staff account has been permanently deleted." });
      setDeleteOpen(false);
    } catch (err) {
      if (totpToken) throw err;
      showToast({ title: "Deletion Failed", description: err.message }, true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const simulateBackup = async (tokenOrEvent = null) => {
    const totpToken = typeof tokenOrEvent === "string" ? tokenOrEvent : null;
    const headers = {};
    if (totpToken) headers["x-totp-token"] = totpToken;

    const performBackup = async () => {
      const res = await fetch("/api/system/backup", { method: "POST", headers });
      const json = await res.json();
      if (res.status === 403 && json?.requiresTOTP) {
        if (totpToken) throw new Error(json.error || "Invalid verification code");
        throw { requiresTOTP: true };
      }
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to create backup");
      if (json.data?.id) {
        const link = document.createElement("a");
        link.href = `/api/system/backup/download?id=${json.data.id}`;
        link.download = json.data.filename;
        link.click();
      }
      refreshBackups();
      return json?.data?.filename || "backup package";
    };

    if (totpToken) {
      const filename = await performBackup();
      showToast({ title: "Backup Complete", description: `Package ready: ${filename}` });
      return;
    }

    await toast.promise(
      performBackup(),
      {
        loading: "Creating full system backup…",
        success: (filename) => ({ title: "Backup Complete", description: `Package ready: ${filename}` }),
        error: (err) => {
          if (err?.requiresTOTP) {
            executeWithTOTP((token) => simulateBackup(token), "Create Backup", true);
            return { title: "Verification Required", description: "Please verify your identity" };
          }
          return { title: "Backup Failed", description: err?.message || "Unable to create system backup." };
        },
      }
    );
  };

  const syncExternal = async (id) => {
    showToast({ title: "Sync In Progress", description: "Transferring encrypted backup to external drive…" }, false, false);
    try {
      const res = await fetch("/api/system/backup/sync-external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Sync failed");
      showToast({ title: "Sync Complete", description: "Backup has been transferred to the external drive." });
      refreshBackups();
    } catch (err) {
      showToast({ title: "Sync Failed", description: err.message }, true);
    }
  };

  const confirmDeleteBackup = async () => {
    if (!backupDeleteTarget || backupDeleteLoading) return;
    setBackupDeleteLoading(true);
    try {
      const res = await fetch(`/api/system/backup/${backupDeleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to delete backup");
      showToast({ title: "Backup Removed", description: "The selected backup has been permanently deleted." });
      setBackupDeleteOpen(false);
      refreshBackups();
    } catch (err) {
      showToast({ title: "Deletion Failed", description: err.message }, true);
    } finally {
      setBackupDeleteLoading(false);
    }
  };

  const confirmRestore = async (tokenOrEvent = null) => {
    const totpToken = typeof tokenOrEvent === "string" ? tokenOrEvent : null;
    if (!restoreFile || restoreLoading) return;
    setRestoreLoading(true);
    const formData = new FormData();
    formData.append("file", restoreFile);
    const headers = {};
    if (totpToken) headers["x-totp-token"] = totpToken;
    try {
      const res = await fetch("/api/system/backup/restore", { method: "POST", headers, body: formData });
      const json = await res.json();
      if (res.status === 403 && json?.requiresTOTP) {
        if (totpToken) throw new Error(json.error || "Invalid verification code");
        setRestoreLoading(false);
        await executeWithTOTP((token) => confirmRestore(token), "Restore System", true);
        return;
      }
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to restore system");
      showToast({ title: "System Restored", description: "Database restored from backup. Reloading in 3s…" });
      setTimeout(() => location.reload(), 3000);
    } catch (err) {
      if (totpToken) throw err;
      showToast({ title: "Restore Failed", description: err.message }, true);
      setRestoreLoading(false);
    }
  };

  const exportData = () => {
    let csv = "ID,First Name,Last Name,Role,Status,Email\n";
    staffData.forEach((s) => { csv += `${s.id},${s.fname},${s.lname},${s.role},${s.status},${s.email}\n`; });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    link.setAttribute("download", "pup_staff_list.csv");
    link.click();
  };

  const sidebarItems = [
    { type: "header", label: "User Management" },
    { key: "directory", label: "Staff Directory", iconClass: "ph-bold ph-users" },
    { key: "create", label: "Register Account", iconClass: "ph-bold ph-user-plus" },
    { type: "header", label: "Operations & Analytics" },
    { key: "review", label: "Digital Records Review", iconClass: "ph-bold ph-seal-check" },
    {
      type: "accordion",
      key: "analytics",
      label: "System Analytics",
      iconClass: "ph-bold ph-chart-line-up",
      children: [
        { key: "digitization", label: "Compliance Analysis", iconClass: "ph-bold ph-chart-bar" },
        { key: "request_analytics", label: "Request Analysis", iconClass: "ph-bold ph-trend-up" },
      ]
    },
    { type: "header", label: "System Configuration" },
    { key: "storage_layout", label: "Storage Layout", iconClass: "ph-bold ph-warehouse" },
    { key: "system_data", label: "System Data", iconClass: "ph-bold ph-gear" },
    { key: "system", label: "Backup & Maintenance", iconClass: "ph-bold ph-database" },
    { key: "logs", label: "Audit Logs", iconClass: "ph-bold ph-scroll" },
  ];

  const sidebarActiveKey = view === "backup" ? "system" : view;

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col font-inter overflow-hidden p-4 gap-4">
        <Skeleton className="h-16 w-full rounded-brand shrink-0" />
        <div className="flex-1 flex gap-4">
          <Skeleton className="w-[30%] h-full rounded-brand" />
          <Skeleton className="w-[70%] h-full rounded-brand" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 font-inter">
      <Header authUser={authUser} onLogout={handleLogout} />
      <Tabs value={sidebarActiveKey} onValueChange={handleSidebarSelect} orientation="vertical" className="flex-1 flex overflow-hidden w-full gap-0">
        <Sidebar items={sidebarItems} activeKey={sidebarActiveKey} onSelect={handleSidebarSelect} />
        <main className="flex-1 overflow-hidden p-4 relative w-full min-w-0">
          <TabsContent value="directory" className="h-full m-0 border-0 focus-visible:ring-0">
            <StaffDirectoryTab
              staffData={staffData}
              isLoading={viewLoading.directory}
              currentUserId={authUser?.id}
              search={search}
              setSearch={setSearch}
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onEditUser={(id) => {
                const u = staffData.find((s) => s.id === id);
                if (!u) return;
                setEditOriginalId(u.id);
                setEditForm({ ...u });
                setEditOpen(true);
              }}
              onDeleteUser={(id) => {
                const u = staffData.find((s) => s.id === id);
                if (!u) return;
                if (authUser?.totp_enabled) {
                  setDeleteTarget(u);
                  setTotpActionLabel("Delete Account");
                  setTotpModalDescription(`Enter your authenticator code to permanently delete ${u.fname}'s account.`);
                  totpPendingActionRef.current = async (token) => confirmDelete(token, u.id, u.fname);
                  setTotpModalOpen(true);
                } else {
                  setDeleteTarget(u);
                  setDeleteOpen(true);
                }
              }}
              onExportData={exportData}
              onSwitchView={switchView}
            />
          </TabsContent>

          <TabsContent value="create" className="h-full m-0 border-0 focus-visible:ring-0">
            <RegisterAccountTab
              createForm={createForm}
              setCreateForm={setCreateForm}
              onResetForm={() => setCreateForm({ id: "", role: "", fname: "", lname: "", email: "", status: "Active" })}
              onCreateAccount={handleCreate}
              onSwitchView={switchView}
            />
          </TabsContent>

          <TabsContent value="logs" className="h-full m-0 border-0 focus-visible:ring-0">
            <AuditLogsTab
              displayLogs={auditLogs}
              isLoading={viewLoading.logs}
              logPage={logPage}
              setLogPage={setLogPage}
              logTotal={logTotal}
              logsPerPage={logsPerPage}
              setLogsPerPage={setLogsPerPage}
              logSearch={logSearch}
              setLogSearch={setLogSearch}
            />
          </TabsContent>

          <TabsContent value="system_data" className="h-full m-0 border-0 focus-visible:ring-0">
            <SystemConfigTab
              showToast={showToast}
              onLogAction={logAdminAction}
              onVerifyTOTP={(action) => executeWithTOTP(action, "Save Security Questions")}
            />
          </TabsContent>

          <TabsContent value="storage_layout" className="h-full m-0 border-0 focus-visible:ring-0">
            <StorageLayoutEditorTab showToast={showToast} />
          </TabsContent>

          <TabsContent value="review" className="h-full m-0 border-0 focus-visible:ring-0">
            <DigitalRecordsReviewTab
              records={reviewRecords}
              isLoading={viewLoading.review}
              statusFilter={reviewStatusFilter}
              setStatusFilter={setReviewStatusFilter}
              onRefresh={refreshReviewRecords}
              onApprove={(id) => reviewDocumentStatus(id, "Approved")}
              onDecline={openDeclinePrompt}
              onPreviewDocument={handlePreviewDocument}
            />
          </TabsContent>

          <TabsContent value="digitization" className="h-full m-0 border-0 focus-visible:ring-0">
            <SystemAnalyticsTab showToast={showToast} onLogAction={logAdminAction} />
          </TabsContent>

          <TabsContent value="request_analytics" className="h-full m-0 border-0 focus-visible:ring-0">
            <SLAAnalyticsTab showToast={showToast} onLogAction={logAdminAction} />
          </TabsContent>

          <TabsContent value="system" className="h-full m-0 border-0 focus-visible:ring-0">
            <BackupMaintenanceTab
              systemHealth={systemHealth}
              backups={backups}
              isLoading={viewLoading.system || viewLoading.backup}
              onSimulateBackup={simulateBackup}
              onSyncExternal={syncExternal}
              onDownloadBackup={(b) => {
                const link = document.createElement("a");
                link.href = `/api/system/backup/download?id=${b.id}`;
                link.download = b.filename;
                link.click();
              }}
              onDeleteBackup={(id) => {
                const b = backups.find((x) => x.id === id);
                if (b) { setBackupDeleteTarget(b); setBackupDeleteOpen(true); }
              }}
              onRestoreFileChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setRestoreFile(f); setRestoreConfirmOpen(true); e.target.value = ""; }
              }}
              showToast={showToast}
            />
          </TabsContent>
        </main>
      </Tabs>

      <Footer />

      <EditUserModal open={editOpen} editForm={editForm} setEditForm={setEditForm} onClose={() => setEditOpen(false)} onSubmit={handleEditSubmit} />
      <ConfirmModal open={deleteOpen} title="Remove Personnel Profile" message={`This will permanently delete ${deleteTarget?.fname}'s account. This action cannot be undone.`} confirmLabel="Remove Account" onConfirm={confirmDelete} onCancel={() => setDeleteOpen(false)} isLoading={deleteLoading} />
      <ConfirmModal open={backupDeleteOpen} title="Delete System Backup" message={`Permanently remove ${backupDeleteTarget?.filename}? This volume cannot be recovered once destroyed.`} confirmLabel="Destroy Volume" onConfirm={confirmDeleteBackup} onCancel={() => setBackupDeleteOpen(false)} isLoading={backupDeleteLoading} />
      <ConfirmModal open={restoreConfirmOpen} title="Restore System Image" variant="warning" message={`Overwrite all repository data with ${restoreFile?.name}? This action is irreversible.`} confirmLabel="Begin Restoration" onConfirm={confirmRestore} onCancel={() => setRestoreConfirmOpen(false)} isLoading={restoreLoading} />

      <PromptModal
        open={declinePromptOpen}
        title="Decline Reason"
        message="Provide a reason for declining this document (optional)."
        value={declineReason}
        onChange={setDeclineReason}
        onConfirm={submitDeclineWithReason}
        onCancel={() => { setDeclinePromptOpen(false); setPendingDeclineDocId(null); setDeclineReason(""); }}
        confirmLabel="Submit Decline"
        placeholder="Enter reason..."
        multiline
      />

      <PDFPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} preview={previewData} />
      <DefaultPasswordModal open={defaultPwOpen} onClose={() => setDefaultPwOpen(false)} userName={defaultPwUserLabel} password={defaultReturnedPw} />
      <TOTPChallengeModal open={totpModalOpen} onOpenChange={setTotpModalOpen} onConfirm={handleTOTPConfirm} actionLabel={totpActionLabel} description={totpModalDescription} isLoading={totpModalLoading} />
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <Suspense fallback={
        <div className="h-screen bg-gray-50 flex flex-col font-inter overflow-hidden p-4 gap-4">
          <Skeleton className="h-16 w-full rounded-brand shrink-0" />
          <div className="flex-1 flex gap-4">
            <Skeleton className="w-[30%] h-full rounded-brand" />
            <Skeleton className="w-[70%] h-full rounded-brand" />
          </div>
        </div>
      }>
        <AdminPageContent />
      </Suspense>
    </AdminGuard>
  );
}
