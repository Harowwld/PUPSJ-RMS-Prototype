"use client";

import { useMemo, useRef } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPHDateTime } from "@/lib/timeFormat";

export default function BackupMaintenanceTab({
  systemHealth,
  backups,
  isLoading = false,
  error = null,
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
    return formatPHDateTime(last.created_at);
  }, [backups]);

  return (
    <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter">
      {isLoading ? (
        <Card className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col">
          <CardContent className="p-6 flex-1 flex flex-col min-h-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-brand" />
                ))}
              </div>
              <Skeleton className="h-4 w-full max-w-md rounded-brand" />
              <Skeleton className="h-32 rounded-brand" />
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col">
          <CardContent className="p-6 flex-1 flex flex-col min-h-0">
            <div className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500">
              <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
              </div>
              <p className="text-lg font-bold text-gray-900">Could not load report</p>
              <p className="text-sm font-medium text-gray-600 mt-1 max-w-md">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col lg:flex-row flex-1 gap-4 items-stretch overflow-hidden">
          {/* LEFT COLUMN: Operations and Health Metrics */}
          <section className="w-full lg:w-[30%] flex-none flex flex-col gap-4 overflow-y-auto pr-1 h-full">
            {/* System Health Card */}
            <Card className="flex-none bg-white rounded-brand shadow-sm border border-gray-200 overflow-hidden">
              <CardHeader className="p-4 border-b border-gray-100 bg-gray-50/50">
                <CardTitle className="font-bold text-gray-900 text-xs flex items-center gap-2 uppercase tracking-wider">
                  <i className="ph-duotone ph-heartbeat text-pup-maroon text-lg"></i>
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-4 space-y-5">
                <div>
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-wide">
                    <span>
                      Storage ({systemHealth.disk.total - systemHealth.disk.free}
                      GB / {systemHealth.disk.total}GB)
                    </span>
                    <span className="text-gray-900">
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
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-wide">
                    <span>Database Size ({systemHealth.dbSize})</span>
                    <span className="text-green-600">
                      {systemHealth.dbStatus}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: "12%" }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-wide">
                    <span>CPU Usage Payload</span>
                    <span className="text-gray-900">{systemHealth.cpu}%</span>
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
              </CardContent>
            </Card>

            {/* Backup Operations Card */}
            <Card className="flex-none bg-white rounded-brand shadow-sm border border-gray-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <i className="ph-fill ph-database text-[8rem] text-pup-maroon -mr-4 -mt-4"></i>
              </div>
              <div className="relative z-10">
                <CardHeader className="p-4 border-b border-gray-100 bg-gray-50/50">
                  <CardTitle className="font-bold text-gray-900 text-xs flex items-center gap-2 uppercase tracking-wider">
                    <i className="ph-duotone ph-database text-pup-maroon text-lg"></i>
                    Full System Backup
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-4">
                  <p className="text-[11px] text-gray-500 mb-4 leading-relaxed font-medium">
                    Compute a secure snapshot of both the SQL database schema and
                    all serialized PDF records.
                  </p>
                  <Button
                    onClick={onSimulateBackup}
                    className="w-full bg-pup-maroon text-white h-10 rounded-brand text-xs font-bold hover:bg-red-900 transition-colors flex items-center justify-center gap-2 shadow-sm mb-5"
                  >
                    <i className="ph-bold ph-download-simple text-sm"></i> Extract
                    .ZIP Package
                  </Button>

                  <div className="border-t border-dashed border-gray-200 pt-5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">
                      Restoration Protocol
                    </label>
                    <input
                      ref={restoreFileRef}
                      type="file"
                      className="hidden"
                      accept=".zip,.sql"
                      onChange={onRestoreFileChange}
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        restoreFileRef.current && restoreFileRef.current.click()
                      }
                      className="w-full h-9 bg-white border-gray-300 text-gray-600 rounded-brand text-xs font-bold hover:bg-gray-50 hover:text-pup-maroon transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <i className="ph-bold ph-upload-simple text-sm"></i> Upload
                      System Image
                    </Button>
                  </div>
                  <div className="mt-5 text-[10px] text-gray-400 text-center uppercase tracking-wider font-bold">
                    Last synchronization:{" "}
                    <span className="font-mono text-gray-600 font-bold ml-1">
                      {lastBackupTime}
                    </span>
                  </div>
                </CardContent>
              </div>
            </Card>
          </section>

          {/* RIGHT COLUMN: History Table */}
          <section className="w-full lg:w-[70%] bg-white rounded-brand border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-none justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white text-gray-600 flex items-center justify-center shrink-0 border border-gray-200 shadow-sm">
                  <i className="ph-duotone ph-clock-counter-clockwise text-lg text-pup-maroon"></i>
                </div>
                <h3 className="font-bold text-xs text-gray-900 tracking-wider uppercase">
                  Encrypted Backup History
                </h3>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                    <th className="p-3 font-bold w-48">Filename</th>
                    <th className="p-3 font-bold w-40">Created At</th>
                    <th className="p-3 font-bold w-24">Size</th>
                    <th className="p-3 font-bold">Status</th>
                    <th className="p-3 font-bold text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {backups.length === 0 ? (
                    <tr className="border-0 hover:bg-transparent">
                      <td colSpan={5} className="p-0 border-0">
                        <div className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500">
                          <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                            <i className="ph-duotone ph-archive text-3xl text-pup-maroon"></i>
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            No system backups yet
                          </div>
                          <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                            There are currently no system backups available.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    backups.map((b) => (
                      <tr
                        key={b.id}
                        className="hover:bg-gray-50 group cursor-default transition-colors"
                      >
                        <td
                          className="p-3 font-mono text-xs text-pup-maroon font-bold max-w-[200px]"
                          title={b.filename}
                        >
                          <span className="truncate block w-full">
                            {b.filename}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] font-medium text-gray-600 whitespace-nowrap">
                          {formatPHDateTime(b.created_at)}
                        </td>
                        <td className="p-3 text-xs font-bold text-gray-700">
                          {(b.size_bytes / (1024 * 1024)).toFixed(2)} MB
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1.5 min-w-[140px]">
                            <div className="flex items-center justify-between gap-3 bg-gray-50 px-2 py-1 rounded border border-gray-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    b.status_local === "Success"
                                      ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)] animate-pulse"
                                      : "bg-gray-300"
                                  }`}
                                ></span>
                                <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">
                                  NODE 1: Local
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

                            <div className="flex items-center justify-between gap-3 bg-gray-50 px-2 py-1 rounded border border-gray-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    b.status_external === "Success"
                                      ? "bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)] animate-pulse"
                                      : "bg-gray-300"
                                  }`}
                                ></span>
                                <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">
                                  NODE 2: External
                                </span>
                              </div>
                              {b.status_external !== "Success" ? (
                                <button
                                  onClick={() => onSyncExternal(b.id)}
                                  className="text-[9px] font-bold text-pup-maroon hover:underline flex items-center gap-1"
                                >
                                  <i className="ph-bold ph-arrows-merge"></i> SYNC
                                </button>
                              ) : (
                                <i className="ph-bold ph-check-circle text-blue-600 text-[10px]"></i>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-3 bg-gray-50 px-2 py-1 rounded border border-gray-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] opacity-70">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">
                                  NODE 3: Offsite
                              </span>
                              </div>
                              <span className="text-[9px] font-bold text-gray-400">
                                Not configured
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDownloadBackup(b)}
                              className="h-8 px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50"
                              title="Extract ZIP Package"
                            >
                              <i className="ph-bold ph-file-zip mr-1.5"></i>
                              Download
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDeleteBackup(b.id)}
                              className="h-8 px-3 font-bold text-xs border-red-300 text-red-700 hover:text-red-800 hover:bg-red-50"
                              title="Destroy Volume"
                            >
                              <i className="ph-bold ph-trash mr-1.5"></i>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
