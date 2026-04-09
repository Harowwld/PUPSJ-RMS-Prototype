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
                <div className="flex items-center gap-3">
                  <i className={`${item.iconClass} text-lg`}></i> {item.label}
                </div>
                <i className={`ph-bold ${isExpanded ? 'ph-caret-up' : 'ph-caret-down'}`}></i>
              </button>
              
              {isExpanded && (
                <div className="flex flex-col pl-4 gap-1 border-l-2 border-gray-100 ml-6 mt-1">
                  {item.children.map(child => (
                    <button
                      key={child.key}
                      onClick={() => onSelect(child.key)}
                      className={`flex items-center gap-3 px-4 py-2 rounded-brand text-sm font-bold transition-colors whitespace-nowrap ${
                        activeKey === child.key
                          ? "bg-red-50 text-pup-maroon"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <i className={`${child.iconClass} text-base`}></i> {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            className={`flex items-center gap-3 px-4 py-3 rounded-brand text-sm font-bold transition-colors whitespace-nowrap ${
              activeKey === item.key
                ? "bg-red-50 text-pup-maroon"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <i className={`${item.iconClass} text-lg`}></i> {item.label}
          </button>
        );
      })}
    </aside>
  );
}
