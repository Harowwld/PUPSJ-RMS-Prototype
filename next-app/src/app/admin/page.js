"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Toast from "@/components/shared/Toast";
import PasswordChangeModal from "@/components/shared/PasswordChangeModal";
import ConfirmModal from "@/components/shared/ConfirmModal";

import StaffDirectoryTab from "@/components/admin/StaffDirectoryTab";
import RegisterAccountTab from "@/components/admin/RegisterAccountTab";
import AuditLogsTab from "@/components/admin/AuditLogsTab";
import BackupMaintenanceTab from "@/components/admin/BackupMaintenanceTab";
import EditUserModal from "@/components/admin/EditUserModal";
import SystemConfigTab from "@/components/admin/SystemConfigTab";

export default function AdminPage() {
  const router = useRouter();
  const toastTimerRef = useRef(null);

  const [view, setView] = useState("directory");
  const [toast, setToast] = useState({ open: false, msg: "", isError: false });

  const [staffData, setStaffData] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logsPerPage, setLogsPerPage] = useState(20);
  const [logSearch, setLogSearch] = useState("");

  const [systemHealth, setSystemHealth] = useState({
    cpu: 0,
    disk: { total: 0, free: 0, percent: 0 },
    dbSize: "0 KB",
    dbStatus: "Healthy",
  });
  const [backups, setBackups] = useState([]);

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

  const [authUser, setAuthUser] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);

  const [defaultPwOpen, setDefaultPwOpen] = useState(false);
  const [defaultPwUserLabel, setDefaultPwUserLabel] = useState("");

  const showToast = useCallback((msg, isError = false, autoHide = true) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ open: true, msg, isError });
    if (autoHide) {
      toastTimerRef.current = setTimeout(() => {
        setToast((t) => ({ ...t, open: false }));
      }, 3000);
    }
  }, []);

  const refreshStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff?limit=500");
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to load staff");
      setStaffData(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      showToast(err.message, true);
    }
  }, [showToast]);

  const refreshAuditLogs = useCallback(async () => {
    try {
      const offset = (logPage - 1) * logsPerPage;
      const resLogs = await fetch(
        `/api/audit-logs?limit=${logsPerPage}&offset=${offset}&search=${encodeURIComponent(logSearch)}`,
      );
      const jsonLogs = await resLogs.json();
      if (!resLogs.ok || !jsonLogs?.ok)
        throw new Error(jsonLogs?.error || "Failed to load audit logs");

      setLogTotal(jsonLogs.total || 0);
      const rows = Array.isArray(jsonLogs.data) ? jsonLogs.data : [];
      setAuditLogs(
        rows.map((r) => ({
          time: r.created_at,
          user: r.actor,
          role: r.role,
          action: r.action,
          ip: r.ip || "—",
        })),
      );
    } catch (err) {
      // silent
    }
  }, [logPage, logsPerPage, logSearch]);

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
    try {
      const res = await fetch(`/api/system/backup?t=${Date.now()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        setBackups(Array.isArray(json.data) ? json.data : []);
      }
    } catch (err) {
      console.error("Failed to refresh backups:", err);
    }
  }, []);

  const logAdminAction = useCallback(
    async (action) => {
      try {
        await fetch("/api/audit-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor: "Admin User",
            role: "Admin",
            action,
            ip: "localhost",
          }),
        });
        refreshAuditLogs();
      } catch {
        // ignore
      }
    },
    [refreshAuditLogs],
  );

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
        if (json?.data?.mustChangePassword) {
          setPwOpen(true);
        }
        refreshStaff();
        refreshAuditLogs();
        refreshSystemHealth();
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
      refreshBackups();
    }
  }, [view, refreshBackups]);

  useEffect(() => {
    if (view === "logs") {
      refreshAuditLogs();
    }
  }, [view, refreshAuditLogs]);

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

  const handleCreate = async (e) => {
    e.preventDefault();
    const section = createForm.role === "Admin" ? "Administrative" : "Records";
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createForm, section }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to create staff");

      setStaffData((prev) => [json.data, ...prev]);
      await logAdminAction(
        `Created account for ${createForm.fname} ${createForm.lname}`,
      );
      showToast(`Account created for ${createForm.fname} ${createForm.lname}!`);
      setDefaultPwUserLabel(
        `${createForm.fname} ${createForm.lname}`.trim() || createForm.id,
      );
      setDefaultPwOpen(true);
      setCreateForm({
        id: "",
        role: "",
        fname: "",
        lname: "",
        email: "",
        status: "Active",
      });
      setView("directory");
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const section = editForm.role === "Admin" ? "Administrative" : "Records";
    try {
      const res = await fetch(`/api/staff/${editOriginalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, section }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to update staff");

      setStaffData((prev) =>
        prev.map((u) => (u.id === editOriginalId ? json.data : u)),
      );
      await logAdminAction(
        `Updated account details for ${json.data.fname} ${json.data.lname}`,
      );
      showToast("Account updated successfully!");
      setEditOpen(false);
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteLoading) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/staff/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to delete staff");
      setStaffData((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      await logAdminAction(`Removed staff account: ${deleteTarget.id}`);
      showToast("User removed successfully.");
      setDeleteOpen(false);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const simulateBackup = async () => {
    showToast("Creating full system backup...", false, false);
    try {
      const res = await fetch("/api/system/backup", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to create backup");

      if (json.data?.id) {
        const link = document.createElement("a");
        link.href = `/api/system/backup/download?id=${json.data.id}`;
        link.download = json.data.filename;
        link.click();
      }
      showToast("Backup created and download started!");
      refreshBackups();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const syncExternal = async (id) => {
    showToast("Syncing encrypted backup to external drive...", false, false);
    try {
      const res = await fetch("/api/system/backup/sync-external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Sync failed");
      showToast("Synced to external drive successfully!");
      refreshBackups();
    } catch (err) {
      showToast(err.message, true);
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
      await logAdminAction(`Deleted backup: ${backupDeleteTarget.filename}`);
      showToast("Backup deleted successfully.");
      setBackupDeleteOpen(false);
      refreshBackups();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setBackupDeleteLoading(false);
    }
  };

  const confirmRestore = async () => {
    if (!restoreFile || restoreLoading) return;
    setRestoreLoading(true);
    const formData = new FormData();
    formData.append("file", restoreFile);
    try {
      const res = await fetch("/api/system/backup/restore", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to restore system");
      await logAdminAction(`Restored system from backup: ${restoreFile.name}`);
      showToast("System restored! Reloading...");
      setTimeout(() => location.reload(), 3000);
    } catch (err) {
      showToast(err.message, true);
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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 font-inter">
      <Header authUser={authUser} onLogout={handleLogout}>
        <button
          onClick={() => setView("directory")}
          className={`btn-nav ${view === "directory" ? "active" : ""}`}
        >
          <i className="ph-bold ph-users"></i> Staff Directory
        </button>
        <button
          onClick={() => setView("create")}
          className={`btn-nav ${view === "create" ? "active" : ""}`}
        >
          <i className="ph-bold ph-user-plus"></i> Register Account
        </button>
        <button
          onClick={() => setView("logs")}
          className={`btn-nav ${view === "logs" ? "active" : ""}`}
        >
          <i className="ph-bold ph-scroll"></i> Audit Logs
        </button>
        <button
          onClick={() => setView("system_data")}
          className={`btn-nav ${view === "system_data" ? "active" : ""}`}
        >
          <i className="ph-bold ph-gear"></i> System Data
        </button>
        <button
          onClick={() => setView("system")}
          className={`btn-nav ${view === "system" || view === "backup" ? "active" : ""}`}
        >
          <i className="ph-bold ph-database"></i> Backup & Maintenance
        </button>
      </Header>

      <main className="flex-1 overflow-hidden w-full max-w-[1600px] mx-auto p-4">
        {view === "directory" && (
          <StaffDirectoryTab
            staffData={staffData}
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
            onSwitchView={setView}
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
            onSwitchView={setView}
          />
        )}

        {view === "logs" && (
          <AuditLogsTab
            displayLogs={auditLogs}
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
          />
        )}

        {(view === "system" || view === "backup") && (
          <BackupMaintenanceTab
            systemHealth={systemHealth}
            backups={backups}
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

      <Footer />

      <PasswordChangeModal
        open={pwOpen}
        authUser={authUser}
        onClose={() => setPwOpen(false)}
        onSuccess={(m) => showToast(m)}
        onLogAction={logAdminAction}
      />

      <EditUserModal
        open={editOpen}
        editForm={editForm}
        setEditForm={setEditForm}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSubmit}
      />

      <ConfirmModal
        open={deleteOpen}
        title="Confirm Removal"
        message={`Are you sure you want to remove ${deleteTarget?.fname} ${deleteTarget?.lname}? This action cannot be undone.`}
        confirmLabel="Confirm Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
        isLoading={deleteLoading}
      />

      <ConfirmModal
        open={backupDeleteOpen}
        title="Confirm Backup Deletion"
        message={`Delete backup ${backupDeleteTarget?.filename}? This cannot be undone.`}
        confirmLabel="Confirm Delete"
        onConfirm={confirmDeleteBackup}
        onCancel={() => setBackupDeleteOpen(false)}
        isLoading={backupDeleteLoading}
      />

      <ConfirmModal
        open={restoreConfirmOpen}
        title="Confirm System Restore"
        variant="warning"
        message={`This will overwrite current system data with ${restoreFile?.name}. Continue?`}
        confirmLabel="Confirm Restore"
        onConfirm={confirmRestore}
        onCancel={() => setRestoreConfirmOpen(false)}
        isLoading={restoreLoading}
      />

      {defaultPwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-brand shadow-xl max-w-sm w-full overflow-hidden animate-scale-in">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ph-bold ph-key text-3xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Default Password
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Password for <b>{defaultPwUserLabel}</b> is:
                <br />
                <span className="text-lg font-mono font-bold text-pup-maroon mt-2 block p-2 bg-gray-50 rounded border border-dashed">
                  pupstaff
                </span>
              </p>
              <button
                onClick={() => setDefaultPwOpen(false)}
                className="w-full bg-pup-maroon text-white py-2.5 rounded-brand font-bold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast {...toast} onClose={() => setToast({ ...toast, open: false })} />
    </div>
  );
}
