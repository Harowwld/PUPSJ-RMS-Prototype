"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useTablePreferences } from "@/components/shared/TablePreferences";
import { TABLE_DENSITIES, normalizeTableDensity, tableStatusTone } from "@/lib/tablePresentation";
import { TableActions } from "@/components/shared/TableActions";
import { Badge } from "@/components/ui/badge";
import { BADGE_BASE } from "@/lib/badgeStyles";

const ColumnsContext = React.createContext([]);
const SectionContext = React.createContext("body");

// Native structural children remain supported in existing tables and dynamic matrices.
function tableChildren(children) {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const components = { thead: TableHeader, tbody: TableBody, tfoot: TableFooter, tr: TableRow, caption: TableCaption };
    const Component = components[child.type];
    if (Component) return <Component {...child.props}>{tableChildren(child.props.children)}</Component>;
    if (child.type === React.Fragment) return <React.Fragment>{tableChildren(child.props.children)}</React.Fragment>;
    return child;
  });
}

function presentationColumn(column) {
  if (!column || typeof column !== "object") return column;
  const { growthWeight, ...presentation } = column;
  return presentation;
}

function Table({ className, columns = [], density: overrideDensity, layout = "content", style, children, ...props }) {
  const { density } = useTablePreferences();
  const tableRef = React.useRef(null);
  const [availableWidth, setAvailableWidth] = React.useState(0);
  const setting = TABLE_DENSITIES[normalizeTableDensity(overrideDensity || density)];
  const matrixWidths = columns.map((column) => (typeof column === "object" && column.width) || 160);
  const matrixWidth = matrixWidths.reduce((sum, width) => sum + width, 0);
  React.useLayoutEffect(() => {
    if (layout !== "content") return undefined;
    const viewport = tableRef.current?.parentElement;
    if (!viewport) return undefined;
    const measure = () => setAvailableWidth(viewport.clientWidth);
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(viewport);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [layout]);
  const contentWidths = layout === "content" ? getContentColumnWidths(columns, children, availableWidth, className) : [];
  const contentWidth = contentWidths.reduce((sum, width) => sum + width, 0);
  return (
    <ColumnsContext.Provider value={columns}>
      <table ref={tableRef} data-slot="table" data-density={normalizeTableDensity(overrideDensity || density)} data-layout={layout}
        className={cn("app-table w-full min-w-0 caption-bottom border-separate border-spacing-0 text-left text-[13px]", className)}
        style={{ ...style, tableLayout: layout === "matrix" || layout === "fixed" || layout === "content" ? "fixed" : "auto", ...(layout === "matrix" && columns.length ? { width: matrixWidth, minWidth: matrixWidth } : {}), ...(layout === "content" ? { width: "100%", ...(contentWidth ? { minWidth: contentWidth } : {}) } : {}), "--table-row-height": `${setting.height}px`, "--table-cell-py": `${setting.padding}px` }} {...props}>
        {(layout === "matrix" || layout === "content") && columns.length > 0 && <colgroup>{(layout === "matrix" ? matrixWidths : contentWidths).map((width, index) => <col key={index} style={{ width }} />)}</colgroup>}
        {tableChildren(children)}
      </table>
    </ColumnsContext.Provider>
  );
}

function TableHeader({ className, children, ...props }) {
  return <SectionContext.Provider value="head"><thead data-slot="table-header" className={cn("bg-gray-50 dark:bg-zinc-900", className)} {...props}>{tableChildren(children)}</thead></SectionContext.Provider>;
}
function TableBody({ className, children, ...props }) {
  return <SectionContext.Provider value="body"><tbody data-slot="table-body" className={className} {...props}>{tableChildren(children)}</tbody></SectionContext.Provider>;
}
function TableFooter({ className, children, ...props }) {
  return <SectionContext.Provider value="foot"><tfoot data-slot="table-footer" className={cn("border-t font-medium", className)} {...props}>{tableChildren(children)}</tfoot></SectionContext.Provider>;
}

function TableRow({ className, children, expanded = false, selected, style, ...props }) {
  const columns = React.useContext(ColumnsContext);
  const section = React.useContext(SectionContext);
  let columnIndex = 0;
  const rowChildren = React.Children.toArray(children).flatMap(function flatten(child) {
    return React.isValidElement(child) && child.type === React.Fragment ? React.Children.toArray(child.props.children).flatMap(flatten) : [child];
  });
  let selectionIndex = 0;
  const isSelectionChecked = rowChildren.some((child) => {
    if (!React.isValidElement(child)) return false;
    const index = selectionIndex;
    selectionIndex += Number(child.props.colSpan) || 1;
    const column = columns[index];
    const config = typeof column === "string" ? { kind: column } : (presentationColumn(column) || { kind: "text" });
    return config?.kind === "selection" && hasCheckedCheckbox(child.props.children);
  });
  const ariaSelected = props["aria-selected"] === true || props["aria-selected"] === "true";
  const rowIsSelected = section === "body" && (selected === undefined ? isSelectionChecked || ariaSelected : selected);
  const cells = rowChildren.map((child, cellIndex) => {
    if (!React.isValidElement(child)) return child;
    const index = columnIndex;
    columnIndex += Number(child.props.colSpan) || 1;
    const column = child.props.colSpan > 1 ? {} : columns[index];
    const config = typeof column === "string" ? { kind: column } : (presentationColumn(column) || { kind: "text" });
    if (!["td", "th", TableCell, TableHead].includes(child.type)) return React.cloneElement(child, { tableColumn: config });
    const Cell = child.type === "th" || child.type === TableHead ? TableHead : TableCell;
    return <Cell key={cellIndex} {...config} {...child.props} />;
  });
  return <tr data-slot="table-row" data-selected={rowIsSelected ? "true" : undefined} data-expanded={expanded || undefined} className={cn(section === "body" && "group border-b hover:bg-gray-50/70 dark:hover:bg-zinc-800/40", className)} style={{ ...style, height: "auto" }} {...props}>{cells}</tr>;
}

function hasCheckedCheckbox(children) {
  return React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child)) return false;
    if ((child.type === "input" && child.props.type === "checkbox") || child.props.role === "checkbox") return child.props.checked === true || child.props["aria-checked"] === true;
    return child.props.children ? hasCheckedCheckbox(child.props.children) : false;
  });
}

function getContentColumnWidths(columns, children, availableWidth, className = "") {
  const schemas = columns.map((column) => typeof column === "string" ? { kind: column } : (column || { kind: "text" }));
  const bodyLengths = Array(columns.length).fill(0);
  const headerLengths = Array(columns.length).fill(0);
  const rows = [];
  const collectRows = (nodes, section = "body") => React.Children.forEach(nodes, (node) => {
    if (!React.isValidElement(node)) return;
    if (node.type === "tr" || node.type === TableRow) {
      rows.push({ node, section });
      return;
    }
    const childSection = node.type === "thead" || node.type === TableHeader ? "head" : node.type === "tbody" || node.type === TableBody ? "body" : section;
    if (node.props.children) collectRows(node.props.children, childSection);
  });
  const flattenCells = (nodes) => React.Children.toArray(nodes).flatMap((node) => {
    if (React.isValidElement(node) && node.type === React.Fragment) return flattenCells(node.props.children);
    return [node];
  });
  collectRows(children);
  for (const { node: row, section } of rows) {
    let index = 0;
    for (const cell of flattenCells(row.props.children)) {
      if (!React.isValidElement(cell)) continue;
      const span = Number(cell.props.colSpan) || 1;
      const config = schemas[index];
      if (span === 1 && config && !["selection", "actions"].includes(config.kind)) {
        const lengths = section === "head" ? headerLengths : bodyLengths;
        lengths[index] = Math.max(lengths[index], tableText(cell.props.children).length);
      }
      index += span;
    }
  }

  const minWidths = schemas.map((column) => {
    if (["selection", "actions"].includes(column.kind)) return 48;
    return ({ identifier: 144, text: 180, date: 140, status: 100, year: 64, category: 80, number: 64 })[column.kind] || 112;
  });
  const maxWidths = schemas.map((column, index) => {
    if (["selection", "actions"].includes(column.kind)) return 48;
    if (column.width) return Number(column.width) || minWidths[index];
    if (column.maxWidth) return Math.max(minWidths[index], Number(column.maxWidth) - 0.5);
    return Math.max(availableWidth || 0, 340);
  });
  const widths = schemas.map((column, index) => {
    if (["selection", "actions"].includes(column.kind)) return 48;
    if (column.width) return Number(column.width);
    if (!bodyLengths[index] && column.maxWidth) return Math.min(maxWidths[index], Number(column.maxWidth));
    const natural = Math.ceil(Math.max(bodyLengths[index], headerLengths[index]) * 7.1 + 36);
    return Math.min(maxWidths[index], Math.max(minWidths[index], natural));
  });
  const declaredMinWidth = Number(className.match(/\bmin-w-\[(\d+(?:\.\d+)?)px\]/)?.[1]) || 0;
  const desiredWidth = Math.max(availableWidth || 0, declaredMinWidth, widths.reduce((sum, width) => sum + width, 0));
  let remaining = Math.min(desiredWidth, maxWidths.reduce((sum, width) => sum + width, 0)) - widths.reduce((sum, width) => sum + width, 0);
  while (remaining > 0.5) {
    const growable = widths.map((width, index) => ({
      index,
      capacity: maxWidths[index] - width,
      weight: schemas[index].growthWeight == null
        ? Math.max(1, width - minWidths[index] + 24)
        : Math.max(0, Number(schemas[index].growthWeight) || 0),
    })).filter((column) => column.capacity > 0.5 && column.weight > 0);
    if (!growable.length) break;
    const totalWeight = growable.reduce((sum, column) => sum + column.weight, 0);
    let distributed = 0;
    for (const column of growable) {
      const addition = Math.min(column.capacity, remaining * column.weight / totalWeight);
      widths[column.index] += addition;
      distributed += addition;
    }
    if (distributed < 0.5) break;
    remaining -= distributed;
  }
  const roundedWidths = widths.map((width) => Math.round(width));
  const roundingDifference = Math.round(desiredWidth) - roundedWidths.reduce((sum, width) => sum + width, 0);
  if (roundingDifference) {
    const flexibleIndex = maxWidths.findIndex((maxWidth, index) =>
      maxWidth - widths[index] > Math.abs(roundingDifference) &&
      (schemas[index].growthWeight == null || Number(schemas[index].growthWeight) > 0)
    );
    if (flexibleIndex >= 0) roundedWidths[flexibleIndex] += roundingDifference;
  }
  return roundedWidths;
}

function cellStyle({ kind, align, width, minWidth, maxWidth, style, header = false, colSpan, paddingX = 16, paddingLeft = paddingX, paddingRight = paddingX }) {
  const control = kind === "actions" || kind === "selection";
  const alignment = align || (["status", "year", "category", "actions", "selection"].includes(kind) ? "center" : kind === "number" ? "right" : "left");
  return {
    ...style, textAlign: alignment, verticalAlign: "middle", paddingLeft, paddingRight,
    ...(colSpan > 1 ? {} : { height: header ? 40 : "var(--table-row-height)", paddingTop: header ? 8 : "var(--table-cell-py)", paddingBottom: header ? 8 : "var(--table-cell-py)" }),
    ...(width ? { width, minWidth: width } : minWidth ? { minWidth } : {}), ...(maxWidth ? { maxWidth, overflow: "hidden" } : {}),
    ...(control ? { width: 48, minWidth: 48, maxWidth: 48, paddingLeft: 2, paddingRight: 2 } : {}),
    ...(kind === "actions" ? { position: "sticky", right: 0 } : {}),
  };
}

function TableHead({ className, children, kind = "text", align, width, minWidth, maxWidth, paddingX, paddingLeft, paddingRight, style, ...props }) {
  return <th data-slot="table-head" data-kind={kind} scope="col" className={cn("px-4 text-xs font-semibold text-gray-600 dark:text-zinc-300", className)} style={cellStyle({ kind, align, width, minWidth, maxWidth, paddingX, paddingLeft, paddingRight, style, header: true, colSpan: props.colSpan })} {...props}>{kind === "actions" ? <span className="sr-only">Actions</span> : kind === "selection" ? selectionContent(children, "Select all records on this page") : children}</th>;
}

function TableCell({ className, children, kind = "text", align, width, minWidth, maxWidth, paddingX, paddingLeft, paddingRight, style, ...props }) {
  const spanning = Number(props.colSpan) > 1;
  const alignment = align || (["status", "year", "category", "actions", "selection"].includes(kind) ? "center" : kind === "number" ? "right" : "left");
  let content = children;
  if (!spanning && !["actions", "selection"].includes(kind) && (children == null || children === "" || ["—", "–", "-"].includes(tableText(children)))) content = "N/A";
  if (!spanning && kind === "identifier") content = <IdentifierBadge>{content}</IdentifierBadge>;
  if (!spanning && kind === "status") content = statusContent(content);
  if (!spanning && kind === "selection") content = selectionContent(children, "Select record");
  if (!spanning && kind === "actions") content = <TableActions>{children}</TableActions>;
  if (!spanning && ["text", "date", "category"].includes(kind) && (typeof children === "string" || typeof children === "number")) {
    content = <span className="block w-full min-w-0 truncate" title={String(children)}>{children}</span>;
  }
  if (!spanning && maxWidth && !["identifier", "status", "actions", "selection"].includes(kind)) content = <div className={cn("w-full min-w-0", alignment === "center" && "mx-auto", alignment === "right" && "ml-auto")} style={{ maxWidth }}>{content}</div>;
  return <td data-slot="table-cell" data-kind={kind} className={cn("px-4 text-[13px] font-normal text-gray-900 dark:text-zinc-100", className)} style={cellStyle({ kind, align, width, minWidth, maxWidth, paddingX, paddingLeft, paddingRight, style, colSpan: props.colSpan })} {...props}>{content}</td>;
}
function selectionContent(children, label) {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    if (child.type === "input" && child.props.type === "checkbox" && !child.props["aria-label"] && !child.props["aria-labelledby"]) return React.cloneElement(child, { "aria-label": label });
    if ((typeof child.type === "string" || child.type === React.Fragment) && child.props.children) return React.cloneElement(child, {}, selectionContent(child.props.children, label));
    return child;
  });
}

export function tableText(children) {
  return React.Children.toArray(children).map((child) => typeof child === "string" || typeof child === "number" ? String(child) : React.isValidElement(child) ? tableText(child.props.children) : "").join("").trim();
}
function IdentifierBadge({ children, className, ...props }) {
  const text = tableText(children);
  if (!text && React.Children.count(children)) return children;
  return <span data-slot="table-identifier" className={cn(BADGE_BASE, "bg-[#F1F5F9] text-[#334155] tabular-nums dark:bg-slate-800 dark:text-slate-200", className)} {...props}><span className="min-w-0 truncate" title={text || undefined}>{text ? children : "N/A"}</span></span>;
}
function statusContent(children, nested = false) {
  if (typeof children === "string" || typeof children === "number") return nested ? children : <TableStatus value={children} />;
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const label = tableText(child.props.children);
    if (label && (/rounded-full/.test(child.props.className || "") || child.type === Badge)) return <TableStatus value={label}>{child.props.children}</TableStatus>;
    if (typeof child.type === "string" && child.props.children) return React.cloneElement(child, {}, statusContent(child.props.children, true));
    return child;
  });
}
function TableStatus({ value, tone, children, className, ...props }) {
  const text = value == null ? tableText(children) : String(value);
  return <span data-slot="table-status" data-tone={tone || tableStatusTone(text)} className={cn(BADGE_BASE, className)} {...props}>{children ?? (text || "N/A")}</span>;
}
function TableText({ children, secondary = false, constrained = false, className, ...props }) {
  return <div data-slot="table-text" className={cn("w-full min-w-0 truncate", secondary ? "text-xs font-normal text-gray-500 dark:text-zinc-400" : "text-[13px] font-medium", constrained && "max-w-[340px]", className)} title={tableText(children) || undefined} {...props}>{children ?? "N/A"}</div>;
}
function TableCaption({ className, ...props }) {
  return <caption data-slot="table-caption" className={cn("mt-4 text-xs text-muted-foreground", className)} {...props} />;
}
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption, IdentifierBadge, TableStatus, TableText };
