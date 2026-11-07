import {
  GridViewIcon,
  Layout3ColumnIcon,
  LeftToRightListBulletIcon,
  TableIcon,
  Building01Icon,
} from "hugeicons-react";

export const VIEW_MODE_ICONS = {
  // Grid: 4-square icon (replaces old Cards)
  grid: GridViewIcon,
  card: GridViewIcon,
  cards: GridViewIcon,
  // List: bullet-list icon matching Apple UI standard
  list: LeftToRightListBulletIcon,
  // Table: spreadsheet / table icon
  table: TableIcon,
  // Kanban: 3-column layout icon
  kanban: Layout3ColumnIcon,
  // Department Features
  office: Building01Icon,
  department: Building01Icon,
  matrix: TableIcon,
  compare: TableIcon,
};
