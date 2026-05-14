"use client"

import { useState, useEffect } from "react"

export default function Sidebar({ items, activeKey, onSelect }) {
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

  return (
    <aside className="z-10 hidden w-72 flex-shrink-0 flex-col gap-2 overflow-y-auto border-r border-gray-200 bg-white p-4 shadow-sm md:flex">
      {items.map((item, idx) => {
        if (item.type === "header") {
          return (
            <div
              key={`header-${idx}`}
              className="mt-4 mb-2 px-2 text-[10px] font-bold tracking-widest text-gray-400 uppercase first:mt-0"
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
                onClick={() => toggleAccordion(item.key)}
                className={`flex items-center justify-between rounded-brand px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors ${
                  hasActiveChild && !isExpanded
                    ? "bg-red-50 text-pup-maroon"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <i className={`${item.iconClass} text-lg`}></i> {item.label}
                </div>
                <div className="flex items-center gap-2">
                  {item.badge > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pup-maroon px-1.5 text-[11px] font-extrabold text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                  <i
                    className={`ph-bold ph-caret-down transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                  ></i>
                </div>
              </button>

              <div
                className={`overflow-hidden transition-all duration-[450ms] ease-out ${
                  isExpanded
                    ? "mt-1 max-h-[500px] opacity-100"
                    : "mt-0 max-h-0 opacity-0"
                }`}
              >
                <div className="ml-6 flex flex-col gap-1 border-l-2 border-gray-100 pl-4">
                  {item.children.map((child, childIdx) => (
                    <button
                      key={child.key}
                      onClick={() => onSelect(child.key)}
                      className={`flex items-center justify-between gap-3 rounded-brand px-4 py-2 text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                        activeKey === child.key
                          ? "bg-red-50 text-pup-maroon"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
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
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pup-maroon px-1.5 text-[11px] font-extrabold text-white">
                          {child.badge > 99 ? "99+" : child.badge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        }

        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            className={`flex items-center justify-between gap-3 rounded-brand px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors ${
              activeKey === item.key
                ? "bg-red-50 text-pup-maroon"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <i className={`${item.iconClass} text-lg`}></i> {item.label}
            </span>
            {item.badge > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pup-maroon px-1.5 text-[11px] font-extrabold text-white">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </aside>
  )
}
