"use client";

import { useState } from "react";
import { ViewIcon, ViewOffIcon } from "hugeicons-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordInput({ label, className, disabled, id, ...props }) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? ViewOffIcon : ViewIcon;

  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn(className, "pr-11")}
      />
      <button
        type="button"
        aria-controls={id}
        aria-label={`${visible ? "Hide" : "Show"} ${label}`}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
