"use client"

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

  // Staff views
  requests: { icon: "ti ti-arrow-up-right" },
  odrs: { icon: "ti ti-file-text" },
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
  const defaultColor = isSystemAdmin ? "#0f172a" : (isStaff ? "#ebb800" : "#e30000")
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
        "z-10 flex-col gap-[2px] bg-white/20 backdrop-blur-md dark:bg-zinc-950/25 select-none sticky top-0 h-screen overflow-hidden hidden md:flex shrink-0",
        open ? "w-[275px] py-2 px-2" : "w-[60px] py-2 px-1"
      )}
      style={{ 
        borderRight: "0.5px solid rgba(255,255,255,0.18)",
        transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1), padding 300ms cubic-bezier(0.4, 0, 0.2, 1)" 
      }}
    >
      <div className="flex flex-col gap-[2px] flex-1 h-full overflow-y-auto w-full items-stretch">
        <div 
          className="flex items-center mb-1.5 w-full"
          style={{ paddingLeft: "6px", height: "36px" }}
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
            className="flex w-[36px] h-[36px] items-center justify-center rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 cursor-pointer transition-colors shrink-0"
          >
            <i className={cn("text-[21px] transition-all duration-300", open ? "ti ti-panel-left-dashed" : "ti ti-panel-left")} style={{ color: activeColor }}></i>
          </button>

          {/* Zoom Control when Sidebar is Visible */}
          <div className={cn(
            "flex items-center gap-1 select-none transition-all duration-300 ease-in-out overflow-hidden origin-left",
            open ? "opacity-35 hover:opacity-100 max-w-[220px] ml-1" : "opacity-0 max-w-0 ml-0 pointer-events-none"
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
                    className="absolute left-0 h-[2.5px] rounded-full"
                    style={{ width: `${(zoomNode / 6) * 100}%`, backgroundColor: activeColor }}
                  ></div>
                  <div 
                    className="absolute -translate-x-1/2 w-[12px] h-[12px] rounded-full bg-white dark:bg-zinc-900 shadow-xs"
                    style={{ left: `${(zoomNode / 6) * 100}%`, border: `2px solid ${activeColor}` }}
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
                    <i className="ti ti-rotate-2 text-[11px]"></i>
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
                className="transition-all duration-300 ease-in-out w-full flex items-center"
                style={{ 
                  height: "20px", 
                  marginTop: idx === 0 ? "8px" : "24px",
                  marginBottom: "8px",
                  paddingLeft: "14px"
                }}
              >
                {open ? (
                  <span className="text-[11.5px] font-semibold tracking-[0.05em] uppercase text-[#8E8E93] dark:text-zinc-500 block truncate transition-opacity duration-300 opacity-100">
                    {item.label}
                  </span>
                ) : (
                  <div className="h-[1px] bg-gray-200 dark:bg-zinc-800 w-[50%] transition-opacity duration-300 opacity-100" />
                )}
              </div>
            )
          }

          if (item.type === "accordion") {
            const isExpanded = expandedKeys[item.key]
            const hasActiveChild = item.children?.some((c) => c.key === activeKey)
            const iconConfig = ICON_MAP[item.key] || { icon: item.iconClass, color: staffIconColor }

            return (
              <div key={item.key} className="flex flex-col gap-[2px] w-full items-stretch">
                <button
                  type="button"
                  onClick={() => toggleAccordion(item.key)}
                  title={!open ? item.label : undefined}
                  data-tooltip-placement="right"
                  className={cn(
                    "flex w-full h-[36px] items-center rounded-[6px] text-[14.5px] outline-none cursor-pointer justify-between transition-colors",
                    hasActiveChild && !isExpanded
                      ? "text-white font-medium shadow-2xs"
                      : "text-[#1D1D1F] dark:text-zinc-200 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 font-normal"
                  )}
                  style={{
                    backgroundColor: hasActiveChild && !isExpanded ? activeColor : undefined,
                    paddingLeft: "14px",
                    paddingRight: "8px",
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-center justify-start overflow-hidden mr-1">
                    <i
                      className={cn(iconConfig.icon, "text-[18px] transition-colors shrink-0")}
                      style={{ color: hasActiveChild && !isExpanded ? "#FFFFFF" : staffIconColor }}
                    ></i>
                    <span className={cn(
                      "transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden text-ellipsis origin-left block",
                      open ? "opacity-100 flex-1 min-w-0 ml-2 text-left" : "opacity-0 max-w-0 ml-0 pointer-events-none"
                    )}>
                      {item.label}
                    </span>
                  </div>
                  <div className={cn("flex items-center gap-1.5 shrink-0 transition-all duration-300", open ? "opacity-100 scale-100" : "opacity-0 scale-0 pointer-events-none w-0")}>
                    {item.badge > 0 ? (
                      <span
                        className={cn(
                          "flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                        )}
                        style={
                          hasActiveChild && !isExpanded
                            ? { backgroundColor: "#FFFFFF", color: activeColor }
                            : { backgroundColor: activeColor, color: "#FFFFFF" }
                        }
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                    <i
                      className={cn(
                        "ti ti-chevron-down text-xs transition-transform duration-normal",
                        isExpanded && "rotate-180"
                      )}
                    ></i>
                  </div>
                </button>

                <div
                  className={cn(
                    "overflow-hidden transition-all duration-[450ms] ease-out w-full",
                    open && isExpanded ? "mt-[2px] max-h-[500px] opacity-100" : "mt-0 max-h-0 opacity-0 pointer-events-none"
                  )}
                >
                  <div className="flex flex-col gap-[2px] items-stretch">
                    {item.children.map((child, childIdx) => {
                      const isActive = activeKey === child.key
                      const childIconConfig = ICON_MAP[child.key] || { icon: child.iconClass, color: staffIconColor }

                      return (
                        <a
                          key={child.key}
                          data-sidebar-key={child.key}
                          href={`${pathname}?view=${child.key}`}
                          onClick={(e) => handleLinkClick(e, child.key)}
                          title={!open ? child.label : undefined}
                          data-tooltip-placement="right"
                          className={cn(
                            "flex w-full h-[36px] items-center rounded-[6px] text-[14.5px] outline-none cursor-pointer justify-between transition-colors",
                            isActive
                              ? "text-white font-medium shadow-2xs"
                              : "text-[#1D1D1F] dark:text-zinc-200 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 font-normal"
                          )}
                          style={{
                            backgroundColor: isActive ? activeColor : undefined,
                            paddingLeft: "26px",
                            paddingRight: "8px",
                            transitionDelay: isExpanded ? `${childIdx * 50}ms` : "0ms",
                          }}
                        >
                          <span className="flex min-w-0 flex-1 items-center justify-start overflow-hidden mr-1">
                            <i
                              className={cn(childIconConfig.icon, "text-[18px] transition-colors shrink-0")}
                              style={{ color: isActive ? "#FFFFFF" : staffIconColor }}
                            ></i>
                            <span className={cn(
                              "transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden text-ellipsis origin-left block",
                              open ? "opacity-100 flex-1 min-w-0 ml-2 text-left" : "opacity-0 max-w-0 ml-0 pointer-events-none"
                            )}>
                              {child.label}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold transition-all duration-300",
                              open && child.badge > 0 ? "opacity-100 scale-100" : "opacity-0 scale-0 pointer-events-none w-0"
                            )}
                            style={
                              isActive
                                ? { backgroundColor: "#FFFFFF", color: activeColor }
                                : { backgroundColor: activeColor, color: "#FFFFFF" }
                            }
                          >
                            {child.badge > 99 ? "99+" : child.badge}
                          </span>
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

          return (
            <a
              key={item.key}
              data-sidebar-key={item.key}
              href={`${pathname}?view=${item.key}`}
              onClick={(e) => handleLinkClick(e, item.key)}
              title={!open ? item.label : undefined}
              data-tooltip-placement="right"
              className={cn(
                "flex w-full h-[36px] items-center rounded-[6px] text-[14.5px] outline-none cursor-pointer justify-between transition-colors",
                isActive
                  ? "text-white font-medium shadow-2xs"
                  : "text-[#1D1D1F] dark:text-zinc-200 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 font-normal"
              )}
              style={{
                backgroundColor: isActive ? activeColor : undefined,
                paddingLeft: "14px",
                paddingRight: "8px",
              }}
            >
              <span className="flex min-w-0 flex-1 items-center justify-start overflow-hidden mr-1">
                <i
                  className={cn(iconConfig.icon, "text-[18px] transition-colors shrink-0")}
                  style={{ color: isActive ? "#FFFFFF" : staffIconColor }}
                ></i>
                <span className={cn(
                  "transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden text-ellipsis origin-left block",
                  open ? "opacity-100 flex-1 min-w-0 ml-2 text-left" : "opacity-0 max-w-0 ml-0 pointer-events-none"
                )}>
                  {item.label}
                </span>
              </span>
              <span
                className={cn(
                  "flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold transition-all duration-300",
                  open && item.badge > 0 ? "opacity-100 scale-100 ml-auto" : "opacity-0 scale-0 pointer-events-none w-0"
                )}
                style={
                  isActive
                    ? { backgroundColor: "#FFFFFF", color: activeColor }
                    : { backgroundColor: activeColor, color: "#FFFFFF" }
                }
              >
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            </a>
          )
        })}
      </div>
    </aside>
  )
}
