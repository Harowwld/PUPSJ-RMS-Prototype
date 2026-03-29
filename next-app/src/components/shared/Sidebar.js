"use client";

export default function Sidebar({ items, activeKey, onSelect }) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col overflow-y-auto z-10 shadow-sm p-4 gap-2 flex-shrink-0">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">
        Menu
      </div>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          className={`flex items-center gap-3 px-4 py-3 rounded-brand text-sm font-bold transition-colors ${
            activeKey === item.key
              ? "bg-red-50 text-pup-maroon"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <i className={`${item.iconClass} text-lg`}></i> {item.label}
        </button>
      ))}
    </aside>
  );
}
