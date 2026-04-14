"use client";

import { useState, useEffect } from "react";

export default function Sidebar({ items, activeKey, onSelect }) {
  const [expandedKeys, setExpandedKeys] = useState(() => {
    const initial = {};
    items.forEach(item => {
      if (item.type === "accordion" && item.children?.some(c => c.key === activeKey)) {
        initial[item.key] = true;
      }
    });
    return initial;
  });

  useEffect(() => {
    items.forEach(item => {
      if (item.type === "accordion" && item.children?.some(c => c.key === activeKey)) {
        setExpandedKeys(prev => {
          if (prev[item.key]) return prev;
          return { ...prev, [item.key]: true };
        });
      }
    });
  }, [activeKey, items]);

  const toggleAccordion = (key) => {
    setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-72 bg-white border-r border-gray-200 hidden md:flex flex-col overflow-y-auto z-10 shadow-sm p-4 gap-2 flex-shrink-0">
      {items.map((item, idx) => {
        if (item.type === "header") {
          return (
            <div
              key={`header-${idx}`}
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-4 first:mt-0 px-2"
            >
              {item.label}
            </div>
          );
        }

        if (item.type === "accordion") {
          const isExpanded = expandedKeys[item.key];
          const hasActiveChild = item.children?.some(c => c.key === activeKey);

          return (
            <div key={item.key} className="flex flex-col gap-1">
              <button
                onClick={() => toggleAccordion(item.key)}
                className={`flex items-center justify-between px-4 py-3 rounded-brand text-sm font-bold transition-colors whitespace-nowrap ${
                  hasActiveChild && !isExpanded
                    ? "bg-red-50 text-pup-maroon"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <i className={`${item.iconClass} text-lg`}></i> {item.label}
                </div>
                <div className="flex items-center gap-2">
                  {item.badge > 0 ? (
                    <span className="h-5 min-w-5 px-1.5 inline-flex items-center justify-center rounded-full bg-pup-maroon text-white text-[11px] font-extrabold">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                  <i className={`ph-bold ph-caret-down transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}></i>
                </div>
              </button>
              
              <div
                className={`overflow-hidden transition-all duration-[450ms] ease-out ${
                  isExpanded ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0 mt-0'
                }`}
              >
                <div className="flex flex-col pl-4 gap-1 border-l-2 border-gray-100 ml-6">
                  {item.children.map((child, childIdx) => (
                    <button
                      key={child.key}
                      onClick={() => onSelect(child.key)}
                      className={`flex items-center justify-between gap-3 px-4 py-2 rounded-brand text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                        activeKey === child.key
                          ? "bg-red-50 text-pup-maroon"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                      style={{
                        transitionDelay: isExpanded ? `${childIdx * 50}ms` : '0ms',
                      }}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <i className={`${child.iconClass} text-base`}></i> {child.label}
                      </span>
                      {child.badge > 0 ? (
                        <span className="h-5 min-w-5 px-1.5 inline-flex items-center justify-center rounded-full bg-pup-maroon text-white text-[11px] font-extrabold">
                          {child.badge > 99 ? "99+" : child.badge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-brand text-sm font-bold transition-colors whitespace-nowrap ${
              activeKey === item.key
                ? "bg-red-50 text-pup-maroon"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <span className="flex items-center gap-3 min-w-0">
              <i className={`${item.iconClass} text-lg`}></i> {item.label}
            </span>
            {item.badge > 0 ? (
              <span className="h-5 min-w-5 px-1.5 inline-flex items-center justify-center rounded-full bg-pup-maroon text-white text-[11px] font-extrabold">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </aside>
  );
}
