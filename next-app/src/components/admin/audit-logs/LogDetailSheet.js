"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function getSeverityColor(sev) {
  switch (String(sev || "").toUpperCase()) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 border-red-200"
    case "WARNING":
      return "bg-amber-100 text-amber-700 border-amber-200"
    default:
      return "bg-blue-100 text-blue-700 border-blue-200"
  }
}

function getSeverityTextColor(sev) {
  switch (String(sev || "").toUpperCase()) {
    case "CRITICAL":
      return "text-red-600"
    case "WARNING":
      return "text-amber-600 dark:text-amber-400"
    default:
      return "text-blue-600 dark:text-blue-400"
  }
}

export default function LogDetailSheet({ 
  selectedLog, 
  setSelectedLog, 
  handleCopy,
  onSearchSimilar,
  onNext,
  onPrev,
  hasNext,
  hasPrev
}) {
  return (
    <Sheet
      open={!!selectedLog}
      onOpenChange={(open) => !open && setSelectedLog(null)}
    >
      <SheetContent className="font-inter flex w-full flex-col border-l border-gray-200 bg-gray-50 p-0 sm:max-w-md dark:border-white/10 dark:bg-card">
        <SheetHeader className="shrink-0 border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card dark:text-primary dark:shadow-none">
              <i className="ph-duotone ph-file-text text-2xl"></i>
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-left text-xl font-black leading-none tracking-tight text-gray-900 dark:text-zinc-50">
                Log Entry
              </SheetTitle>
              <SheetDescription className="mt-1.5 text-left text-sm font-medium text-gray-500 dark:text-zinc-400">
                System Event ID:{" "}
                <span className="font-mono font-bold text-gray-700 dark:text-zinc-200">
                  {selectedLog?.id}
                </span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {selectedLog && (
          <div className="flex-1 space-y-6 overflow-y-auto p-6 pb-24">
            {/* Header Info */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-[10px] font-black tracking-widest text-gray-400 dark:text-zinc-300">
                  Timestamp
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-zinc-50">{selectedLog.time}</p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-[10px] font-black tracking-widest text-gray-400 dark:text-zinc-300">
                  Severity
                </p>
                <Badge
                  className={`rounded-sm border-0 px-2 py-0.5 text-[10px] font-black ${getSeverityColor(selectedLog.severity)}`}
                >
                  {selectedLog.severity}
                </Badge>
              </div>
            </div>

            {/* Actor Section */}
            <Card className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-transparent px-4 py-3 dark:border-white/10 dark:bg-transparent">
                <i className="ph-bold ph-user-focus text-pup-maroon dark:text-primary"></i>
                <h4 className="text-[10px] font-black tracking-widest text-gray-400 dark:text-zinc-300">
                  Actor Information
                </h4>
              </div>
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-muted">
                  <i className="ph-bold ph-user text-lg text-gray-500 dark:text-zinc-400"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black text-gray-900 dark:text-zinc-50">{selectedLog.user}</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onSearchSimilar(selectedLog.user)}
                          className="h-7 w-7 rounded-lg border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-xs transition-all dark:border-white/10 dark:bg-card dark:hover:border-zinc-700 dark:text-zinc-300"
                        >
                          <i className="ph-bold ph-magnifying-glass text-xs"></i>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="rounded-brand font-bold text-[10px] tracking-wider">
                        Search similar (Actor)
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="mt-0.5 text-[10px] font-bold tracking-wider text-pup-maroon dark:text-primary dark:text-primary">
                    {selectedLog.role}
                  </p>
                </div>
              </div>
            </Card>

            {/* Event Details */}
            <Card className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-transparent px-4 py-3 dark:border-white/10 dark:bg-transparent">
                <i className="ph-bold ph-newspaper text-pup-maroon dark:text-primary"></i>
                <h4 className="text-[10px] font-black tracking-widest text-gray-400 dark:text-zinc-300">
                  Event Details
                </h4>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <p className="mb-1 text-[10px] font-bold text-gray-400 dark:text-zinc-300">
                    Action Performed
                  </p>
                  <p
                    className={`text-sm font-black tracking-tight ${getSeverityTextColor(selectedLog.severity)}`}
                  >
                    {selectedLog.action}
                  </p>
                </div>

                <div className="border-t border-gray-100 pt-3 dark:border-white/10">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-300">
                      Description
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopy(selectedLog.details || "No known description", "Event description")}
                          className="h-7 w-7 rounded-lg border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-xs transition-all dark:border-white/10 dark:bg-card dark:hover:border-zinc-700 dark:text-zinc-300"
                        >
                          <i className="ph-bold ph-copy text-xs"></i>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="rounded-brand font-bold text-[10px] tracking-wider">
                        Copy Description
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm leading-relaxed font-medium text-gray-700 dark:text-zinc-200">
                    {selectedLog.details || "No known description"}
                  </p>
                </div>

                {(selectedLog.entityType || selectedLog.entityId) && (
                  <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 dark:border-white/10">
                    <div>
                      <p className="mb-1 text-[10px] font-bold text-gray-400 dark:text-zinc-300">
                        Target Entity
                      </p>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-600 dark:text-zinc-300 dark:bg-muted">
                        {selectedLog.entityType || "N/A"}
                      </span>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-300">
                          Entity Reference ID
                        </p>
                        {selectedLog.entityId && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleCopy(selectedLog.entityId, "Entity ID")}
                                className="h-7 w-7 rounded-lg border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-xs transition-all dark:border-white/10 dark:bg-card dark:hover:border-zinc-700 dark:text-zinc-300"
                              >
                                <i className="ph-bold ph-copy text-xs"></i>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="rounded-brand font-bold text-[10px] tracking-wider">
                              Copy Entity ID
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <p className="font-mono text-[11px] font-bold text-gray-900 dark:text-zinc-50">
                        {selectedLog.entityId || "N/A"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Network Data */}
            <Card className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-transparent px-4 py-3 dark:border-white/10 dark:bg-transparent">
                <i className="ph-bold ph-broadcast text-pup-maroon dark:text-primary"></i>
                <h4 className="text-[10px] font-black tracking-widest text-gray-400 dark:text-zinc-300">
                  Network Data
                </h4>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-zinc-300">
                      <i className="ph-bold ph-globe"></i> IP Address
                    </p>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onSearchSimilar(selectedLog.ip)}
                            className="h-7 w-7 rounded-lg border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-xs transition-all dark:border-white/10 dark:bg-card dark:hover:border-zinc-700 dark:text-zinc-300"
                          >
                            <i className="ph-bold ph-magnifying-glass text-xs"></i>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="rounded-brand font-bold text-[10px] tracking-wider">
                          Search similar (IP)
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCopy(selectedLog.ip, "IP address")}
                            className="h-7 w-7 rounded-lg border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-xs transition-all dark:border-white/10 dark:bg-card dark:hover:border-zinc-700 dark:text-zinc-300"
                          >
                            <i className="ph-bold ph-copy text-xs"></i>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="rounded-brand font-bold text-[10px] tracking-wider">
                          Copy IP Address
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <p className="inline-block rounded border border-gray-100 bg-gray-50 p-2 font-mono text-xs font-bold text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50">
                    {selectedLog.ip}
                  </p>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-zinc-300">
                    <i className="ph-bold ph-desktop"></i> Device &amp; Browser
                  </p>
                  <p className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-[11px] leading-tight font-medium text-gray-600 dark:border-white/10 dark:bg-card dark:text-zinc-300">
                    {selectedLog.userAgent}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white p-4 backdrop-blur-sm dark:border-white/10 dark:bg-card/80">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={onPrev}
              className="flex-1 h-10 rounded-brand border-gray-300 text-[10px] font-black tracking-widest text-gray-500 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 disabled:opacity-30 transition-all dark:text-zinc-400 dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
            >
              <i className="ph-bold ph-caret-left mr-2"></i>
              Previous Log
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={onNext}
              className="flex-1 h-10 rounded-brand border-gray-300 text-[10px] font-black tracking-widest text-gray-500 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 disabled:opacity-30 transition-all dark:text-zinc-400 dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
            >
              Next Log
              <i className="ph-bold ph-caret-right ml-2"></i>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}



