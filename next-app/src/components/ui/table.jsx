"use client";

import * as React from "react";
import { ArrowLeft01Icon } from "hugeicons-react";
import TableScrollControls, { hasTableScrollToolbar, tableScrollToolbarChange } from "@/components/shared/TableScrollControls";
import { moveTableScroll } from "@/hooks/useTableScroll";
import { cn } from "@/lib/utils";
import { useTablePreferences } from "@/components/shared/TablePreferences";
import { TABLE_DENSITIES, normalizeTableDensity, tableStatusTone, sizeContentColumns } from "@/lib/tablePresentation";
import { TableActions } from "@/components/shared/TableActions";
import { Badge } from "@/components/ui/badge";
import { BADGE_BASE } from "@/lib/badgeStyles";

const ColumnsContext = React.createContext({ columns: [], spacerIndex: -1, identityIndex: -1 });
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
  const viewportRef = React.useRef(null);
  const [scroll, setScroll] = React.useState(null);
  const [availableWidth, setAvailableWidth] = React.useState(0);
  const setting = TABLE_DENSITIES[normalizeTableDensity(overrideDensity || density)];
  const matrixWidths = columns.map((column) => (typeof column === "object" && column.width) || 160);
  const matrixWidth = matrixWidths.reduce((sum, width) => sum + width, 0);
  React.useLayoutEffect(() => {
    const table = tableRef.current;
    const parent = table?.parentElement;
    if (!parent) return undefined;

    // Use the existing viewport so toolbar, scrollbar, and header reset share one scroll position.
    let viewport = parent;
    while (viewport && getComputedStyle(viewport).overflowX === "visible") {
      viewport = viewport.parentElement;
    }
    if (viewport && !/^(auto|scroll|overlay)$/.test(getComputedStyle(viewport).overflowX)) {
      viewport = null;
    }
    viewportRef.current = viewport;
    const measure = () => {
      const width = (viewport ?? parent).clientWidth;
      if (layout === "content") setAvailableWidth(width);
      const remaining = viewport ? viewport.scrollWidth - width : 0;
      const next = remaining > 5 && table.offsetWidth > width + 5 ? {
        width,
        backward: viewport.scrollLeft > 5,
        forward: remaining - viewport.scrollLeft > 5,
        scrolled: viewport.scrollLeft > 20,
        hasToolbar: hasTableScrollToolbar(viewport),
      } : null;
      setScroll((previous) => previous && next && Object.keys(next).every((key) => next[key] === previous[key]) ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(viewport ?? parent);
    observer?.observe(table);
    viewport?.addEventListener("scroll", measure, { passive: true });
    viewport?.addEventListener(tableScrollToolbarChange, measure);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      viewport?.removeEventListener("scroll", measure);
      viewport?.removeEventListener(tableScrollToolbarChange, measure);
      window.removeEventListener("resize", measure);
      viewportRef.current = null;
    };
  }, [layout]);
  const contentWidths = layout === "content" ? getContentColumnWidths(columns, children, availableWidth, className) : [];
  const contentWidth = contentWidths.reduce((sum, width) => sum + width, 0);
  const controlsOnly = layout === "content" && columns.length > 0 && columns.every((column) =>
    ["selection", "actions"].includes(typeof column === "string" ? column : column?.kind)
  );
  const actionIndex = columns.findIndex((column) => column === "actions" || column?.kind === "actions");
  const spacerIndex = controlsOnly ? (actionIndex < 0 ? columns.length : actionIndex) : -1;
  const colWidths = layout === "matrix" ? matrixWidths : [...contentWidths];
  if (controlsOnly) colWidths.splice(spacerIndex, 0, undefined);
  const identityIndex = columns.findIndex((column) => !["selection", "actions"].includes(column?.kind ?? column));
  const hasLeadingSelection = (columns[0]?.kind ?? columns[0]) === "selection";
  const identityWidth = colWidths[identityIndex];
  const identityInset = hasLeadingSelection ? 48 : 0;
  const actionsWidth = actionIndex >= 0 ? 48 : 0;
  // A wide identity column must leave room to scroll on a phone.
  const pinnedLeft = scroll && identityWidth
    ? Math.min(identityInset, scroll.width - identityWidth - actionsWidth - 44)
    : identityInset;
  const hasHeader = React.Children.toArray(children).some((child) =>
    React.isValidElement(child) && (child.type === "thead" || child.type === TableHeader)
  );
  const resetScroll = () => moveTableScroll(viewportRef.current);
  return (
    <ColumnsContext.Provider value={{ columns, spacerIndex, identityIndex, hasLeadingSelection, showReset: scroll?.scrolled, resetScroll }}>
      {scroll && !scroll.hasToolbar && hasHeader && identityIndex !== -1 && (
        <div className="table-inline-scroll-controls" style={{ width: scroll.width }}>
          <TableScrollControls
            canScrollLeft={scroll.backward}
            canScrollRight={scroll.forward}
            isScrolledX={scroll.scrolled}
            onResetScroll={resetScroll}
            onScrollLeft={(amount) => moveTableScroll(viewportRef.current, -amount)}
            onScrollRight={(amount) => moveTableScroll(viewportRef.current, amount)}
            controlSize="sm"
          />
        </div>
      )}
      <table ref={tableRef} data-slot="table" data-density={normalizeTableDensity(overrideDensity || density)} data-layout={layout}
        data-horizontal-overflow={scroll ? "" : undefined} data-scrolled-x={scroll?.scrolled ? "" : undefined}
        className={cn("app-table w-full min-w-0 caption-bottom border-separate border-spacing-0 text-left text-[13px]", className)}
        style={{ ...style, tableLayout: layout === "matrix" || layout === "fixed" || layout === "content" ? "fixed" : "auto", ...(layout === "matrix" && columns.length ? { width: matrixWidth, minWidth: matrixWidth } : {}), ...(layout === "content" ? { width: controlsOnly || !contentWidth ? "100%" : contentWidth, ...(contentWidth ? { minWidth: contentWidth } : {}) } : {}), "--table-row-height": `${setting.height}px`, "--table-cell-py": `${setting.padding}px`, "--table-identity-left": `${pinnedLeft}px` }} {...props}>
        {(layout === "matrix" || layout === "content") && columns.length > 0 && <colgroup>{colWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>}
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
  const { columns, spacerIndex, identityIndex, hasLeadingSelection } = React.useContext(ColumnsContext);
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
    const pinned = child.props.colSpan > 1 ? undefined
      : index === identityIndex ? "identity" : index === 0 && hasLeadingSelection ? "selection" : undefined;
    if (!["td", "th", TableCell, TableHead].includes(child.type)) {
      return React.cloneElement(child, { tableColumn: { ...config, "data-table-pin": pinned } });
    }
    const Cell = child.type === "th" || child.type === TableHead ? TableHead : TableCell;
    const childProps = { ...child.props };
    delete childProps.key;
    return <Cell {...config} {...childProps} data-table-pin={pinned} key={cellIndex} />;
  });
  if (spacerIndex >= 0) {
    const [firstCell] = cells;
    if (cells.length === 1 && firstCell?.props?.colSpan === columns.length) {
      cells[0] = React.cloneElement(firstCell, { colSpan: columns.length + 1 });
    } else {
      const Spacer = section === "head" ? "th" : "td";
      cells.splice(spacerIndex, 0, <Spacer key="table-spacer" aria-hidden="true" data-slot={section === "head" ? "table-head" : "table-cell"} />);
    }
  }
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
      if (cell.props.colSpan == null && config && !["selection", "actions"].includes(config.kind)) {
        const lengths = section === "head" ? headerLengths : bodyLengths;
        lengths[index] = Math.max(lengths[index], tableContentLength(cell.props.children));
      }
      index += span;
    }
  }

  const declaredMinWidth = Number(className.match(/\bmin-w-\[(\d+(?:\.\d+)?)px\]/)?.[1]) || 0;
  return sizeContentColumns(schemas, bodyLengths, headerLengths, Math.max(availableWidth, declaredMinWidth), availableWidth);
}

// Stacked lines share a column. Size for the longest line, while keeping inline labels together.
function tableContentLength(children) {
  function lines(nodes) {
    return React.Children.toArray(nodes).map((node) => {
      if (typeof node === "string" || typeof node === "number") return String(node);
      if (!React.isValidElement(node) || node.props["aria-hidden"] === true || node.props.className?.split(/\s+/).includes("sr-only")) return "";
      const content = lines(node.props.children);
      return node.type === "div" || node.type === "p" || node.type === TableText
        ? `\n${content}\n`
        : content;
    }).join("");
  }
  return lines(children).split("\n").reduce((longest, line) => Math.max(longest, line.trim().length), 0);
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
  const { showReset, resetScroll } = React.useContext(ColumnsContext);
  let content = children;
  if (kind === "actions") content = <span className="sr-only">Actions</span>;
  else if (kind === "selection") content = selectionContent(children, "Select all records on this page");
  else if (props["data-table-pin"] === "identity") {
    content = (
      <div className="table-header-with-scroll-reset">
        <div>{children}</div>
        {showReset && (
          <button
            type="button"
            className="table-header-scroll-reset"
            aria-label="Reset table scroll"
            title="Reset table scroll"
            onClick={(event) => {
              event.stopPropagation();
              const header = event.currentTarget.closest("th");
              const sortButton = header?.querySelector("button:not(.table-header-scroll-reset)");
              (sortButton ?? header)?.focus({ preventScroll: true });
              resetScroll();
            }}
          >
            <ArrowLeft01Icon size={10} aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }
  return <th data-slot="table-head" data-kind={kind} scope="col" tabIndex={props["data-table-pin"] === "identity" ? -1 : undefined} className={cn("px-4 text-xs font-semibold text-gray-600 dark:text-zinc-300", className)} style={cellStyle({ kind, align, width, minWidth, maxWidth, paddingX, paddingLeft, paddingRight, style, header: true, colSpan: props.colSpan })} {...props}>{content}</th>;
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
