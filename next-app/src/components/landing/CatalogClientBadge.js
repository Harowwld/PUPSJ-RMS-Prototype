export default function CatalogClientBadge({ label }) {
  if (!label) return null;

  const initials = label.split(/[\s&]+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join("");

  return (
    <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-zinc-100 py-1 pl-1 pr-2.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200" title={label}>
      <span aria-hidden="true" className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-zinc-300 text-[9px] font-semibold text-zinc-700 dark:bg-zinc-600 dark:text-white">
        {initials}
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}
