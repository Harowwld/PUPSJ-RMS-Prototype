"use client";

import { useCallback, useRef, useState } from "react";

export default function useCreateAnother(open) {
  const [session, setSession] = useState({ open, checked: false, count: 0 });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const formRef = useRef(null);
  const attachForm = useCallback((node) => { formRef.current = node; }, []);

  if (session.open !== open) {
    setSession({ open, checked: false, count: 0 });
  }

  const createAnother = session.open === open && session.checked;

  const beginSave = () => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    return true;
  };

  const endSave = () => {
    savingRef.current = false;
    setSaving(false);
  };

  const focusFirstField = () => {
    requestAnimationFrame(() => {
      const form = formRef.current;
      if (!form?.isConnected) return;
      const field = form.querySelector("[data-create-another-focus]") ||
        form.querySelector('input:not([type="hidden"]):not([type="file"]):not([disabled]), textarea:not([disabled])');
      field?.focus();
      field?.scrollIntoView({ block: "nearest" });
    });
  };

  const complete = (reset, close) => {
    reset();
    if (createAnother) {
      setSession((current) => ({ ...current, count: current.count + 1 }));
      focusFirstField();
    } else {
      close();
    }
  };

  return {
    createAnother,
    setCreateAnother: (checked) => setSession((current) => ({ ...current, checked })),
    savedCount: session.open === open ? session.count : 0,
    attachForm,
    saving,
    beginSave,
    endSave,
    complete,
    focusFirstField,
  };
}
