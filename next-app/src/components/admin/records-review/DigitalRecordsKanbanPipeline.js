"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, formatTitleCase } from "@/lib/utils";
import {
  KanbanStatusIcon,
  KANBAN_CARD_CLASS,
  KANBAN_CARD_DRAGGING_CLASS,
  KANBAN_CARD_HEADER_CLASS,
  KANBAN_CARD_TITLE_CLASS,
  KANBAN_CARD_FOOTER_CLASS,
  KANBAN_CARD_METADATA_CLASS,
  KanbanCardTag,
} from "@/components/shared/KanbanPrimitives";
import { formatBytes, formatUploadedDate } from "./DigitalRecordsList";
import {
  File02Icon,
  InboxIcon,
  Pdf01Icon,
} from "hugeicons-react";
import { EmptyState } from "@/components/ui/empty";

export const DIGITAL_RECORDS_KANBAN_COLUMNS = [
  {
    key: "Pending",
    label: "Awaiting Review",
    dropZone:
      "border-amber-500/50 bg-amber-50/60 dark:bg-amber-950/25 text-amber-700 dark:text-amber-300",
  },
  {
    key: "Approved",
    label: "Approved",
    dropZone:
      "border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-300",
  },
  {
    key: "Declined",
    label: "Declined",
    dropZone:
      "border-rose-500/50 bg-rose-50/60 dark:bg-rose-950/25 text-rose-700 dark:text-rose-300",
  },
];

export default function DigitalRecordsKanbanPipeline({
  records = [],
  isOsas = false,
  onPreview,
  onDropItem,
  scrollRef,
}) {
  const internalBoardScrollRef = useRef(null);
  const boardScrollRef = scrollRef || internalBoardScrollRef;
  const isDraggingCardRef = useRef(false);

  const [draggingItem, setDraggingItem] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Mouse pan / drag-to-scroll canvas state
  const isPanningRef = useRef(false);
  const panStartXRef = useRef(0);
  const panScrollLeftRef = useRef(0);
  const [isPanningActive, setIsPanningActive] = useState(false);

  // Group items by column
  const columnData = useMemo(() => {
    const map = {
      Pending: [],
      Approved: [],
      Declined: [],
    };

    records.forEach((record) => {
      const status = record.approval_status || "Pending";
      if (map[status]) {
        map[status].push(record);
      } else {
        map.Pending.push(record);
      }
    });

    return map;
  }, [records]);

  // Canvas Mouse Pan (Drag-to-Scroll)
  const handleMouseDownCanvas = (e) => {
    if (isDraggingCardRef.current) return;
    if (
      e.target.closest("button") ||
      e.target.closest("[role='button']") ||
      e.target.closest(".kanban-card")
    )
      return;
    if (e.button !== 0) return;

    isPanningRef.current = true;
    panStartXRef.current = e.pageX - (boardScrollRef.current?.offsetLeft || 0);
    panScrollLeftRef.current = boardScrollRef.current?.scrollLeft || 0;
    setIsPanningActive(true);
  };

  const handleMouseMoveCanvas = useCallback(
    (e) => {
      if (!isPanningRef.current || !boardScrollRef.current) return;
      e.preventDefault();
      const x = e.pageX - (boardScrollRef.current.offsetLeft || 0);
      const walk = (x - panStartXRef.current) * 1.5;
      boardScrollRef.current.scrollLeft = panScrollLeftRef.current - walk;
    },
    [boardScrollRef]
  );

  const handleMouseUpCanvas = useCallback(() => {
    isPanningRef.current = false;
    setIsPanningActive(false);
  }, []);

  useEffect(() => {
    const handleUp = () => handleMouseUpCanvas();
    const handleMove = (e) => handleMouseMoveCanvas(e);

    window.addEventListener("mouseup", handleUp);
    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("mousemove", handleMove);
    };
  }, [handleMouseUpCanvas, handleMouseMoveCanvas]);

  // Card Drag-and-Drop handlers
  const handleDragStartCard = (e, item) => {
    isDraggingCardRef.current = true;
    setDraggingItem(item);
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEndCard = () => {
    isDraggingCardRef.current = false;
    setDraggingItem(null);
    setDragOverColumn(null);
  };

  const handleDragOverColumn = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colKey) {
      setDragOverColumn(colKey);
    }
  };

  const handleDragLeaveColumn = (e, colKey) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverColumn === colKey) {
      setDragOverColumn(null);
    }
  };

  const handleDropOnColumn = (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    let droppedData = draggingItem;
    if (!droppedData) {
      try {
        const raw = e.dataTransfer.getData("application/json");
        if (raw) droppedData = JSON.parse(raw);
      } catch {}
    }

    if (!droppedData) return;
    if (droppedData.approval_status === targetStatus) return;

    onDropItem?.(droppedData, targetStatus);
  };

  return (
    <div
      ref={boardScrollRef}
      onMouseDown={handleMouseDownCanvas}
      className={cn(
        "w-full flex-1 flex flex-col min-h-[calc(100vh-20rem)] overflow-x-auto pb-4 pt-3 px-4 sm:px-6 show-scrollbar select-none",
        isPanningActive ? "cursor-grabbing" : "cursor-grab"
      )}
    >
      <div className="flex items-stretch gap-3.5 min-w-max flex-1 h-full min-h-[500px]">
        {DIGITAL_RECORDS_KANBAN_COLUMNS.map((col) => {
          const colItems = columnData[col.key] || [];
          const isOver = dragOverColumn === col.key;
          const isDraggingCurrentCol = draggingItem?.approval_status === col.key;

          return (
            <div
              key={col.key}
              onDragOver={(e) => handleDragOverColumn(e, col.key)}
              onDragLeave={(e) => handleDragLeaveColumn(e, col.key)}
              onDrop={(e) => handleDropOnColumn(e, col.key)}
              className={cn(
                "w-80 shrink-0 flex flex-col h-full rounded-2xl border border-gray-200/60 dark:border-white/[0.06] bg-gray-100/75 dark:bg-zinc-900/60 p-2.5 transition-all duration-200",
                isOver &&
                  !isDraggingCurrentCol &&
                  "ring-2 ring-gray-400/50 dark:ring-zinc-600 bg-gray-200/60 dark:bg-zinc-800/70"
              )}
            >
              {/* Clean Single-Line Column Header */}
              <div className="flex items-center justify-between px-2 pt-1.5 pb-2.5 select-none shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <KanbanStatusIcon status={col.key} />
                  <span className="text-[13px] font-semibold tracking-tight text-gray-800 dark:text-zinc-100 truncate">
                    {col.label}
                  </span>
                  <span className="text-xs font-medium text-gray-400 dark:text-zinc-500 tabular-nums">
                    {colItems.length}
                  </span>
                </div>
              </div>

              {/* Column Dropzone / Items list */}
              <div className="flex flex-col gap-2 h-[760px] overflow-y-auto px-0.5 pb-0.5 show-scrollbar">
                {/* Drag-over indicator placeholder */}
                {isOver && !isDraggingCurrentCol && (
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-xl border border-dashed p-3.5 text-xs font-medium transition-all shrink-0",
                      col.dropZone
                    )}
                  >
                    Drop to mark as {col.label}
                  </div>
                )}

                {colItems.length === 0 && !isOver && (
                  <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <EmptyState
                      variant="compact"
                      icon={InboxIcon}
                      title="No records in queue"
                      description="Drag records here to update"
                    />
                  </div>
                )}

                {colItems.map((record) => {
                  const isPdf = /\.pdf$/i.test(record.original_filename || "");
                  const status = record.approval_status || "Pending";
                  const isDeclined = status === "Declined";
                  const organizationName = record.organization_name || "Organization not linked";
                  const { dateStr, timeStr } = formatUploadedDate(record.created_at);

                  return (
                    <div
                      key={record.id}
                      draggable
                      onDragStart={(e) => handleDragStartCard(e, record)}
                      onDragEnd={handleDragEndCard}
                      onClick={() => onPreview?.(record)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onPreview?.(record);
                        }
                      }}
                      className={cn(
                        KANBAN_CARD_CLASS,
                        "cursor-grab active:cursor-grabbing",
                        draggingItem?.id === record.id && KANBAN_CARD_DRAGGING_CLASS
                      )}
                    >
                      {/* Row 1: Status Icon + Student Name (left) & Date (right) */}
                      <div className={KANBAN_CARD_HEADER_CLASS}>
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <KanbanStatusIcon status={status} className="mt-[3px]" />
                          <span
                            className={KANBAN_CARD_TITLE_CLASS}
                            title={isOsas ? organizationName : formatTitleCase(record.student_name)}
                          >
                            {isOsas ? organizationName : formatTitleCase(record.student_name)}
                          </span>
                        </div>

                        <span
                          className={cn(
                            "text-[11px] font-medium tabular-nums shrink-0",
                            isDeclined
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-gray-400 dark:text-zinc-500"
                          )}
                          title={`Uploaded ${dateStr} ${timeStr}`}
                        >
                          {dateStr}
                        </span>
                      </div>

                      {/* Optional subline: Decline reason or filename */}
                      {isDeclined && record.review_note ? (
                        <p
                          className="text-[11px] text-rose-600 dark:text-rose-400 line-clamp-1 pl-5.5"
                          title={record.review_note}
                        >
                          Reason: &ldquo;{record.review_note}&rdquo;
                        </p>
                      ) : record.original_filename ? (
                        <p
                          className="text-[11px] text-gray-400 dark:text-zinc-500 truncate pl-5.5"
                          title={record.original_filename}
                        >
                          {record.original_filename}
                        </p>
                      ) : null}

                      {/* Row 2: Metadata */}
                      <div className={KANBAN_CARD_METADATA_CLASS}>
                        <KanbanCardTag label={record.doc_type} />
                        {record.course_code && (
                          <KanbanCardTag label={record.course_code} />
                        )}
                      </div>

                      {/* Row 3: File Size */}
                      <div
                        className={KANBAN_CARD_FOOTER_CLASS}
                      >
                        {!isOsas && (
                          <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-gray-400 dark:text-zinc-500">
                            {isPdf ? (
                              <Pdf01Icon size={13} className="text-rose-500/80 dark:text-rose-400/80 shrink-0" />
                            ) : (
                              <File02Icon size={13} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                            )}
                            <Badge variant="gray" size="compact" className="rounded-lg">{record.student_no}</Badge>
                          </span>
                        )}

                        <span className="ml-auto shrink-0 font-medium tabular-nums">
                          {formatBytes(record.size_bytes)}
                        </span>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
