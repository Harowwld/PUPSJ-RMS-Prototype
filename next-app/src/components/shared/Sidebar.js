"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function Sidebar({ items, activeKey, onSelect }) {
  const pathname = usePathname()
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
    <aside className="z-10 hidden w-72 flex-shrink-0 flex-col gap-[1px] overflow-y-auto border-r border-gray-200 bg-white px-3 py-4 shadow-sm md:flex select-none transition-colors duration-300 dark:border-white/5 dark:bg-white/2">
      {items.map((item, idx) => {
        if (item.type === "header") {
          return (
            <div
              key={`header-${idx}`}
              className="mt-5 mb-[2px] px-2 text-[10px] font-medium tracking-[0.06em] uppercase text-gray-400 first:mt-0 dark:text-zinc-500"
            >
              {item.label}
            </div>
          )
        }

        if (item.type === "accordion") {
          const isExpanded = expandedKeys[item.key]
          const hasActiveChild = item.children?.some((c) => c.key === activeKey)

          return (
            <div key={item.key} className="flex flex-col gap-[1px]">
              <button
                type="button"
                onClick={() => toggleAccordion(item.key)}
                className={cn(
                  "flex w-full h-[34px] items-center justify-between rounded-[8px] px-[10px] text-[13px] tracking-[-0.01em] whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/20 cursor-pointer",
                  hasActiveChild && !isExpanded
                    ? "bg-red-50 text-pup-maroon dark:bg-red-500/10 dark:text-primary font-medium"
                    : "text-gray-650 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50 font-normal"
                )}
              >
                <div className="flex min-w-0 items-center gap-[10px]">
                  <i className={cn(
                    item.iconClass,
                    "text-[15px] transition-colors shrink-0",
                    hasActiveChild && !isExpanded ? "text-pup-maroon dark:text-primary" : "text-gray-400 dark:text-zinc-500"
                  )}></i>
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge > 0 ? (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white bg-pup-maroon dark:bg-red-500">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                  <i
                    className={cn(
                      "ph-bold ph-caret-down text-xs transition-transform duration-300",
                      isExpanded && "rotate-180"
                    )}
                  ></i>
                </div>
              </button>

              <div
                className={cn(
                  "overflow-hidden transition-all duration-[450ms] ease-out",
                  isExpanded ? "mt-[1px] max-h-[500px] opacity-100" : "mt-0 max-h-0 opacity-0"
                )}
              >
                <div className="ml-5 flex flex-col gap-[1px] border-l border-gray-100 pl-3 dark:border-white/5">
                  {item.children.map((child, childIdx) => {
                    const isActive = activeKey === child.key
                    return (
                      <a
                        key={child.key}
                        href={`${pathname}?view=${child.key}`}
                        onClick={(e) => handleLinkClick(e, child.key)}
                        className={cn(
                          "flex w-full h-[34px] items-center justify-between gap-[10px] rounded-[8px] px-[10px] text-[13px] tracking-[-0.01em] whitespace-nowrap transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/20 cursor-pointer",
                          isActive
                            ? "bg-red-50 text-pup-maroon dark:bg-red-500/10 dark:text-primary font-medium"
                            : "text-gray-650 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50 font-normal"
                        )}
                        style={{
                          transitionDelay: isExpanded
                            ? `${childIdx * 50}ms`
                            : "0ms",
                        }}
                      >
                        <span className="flex min-w-0 items-center gap-[10px]">
                          <i className={cn(
                            child.iconClass,
                            "text-[15px] transition-colors shrink-0",
                            isActive ? "text-pup-maroon dark:text-primary" : "text-gray-400 dark:text-zinc-500"
                          )}></i>
                          <span>{child.label}</span>
                        </span>
                        {child.badge > 0 ? (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white bg-pup-maroon dark:bg-red-500">
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

        const isActive = activeKey === item.key
        return (
          <a
            key={item.key}
            href={`${pathname}?view=${item.key}`}
            onClick={(e) => handleLinkClick(e, item.key)}
            className={cn(
              "flex w-full h-[34px] items-center justify-between gap-[10px] rounded-[8px] px-[10px] py-[6px] text-[13px] tracking-[-0.01em] whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/20 cursor-pointer",
              isActive
                ? "bg-red-50 text-pup-maroon dark:bg-red-500/10 dark:text-primary font-medium"
                : "text-gray-650 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50 font-normal"
            )}
          >
            <span className="flex min-w-0 items-center gap-[10px]">
              <i className={cn(
                item.iconClass,
                "text-[15px] transition-colors shrink-0",
                isActive ? "text-pup-maroon dark:text-primary" : "text-gray-400 dark:text-zinc-500"
              )}></i>
              <span>{item.label}</span>
            </span>
            {item.badge > 0 ? (
              <span className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white bg-pup-maroon dark:bg-red-500">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </a>
        )
      })}
    </aside>
  )
}
