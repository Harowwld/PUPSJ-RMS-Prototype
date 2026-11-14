"use client";

import { Input } from "@/components/ui/input";
import { formatRegistrarStudentName } from "@/lib/validationSchemas";

export default function StudentNameFields({ value, onChange, idPrefix, invalid = false, invalidFields, disabled = false }) {
  const displayName = formatRegistrarStudentName(value);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[["firstName", "First Name", "Maria"], ["middleName", "Middle Name", "Reyes"], ["lastName", "Last Name", "Santos"]].map(([key, label, example]) => (
          <div key={key}>
            <label htmlFor={`${idPrefix}-${key}`} className="text-xs font-semibold mb-1.5 block text-gray-700 dark:text-zinc-300">{label}{key === "middleName" && <> <span className="normal-case tracking-normal opacity-70">(optional)</span></>}</label>
            <Input
              id={`${idPrefix}-${key}`}
              value={value[key] || ""}
              placeholder={example}
              onChange={(event) => onChange({ ...value, [key]: event.target.value })}
              required={key !== "middleName"}
              disabled={disabled}
              maxLength={60}
              autoComplete={key === "firstName" ? "given-name" : key === "middleName" ? "additional-name" : "family-name"}
              aria-invalid={(invalidFields ? invalidFields[key] : invalid) || undefined}
              className="h-10 w-full uppercase placeholder:normal-case"
            />
          </div>
        ))}
      </div>
      {displayName && <p className="text-xs text-gray-500 dark:text-zinc-400">Recorded name: <span className="font-medium">{displayName}</span></p>}
    </div>
  );
}
