import { VIEW_MODE_ICONS } from "@/lib/viewModeIcons";

export default function ViewModeIcon({ mode, size = "1em", className }) {
  const Icon = VIEW_MODE_ICONS[mode];
  if (!Icon) return null;

  return <Icon size={size} className={className} aria-hidden="true" />;
}
