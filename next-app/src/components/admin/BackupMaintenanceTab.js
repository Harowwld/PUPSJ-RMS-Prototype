"use client";

import { useMemo, useRef } from "react";

export default function BackupMaintenanceTab({
  systemHealth,
  backups,
  onSimulateBackup,
  onRestoreFileChange,
  onSyncExternal,
  onDownloadBackup,
  onDeleteBackup,
  showToast,
}) {
  const restoreFileRef = useRef(null);

  const lastBackupTime = useMemo(() => {
    if (!backups || backups.length === 0) return "Never";
    const last = backups[0];
    try {
      const dateStr = last.created_at.replace(" ", "T") + "Z";
      const utcDate = new Date(dateStr);
      const now = new Date();
      const datePH = utcDate.toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
      });
      const todayPH = now.toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
      });
      const timeStr = utcDate.toLocaleTimeString("en-PH", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
      });
      if (datePH === todayPH) return `Today, ${timeStr}`;
      return `${datePH}, ${timeStr}`;
    } catch {
      return last.created_at;
    }
  }, [backups]);

  const formatPHTime = (dateString) => {
    const date = new Date(dateString.replace(" ", "T") + "Z");
    const datePH = date.toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
    });
    const timePH = date.toLocaleTimeString("en-PH", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePH}, ${timePH}`;
  };

  return (
    <div className="flex h-full gap-4 flex-row animate-fade-in items-stretch">
      <section className="w-[30%] flex-none flex flex-col gap-4 overflow-y-auto pr-1 h-full">
        <div className="bg-white rounded-brand border border-gray-300 shadow-sm p-5 relative flex-none">
          <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
            <i className="ph-duotone ph-heartbeat text-pup-maroon text-lg"></i>
            System Health
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                <span>
                  Storage ({systemHealth.disk.total - systemHealth.disk.free}
                  GB/{systemHealth.disk.total}GB)
                </span>
                <span className="text-gray-700">
                  {systemHealth.disk.percent}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-pup-maroon h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${systemHealth.disk.percent}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                <span>Database Size ({systemHealth.dbSize})</span>
                <span className="text-green-600">{systemHealth.dbStatus}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: "12%" }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                <span>CPU Usage</span>
                <span className="text-gray-700">{systemHealth.cpu}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`${
                    systemHealth.cpu > 80
                      ? "bg-red-500"
                      : systemHealth.cpu > 50
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  } h-1.5 rounded-full transition-all duration-1000`}
                  style={{ width: `${systemHealth.cpu}%` }}
                ></div>
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
              Create a complete snapshot including the SQL database records and
              all scanned PDF documents stored on the connected external drive.
            </p>

            <button
              onClick={onSimulateBackup}
              className="w-full bg-pup-maroon text-white py-2.5 rounded-brand text-xs font-bold hover:bg-red-900 transition-colors flex items-center justify-center gap-2 shadow-sm mb-4"
            >
              <i className="ph-bold ph-download-simple"></i> Download Full
              Backup (.zip)
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
                onChange={onRestoreFileChange}
              />
              <button
                onClick={() =>
                  restoreFileRef.current && restoreFileRef.current.click()
                }
                className="w-full bg-white border border-gray-300 text-gray-600 py-2 rounded-brand text-xs font-bold hover:border-pup-maroon hover:text-pup-maroon transition-colors flex items-center justify-center gap-2"
              >
                <i className="ph-bold ph-upload-simple"></i> Upload Backup File
              </button>
            </div>
            <div className="mt-4 text-[10px] text-gray-400 text-center">
              Last backup:{" "}
              <span className="font-mono text-gray-600">{lastBackupTime}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-brand border border-gray-300 shadow-sm p-5 flex-1">
          <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
            <i className="ph-duotone ph-wrench text-pup-maroon text-lg"></i>
            System Operations
          </h3>
          <div className="space-y-4 text-xs text-gray-500 italic">
            No further operations available.
          </div>
        </div>
      </section>

      <section className="w-[70%] bg-white rounded-brand border border-gray-300 shadow-sm flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-none">
          <h3 className="font-bold text-xs text-pup-maroon uppercase tracking-wide">
            Backup History
          </h3>
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
                <th className="p-3 border-b border-gray-200 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-600">
              {backups.map((b) => (
                <tr
                  key={b.id}
                  className="hover:bg-gray-50 border-b border-gray-50"
                >
                  <td
                    className="p-3 font-mono text-pup-maroon truncate max-w-[200px]"
                    title={b.filename}
                  >
                    {b.filename}
                  </td>
                  <td className="p-3">{formatPHTime(b.created_at)}</td>
                  <td className="p-3">
                    {(b.size_bytes / (1024 * 1024)).toFixed(2)} MB
                  </td>
                  <td className="p-3">SQL + Docs</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              b.status_local === "Success"
                                ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"
                                : "bg-gray-300"
                            }`}
                          ></span>
                          <span className="text-[9px] uppercase font-bold text-gray-500">
                            1. Local
                          </span>
                        </div>
                        <i
                          className={`ph-bold ${
                            b.status_local === "Success"
                              ? "ph-check-circle text-green-600"
                              : "ph-circle text-gray-300"
                          } text-[10px]`}
                        ></i>
                      </div>

                      <div className="flex items-center justify-between gap-3 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              b.status_external === "Success"
                                ? "bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"
                                : "bg-gray-300"
                            }`}
                          ></span>
                          <span className="text-[9px] uppercase font-bold text-gray-500">
                            2. External
                          </span>
                        </div>
                        {b.status_external !== "Success" ? (
                          <button
                            onClick={() => onSyncExternal(b.id)}
                            className="text-[9px] font-bold text-pup-maroon hover:underline"
                          >
                            SYNC
                          </button>
                        ) : (
                          <i className="ph-bold ph-check-circle text-blue-600 text-[10px]"></i>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onDownloadBackup(b)}
                        className="text-gray-400 hover:text-pup-maroon p-2 transition-colors"
                        title="Download ZIP Backup"
                      >
                        <i className="ph-bold ph-file-zip text-lg"></i>
                      </button>
                      <button
                        onClick={() => onDeleteBackup(b.id)}
                        className="text-gray-400 hover:text-red-600 p-2 transition-colors"
                        title="Delete Backup"
                      >
                        <i className="ph-bold ph-trash text-lg"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400">
                    No backups found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
