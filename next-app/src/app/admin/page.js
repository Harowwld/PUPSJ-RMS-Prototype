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
import { formatPHDateTime } from "@/lib/timeFormat";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [totpPendingAction, setTotpPendingAction] = useState(null);
  const [totpActionLabel, setTotpActionLabel] = useState("Confirm");

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
    setTotpPendingAction(() => action);
    setTotpModalOpen(true);
  }, []);

  const handleTOTPConfirm = useCallback(async (token) => {
    if (!totpPendingAction) return;
    setTotpModalLoading(true);
    try {
      await totpPendingAction(token);
      setTotpModalOpen(false);
    } catch (err) {
      const msg = err?.message || "Action failed";
      const clean = msg.includes("TOTP verification required: ")
        ? msg.replace("TOTP verification required: ", "")
        : msg;
      throw new Error(clean);
    } finally {
      setTotpModalLoading(false);
    }
  }, [totpPendingAction]);

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
        // Render first, then hydrate data in background.
        setLoading(false);
        setTimeout(() => {
          refreshStaff();
          refreshSystemHealth();
        }, 0);
      } catch {
        router.push("/");
      }
    })();
  }, [router, refreshStaff, refreshAuditLogs, refreshSystemHealth]);

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
      // Render the tab first, then hydrate data in the background.
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
      setTimeout(() => {
        refreshStaff();
      }, 0);
    }
    if (nextView === "logs" && !loadedViewsRef.current.logs) {
      setTimeout(() => {
        refreshAuditLogs();
      }, 0);
    }
    if (
      (nextView === "system" || nextView === "backup") &&
      !loadedViewsRef.current.system
    ) {
      setTimeout(() => {
        refreshBackups();
      }, 0);
    }
    if (nextView === "review" && !loadedViewsRef.current.review) {
      setTimeout(() => {
        refreshReviewRecords();
      }, 0);
    }
  }, [refreshAuditLogs, refreshBackups, refreshStaff, refreshReviewRecords]);

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
    [refreshReviewRecords, showToast, logAdminAction]
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
    } catch {
      /* ignore */
    }
    router.push("/");
  };

  const handleCreate = async (e, totpToken = null) => {
    e.preventDefault();
    const section = createForm.role === "Admin" ? "Administrative" : "Records";
    const headers = { "Content-Type": "application/json" };
    if (totpToken) {
      headers["x-totp-token"] = totpToken;
    }
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...createForm, section }),
      });
      const json = await res.json();
      
      if (res.status === 403) {
        if (json?.requiresTOTP) {
          if (totpToken) {
            throw new Error(json.error || "Invalid verification code");
          }
          await executeWithTOTP((token) => handleCreate(e, token), "Create Staff", true);
          return;
        }
        throw new Error(json?.error || "Access denied");
      }
      
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to create staff");

      setStaffData((prev) => [json.data, ...prev]);
      showToast({ title: "Account Created", description: `Staff account for ${createForm.fname} ${createForm.lname} is now active.` });
      setDefaultPwUserLabel(
        `${createForm.fname} ${createForm.lname}`.trim() || createForm.id,
      );
      setDefaultReturnedPw(json.defaultPassword || "pupstaff");
      setDefaultPwOpen(true);
      setCreateForm({
        id: "",
        role: "",
        fname: "",
        lname: "",
        email: "",
        status: "Active",
      });
      switchView("directory");
    } catch (err) {
      if (totpToken) throw err;
      showToast({ title: "Creation Failed", description: err.message }, true);
    }
  };

  const handleEditSubmit = async (e, totpToken = null) => {
    e.preventDefault();
    const section = editForm.role === "Admin" ? "Administrative" : "Records";
    const headers = { "Content-Type": "application/json" };
    if (totpToken) {
      headers["x-totp-token"] = totpToken;
    }
    try {
      const res = await fetch(`/api/staff/${editOriginalId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ ...editForm, section }),
      });
      const json = await res.json();
      
      if (res.status === 403) {
        if (json?.requiresTOTP) {
          if (totpToken) {
            throw new Error(json.error || "Invalid verification code");
          }
          await executeWithTOTP((token) => handleEditSubmit(e, token), "Update Staff", true);
          return;
        }
        throw new Error(json?.error || "Access denied");
      }
      
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to update staff");

      setStaffData((prev) =>
        prev.map((u) => (u.id === editOriginalId ? json.data : u)),
      );
      showToast({ title: "Account Updated", description: "Staff profile changes have been saved." });
      setEditOpen(false);
    } catch (err) {
      if (totpToken) throw err;
      showToast({ title: "Update Failed", description: err.message }, true);
    }
  };

  const confirmDelete = async (totpToken = null) => {
    if (!deleteTarget || deleteLoading) return;
    setDeleteLoading(true);
    const headers = {};
    if (totpToken) {
      headers["x-totp-token"] = totpToken;
    }
    try {
      const res = await fetch(`/api/staff/${deleteTarget.id}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      
      if (res.status === 403) {
        if (json?.requiresTOTP) {
          if (totpToken) {
            setDeleteLoading(false);
            throw new Error(json.error || "Invalid verification code");
          }
          setDeleteLoading(false);
          await executeWithTOTP((token) => confirmDelete(token), "Delete Staff", true);
          return;
        }
        throw new Error(json?.error || "Access denied");
      }
      
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to delete staff");
      setStaffData((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      showToast({ title: "Account Removed", description: "The staff account has been permanently deleted." });
      setDeleteOpen(false);
    } catch (err) {
      if (totpToken) throw err;
      showToast({ title: "Deletion Failed", description: err.message }, true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const simulateBackup = async (totpToken = null) => {
    const headers = {};
    if (totpToken) {
      headers["x-totp-token"] = totpToken;
    }
    await toast.promise(
      (async () => {
      const res = await fetch("/api/system/backup", { method: "POST", headers });
      const json = await res.json();
      
      if (res.status === 403) {
        if (json?.requiresTOTP) {
          if (totpToken) {
            throw new Error(json.error || "Invalid verification code");
          }
          throw { requiresTOTP: true };
        }
        throw new Error(json?.error || "Access denied");
      }
      
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to create backup");

      if (json.data?.id) {
        const link = document.createElement("a");
        link.href = `/api/system/backup/download?id=${json.data.id}`;
        link.download = json.data.filename;
        link.click();
      }
      refreshBackups();
      return json?.data?.filename || "backup package";
      })(),
      {
        loading: "Creating full system backup…",
        success: (filename) => ({ title: "Backup Complete", description: `Package ready: ${filename}` }),
        error: (err) => {
          if (err?.requiresTOTP) {
            executeWithTOTP((token) => simulateBackup(token), "Create Backup", true);
            return { title: "Verification Required", description: "Please verify your identity" };
          }
          if (totpToken) throw err;
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
      const res = await fetch(`/api/system/backup/${backupDeleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to delete backup");
      showToast({ title: "Backup Removed", description: "The selected backup has been permanently deleted." });
      setBackupDeleteOpen(false);
      refreshBackups();
    } catch (err) {
      showToast({ title: "Deletion Failed", description: err.message }, true);
    } finally {
      setBackupDeleteLoading(false);
    }
  };

  const confirmRestore = async (totpToken = null) => {
    if (!restoreFile || restoreLoading) return;
    setRestoreLoading(true);
    const formData = new FormData();
    formData.append("file", restoreFile);
    const headers = {};
    if (totpToken) {
      headers["x-totp-token"] = totpToken;
    }
    try {
      const res = await fetch("/api/system/backup/restore", {
        method: "POST",
        headers,
        body: formData,
      });
      const json = await res.json();
      
      if (res.status === 403) {
        if (json?.requiresTOTP) {
          if (totpToken) {
            setRestoreLoading(false);
            throw new Error(json.error || "Invalid verification code");
          }
          setRestoreLoading(false);
          await executeWithTOTP((token) => confirmRestore(token), "Restore System", true);
          return;
        }
        throw new Error(json?.error || "Access denied");
      }
      
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to restore system");
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
    staffData.forEach((s) => {
      csv += `${s.id},${s.fname},${s.lname},${s.role},${s.status},${s.email}\n`;
    });
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
        {
          key: "digitization",
          label: "Compliance Analysis",
          iconClass: "ph-bold ph-chart-bar",
        },
        {
          key: "request_analytics",
          label: "Request Analysis",
          iconClass: "ph-bold ph-trend-up",
        },
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

      <div className="flex-1 flex overflow-hidden w-full">
        <Sidebar items={sidebarItems} activeKey={sidebarActiveKey} onSelect={switchView} />

        <main className="flex-1 overflow-hidden p-4 relative w-full min-w-0">
        {view === "directory" && (
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
              if (u) {
                setDeleteTarget(u);
                setDeleteOpen(true);
              }
            }}
            onExportData={exportData}
            onSwitchView={switchView}
          />
        )}

        {view === "create" && (
          <RegisterAccountTab
            createForm={createForm}
            setCreateForm={setCreateForm}
            onResetForm={() =>
              setCreateForm({
                id: "",
                role: "",
                fname: "",
                lname: "",
                email: "",
                status: "Active",
              })
            }
            onCreateAccount={handleCreate}
            onSwitchView={switchView}
          />
        )}

        {view === "logs" && (
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
        )}

        {view === "system_data" && (
          <SystemConfigTab
            showToast={showToast}
            logAdminAction={logAdminAction}
            onVerifyTOTP={(action) => executeWithTOTP(action, "Save Security Questions", true)}
          />
        )}

        {view === "storage_layout" && (
          <StorageLayoutEditorTab showToast={showToast} />
        )}

        {view === "review" && (
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
        )}

        {view === "digitization" && (
          <SystemAnalyticsTab
            showToast={showToast}
            onLogAction={logAdminAction}
          />
        )}

        {view === "request_analytics" && (
          <SLAAnalyticsTab
            showToast={showToast}
            onLogAction={logAdminAction}
          />
        )}

        {(view === "system" || view === "backup") && (
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
              if (b) {
                setBackupDeleteTarget(b);
                setBackupDeleteOpen(true);
              }
            }}
            onRestoreFileChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setRestoreFile(f);
                setRestoreConfirmOpen(true);
                e.target.value = "";
              }
            }}
            showToast={showToast}
          />
        )}
        </main>
      </div>

      <Footer />

      <EditUserModal
        open={editOpen}
        editForm={editForm}
        setEditForm={setEditForm}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSubmit}
      />

      <ConfirmModal
        open={deleteOpen}
        title="Remove Personnel Profile"
        message={`This will permanently delete ${deleteTarget?.fname}'s account. This action cannot be undone.`}
        confirmLabel="Remove Account"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
        isLoading={deleteLoading}
      />

      <ConfirmModal
        open={backupDeleteOpen}
        title="Delete System Backup"
        message={`Permanently remove ${backupDeleteTarget?.filename}? This volume cannot be recovered once destroyed.`}
        confirmLabel="Destroy Volume"
        onConfirm={confirmDeleteBackup}
        onCancel={() => setBackupDeleteOpen(false)}
        isLoading={backupDeleteLoading}
      />

      <ConfirmModal
        open={restoreConfirmOpen}
        title="Restore System Image"
        variant="warning"
        message={`Overwrite all repository data with ${restoreFile?.name}? This action is irreversible.`}
        confirmLabel="Begin Restoration"
        onConfirm={confirmRestore}
        onCancel={() => setRestoreConfirmOpen(false)}
        isLoading={restoreLoading}
      />

      <PromptModal
        open={declinePromptOpen}
        title="Decline Reason"
        message="Provide a reason for declining this document (optional)."
        value={declineReason}
        onChange={setDeclineReason}
        onConfirm={submitDeclineWithReason}
        onCancel={() => {
          setDeclinePromptOpen(false);
          setPendingDeclineDocId(null);
          setDeclineReason("");
        }}
        confirmLabel="Submit Decline"
        placeholder="Enter reason..."
        multiline
      />

      <PDFPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        preview={previewData}
      />

      <Dialog open={defaultPwOpen} onOpenChange={setDefaultPwOpen}>
        <DialogContent className="sm:max-w-2xl max-w-2xl w-full p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-key text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                  Staff Account Created
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
                  System account configured successfully. Securely record the following temporary credentials before closing this window.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Default Password for <span className="text-pup-maroon font-black">{defaultPwUserLabel}</span>
              </label>
              <Input
                type="text"
                readOnly
                className="h-12 font-mono font-bold bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                value={defaultReturnedPw}
              />
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDefaultPwOpen(false)}
              className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
            >
              Close
            </Button>
            <Button
              onClick={() => setDefaultPwOpen(false)}
              className="h-11 px-6 bg-pup-maroon text-white hover:bg-red-900 shadow-sm font-bold flex items-center gap-2 rounded-brand"
            >
              <i className="ph-bold ph-check"></i>
              Acknowledge
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TOTPChallengeModal
        open={totpModalOpen}
        onOpenChange={setTotpModalOpen}
        onConfirm={handleTOTPConfirm}
        actionLabel={totpActionLabel}
        isLoading={totpModalLoading}
      />

    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-gray-50 flex flex-col font-inter overflow-hidden p-4 gap-4">
          <Skeleton className="h-16 w-full rounded-brand shrink-0" />
          <div className="flex-1 flex gap-4">
            <Skeleton className="w-[30%] h-full rounded-brand" />
            <Skeleton className="w-[70%] h-full rounded-brand" />
          </div>
        </div>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
