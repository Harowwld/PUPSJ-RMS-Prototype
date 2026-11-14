"use client";

import { useEffect } from "react";

const activeAttribute = "data-show-form-errors";
const formScope = "form, [data-form-validation-scope]";
const fieldSurface = "input, textarea, select, label, [data-slot='select-control'], [data-slot='attachment-field'], [aria-invalid]";

export default function FormErrorHighlights() {
  useEffect(() => {
    function showErrors(event) {
      const scope = event.type === "invalid" ? event.target.form : event.target;
      if (scope instanceof HTMLFormElement) scope.setAttribute(activeAttribute, "");
    }

    function dismissOutside(event) {
      if (!(event.target instanceof Element)) return;
      // Portaled select options belong to the field the user is editing.
      if (event.target.closest("[data-slot='select-popup']")) return;
      const editingScope = event.target.closest(fieldSurface)?.closest(formScope);
      for (const scope of document.querySelectorAll(`[${activeAttribute}]`)) {
        if (scope !== editingScope) scope.removeAttribute(activeAttribute);
      }
    }

    function showCustomErrors(event) {
      if (!(event.target instanceof Element)) return;
      event.target.closest("[data-form-validation-submit]")?.closest(formScope)?.setAttribute(activeAttribute, "");
    }

    document.addEventListener("invalid", showErrors, true);
    document.addEventListener("submit", showErrors, true);
    document.addEventListener("pointerdown", dismissOutside, true);
    document.addEventListener("click", showCustomErrors, true);
    return () => {
      document.removeEventListener("invalid", showErrors, true);
      document.removeEventListener("submit", showErrors, true);
      document.removeEventListener("pointerdown", dismissOutside, true);
      document.removeEventListener("click", showCustomErrors, true);
    };
  }, []);

  return null;
}
