import { Clock01Icon, Tick01Icon } from "hugeicons-react";
import { SETTINGS_DOT_CHECK, SETTINGS_STATUS_PILL_SM } from "@/lib/badgeStyles";
import { cn } from "@/lib/utils";

export default function ChecklistStatusBadge({ complete, children }) {
  return (
    <span className={cn(SETTINGS_STATUS_PILL_SM, "shrink-0 font-semibold text-gray-900 dark:text-zinc-100")}>
      {complete ? (
        <span className={SETTINGS_DOT_CHECK} aria-hidden="true">
          <Tick01Icon size={8} className="stroke-[3]" />
        </span>
      ) : (
        <Clock01Icon size={13} className="shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
