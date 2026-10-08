"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { getRoleBranding } from "@/lib/roleBranding"
import { ZOOM_PERCENTAGES } from "@/hooks/useLayoutZoom"

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
  standards: { icon: "ph-bold ph-clock-countdown" },
  staff: { icon: "ti ti-users" },
  security: { icon: "ph-bold ph-shield-check" },
  health: { icon: "ti ti-activity-heartbeat" },
  backups: { icon: "ti ti-database-backup" },
  landing: { icon: "ph-bold ph-layout" },

  // Staff views
  requests: { icon: "ti ti-arrow-up-right" },
  odrs: { icon: "ti ti-file-text" },
  compliance: { icon: "ti ti-clipboard-check" },
  osas: { icon: "ti ti-school" },
  osas_monitoring: { icon: "ti ti-school" },
  upload: { icon: "ti ti-scan" },
  documents: { icon: "ti ti-file-text" },
  notifications: { icon: "ti ti-bell" },
  search: { icon: "ti ti-archive" },
  storage: { icon: "ti ti-folder-open" },
}

export default function Sidebar({ open = true, items, activeKey, onSelect, onLogout, zoomNode, setZoomNode, handleZoomMouseDown, accentColor, officeName, authUser, bottomContent, children }) {
  const pathname = usePathname()
  const isStaff = pathname?.startsWith("/staff") || items.some(item => 
    ["requests", "upload", "documents", "notifications", "search"].includes(item.key)
  )
  const isSystemAdmin = pathname?.startsWith("/systemadmin") || pathname?.startsWith("/superadmin")
  const roleBranding = getRoleBranding(authUser || {
    role: isSystemAdmin ? "SuperAdmin" : (isStaff ? "Staff" : "Admin"),
    officeName,
    accent_color: accentColor,
  })
  const defaultColor = isSystemAdmin ? "#0F172A" : (roleBranding.color || (isStaff ? "#ffcb00" : "#ff9b11"))
  const activeColor = accentColor || roleBranding.color || defaultColor
  const activeForeground = (accentColor && accentColor !== roleBranding.color ? "#FFFFFF" : roleBranding.foreground) || "#FFFFFF"
  const staffIconColor = activeColor
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
            className="flex w-[40px] h-[40px] items-center justify-center rounded-[8px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 active:scale-95 cursor-pointer transition-all duration-200 ease-out shrink-0"
          >
            <HugeIcon className={cn("text-gray-700 dark:text-zinc-300 text-[24px] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", open ? "ti ti-panel-left-dashed" : "ti ti-panel-left")}></HugeIcon>
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
                  title={`Zoom Out (${zoomNode > 0 ? (ZOOM_PERCENTAGES[zoomNode - 1] ?? 75) + "%" : "Min 75%"})`}
                  className="group flex items-center justify-center border-0 rounded-brand hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer bg-transparent h-7 w-7 transition-colors duration-75 shrink-0"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 7H11.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <div 
                  onMouseDown={handleZoomMouseDown}
                  onTouchStart={handleZoomMouseDown}
                  title={`Layout Scale: ${ZOOM_PERCENTAGES[zoomNode] ?? 100}% (Drag slider or click Reset)`}
                  className="relative w-[50px] h-[14px] flex items-center group cursor-pointer shrink-0"
                >
                  <div className="absolute left-0 right-0 h-[2.5px] bg-[#D1D1D6] dark:bg-zinc-700 rounded-full"></div>
                  <div
                    className="rms-style-width bg-gray-800 dark:bg-zinc-200 absolute left-0 h-[2.5px] rounded-full"
                    data-width={`${(zoomNode / 6) * 100}%`}
                  ></div>
                  <div
                    className="rms-style-left border-gray-800 dark:border-border absolute -translate-x-1/2 w-[12px] h-[12px] rounded-full bg-white dark:bg-zinc-900 shadow-xs border-2"
                    data-left={`${(zoomNode / 6) * 100}%`}
                  ></div>
                </div>
                <button
                  type="button"
                  onClick={() => setZoomNode(prev => Math.min(6, prev + 1))}
                  title={`Zoom In (${zoomNode < 6 ? (ZOOM_PERCENTAGES[zoomNode + 1] ?? 125) + "%" : "Max 125%"})`}
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
                    <HugeIcon  className="ti ti-rotate-2 text-[12px]"></HugeIcon>
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
                    "text-[12px] font-semibold tracking-[0.05em] uppercase text-[#8E8E93] dark:text-zinc-500 whitespace-nowrap px-2 block transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
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
                  style={hasActiveChild && !isExpanded ? { backgroundColor: activeColor, color: activeForeground } : undefined}
                  className={cn(
                    "flex w-full h-[42px] items-center rounded-[8px] text-[14px] outline-none cursor-pointer transition-colors duration-200 ease-out relative group select-none overflow-hidden shrink-0",
                    open ? "px-1 justify-start" : "px-0 justify-center",
                    hasActiveChild && !isExpanded
                      ? "font-medium shadow-2xs rms-style-background-color"
                      : "text-[#1D1D1F] dark:text-zinc-200 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 font-normal"
                  )}
                >
                  <div className={cn("flex items-center overflow-hidden", open ? "min-w-0 flex-1" : "justify-center w-full")}>
                    <span className="relative w-[40px] h-[40px] flex items-center justify-center shrink-0">
                      <HugeIcon 
                        data-color={hasActiveChild && !isExpanded ? activeForeground : staffIconColor}
                        style={{ color: hasActiveChild && !isExpanded ? activeForeground : staffIconColor }}
                        className={cn("rms-style-color", iconName, "text-[22px] transition-colors shrink-0")}
                      ></HugeIcon>
                      {/* Collapsed notification dot */}
                      <span
                        data-background-color={activeColor}
                        style={{ backgroundColor: activeColor }}
                        className={cn("rms-style-background-color absolute top-1 right-1 h-2 w-2 rounded-full ring-2 ring-white dark:ring-zinc-950 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", !open && item.badge > 0 ? "opacity-100 scale-100" : "opacity-0 scale-0 pointer-events-none")}
                      />
                    </span>
                    <span
                      className={cn(
                        "whitespace-nowrap font-medium text-[14.5px] text-left ml-1.5 overflow-hidden block transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
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
                        data-background-color={hasActiveChild && !isExpanded ? activeForeground : activeColor}
                        data-color={hasActiveChild && !isExpanded ? activeColor : activeForeground}
                        style={{ backgroundColor: hasActiveChild && !isExpanded ? activeForeground : activeColor, color: hasActiveChild && !isExpanded ? activeColor : activeForeground }}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                    <HugeIcon 
                      className={cn(
                        "ti ti-chevron-down text-xs transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        isExpanded && "rotate-180"
                      )}
                    ></HugeIcon>
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
                          style={isActive ? { backgroundColor: activeColor, color: activeForeground } : undefined}
                          className={cn(
                            "rms-style-transition-delay flex w-full h-[42px] items-center rounded-[8px] text-[14px] outline-none cursor-pointer transition-colors duration-200 ease-out relative group select-none overflow-hidden shrink-0",
                            open ? "pl-4 pr-1 justify-start" : "px-0 justify-center",
                            isActive
                              ? "font-medium shadow-2xs rms-style-background-color"
                              : "text-[#1D1D1F] dark:text-zinc-200 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 font-normal"
                          )}
                        >
                          <div className={cn("flex items-center overflow-hidden", open ? "min-w-0 flex-1" : "justify-center w-full")}>
                            <span className="w-[40px] h-[40px] flex items-center justify-center shrink-0">
                              <HugeIcon 
                                data-color={isActive ? activeForeground : staffIconColor}
                                style={{ color: isActive ? activeForeground : staffIconColor }}
                                className={cn("rms-style-color", childIconName, "text-[22px] transition-colors shrink-0")}
                                title={child.label}
                              ></HugeIcon>
                            </span>
                            <span
                              className={cn(
                                "whitespace-nowrap font-medium text-[14.5px] text-left ml-1.5 overflow-hidden block transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
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
                                data-background-color={isActive ? activeForeground : activeColor}
                                data-color={isActive ? activeColor : activeForeground}
                                style={{ backgroundColor: isActive ? activeForeground : activeColor, color: isActive ? activeColor : activeForeground }}
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
              style={isActive ? { backgroundColor: activeColor, color: activeForeground } : undefined}
              className={cn(
                "flex w-full h-[42px] items-center rounded-[8px] text-[14px] outline-none cursor-pointer transition-colors duration-200 ease-out relative group select-none overflow-hidden shrink-0",
                open ? "px-1 justify-start" : "px-0 justify-center",
                isActive
                  ? "font-medium shadow-2xs rms-style-background-color"
                  : "text-[#1D1D1F] dark:text-zinc-200 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 font-normal"
              )}
            >
              <div className={cn("flex items-center overflow-hidden", open ? "min-w-0 flex-1" : "justify-center w-full")}>
                <span className="relative w-[40px] h-[40px] flex items-center justify-center shrink-0">
                  <HugeIcon 
                    data-color={isActive ? activeForeground : staffIconColor}
                    style={{ color: isActive ? activeForeground : staffIconColor }}
                    className={cn("rms-style-color", iconName, "text-[22px] transition-colors shrink-0")}
                                title={item.label}
                  ></HugeIcon>
                  {/* Collapsed notification dot */}
                  <span
                    data-background-color={activeColor}
                    style={{ backgroundColor: activeColor }}
                    className={cn("rms-style-background-color absolute top-1 right-1 h-2 w-2 rounded-full ring-2 ring-white dark:ring-zinc-950 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", !open && item.badge > 0 ? "opacity-100 scale-100" : "opacity-0 scale-0 pointer-events-none")}
                  />
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap font-medium text-[14.5px] text-left ml-1.5 overflow-hidden block transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
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
                    data-background-color={isActive ? activeForeground : activeColor}
                    data-color={isActive ? activeColor : activeForeground}
                    style={{ backgroundColor: isActive ? activeForeground : activeColor, color: isActive ? activeColor : activeForeground }}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
            </a>
          )
        })}

        {(bottomContent || children) && (
          <div className="mt-auto pt-2 w-full shrink-0">
            {typeof bottomContent === "function"
              ? bottomContent({ open })
              : bottomContent}
            {typeof children === "function"
              ? children({ open })
              : children}
          </div>
        )}
      </div>
    </aside>
  )
}
