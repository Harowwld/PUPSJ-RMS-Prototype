export const DEFAULT_INITIAL_LOADER = "fill";

export const INITIAL_LOADER_OPTIONS = [
  { value: "fill", label: "Logo Fill" },
  { value: "workspace", label: "Slide Together" },
  { value: "aperture", label: "Aperture" },
  { value: "echo", label: "Logo Echo" },
  { value: "skeleton", label: "Dashboard skeleton" },
];

export function isInitialLoader(value) {
  return INITIAL_LOADER_OPTIONS.some((option) => option.value === value);
}

export function normalizeInitialLoader(value) {
  return isInitialLoader(value) ? value : DEFAULT_INITIAL_LOADER;
}
