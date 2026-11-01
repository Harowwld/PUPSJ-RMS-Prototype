import {
  Cards01Icon,
  GridViewIcon,
  Layout3ColumnIcon,
  ListViewIcon,
  TableIcon,
} from "hugeicons-react";

const VIEW_MODE_ICONS = {
  list: ListViewIcon,
  table: TableIcon,
  kanban: Layout3ColumnIcon,
  // Grid describes the arrangement; Cards describes the content rendered in that grid.
  grid: GridViewIcon,
  cards: Cards01Icon,
};

export default function ViewModeIcon({ mode, size = "1em", className }) {
  const Icon = VIEW_MODE_ICONS[mode];
  if (!Icon) return null;

  return <Icon size={size} className={className} aria-hidden="true" />;
}
