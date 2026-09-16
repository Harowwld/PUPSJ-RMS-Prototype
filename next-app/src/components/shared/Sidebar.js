"use client"

import LucideIcon from "@/components/shared/LucideIcon";
import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { getRoleBranding } from "@/lib/roleBranding"

// Icon and color map matching Apple Photos Light Sidebar spec
const ICON_MAP = {
  // Admin views
  review: { icon: "ti ti-file-check" },
  digitization: { icon: "ti ti-chart-bar" },
  request_analytics: { icon: "ti ti-arrow-up-right" },
  directory: { icon: "ti ti-users" },
  create: { icon: "ti ti-user-plus" },
  storage_layout: { icon: "ti ti-building-warehouse" },
  system_data: { icon: "ti ti-settings-cog" },
  system: { icon: "ti ti-database-backup" },
  logs: { icon: "ti ti-history" },
  offices: { icon: "ti ti-building-community" },
  modules: { icon: "ti ti-layout-grid" },
  staff: { icon: "ti ti-users" },
  health: { icon: "ti ti-activity-heartbeat" },
  backups: { icon: "ti ti-database-backup" },

  // Staff views
  requests: { icon: "ti ti-arrow-up-right" },
  odrs: { icon: "ti ti-file-text" },
  compliance: { icon: "ti ti-clipboard-check" },
  osas: { icon: "ti ti-school" },
  osas_monitoring: { icon: "ti ti-clipboard-check" },
  upload: { icon: "ti ti-scan" },
  documents: { icon: "ti ti-file-text" },
  notifications: { icon: "ti ti-bell" },
  search: { icon: "ti ti-archive" },
  storage: { icon: "ti ti-folder-open" },
}

export default function Sidebar({ open = true, items, activeKey, onSelect, onLogout, zoomNode, setZoomNode, handleZoomMouseDown, accentColor, officeName, authUser }) {
  const pathname = usePathname()
  const isStaff = pathname?.startsWith("/staff") || items.some(item => 
    ["requests", "upload", "documents", "notifications", "search"].includes(item.key)
  )
  const isSystemAdmin = pathname?.startsWith("/systemadmin") || pathname?.startsWith("/superadmin")
  const defaultColor = isSystemAdmin ? "#0f172a" : (isStaff ? "#EDBB00" : "#EA580C")
  const activeColor = accentColor || defaultColor
  const staffIconColor = accentColor || defaultColor
  const sidebarRef = useRef(null)

  const [expandedKeys, setExpandedKeys] = useState(() => {
    const initial = {}
    items.forEach((item) => {
      if (
        item.type === "accordion" &&
        item.children?.some((c) => c.key === activeKey)
      ) {
        initial[item.key] = true
      }
    })
    return initial
  })

  useEffect(() => {
    items.forEach((item) => {
      if (
        item.type === "accordion" &&
        item.children?.some((c) => c.key === activeKey)
      ) {
        setExpandedKeys((prev) => {
          if (prev[item.key]) return prev
          return { ...prev, [item.key]: true }
        })
      }
    })
  }, [activeKey, items])

  const toggleAccordion = (key) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleLinkClick = (e, key) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      onSelect(key)
    }
  }

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        "rms-sidebar z-10 flex-col gap-[2px] bg-white/20 backdrop-blur-md dark:bg-zinc-950/25 select-none sticky top-0 h-screen overflow-hidden hidden md:flex shrink-0 will-change-[width]",
        open ? "w-[275px] py-2 px-2" : "w-[68px] py-2 px-2"
      )}
    >
      <div className="flex flex-col gap-[2px] flex-1 h-full overflow-y-auto w-full items-stretch [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div 
          className={cn(
            "flex items-center mb-1.5 w-full h-[36px] overflow-hidden shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            open ? "px-1 justify-start" : "px-0 justify-center"
          )}
        >
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("toggle-sidebar"))
              }
            }}
            title={open ? "Collapse Sidebar" : "Expand Sidebar"}
            data-tooltip-placement="right"
            className="flex w-[36px] h-[36px] items-center justify-center rounded-[8px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 active:scale-95 cursor-pointer transition-all duration-200 ease-out shrink-0"
          >
            <LucideIcon  className={cn("rms-style-color text-[21px] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", open ? "ti ti-panel-left-dashed" : "ti ti-panel-left")} data-color={activeColor} style={{ color: activeColor }}></LucideIcon>
          </button>

          {/* Zoom Control when Sidebar is Visible */}
          <div className={cn(
            "flex items-center gap-1 select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden origin-left",
            open ? "opacity-40 hover:opacity-100 max-w-[220px] ml-1.5 translate-x-0" : "opacity-0 max-w-0 ml-0 -translate-x-3 pointer-events-none"
          )}>
            {zoomNode !== undefined && setZoomNode && handleZoomMouseDown && (
              <>
                <button
                  type="button"
                  onClick={() => setZoomNode(prev => Math.max(0, prev - 1))}
                  title="Zoom Out"
                  className="group flex items-center justify-center border-0 rounded-brand hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer bg-transparent h-7 w-7 transition-colors duration-75 shrink-0"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 7H11.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <div 
                  onMouseDown={handleZoomMouseDown}
                  onTouchStart={handleZoomMouseDown}
                  title="Adjust Layout Scale (Drag slider or click Reset to restore)"
                  className="relative w-[50px] h-[14px] flex items-center group cursor-pointer shrink-0"
                >
                  <div className="absolute left-0 right-0 h-[2.5px] bg-[#D1D1D6] dark:bg-zinc-700 rounded-full"></div>
                  <div
                    className="rms-style-width rms-style-background-color absolute left-0 h-[2.5px] rounded-full"
                    data-width={`${(zoomNode / 6) * 100}%`}
                    data-background-color={activeColor}
                  ></div>
                  <div
                    className="rms-style-left rms-style-border-color absolute -translate-x-1/2 w-[12px] h-[12px] rounded-full bg-white dark:bg-zinc-900 shadow-xs border-2"
                    data-left={`${(zoomNode / 6) * 100}%`}
                    data-border-color={activeColor}
                  ></div>
                </div>
                <button
                  type="button"
                  onClick={() => setZoomNode(prev => Math.min(6, prev + 1))}
                  title="Zoom In"
                  className="group flex items-center justify-center border-0 rounded-brand hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer bg-transparent h-7 w-7 transition-colors duration-75 shrink-0"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 2.5V11.5M2.5 7H11.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
                
                {/* Reset button to restore default scale (100% / node 3) */}
                {zoomNode !== 3 && (
                  <button
                    type="button"
                    onClick={() => setZoomNode(3)}
                    title="Reset scale to 100% (Default)"
                    className="flex items-center gap-1 px-1.5 h-6 text-[10px] font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white bg-gray-200/80 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md transition-colors cursor-pointer border-0 shadow-2xs shrink-0 select-none"
                  >
                    <LucideIcon  className="ti ti-rotate-2 text-[11px]"></LucideIcon>
                    <span>Reset</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {items.map((item, idx) => {
          if (item.type === "header") {
            return (
              <div
                key={`header-${idx}`}
                className={cn("relative w-full flex items-center select-none overflow-hidden h-[22px] shrink-0 mb-1", idx === 0 ? "mt-1" : "mt-4")}
              >
                <span
                  className={cn(
                    "text-[11px] font-semibold tracking-[0.05em] uppercase text-[#8E8E93] dark:text-zinc-500 whitespace-nowrap px-2 block transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    open ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
                  )}
                >
                  {item.label}
                </span>

                <div
                  className={cn(
                    "absolute inset-x-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none",
                    open ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"
                  )}
                >
                  <div className="h-[1px] bg-gray-300/80 dark:bg-zinc-800 w-[24px] rounded-full" />
                </div>
              </div>
            )
          }

          if (item.type === "accordion") {
            const isExpanded = expandedKeys[item.key]
            const hasActiveChild = item.children?.some((c) => c.key === activeKey)
            const iconConfig = ICON_MAP[item.key] || { icon: item.iconClass, color: staffIconColor }
            const iconName = item.iconClass || iconConfig.icon

            return (
              <div key={item.key} className="flex flex-col gap-[2px] w-full items-stretch">
                <button
                  type="button"
                  onClick={() => toggleAccordion(item.key)}
                  title={!open ? item.label : undefined}
                  data-tooltip-placement="right"
                  data-background-color={hasActiveChild && !isExpanded ? activeColor : undefined}
                  style={hasActiveChild && !isExpanded ? { backgroundColor: activeColor } : undefined}
                  className={cn(
                    "flex w-full h-[38px] items-center rounded-[8px] text-[14px] outline-none cursor-pointer transition-colors duration-200 ease-out relative group select-none overflow-hidden shrink-0",
                    open ? "px-1 justify-start" : "px-0 justify-center",
                    hasActiveChild && !isExpanded
                      ? "text-white font-medium shadow-2xs rms-style-background-color"
                      : "text-[#1D1D1F] dark:text-zinc-200 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 font-normal"
                  )}
                >
                  <div className={cn("flex items-center overflow-hidden", open ? "min-w-0 flex-1" : "justify-center w-full")}>
                    <span className="relative w-[36px] h-[36px] flex items-center justify-center shrink-0">
                      <LucideIcon 
                        data-color={hasActiveChild && !isExpanded ? "#FFFFFF" : staffIconColor}
                        style={{ color: hasActiveChild && !isExpanded ? "#FFFFFF" : staffIconColor }}
                        className={cn("rms-style-color", iconName, "text-[19px] transition-colors shrink-0")}
                      ></LucideIcon>
                      {/* Collapsed notification dot */}
                      <span
                        data-background-color={activeColor}
                        style={{ backgroundColor: activeColor }}
                        className={cn("rms-style-background-color absolute top-1 right-1 h-2 w-2 rounded-full ring-2 ring-white dark:ring-zinc-950 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", !open && item.badge > 0 ? "opacity-100 scale-100" : "opacity-0 scale-0 pointer-events-none")}
                      />
                    </span>
                    <span
                      className={cn(
                        "whitespace-nowrap font-medium text-[13.5px] text-left ml-1.5 overflow-hidden block transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        open
                          ? "opacity-100 max-w-[170px] translate-x-0"
                          : "opacity-0 max-w-0 ml-0 -translate-x-3 pointer-events-none"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* Badge and Chevron for expanded view */}
                  <div
                    className={cn(
                      "flex items-center gap-1.5 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
                      open
                        ? "opacity-100 max-w-[70px] translate-x-0 mr-1"
                        : "opacity-0 max-w-0 translate-x-2 pointer-events-none mr-0"
                    )}
                  >
                    {item.badge > 0 && (
                      <span
                        className="rms-style-background-color rms-style-color flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                        data-background-color={hasActiveChild && !isExpanded ? "#FFFFFF" : activeColor}
                        data-color={hasActiveChild && !isExpanded ? activeColor : "#FFFFFF"}
                        style={{ backgroundColor: hasActiveChild && !isExpanded ? "#FFFFFF" : activeColor, color: hasActiveChild && !isExpanded ? activeColor : "#FFFFFF" }}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                    <LucideIcon 
                      className={cn(
                        "ti ti-chevron-down text-xs transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        isExpanded && "rotate-180"
                      )}
                    ></LucideIcon>
                  </div>
                </button>

                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] w-full",
                    open && isExpanded ? "mt-[2px] max-h-[500px] opacity-100" : "mt-0 max-h-0 opacity-0 pointer-events-none"
                  )}
                >
                  <div className="flex flex-col gap-[2px] items-stretch">
                    {item.children.map((child, childIdx) => {
                      const isActive = activeKey === child.key
                      const childIconConfig = ICON_MAP[child.key] || { icon: child.iconClass, color: staffIconColor }
                      const childIconName = child.iconClass || childIconConfig.icon

                      return (
                        <a
                          key={child.key}
                          data-sidebar-key={child.key}
                          href={`${pathname}?view=${child.key}`}
                          onClick={(e) => handleLinkClick(e, child.key)}
                          title={!open ? child.label : undefined}
                          data-tooltip-placement="right"
                          data-background-color={isActive ? activeColor : undefined}
                          data-transition-delay={isExpanded ? `${childIdx * 30}ms` : "0ms"}
                          style={isActive ? { backgroundColor: activeColor } : undefined}
                          className={cn(
                            "rms-style-transition-delay flex w-full h-[38px] items-center rounded-[8px] text-[14px] outline-none cursor-pointer transition-colors duration-200 ease-out relative group select-none overflow-hidden shrink-0",
                            open ? "pl-4 pr-1 justify-start" : "px-0 justify-center",
                            isActive
                              ? "text-white font-medium shadow-2xs rms-style-background-color"
                              : "text-[#1D1D1F] dark:text-zinc-200 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 font-normal"
                          )}
                        >
                          <div className={cn("flex items-center overflow-hidden", open ? "min-w-0 flex-1" : "justify-center w-full")}>
                            <span className="w-[36px] h-[36px] flex items-center justify-center shrink-0">
                              <LucideIcon 
                                data-color={isActive ? "#FFFFFF" : staffIconColor}
                                style={{ color: isActive ? "#FFFFFF" : staffIconColor }}
                                className={cn("rms-style-color", childIconName, "text-[19px] transition-colors shrink-0")}
                              ></LucideIcon>
                            </span>
                            <span
                              className={cn(
                                "whitespace-nowrap font-medium text-[13.5px] text-left ml-1.5 overflow-hidden block transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                                open
                                  ? "opacity-100 max-w-[170px] translate-x-0"
                                  : "opacity-0 max-w-0 ml-0 -translate-x-3 pointer-events-none"
                              )}
                            >
                              {child.label}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "flex items-center shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
                              open
                                ? "opacity-100 max-w-[50px] translate-x-0 mr-1"
                                : "opacity-0 max-w-0 translate-x-2 pointer-events-none mr-0"
                            )}
                          >
                            {child.badge > 0 && (
                              <span
                                className="rms-style-background-color rms-style-color flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                                data-background-color={isActive ? "#FFFFFF" : activeColor}
                                data-color={isActive ? activeColor : "#FFFFFF"}
                                style={{ backgroundColor: isActive ? "#FFFFFF" : activeColor, color: isActive ? activeColor : "#FFFFFF" }}
                              >
                                {child.badge > 99 ? "99+" : child.badge}
                              </span>
                            )}
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          }

          const isActive = activeKey === item.key
          const iconConfig = ICON_MAP[item.key] || { icon: item.iconClass, color: staffIconColor }
          const iconName = item.iconClass || iconConfig.icon

          return (
            <a
              key={item.key}
              data-sidebar-key={item.key}
              href={`${pathname}?view=${item.key}`}
              onClick={(e) => handleLinkClick(e, item.key)}
              title={!open ? item.label : undefined}
              data-tooltip-placement="right"
              data-background-color={isActive ? activeColor : undefined}
              style={isActive ? { backgroundColor: activeColor } : undefined}
              className={cn(
                "flex w-full h-[38px] items-center rounded-[8px] text-[14px] outline-none cursor-pointer transition-colors duration-200 ease-out relative group select-none overflow-hidden shrink-0",
                open ? "px-1 justify-start" : "px-0 justify-center",
                isActive
                  ? "text-white font-medium shadow-2xs rms-style-background-color"
                  : "text-[#1D1D1F] dark:text-zinc-200 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 font-normal"
              )}
            >
              <div className={cn("flex items-center overflow-hidden", open ? "min-w-0 flex-1" : "justify-center w-full")}>
                <span className="relative w-[36px] h-[36px] flex items-center justify-center shrink-0">
                  <LucideIcon 
                    data-color={isActive ? "#FFFFFF" : staffIconColor}
                    style={{ color: isActive ? "#FFFFFF" : staffIconColor }}
                    className={cn("rms-style-color", iconName, "text-[19px] transition-colors shrink-0")}
                  ></LucideIcon>
                  {/* Collapsed notification dot */}
                  <span
                    data-background-color={activeColor}
                    style={{ backgroundColor: activeColor }}
                    className={cn("rms-style-background-color absolute top-1 right-1 h-2 w-2 rounded-full ring-2 ring-white dark:ring-zinc-950 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", !open && item.badge > 0 ? "opacity-100 scale-100" : "opacity-0 scale-0 pointer-events-none")}
                  />
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap font-medium text-[13.5px] text-left ml-1.5 overflow-hidden block transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    open
                      ? "opacity-100 max-w-[170px] translate-x-0"
                      : "opacity-0 max-w-0 ml-0 -translate-x-3 pointer-events-none"
                  )}
                >
                  {item.label}
                </span>
              </div>

              {/* Badge for expanded view */}
              <div
                className={cn(
                  "flex items-center shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
                  open
                    ? "opacity-100 max-w-[50px] translate-x-0 mr-1"
                    : "opacity-0 max-w-0 translate-x-2 pointer-events-none mr-0"
                )}
              >
                {item.badge > 0 && (
                  <span
                    className="rms-style-background-color rms-style-color flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                    data-background-color={isActive ? "#FFFFFF" : activeColor}
                    data-color={isActive ? activeColor : "#FFFFFF"}
                    style={{ backgroundColor: isActive ? "#FFFFFF" : activeColor, color: isActive ? activeColor : "#FFFFFF" }}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
            </a>
          )
        })}
      </div>
    </aside>
  )
}
