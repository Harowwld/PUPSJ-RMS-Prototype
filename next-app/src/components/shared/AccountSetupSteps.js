import { CircleIcon, Tick01Icon } from "hugeicons-react";
import { cn } from "@/lib/utils";

export default function AccountSetupSteps({ steps, activeIndex, className }) {
  return (
    <aside className={cn("flex w-full shrink-0 flex-col overflow-y-auto border-r border-border bg-gray-50/50 p-6 md:w-1/3 dark:border-border dark:bg-card", className)}>
      <div className="mb-5">
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-550">
          Account Setup
        </h3>
        <p className="mt-1 text-[11px] font-normal leading-normal text-gray-900 dark:text-zinc-300">
          Complete these steps to access your dashboard securely.
        </p>
      </div>

      <ol className="flex flex-1 list-none flex-col gap-1">
        {steps.map(({ title, description, skipped }, index) => {
          const active = index === activeIndex;
          const done = index < activeIndex && !skipped;

          return (
            <li key={title} aria-current={active ? "step" : undefined}>
              {index > 0 && (
                <div aria-hidden="true" className="mb-1 ml-6 h-[20px] w-[0.5px] bg-gray-200 dark:bg-zinc-800" />
              )}
              <div className={cn(
                "flex flex-col gap-1 rounded-[8px] px-3 py-2.5 transition-all",
                active ? "bg-gray-100/80 dark:bg-zinc-800/40" : "opacity-60"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {done ? (
                      <Tick01Icon aria-hidden="true" size="1em" className="shrink-0 text-[14px] text-emerald-600 dark:text-emerald-450" />
                    ) : active || index === 0 ? (
                      <CircleIcon aria-hidden="true" size="1em" className="shrink-0 text-[14px] text-pup-maroon dark:text-red-400" />
                    ) : (
                      <span aria-hidden="true" className="size-[14px] shrink-0" />
                    )}
                    <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-550">
                      Step {index + 1}
                    </span>
                  </div>
                  {done && (
                    <span className="text-[10px] font-normal text-gray-400 dark:text-zinc-550">Done</span>
                  )}
                </div>
                <span className="pl-[22px] text-[13px] font-semibold tracking-[-0.01em] text-gray-800 dark:text-zinc-200">
                  {title}
                </span>
                <p className="mt-0.5 pl-[22px] text-[11px] font-normal text-gray-400 dark:text-zinc-550">
                  {description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
