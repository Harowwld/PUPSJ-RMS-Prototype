"use client";

import { ViewIcon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function SheetPreviewButton({ label, onClick }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="secondary" size="icon-sm" className="table-action-button shrink-0" aria-label={label} onClick={onClick}>
          <ViewIcon size={16} aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
