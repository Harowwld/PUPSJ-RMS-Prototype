import { cn } from "@/lib/utils";
import AppIcon from "@/components/ui/app-icon";

export default function SheetSectionHeading({ icon, title, children, divider = true }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", divider && "border-b border-border pb-1.5")}>
      <div className="flex items-center gap-2">
        <AppIcon icon={icon} aria-hidden="true" className="shrink-0 text-sm text-pup-maroon dark:text-red-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">{title}</h3>
      </div>
      {children}
    </div>
  );
}
