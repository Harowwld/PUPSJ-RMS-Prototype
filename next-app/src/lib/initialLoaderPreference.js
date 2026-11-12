export const DEFAULT_INITIAL_LOADER = "workspace";

export function normalizeInitialLoader(value) {
  return value === "skeleton" ? "skeleton" : DEFAULT_INITIAL_LOADER;
}
