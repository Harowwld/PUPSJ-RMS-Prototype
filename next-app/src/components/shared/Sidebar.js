"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

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
    // Only intercept normal left clicks without modifiers (Ctrl, Cmd, Shift, Alt)
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      onSelect(key)
    }
  }

  return (
    <aside className="z-10 hidden w-72 flex-shrink-0 flex-col gap-2 overflow-y-auto border-r border-gray-200 bg-white p-4 shadow-sm md:flex select-none transition-colors duration-300 dark:border-white/5 dark:bg-white/2">
      {items.map((item, idx) => {
        if (item.type === "header") {
          return (
            <div
              key={`header-${idx}`}
              className="mt-5 mb-2 px-2 text-[11px] font-black tracking-widest text-gray-500 first:mt-0 dark:text-zinc-400"
            >
              {item.label}
            </div>
          )
        }

        if (item.type === "accordion") {
          const isExpanded = expandedKeys[item.key]
          const hasActiveChild = item.children?.some((c) => c.key === activeKey)

          return (
            <div key={item.key} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => toggleAccordion(item.key)}
                className={`flex w-full text-left items-center justify-between rounded-xl px-4 py-3.5 text-sm font-bold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/20 ${ hasActiveChild && !isExpanded ? "bg-red-50 text-pup-maroon dark:bg-red-500/10 dark:text-primary" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900" } dark:focus-visible:ring-red-500/20 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <i className={`${item.iconClass} text-lg`}></i> {item.label}
                </div>
                <div className="flex items-center gap-2">
                  {item.badge > 0 ? (
                    <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold text-white ${
 item.key === "review" || item.key === "notifications"
 ? "bg-pup-maroon dark:bg-red-500/20 dark:text-red-400 dark:ring-1 dark:ring-red-500/30"
 : "bg-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 dark:ring-1 dark:ring-emerald-500/20"
 }`}>
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                  <i
                    className={`ph-bold ph-caret-down transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                  ></i>
                </div>
              </button>

              <div
                className={`overflow-hidden transition-all duration-[450ms] ease-out ${ isExpanded ? "mt-1 max-h-[500px] opacity-100" : "mt-0 max-h-0 opacity-0" }`}
              >
                <div className="ml-6 flex flex-col gap-1 border-l-2 border-gray-100 pl-4 dark:border-white/5">
                  {item.children.map((child, childIdx) => (
                    <a
                      key={child.key}
                      href={`${pathname}?view=${child.key}`}
                      onClick={(e) => handleLinkClick(e, child.key)}
                      className={`flex w-full text-left items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/20 cursor-pointer ${ activeKey === child.key ? "bg-red-50 text-pup-maroon dark:bg-red-500/10 dark:text-primary" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900" } dark:focus-visible:ring-red-500/20 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50`}
                      style={{
                        transitionDelay: isExpanded
                          ? `${childIdx * 50}ms`
                          : "0ms",
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <i className={`${child.iconClass} text-base`}></i>{" "}
                        {child.label}
                      </span>
                      {child.badge > 0 ? (
                        <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold text-white ${
 child.key === "review" || child.key === "notifications"
 ? "bg-pup-maroon dark:bg-red-500/20 dark:text-red-400 dark:ring-1 dark:ring-red-500/30"
 : "bg-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 dark:ring-1 dark:ring-emerald-500/20"
 }`}>
                          {child.badge > 99 ? "99+" : child.badge}
                        </span>
                      ) : null}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )
        }

        return (
          <a
            key={item.key}
            href={`${pathname}?view=${item.key}`}
            onClick={(e) => handleLinkClick(e, item.key)}
            className={`flex w-full text-left items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm font-bold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/20 cursor-pointer ${ activeKey === item.key ? "bg-red-50 text-pup-maroon dark:bg-red-500/10 dark:text-primary shadow-xs dark:shadow-none" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900" } dark:focus-visible:ring-red-500/20 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <i className={`${item.iconClass} text-lg`}></i> {item.label}
            </span>
            {item.badge > 0 ? (
              <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold text-white ${
 item.key === "review" || item.key === "notifications"
 ? "bg-pup-maroon dark:bg-red-500/20 dark:text-red-400 dark:ring-1 dark:ring-red-500/30"
 : "bg-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 dark:ring-1 dark:ring-emerald-500/20"
 }`}>
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </a>
        )
      })}
    </aside>
  )
}

