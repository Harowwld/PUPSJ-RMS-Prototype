"use client"

import { Button } from "@/components/ui/button"

export default function LogExpandedRow({ log, handleCopy }) {
  return (
    <div className="animate-in fade-in slide-in-from-top-1 border-t border-gray-100 p-6 duration-200">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Rich Description */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-pup-maroon/10 text-pup-maroon">
              <i className="ph-duotone ph-newspaper text-sm"></i>
            </div>
            <h5 className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
              Rich Description
            </h5>
          </div>
          <div className="rounded-brand border border-gray-200 bg-white p-3 shadow-xs">
            <p className="text-xs leading-relaxed font-medium text-gray-700">
              {log.details}
            </p>
          </div>
        </div>

        {/* Network & Device */}
        <div className="flex flex-col gap-3 border-l border-gray-100 pl-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-pup-maroon/10 text-pup-maroon">
              <i className="ph-duotone ph-broadcast text-sm"></i>
            </div>
            <h5 className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
              Network & Device
            </h5>
          </div>
          <div className="space-y-3 rounded-brand border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400">IP ADDRESS:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-gray-900">{log.ip}</span>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(log.ip, "IP Address")}
                  className="h-6 w-6 rounded-md border-gray-200 bg-gray-50 text-gray-400 hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon shadow-xs transition-all"
                >
                  <i className="ph-bold ph-copy text-[10px]"></i>
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 border-t border-gray-50 pt-3">
              <span className="text-[10px] font-bold text-gray-400">USER AGENT:</span>
              <span className="text-[10px] leading-snug font-medium text-gray-600 italic">
                {log.userAgent}
              </span>
            </div>
          </div>
        </div>

        {/* Entity Context */}
        <div className="flex flex-col gap-3 border-l border-gray-100 pl-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-pup-maroon/10 text-pup-maroon">
              <i className="ph-duotone ph-cube text-sm"></i>
            </div>
            <h5 className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
              Entity Context
            </h5>
          </div>
          <div className="space-y-3 rounded-brand border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400">TARGET TYPE:</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-black text-gray-600 uppercase">
                {log.entityType || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-50 pt-3">
              <span className="text-[10px] font-bold text-gray-400">REFERENCE ID:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-gray-900">{log.entityId || "N/A"}</span>
                {log.entityId && (
                  <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(log.entityId, "Reference ID")}
                    className="h-6 w-6 rounded-md border-gray-200 bg-gray-50 text-gray-400 hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon shadow-xs transition-all"
                  >
                    <i className="ph-bold ph-copy text-[10px]"></i>
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
