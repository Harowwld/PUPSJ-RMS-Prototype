"use client";

import { Input } from "@/components/ui/input";
import { formatRegistrarStudentName } from "@/lib/validationSchemas";

export default function StudentNameFields({ value, onChange, idPrefix, invalid = false, disabled = false }) {
  const displayName = formatRegistrarStudentName(value);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[["firstName", "First Name"], ["middleName", "Middle Name (optional)"], ["lastName", "Last Name"]].map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`${idPrefix}-${key}`} className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">{label}</label>
            <Input
              id={`${idPrefix}-${key}`}
              value={value[key] || ""}
              onChange={(event) => onChange({ ...value, [key]: event.target.value })}
              required={key !== "middleName"}
              disabled={disabled}
              maxLength={60}
              autoComplete={key === "firstName" ? "given-name" : key === "middleName" ? "additional-name" : "family-name"}
              aria-invalid={invalid || undefined}
              className="h-10 w-full uppercase"
            />
          </div>
        ))}
      </div>
      {displayName && <p className="text-xs text-gray-500 dark:text-zinc-400">Recorded name: <span className="font-medium">{displayName}</span></p>}
    </div>
  );
}
