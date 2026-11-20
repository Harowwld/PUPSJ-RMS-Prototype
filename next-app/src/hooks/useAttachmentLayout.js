"use client";

import { useSyncExternalStore } from "react";
import { createViewPreferenceStore } from "@/lib/viewPreferences";

const attachmentViewKey = "pup_attachment_view";
const attachmentViewStore = createViewPreferenceStore(() => window.localStorage);

function subscribeToAttachmentView(callback) {
  const unsubscribe = attachmentViewStore.subscribe(attachmentViewKey, callback);
  const sync = (event) => {
    if (event.key === attachmentViewKey || event.key === null) callback();
  };
  window.addEventListener("storage", sync);
  return () => {
    unsubscribe();
    window.removeEventListener("storage", sync);
  };
}

function readAttachmentView() {
  return attachmentViewStore.read(attachmentViewKey, "rows", (value) =>
    value === "cards" || value === "rows" ? value : "rows"
  );
}

export function useAttachmentLayout() {
  return useSyncExternalStore(subscribeToAttachmentView, readAttachmentView, () => "rows");
}

export function setAttachmentLayout(layout) {
  if (layout === "cards" || layout === "rows") {
    attachmentViewStore.write(attachmentViewKey, layout);
  }
}
