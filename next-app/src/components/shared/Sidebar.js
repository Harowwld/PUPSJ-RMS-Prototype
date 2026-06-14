"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

// Icon and color map matching Apple Photos Light Sidebar spec
const ICON_MAP = {
  // Admin views
  review: { icon: "ti ti-file-check", color: "#E5484D" },
  digitization: { icon: "ti ti-chart-bar", color: "#E5484D" },
  request_analytics: { icon: "ti ti-arrow-up-right", color: "#E5484D" },
  directory: { icon: "ti ti-users", color: "#E5484D" },
  create: { icon: "ti ti-user-plus", color: "#E5484D" },
  storage_layout: { icon: "ti ti-building-warehouse", color: "#E5484D" },
  system_data: { icon: "ti ti-settings-cog", color: "#E5484D" },
  system: { icon: "ti ti-database", color: "#E5484D" },
  logs: { icon: "ti ti-shield-check", color: "#E5484D" },

  // Staff views
  requests: { icon: "ti ti-arrow-up-right", color: "#E5484D" },
  upload: { icon: "ti ti-scan", color: "#E5484D" },
  documents: { icon: "ti ti-file-text", color: "#E5484D" },
  notifications: { icon: "ti ti-bell", color: "#E5484D" },
  search: { icon: "ti ti-archive", color: "#E5484D" },
}

export default function Sidebar({ items, activeKey, onSelect, onLogout, zoomNode, setZoomNode, handleZoomMouseDown }) {
  const pathname = usePathname()
  const isStaff = pathname?.startsWith("/staff") || items.some(item => 
    ["requests", "upload", "documents", "notifications", "search"].includes(item.key)
  )
  const staffIconColor = isStaff ? "#edbb00" : "#E5484D"
  const sidebarRef = useRef(null)
  const [sidebarFocused, setSidebarFocused] = useState(true)
  const [localActiveKey, setLocalActiveKey] = useState(activeKey)

  useEffect(() => {
    setLocalActiveKey(activeKey)
  }, [activeKey])

  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (sidebarRef.current && sidebarRef.current.contains(e.target)) {
        setSidebarFocused(true)
      } else {
        setSidebarFocused(false)
      }
    }
    if (typeof document !== "undefined") {
      document.addEventListener("mousedown", handleDocumentClick)
    }
    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("mousedown", handleDocumentClick)
      }
    }
  }, [])

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
      setLocalActiveKey(key)
      onSelect(key)
    }
  }

  return (
    <aside
      ref={sidebarRef}
      className="z-10 hidden w-[260px] flex-shrink-0 flex-col gap-[2px] overflow-y-auto bg-[#fbfbfd] dark:bg-zinc-950 p-2 select-none md:flex sticky top-0 h-screen"
      style={{ borderRight: "0.5px solid rgba(0,0,0,0.08)" }}
    >
      <div className="flex flex-col gap-[2px] flex-1">
        <div className="flex items-center gap-[5px] mb-1.5 ml-1">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("toggle-sidebar"))
              }
            }}
            className="flex w-[30px] h-[30px] items-center justify-center rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] cursor-pointer transition-colors"
          >
            <i className="ti ti-layout-sidebar text-[21px]" style={{ color: "#E5484D" }}></i>
          </button>

          {/* Zoom Control when Sidebar is Visible */}
          {zoomNode !== undefined && setZoomNode && handleZoomMouseDown && (
            <div className="flex items-center gap-1 select-none">
              <button
                type="button"
                onClick={() => setZoomNode(prev => Math.max(0, prev - 1))}
                className="group flex items-center justify-center border-0 rounded-brand hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer bg-transparent h-7 w-7 transition-colors duration-75"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 7H11.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>
              <div 
                onMouseDown={handleZoomMouseDown}
                onTouchStart={handleZoomMouseDown}
                className="relative w-[50px] h-[14px] flex items-center group cursor-pointer"
              >
                {/* Track */}
                <div className="absolute left-0 right-0 h-[2.5px] bg-[#D1D1D6] dark:bg-zinc-700 rounded-full"></div>
                {/* Active Track */}
                <div 
                  className="absolute left-0 h-[2.5px] bg-[#007AFF] rounded-full"
                  style={{ width: `${(zoomNode / 6) * 100}%` }}
                ></div>
                {/* Handle */}
                <div 
                  className="absolute -translate-x-1/2 w-[12px] h-[12px] rounded-full bg-white dark:bg-zinc-900 border-[2px] border-[#007AFF] shadow-xs"
                  style={{ left: `${(zoomNode / 6) * 100}%` }}
                ></div>
              </div>
              <button
                type="button"
                onClick={() => setZoomNode(prev => Math.min(6, prev + 1))}
                className="group flex items-center justify-center border-0 rounded-brand hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer bg-transparent h-7 w-7 transition-colors duration-75"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 2.5V11.5M2.5 7H11.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>
        {items.map((item, idx) => {
          if (item.type === "header") {
            return (
              <div
                key={`header-${idx}`}
                className={cn(
                  "mb-[2px] pl-2 text-[12px] font-semibold tracking-[0.05em] uppercase text-[#8E8E93]",
                  idx === 0 ? "mt-1.5" : "mt-5"
                )}
              >
                {item.label}
              </div>
            )
          }

          if (item.type === "accordion") {
            const isExpanded = expandedKeys[item.key]
            const hasActiveChild = item.children?.some((c) => c.key === localActiveKey)
            const iconConfig = ICON_MAP[item.key] || { icon: item.iconClass, color: staffIconColor }

            return (
              <div key={item.key} className="flex flex-col gap-[2px]">
                <button
                  type="button"
                  onClick={() => toggleAccordion(item.key)}
                  className={cn(
                    "flex w-full h-[36px] items-center justify-between rounded-[6px] px-2 text-[15px] transition-colors outline-none cursor-pointer",
                    hasActiveChild && !isExpanded
                      ? sidebarFocused
                        ? "bg-[#E5484D] text-white font-medium"
                        : "bg-[#F0F0F0] text-[#1D1D1F] font-medium"
                      : "text-[#1D1D1F] hover:bg-[rgba(0,0,0,0.06)] font-normal"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-1.5 pl-4">
                    <i
                      className={cn(iconConfig.icon, "text-[18px] transition-colors shrink-0")}
                      style={{ color: hasActiveChild && !isExpanded ? (sidebarFocused ? "#FFFFFF" : staffIconColor) : staffIconColor }}
                    ></i>
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge > 0 ? (
                      <span
                        className={cn(
                          "flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                          hasActiveChild && !isExpanded
                            ? sidebarFocused
                              ? "bg-white text-[#E5484D]"
                              : "bg-[#E5484D] text-white"
                            : "bg-[#E5484D] text-white"
                        )}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                    <i
                      className={cn(
                        "ti ti-chevron-down text-xs transition-transform duration-300",
                        isExpanded && "rotate-180"
                      )}
                    ></i>
                  </div>
                </button>

                <div
                  className={cn(
                    "overflow-hidden transition-all duration-[450ms] ease-out",
                    isExpanded ? "mt-[2px] max-h-[500px] opacity-100" : "mt-0 max-h-0 opacity-0"
                  )}
                >
                  <div className="ml-4 flex flex-col gap-[2px] border-l border-gray-150 pl-2">
                    {item.children.map((child, childIdx) => {
                      const isActive = localActiveKey === child.key
                      const childIconConfig = ICON_MAP[child.key] || { icon: child.iconClass, color: staffIconColor }

                      return (
                        <a
                          key={child.key}
                          href={`${pathname}?view=${child.key}`}
                          onClick={(e) => handleLinkClick(e, child.key)}
                          className={cn(
                            "flex w-full h-[36px] items-center justify-between gap-[6px] rounded-[6px] px-2 text-[15px] transition-colors outline-none cursor-pointer",
                            isActive
                              ? sidebarFocused
                                ? "bg-[#E5484D] text-white font-medium"
                                : "bg-[#F0F0F0] text-[#1D1D1F] font-medium"
                              : "text-[#1D1D1F] hover:bg-[rgba(0,0,0,0.06)] font-normal"
                          )}
                          style={{
                            transitionDelay: isExpanded
                              ? `${childIdx * 50}ms`
                              : "0ms",
                          }}
                        >
                          <span className="flex min-w-0 items-center gap-1.5 pl-4">
                            <i
                              className={cn(childIconConfig.icon, "text-[18px] transition-colors shrink-0")}
                              style={{ color: isActive ? (sidebarFocused ? "#FFFFFF" : staffIconColor) : staffIconColor }}
                            ></i>
                            <span>{child.label}</span>
                          </span>
                          {child.badge > 0 ? (
                            <span
                              className={cn(
                                "flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                                isActive
                                  ? sidebarFocused
                                    ? "bg-white text-[#E5484D]"
                                    : "bg-[#E5484D] text-white"
                                  : "bg-[#E5484D] text-white"
                              )}
                            >
                              {child.badge > 99 ? "99+" : child.badge}
                            </span>
                          ) : null}
                        </a>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          }

          const isActive = localActiveKey === item.key
          const iconConfig = ICON_MAP[item.key] || { icon: item.iconClass, color: staffIconColor }

          return (
            <a
              key={item.key}
              href={`${pathname}?view=${item.key}`}
              onClick={(e) => handleLinkClick(e, item.key)}
              className={cn(
                "flex w-full h-[36px] items-center justify-between gap-1.5 rounded-[6px] px-2 text-[15px] transition-colors outline-none cursor-pointer",
                isActive
                  ? sidebarFocused
                    ? "bg-[#E5484D] text-white font-medium"
                    : "bg-[#F0F0F0] text-[#1D1D1F] font-medium"
                  : "text-[#1D1D1F] hover:bg-[rgba(0,0,0,0.06)] font-normal"
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5 pl-4">
                <i
                  className={cn(iconConfig.icon, "text-[18px] transition-colors shrink-0")}
                  style={{ color: isActive ? (sidebarFocused ? "#FFFFFF" : staffIconColor) : staffIconColor }}
                ></i>
                <span>{item.label}</span>
              </span>
              {item.badge > 0 ? (
                <span
                  className={cn(
                    "ml-auto flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                    isActive
                      ? sidebarFocused
                        ? "bg-white text-[#E5484D]"
                        : "bg-[#E5484D] text-white"
                      : "bg-[#E5484D] text-white"
                  )}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </a>
          )
        })}
      </div>

      
    </aside>
  )
}
