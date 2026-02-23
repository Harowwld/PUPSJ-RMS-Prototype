"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const initialStaffData = [
  {
    id: "2023-001",
    fname: "Maria",
    lname: "Santos",
    role: "Admin",
    section: "Administrative",
    status: "Active",
    lastActive: "Just now",
    email: "m.santos",
  },
  {
    id: "2023-002",
    fname: "Jose",
    lname: "Reyes",
    role: "Staff",
    section: "Records",
    status: "Active",
    lastActive: "10 mins ago",
    email: "j.reyes",
  },
  {
    id: "2023-005",
    fname: "Ana",
    lname: "Dizon",
    role: "Staff",
    section: "Records",
    status: "Inactive",
    lastActive: "2 days ago",
    email: "a.dizon",
  },
  {
    id: "2023-008",
    fname: "Pedro",
    lname: "Cruz",
    role: "Staff",
    section: "Evaluation",
    status: "Active",
    lastActive: "1 hour ago",
    email: "p.cruz",
  },
  {
    id: "2022-045",
    fname: "Lorna",
    lname: "Tolentino",
    role: "Staff",
    section: "Releasing",
    status: "Active",
    lastActive: "5 mins ago",
    email: "l.tolentino",
  },
  {
    id: "2021-012",
    fname: "Rico",
    lname: "Yan",
    role: "Admin",
    section: "Administrative",
    status: "Active",
    lastActive: "Yesterday",
    email: "r.yan",
  },
];

const initialAuditLogs = [
  {
    time: "10:42 AM",
    user: "Maria Santos",
    role: "Admin",
    action: "Created new staff account: P. Cruz",
    ip: "192.168.1.10",
  },
  {
    time: "10:30 AM",
    user: "Jose Reyes",
    role: "Staff",
    action: "Updated student record: 2020-00123-MN-0",
    ip: "192.168.1.12",
  },
  {
    time: "09:15 AM",
    user: "System",
    role: "System",
    action: "Daily automated backup completed (1.2GB)",
    ip: "localhost",
  },
  {
    time: "08:55 AM",
    user: "Lorna Tolentino",
    role: "Staff",
    action: "Generated Grade Report for Batch 2023",
    ip: "192.168.1.15",
  },
  {
    time: "Yesterday",
    user: "Rico Yan",
    role: "Admin",
    action: "Deleted archived document #4421 (Expired)",
    ip: "192.168.1.11",
  },
  {
    time: "Yesterday",
    user: "Ana Dizon",
    role: "Staff",
    action: "Failed login attempt (3x) - Account Locked",
    ip: "192.168.1.14",
  },
  {
    time: "Yesterday",
    user: "Pedro Cruz",
    role: "Staff",
    action: "Printed Transcript of Records: 2019-00567-MN-0",
    ip: "192.168.1.13",
  },
  {
    time: "2 days ago",
    user: "Maria Santos",
    role: "Admin",
    action: "Updated System Configuration: Retention Policy",
    ip: "192.168.1.10",
  },
  {
    time: "2 days ago",
    user: "Jose Reyes",
    role: "Staff",
    action: "Uploaded 150 scanned documents to Archive C",
    ip: "192.168.1.12",
  },
  {
    time: "3 days ago",
    user: "System",
    role: "System",
    action: "Weekly Maintenance Script executed successfully",
    ip: "localhost",
  },
];

function formatTime(value) {
  const [hourStr, minute] = value.split(":");
  let hour = parseInt(hourStr, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}

export default function AdminPage() {
  const router = useRouter();
  const restoreFileRef = useRef(null);
  const toastTimerRef = useRef(null);

  const [view, setView] = useState("directory");
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: "", isError: false });

  const [staffData, setStaffData] = useState(initialStaffData);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [autoBackupTime, setAutoBackupTime] = useState("00:00");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [createForm, setCreateForm] = useState({
    id: "",
    role: "",
    fname: "",
    lname: "",
    email: "",
    section: "Admin",
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
    section: "Administrative",
    status: "Active",
  });

  function showToast(msg, isError = false, autoHide = true) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ open: true, msg, isError });
    if (autoHide) {
      toastTimerRef.current = setTimeout(() => {
        setToast((t) => ({ ...t, open: false }));
      }, 3000);
    }
  }

  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase();
    return staffData.filter((s) => {
      const matchesSearch =
        `${s.fname} ${s.lname}`.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);
      const matchesRole = roleFilter === "All" || s.role === roleFilter;
      const matchesStatus = statusFilter === "All" || s.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [search, roleFilter, staffData, statusFilter]);

  const recentLogins = useMemo(() => {
    return staffData.filter((s) => s.status === "Active").slice(0, 4);
  }, [staffData]);

  const stats = useMemo(() => {
    return {
      total: staffData.length,
      active: staffData.filter((s) => s.status === "Active").length,
    };
  }, [staffData]);

  const displayLogs = useMemo(() => {
    const expanded = [...auditLogs];
    for (let i = 0; i < 15; i++) {
      expanded.push({
        time: "Last Week",
        user: i % 2 === 0 ? "Maria Santos" : "System",
        role: i % 2 === 0 ? "Admin" : "System",
        action:
          i % 2 === 0
            ? `Reviewed audit log entry #${1000 + i}`
            : "Automated database optimization",
        ip: "192.168.1.10",
      });
    }
    return expanded;
  }, [auditLogs]);

  function switchView(next) {
    setView(next);
  }

  function logout() {
    router.push("/");
  }

  function resetCreateForm() {
    setCreateForm({
      id: "",
      role: "",
      fname: "",
      lname: "",
      email: "",
      section: "Admin",
      status: "Active",
    });
  }

  function handleCreate(e) {
    e.preventDefault();
    const id = createForm.id;
    const fname = createForm.fname;
    const lname = createForm.lname;
    const role = createForm.role;
    const email = createForm.email;
    const section = createForm.section;
    const status = createForm.status;

    if (staffData.some((s) => s.id === id)) {
      showToast("Error: Employee ID already exists!", true);
      return;
    }

    const newUser = {
      id,
      fname,
      lname,
      role,
      section,
      status,
      email,
      lastActive: "Never",
    };

    setStaffData((prev) => [newUser, ...prev]);
    setAuditLogs((prev) => [
      {
        time: "Just now",
        user: "Admin User",
        role: "Admin",
        action: `Created account for ${fname} ${lname}`,
        ip: "192.168.1.10",
      },
      ...prev,
    ]);
    showToast(`Account created for ${fname} ${lname}!`);
    resetCreateForm();
    switchView("directory");
  }

  function deleteUser(id) {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    setStaffData((prev) => prev.filter((s) => s.id !== id));
    showToast("User removed successfully.");
  }

  function openEditUser(id) {
    const user = staffData.find((u) => u.id === id);
    if (!user) return;
    setEditOriginalId(user.id);
    setEditForm({
      id: user.id,
      role: user.role,
      fname: user.fname,
      lname: user.lname,
      email: user.email,
      section: user.section,
      status: user.status,
    });
    setEditOpen(true);
  }

  function closeEditModal() {
    setEditOpen(false);
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    const originalId = editOriginalId;
    const newId = editForm.id;

    if (originalId !== newId && staffData.some((s) => s.id === newId)) {
      showToast("Error: Employee ID already exists!", true);
      return;
    }

    const updatedUser = {
      id: newId,
      fname: editForm.fname,
      lname: editForm.lname,
      role: editForm.role,
      section: editForm.section,
      status: editForm.status,
      email: editForm.email,
      lastActive: "Just now",
    };

    setStaffData((prev) => {
      const next = [...prev];
      const index = next.findIndex((u) => u.id === originalId);
      if (index !== -1) next[index] = updatedUser;
      return next;
    });
    setAuditLogs((prev) => [
      {
        time: "Just now",
        user: "Admin User",
        role: "Admin",
        action: `Updated account details for ${updatedUser.fname} ${updatedUser.lname}`,
        ip: "192.168.1.10",
      },
      ...prev,
    ]);
    showToast("Account updated successfully!");
    closeEditModal();
  }

  function exportData() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,First Name,Last Name,Role,Section,Status,Email\n";
    staffData.forEach((s) => {
      csvContent += `${s.id},${s.fname},${s.lname},${s.role},${s.section},${s.status},${s.email}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "pup_staff_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function simulateBackup() {
    showToast("Creating full system backup...", false, false);
    setTimeout(() => {
      showToast("Backup downloaded successfully!");
    }, 1500);
  }

  function handleRestoreFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const fileName = file.name;
    if (
      confirm(
        `Are you sure you want to restore the system from '${fileName}'? This will overwrite current data and files.`
      )
    ) {
      showToast("Restoring system...", false, false);
      setTimeout(() => {
        showToast("System restored successfully! Reloading...");
        setTimeout(() => location.reload(), 2000);
      }, 2000);
    }
    e.target.value = "";
  }

  function clearCache() {
    showToast("Clearing system cache...", false, false);
    setTimeout(() => {
      showToast("Cache cleared successfully!");
    }, 1000);
  }

  function forceLogout() {
    if (!confirm("This will log out all users (except you). Continue?")) return;
    showToast("Processing global logout...", false, false);
    setTimeout(() => {
      showToast("All active sessions terminated.");
    }, 1500);
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <header className="bg-white border-b border-gray-300 flex-none z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="ph-bold ph-bank text-3xl text-pup-maroon"></i>
            <div className="leading-tight">
              <h1 className="font-bold text-lg text-pup-maroon tracking-tight">
                PUP E-MANAGE
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                Student Record Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => switchView("directory")}
              id="nav-directory"
              className={`btn-nav ${view === "directory" ? "active" : ""}`}
            >
              <i className="ph ph-users"></i> Staff Directory
            </button>
            <button
              onClick={() => switchView("create")}
              id="nav-create"
              className={`btn-nav ${view === "create" ? "active" : ""}`}
            >
              <i className="ph ph-user-plus"></i> Register Account
            </button>
            <button
              onClick={() => switchView("logs")}
              id="nav-logs"
              className={`btn-nav ${view === "logs" ? "active" : ""}`}
            >
              <i className="ph ph-scroll"></i> Audit Logs
            </button>
            <button
              onClick={() => switchView("backup")}
              id="nav-backup"
              className={`btn-nav ${view === "backup" ? "active" : ""}`}
            >
              <i className="ph ph-database"></i> Backup & Maintenance
            </button>
          </div>

          <div className="relative ml-4">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="h-9 w-9 border border-pup-maroon rounded-full flex items-center justify-center text-pup-maroon font-bold text-xs bg-red-50 hover:bg-pup-maroon hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pup-maroon"
            >
              AD
            </button>

            <div
              className={`${profileOpen ? "" : "hidden"} absolute right-0 mt-2 w-64 bg-white rounded-brand shadow-xl border border-gray-200 z-50 animate-scale-in origin-top-right overflow-hidden`}
            >
              <div className="p-4 border-b border-gray-200">
                <p className="text-sm font-bold text-pup-maroon">Admin</p>
                <p className="text-xs text-gray-500">registrar.admin</p>
              </div>
              <div className="py-1">
                <button className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-pup-maroon transition-colors flex items-center gap-3">
                  <i className="ph-bold ph-user"></i> Account Settings
                </button>
                <button className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-pup-maroon transition-colors flex items-center gap-3">
                  <i className="ph-bold ph-question"></i> Help & Support
                </button>
              </div>
              <div className="py-1 border-t border-gray-200">
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                >
                  <i className="ph-bold ph-sign-out"></i> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden w-full max-w-[1600px] mx-auto p-4">
        <div
          className={`${view === "directory" ? "flex" : "hidden"} flex-col lg:flex-row gap-4 h-full animate-fade-in`}
        >
          <aside className="w-full lg:w-1/4 flex flex-col gap-4 h-full">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-4 rounded-brand border border-gray-300 shadow-sm stats-card">
                <div className="text-2xl font-bold text-pup-maroon">
                  {stats.total}
                </div>
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">
                  Total Staff
                </div>
              </div>
              <div className="bg-white p-4 rounded-brand border border-gray-300 shadow-sm stats-card">
                <div className="text-2xl font-bold text-green-600">
                  {stats.active}
                </div>
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">
                  Active Now
                </div>
              </div>
            </div>

            <div className="bg-white rounded-brand border border-gray-300 shadow-sm flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                <h3 className="text-xs font-bold text-pup-maroon uppercase tracking-wide mb-3">
                  Filter Directory
                </h3>
                <div className="space-y-3">
                  <div className="relative group">
                    <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-gray-400 group-focus-within:text-pup-maroon"></i>
                    <input
                      type="text"
                      placeholder="Search name or ID..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-pup-maroon transition-all placeholder-gray-400"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                      Role
                    </label>
                    <select
                      className="form-select text-xs"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="All">All Roles</option>
                      <option value="Admin">Admin</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                      Status
                    </label>
                    <select
                      className="form-select text-xs"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-white">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
                  Recent Logins
                </h4>
                <div className="space-y-3">
                  {recentLogins.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer group"
                    >
                      <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-bold">
                        {s.fname[0]}
                        {s.lname[0]}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-gray-700 truncate group-hover:text-pup-maroon">
                          {s.fname} {s.lname}
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                          {s.lastActive}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <section className="w-full lg:w-3/4 bg-white rounded-brand border border-gray-300 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/30">
              <h2 className="font-bold text-pup-maroon flex items-center gap-2">
                <i className="ph-duotone ph-table"></i> Staff Management
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={exportData}
                  className="px-3 py-1.5 border border-gray-300 rounded-brand text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-pup-maroon transition-colors"
                >
                  <i className="ph-bold ph-download-simple"></i> Export CSV
                </button>
                <button
                  onClick={() => switchView("create")}
                  className="px-3 py-1.5 bg-pup-maroon text-white rounded-brand text-xs font-bold hover:bg-red-900 transition-colors shadow-sm flex items-center gap-1"
                >
                  <i className="ph-bold ph-plus"></i> Add New
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="table-header w-16">ID</th>
                    <th className="table-header">Staff Name</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Section/Unit</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Last Active</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((s) => {
                    const roleBadgeClass =
                      s.role === "Admin" ? "badge-admin" : "badge-staff";
                    const statusBadgeClass =
                      s.status === "Active" ? "badge-active" : "badge-inactive";

                    return (
                      <tr
                        key={s.id}
                        className="table-row-hover transition-colors group"
                      >
                        <td className="table-cell font-mono text-gray-500 text-xs">
                          {s.id}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-pup-maroon text-white flex items-center justify-center text-xs font-bold">
                              {s.fname[0]}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800 text-sm">
                                {s.fname} {s.lname}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {s.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${roleBadgeClass}`}>{s.role}</span>
                        </td>
                        <td className="table-cell text-sm text-gray-600">
                          {s.section}
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${statusBadgeClass}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="table-cell text-xs text-gray-500">
                          {s.lastActive}
                        </td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditUser(s.id)}
                              className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-pup-maroon"
                              title="Edit"
                            >
                              <i className="ph-bold ph-pencil-simple"></i>
                            </button>
                            <button
                              onClick={() => deleteUser(s.id)}
                              className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600"
                              title="Delete"
                            >
                              <i className="ph-bold ph-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredStaff.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <i className="ph-duotone ph-ghost text-4xl mb-2"></i>
                  <p className="text-sm">No staff members found.</p>
                </div>
              ) : null}
            </div>

            <div className="p-2 border-t border-gray-200 bg-gray-50 text-[10px] text-gray-400 flex justify-between px-4">
              <span>
                Showing <span>{filteredStaff.length}</span> records
              </span>
              <span>System v1.0.5 Admin</span>
            </div>
          </section>
        </div>

        <div className={`${view === "create" ? "flex" : "hidden"} h-full flex-col animate-fade-in`}>
          <div className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/30">
              <div>
                <h3 className="font-bold text-pup-maroon text-lg flex items-center gap-2">
                  <i className="ph-duotone ph-user-plus"></i> New Account Creation
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Create secure access credentials for Registrar Staff.
                </p>
              </div>
              <button
                onClick={() => switchView("directory")}
                className="text-xs font-bold text-gray-500 hover:text-pup-maroon flex items-center gap-2 transition-colors"
              >
                <i className="ph-bold ph-arrow-left"></i> Back to Directory
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-blue-50 p-4 rounded-brand border border-blue-100 flex items-start gap-3">
                    <i className="ph-fill ph-shield-check text-blue-600 text-xl mt-0.5"></i>
                    <div>
                      <h4 className="text-sm font-bold text-blue-800">
                        Role-Based Access
                      </h4>
                      <p className="text-xs text-blue-600 mt-1">
                        Assign permissions as either Admin or Staff to keep access
                        scoped to responsibilities.
                      </p>
                    </div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-brand border border-amber-100 flex items-start gap-3">
                    <i className="ph-fill ph-key text-amber-600 text-xl mt-0.5"></i>
                    <div>
                      <h4 className="text-sm font-bold text-amber-800">
                        Default Credentials
                      </h4>
                      <p className="text-xs text-amber-600 mt-1">
                        Accounts are initialized with a temporary password. Users
                        will be prompted to change it upon first login.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCreate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                        Employee ID *
                      </label>
                      <div className="relative">
                        <i className="ph-bold ph-identification-card absolute left-3 top-2.5 text-gray-400"></i>
                        <input
                          type="text"
                          required
                          className="form-input pl-9 font-mono"
                          placeholder="e.g. 2023-001"
                          value={createForm.id}
                          onChange={(e) =>
                            setCreateForm((f) => ({ ...f, id: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                        System Role *
                      </label>
                      <select
                        required
                        className="form-select"
                        value={createForm.role}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, role: e.target.value }))
                        }
                      >
                        <option value="" disabled>
                          Select Role...
                        </option>
                        <option value="Admin">Admin</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="Juan"
                        value={createForm.fname}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, fname: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="Dela Cruz"
                        value={createForm.lname}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, lname: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                      Username *
                    </label>
                    <div className="relative">
                      <i className="ph-bold ph-envelope absolute left-3 top-2.5 text-gray-400"></i>
                      <input
                        type="text"
                        required
                        className="form-input pl-9"
                        placeholder="username"
                        value={createForm.email}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, email: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                        Role
                      </label>
                      <select
                        className="form-select"
                        value={createForm.section}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            section: e.target.value,
                          }))
                        }
                      >
                        <option value="Admin">Admin</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                        Initial Status
                      </label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            value="Active"
                            checked={createForm.status === "Active"}
                            onChange={(e) =>
                              setCreateForm((f) => ({
                                ...f,
                                status: e.target.value,
                              }))
                            }
                            className="text-pup-maroon focus:ring-pup-maroon"
                          />
                          <span className="text-sm text-gray-700">Active</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            value="Inactive"
                            checked={createForm.status === "Inactive"}
                            onChange={(e) =>
                              setCreateForm((f) => ({
                                ...f,
                                status: e.target.value,
                              }))
                            }
                            className="text-pup-maroon focus:ring-pup-maroon"
                          />
                          <span className="text-sm text-gray-700">Inactive</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={resetCreateForm}
                      className="px-5 py-2.5 border border-gray-300 rounded-brand text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Reset Form
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-pup-maroon text-white rounded-brand text-sm font-bold hover:bg-red-900 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <i className="ph-bold ph-check"></i> Create Account
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className={`${view === "logs" ? "block" : "hidden"} h-full animate-fade-in`}>
          <div className="bg-white rounded-brand border border-gray-300 shadow-sm h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-pup-maroon flex items-center gap-2">
                <i className="ph-duotone ph-scroll"></i> System Audit Logs
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <i className="ph ph-magnifying-glass absolute left-2.5 top-2 text-gray-400 text-xs"></i>
                  <input
                    type="text"
                    placeholder="Search logs..."
                    className="pl-7 pr-3 py-1.5 text-xs border border-gray-300 rounded-brand focus:outline-none focus:border-pup-maroon w-48"
                  />
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  Total Records: 1,245
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10 text-[10px] uppercase text-gray-500 font-bold">
                  <tr>
                    <th className="p-3 border-b border-gray-200 w-32">
                      Timestamp
                    </th>
                    <th className="p-3 border-b border-gray-200 w-40">User</th>
                    <th className="p-3 border-b border-gray-200 w-32">Role</th>
                    <th className="p-3 border-b border-gray-200">Activity</th>
                    <th className="p-3 border-b border-gray-200 w-24 text-right">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="text-xs text-gray-600 divide-y divide-gray-100">
                  {displayLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 border-b border-gray-100 font-mono text-gray-500">
                        {log.time}
                      </td>
                      <td className="p-3 border-b border-gray-100 font-bold text-gray-700">
                        {log.user}
                      </td>
                      <td className="p-3 border-b border-gray-100">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">
                          {log.role}
                        </span>
                      </td>
                      <td className="p-3 border-b border-gray-100 text-gray-600">
                        {log.action}
                      </td>
                      <td className="p-3 border-b border-gray-100 text-right font-mono text-gray-400">
                        {log.ip}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-2 border-t border-gray-200 bg-gray-50 text-[10px] text-gray-400 flex justify-center">
              <button className="hover:text-pup-maroon px-2">Previous</button>
              <span className="px-2">Page 1 of 50</span>
              <button className="hover:text-pup-maroon px-2">Next</button>
            </div>
          </div>
        </div>

        <div
          className={`${view === "backup" ? "flex" : "hidden"} h-full gap-4 flex-row animate-fade-in items-stretch`}
        >
          <section className="w-[30%] flex-none flex flex-col gap-4 overflow-y-auto pr-1 h-full">
            <div className="bg-white rounded-brand border border-gray-300 shadow-sm p-5 relative flex-none">
              <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                <i className="ph-duotone ph-heartbeat text-pup-maroon text-lg"></i>
                System Health
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                    <span>Storage (45GB/100GB)</span>
                    <span className="text-gray-700">45%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-pup-maroon h-1.5 rounded-full" style={{ width: "45%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                    <span>Database Load</span>
                    <span className="text-green-600">Healthy</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: "12%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                    <span>CPU Usage</span>
                    <span className="text-gray-700">28%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: "28%" }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-brand border border-gray-300 shadow-sm p-5 relative overflow-hidden group flex-none">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <i className="ph-fill ph-database text-9xl text-pup-maroon"></i>
              </div>
              <div className="relative z-10">
                <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                  <i className="ph-duotone ph-database text-pup-maroon text-lg"></i>
                  Full System Backup
                </h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Create a complete snapshot including the SQL database records
                  and all scanned PDF documents stored on the connected external
                  drive.
                </p>

                <button
                  onClick={simulateBackup}
                  className="w-full bg-pup-maroon text-white py-2.5 rounded-brand text-xs font-bold hover:bg-red-900 transition-colors flex items-center justify-center gap-2 shadow-sm mb-4"
                >
                  <i className="ph-bold ph-download-simple"></i> Download Full Backup
                  (.zip)
                </button>

                <div className="border-t border-dashed border-gray-200 pt-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">
                    Restore System
                  </label>
                  <input
                    ref={restoreFileRef}
                    type="file"
                    className="hidden"
                    accept=".zip,.sql"
                    onChange={handleRestoreFileChange}
                  />
                  <button
                    onClick={() => restoreFileRef.current && restoreFileRef.current.click()}
                    className="w-full bg-white border border-gray-300 text-gray-600 py-2 rounded-brand text-xs font-bold hover:border-pup-maroon hover:text-pup-maroon transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="ph-bold ph-upload-simple"></i> Upload Backup File
                  </button>
                </div>
                <div className="mt-4 text-[10px] text-gray-400 text-center">
                  Last backup: <span className="font-mono text-gray-600">Today, 08:00 AM</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-brand border border-gray-300 shadow-sm p-5 flex-1">
              <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                <i className="ph-duotone ph-wrench text-pup-maroon text-lg"></i>
                System Operations
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <div className="font-bold text-gray-700">Auto-Backup</div>
                    <div className="text-gray-400 flex items-center gap-2">
                      <span>Daily at</span>
                      <span className="font-semibold text-gray-600">
                        {formatTime(autoBackupTime)}
                      </span>
                      <input
                        type="time"
                        className="text-[11px] border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-pup-maroon"
                        value={autoBackupTime}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!value) return;
                          setAutoBackupTime(value);
                          showToast(`Auto-backup time set to ${formatTime(value)}`);
                        }}
                      />
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pup-maroon"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <div className="font-bold text-gray-700">Maintenance Mode</div>
                    <div className="text-gray-400">Lock non-admin logins</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pup-maroon"></div>
                  </label>
                </div>
                <hr className="border-gray-200 my-2" />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={clearCache}
                    className="px-3 py-2 border border-gray-200 rounded-brand text-[10px] font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors flex flex-col items-center gap-1"
                  >
                    <i className="ph-bold ph-broom text-lg"></i> Clear Cache
                  </button>
                  <button
                    onClick={forceLogout}
                    className="px-3 py-2 border border-red-100 bg-red-50 rounded-brand text-[10px] font-bold text-red-700 hover:bg-red-100 transition-colors flex flex-col items-center gap-1"
                  >
                    <i className="ph-bold ph-sign-out text-lg"></i> Force Logout
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="w-[70%] bg-white rounded-brand border border-gray-300 shadow-sm flex flex-col overflow-hidden h-full">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-none">
              <h3 className="font-bold text-xs text-pup-maroon uppercase tracking-wide">
                Backup History
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase">
                  Retention Policy:
                </label>
                <select className="text-xs border-gray-300 rounded border px-2 py-1 focus:outline-none focus:border-pup-maroon">
                  <option>Keep 30 Days</option>
                  <option>Keep 60 Days</option>
                  <option>Keep All</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white text-[10px] text-gray-400 uppercase font-bold sticky top-0">
                  <tr>
                    <th className="p-3 border-b border-gray-200">Filename</th>
                    <th className="p-3 border-b border-gray-200">Date & Time</th>
                    <th className="p-3 border-b border-gray-200">Size</th>
                    <th className="p-3 border-b border-gray-200">Contents</th>
                    <th className="p-3 border-b border-gray-200">Type</th>
                    <th className="p-3 border-b border-gray-200 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-gray-600">
                  <tr className="hover:bg-gray-50 border-b border-gray-50">
                    <td className="p-3 font-mono text-pup-maroon">
                      full_backup_20231126.zip
                    </td>
                    <td className="p-3">Nov 26, 2023 - 08:00 AM</td>
                    <td className="p-3">1.2 GB</td>
                    <td className="p-3">SQL + PDF Files</td>
                    <td className="p-3">
                      <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        AUTO
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button className="text-gray-400 hover:text-pup-maroon">
                        <i className="ph-bold ph-download-simple"></i>
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b border-gray-50">
                    <td className="p-3 font-mono text-pup-maroon">
                      full_backup_20231125.zip
                    </td>
                    <td className="p-3">Nov 25, 2023 - 08:00 AM</td>
                    <td className="p-3">1.1 GB</td>
                    <td className="p-3">SQL + PDF Files</td>
                    <td className="p-3">
                      <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        AUTO
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button className="text-gray-400 hover:text-pup-maroon">
                        <i className="ph-bold ph-download-simple"></i>
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b border-gray-50">
                    <td className="p-3 font-mono text-pup-maroon">db_snapshot.sql</td>
                    <td className="p-3">Nov 24, 2023 - 03:15 PM</td>
                    <td className="p-3">44.5 MB</td>
                    <td className="p-3">SQL Only</td>
                    <td className="p-3">
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        MANUAL
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button className="text-gray-400 hover:text-pup-maroon">
                        <i className="ph-bold ph-download-simple"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-300 p-3 flex-none z-10 shadow-inner">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center text-xs font-medium text-gray-600">
          <p>
            &copy; 2024 Polytechnic University of the Philippines. All rights
            reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-pup-maroon transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-pup-maroon transition-colors">
              Terms of Use
            </a>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">System Version 1.0.2 (Beta)</span>
          </div>
        </div>
      </footer>

      <div
        className={`fixed bottom-5 right-5 transform transition-all duration-300 z-50 px-4 py-3 rounded-brand shadow-lg flex items-center gap-3 ${
          toast.open ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        } ${toast.isError ? "bg-red-800" : "bg-gray-800"} text-white`}
      >
        <i
          className={`ph-fill ${
            toast.isError ? "ph-warning-circle" : "ph-check-circle"
          } ${toast.isError ? "text-red-200" : "text-green-400"} text-xl`}
        ></i>
        <span className="text-sm font-medium">{toast.msg}</span>
      </div>

      <div
        className={`${editOpen ? "flex" : "hidden"} fixed inset-0 bg-black/50 z-50 items-center justify-center animate-fade-in`}
      >
        <div className="bg-white rounded-brand shadow-lg w-full max-w-2xl overflow-hidden transform scale-95 transition-transform duration-200">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/30">
            <div>
              <h3 className="font-bold text-pup-maroon text-lg flex items-center gap-2">
                <i className="ph-duotone ph-pencil-simple"></i> Edit Account
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Update staff details and permissions.
              </p>
            </div>
            <button
              onClick={closeEditModal}
              className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
            >
              <i className="ph-bold ph-x text-lg"></i>
            </button>
          </div>
          <div className="p-8">
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                    Employee ID *
                  </label>
                  <div className="relative">
                    <i className="ph-bold ph-identification-card absolute left-3 top-2.5 text-gray-400"></i>
                    <input
                      type="text"
                      required
                      className="form-input pl-9 font-mono"
                      placeholder="e.g. 2023-001"
                      value={editForm.id}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, id: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                    System Role *
                  </label>
                  <select
                    required
                    className="form-select"
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, role: e.target.value }))
                    }
                  >
                    <option value="" disabled>
                      Select Role...
                    </option>
                    <option value="Admin">Admin</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Juan"
                    value={editForm.fname}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, fname: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Dela Cruz"
                    value={editForm.lname}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, lname: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                  Username *
                </label>
                <div className="relative">
                  <i className="ph-bold ph-envelope absolute left-3 top-2.5 text-gray-400"></i>
                  <input
                    type="text"
                    required
                    className="form-input pl-9"
                    placeholder="username"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                    Section / Unit
                  </label>
                  <select
                    className="form-select"
                    value={editForm.section}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, section: e.target.value }))
                    }
                  >
                    <option value="Administrative">Administrative</option>
                    <option value="Records">Records Section</option>
                    <option value="Evaluation">Evaluation Section</option>
                    <option value="Releasing">Releasing Window</option>
                    <option value="Admission">Admission Support</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                    Status
                  </label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editStatus"
                        value="Active"
                        checked={editForm.status === "Active"}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            status: e.target.value,
                          }))
                        }
                        className="text-pup-maroon focus:ring-pup-maroon"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editStatus"
                        value="Inactive"
                        checked={editForm.status === "Inactive"}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            status: e.target.value,
                          }))
                        }
                        className="text-pup-maroon focus:ring-pup-maroon"
                      />
                      <span className="text-sm text-gray-700">Inactive</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-5 py-2.5 border border-gray-300 rounded-brand text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-pup-maroon text-white rounded-brand text-sm font-bold hover:bg-red-900 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <i className="ph-bold ph-floppy-disk"></i> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
