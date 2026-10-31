"use client";

import { useId } from "react";
import { Switch } from "@/components/ui/switch";

export default function CreateAnotherToggle({ checked, onCheckedChange, disabled, savedCount = 0 }) {
  const id = useId();

  return (
    <div className="mr-auto flex min-h-11 w-full flex-wrap items-center gap-x-3 gap-y-1 sm:w-auto">
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-xs font-medium text-gray-700 dark:text-zinc-200 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
        Create another
      </label>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {savedCount > 0 && `Entry ${savedCount} saved. Ready for another.`}
      </span>
    </div>
  );
}
