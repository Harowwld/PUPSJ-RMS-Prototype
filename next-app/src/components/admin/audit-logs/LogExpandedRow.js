"use client"

import { Button } from "@/components/ui/button"

export default function LogExpandedRow({ log, handleCopy }) {
  return (
    <div className="animate-in fade-in slide-in-from-top-1 border-t border-gray-100 p-8 duration-500">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Rich Description */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pup-maroon/10 text-pup-maroon shadow-sm ring-1 ring-pup-maroon/20">
              <i className="ph-duotone ph-newspaper-clipping text-lg"></i>
            </div>
            <h5 className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
              Rich Description
            </h5>
          </div>
          <div className="h-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs leading-relaxed font-semibold text-gray-700">
              {log.details || "No known description"}
            </p>
          </div>
        </div>

        {/* Network & Device */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100">
              <i className="ph-duotone ph-broadcast text-lg"></i>
            </div>
            <h5 className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
              Network & Device
            </h5>
          </div>
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase">IP ADDRESS:</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{log.ip}</span>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(log.ip, "IP Address")}
                  className="h-8 w-8 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:bg-white hover:text-pup-maroon shadow-xs transition-all"
                >
                  <i className="ph-bold ph-copy text-xs"></i>
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-gray-50 pt-4">
              <span className="text-[10px] font-black text-gray-400 uppercase">USER AGENT:</span>
              <span className="text-[10px] leading-relaxed font-bold text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                {log.userAgent}
              </span>
            </div>
          </div>
        </div>

        {/* Entity Context */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-100">
              <i className="ph-duotone ph-cube text-lg"></i>
            </div>
            <h5 className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
              Entity Context
            </h5>
          </div>
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase">TARGET TYPE:</span>
              <span className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700 uppercase shadow-xs">
                {log.entityType || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-50 pt-4">
              <span className="text-[10px] font-black text-gray-400 uppercase">REFERENCE ID:</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-black text-emerald-600">{log.entityId || "N/A"}</span>
                {log.entityId && (
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(log.entityId, "Reference ID")}
                    className="h-8 w-8 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:bg-white hover:text-pup-maroon shadow-xs transition-all"
                  >
                    <i className="ph-bold ph-copy text-xs"></i>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
