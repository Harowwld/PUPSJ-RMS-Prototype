"use client";

import useWorkspaceViewPreference from "./useWorkspaceViewPreference";

export default function useOsasViewPreference(page, field, initialValue, options) {
  return useWorkspaceViewPreference(page, field, initialValue, { ...options, preserveOsasKey: true });
}
