"use client";

import { ArrowDown01Icon } from "hugeicons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BANNER_GRADIENT_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const triggerClassName = "flex min-h-10 max-w-72 min-w-0 items-center gap-2.5 rounded-full border border-gray-200 bg-white py-1 pl-1.5 pr-3 text-left text-xs font-semibold text-gray-900 shadow-xs";

export function OrganizationAvatar({ organization, className }) {
  const gradient = BANNER_GRADIENT_PRESETS.find(({ id }) => id === organization?.banner_gradient)
    ?? BANNER_GRADIENT_PRESETS[0];

  return (
    <span
      aria-hidden="true"
      className={cn("size-7 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]", className)}
      style={{ backgroundImage: gradient.previewGradient }}
    />
  );
}

export function organizationName(organization) {
  const name = organization.organization_name.trim();
  const acronym = organization.acronym?.trim();
  const suffix = acronym ? ` (${acronym})` : "";
  return suffix && name.toLowerCase().endsWith(suffix.toLowerCase())
    ? name.slice(0, -suffix.length)
    : name;
}

export default function OsasOrganizationSwitcher({ organizations, selectedOrganization, onChange, selectionLocked }) {
  if (organizations.length === 0) return null;

  const currentOrganization = selectedOrganization ?? (organizations.length === 1 ? organizations[0] : null);
  const selectedId = String(currentOrganization?.organization_id ?? "");
  const currentName = currentOrganization ? organizationName(currentOrganization) : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={currentName ? `Authorized organizations. Current organization: ${currentName}` : "Choose organization"}
          className={`${triggerClassName} group cursor-pointer transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-pup-maroon`}
        >
          <OrganizationAvatar organization={currentOrganization} />
          <span className="min-w-0 flex-1 break-words">{currentName || "Choose organization"}</span>
          <ArrowDown01Icon
            size={14}
            aria-hidden="true"
            className="shrink-0 text-gray-500 transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        aria-label="Authorized organizations"
        className="w-72 max-w-[calc(100vw-2rem)] border-gray-200 bg-white text-gray-900 dark:border-gray-200 dark:bg-white dark:shadow-[0_16px_36px_rgba(0,0,0,0.2)]"
      >
        <DropdownMenuLabel className="px-2.5 py-2 text-gray-600">Authorized Organizations</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={selectedId}
          onValueChange={(value) => {
            if (!selectionLocked && value !== selectedId) onChange(value);
          }}
        >
          {organizations.map((organization) => (
            <DropdownMenuRadioItem
              key={organization.organization_id}
              value={String(organization.organization_id)}
              disabled={selectionLocked && String(organization.organization_id) !== selectedId}
              className="min-h-12 cursor-pointer gap-2.5 px-2.5 py-1.5 pr-8 text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:**:text-gray-900 data-checked:bg-gray-100 data-checked:focus:bg-gray-200/70"
            >
              <OrganizationAvatar organization={organization} />
              <span className="min-w-0 flex-1">
                <span className="block break-words font-semibold">{organizationName(organization)}</span>
                {organization.officer_position && (
                  <span className="block truncate text-[11px] font-normal text-gray-600">{organization.officer_position}</span>
                )}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
