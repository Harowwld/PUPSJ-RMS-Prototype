"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROOM_TEMPLATES, getDefaultDoor } from "@/lib/storageLayoutDefaults";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export default function StorageLayoutEditorTab({ showToast, error = null }) {
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentRoomUsage, setStudentRoomUsage] = useState(new Map());
  const [studentDrawerUsage, setStudentDrawerUsage] = useState(new Map());

  const [activeRoomId, setActiveRoomId] = useState(null);
  const [selectedCabinetId, setSelectedCabinetId] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("grid-4x2");
  const [templateConflictOpen, setTemplateConflictOpen] = useState(false);
  const [templateConflictRows, setTemplateConflictRows] = useState([]);
  const [templateMappingDraft, setTemplateMappingDraft] = useState({});
  const [templateTargetOptions, setTemplateTargetOptions] = useState([]);
  const [templateApplyPayload, setTemplateApplyPayload] = useState(null);
  const [reassignmentMode, setReassignmentMode] = useState("");
  const [dragSourceKey, setDragSourceKey] = useState("");
  const [applyPreviewOpen, setApplyPreviewOpen] = useState(false);
  const [applyPreviewRows, setApplyPreviewRows] = useState([]);
  const [applyReportOpen, setApplyReportOpen] = useState(false);
  const [applyReportRows, setApplyReportRows] = useState([]);

  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const MIN_SIZE = 0.08;

  const getCabinetEffectiveSize = (cab) => {
    const baseW = Number(cab?.rect?.w) || 0;
    const baseH = Number(cab?.rect?.h) || 0;
    const rot = Number(cab?.rotation) === 90 ? 90 : 0;
    return rot === 90 ? { w: baseH, h: baseW } : { w: baseW, h: baseH };
  };

  const clampCabinetToRoom = (cab) => {
    const x = Number(cab?.rect?.x) || 0;
    const y = Number(cab?.rect?.y) || 0;
    const { w, h } = getCabinetEffectiveSize(cab);
    const cx = clamp(x, 0, Math.max(0, 1 - w));
    const cy = clamp(y, 0, Math.max(0, 1 - h));
    return {
      ...cab,
      rect: { ...cab.rect, x: cx, y: cy },
    };
  };

  const activeRoom = useMemo(() => {
    if (!layout || activeRoomId == null) return null;
    return layout.rooms.find((r) => r.id === activeRoomId) || null;
  }, [layout, activeRoomId]);

  const selectedCabinet = useMemo(() => {
    if (!activeRoom || !selectedCabinetId) return null;
    return activeRoom.cabinets.find((c) => c.id === selectedCabinetId) || null;
  }, [activeRoom, selectedCabinetId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/storage-layout", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.ok)
          throw new Error(json?.error || "Failed to load layout");
        setLayout(json.data);
        const firstRoom = Array.isArray(json.data?.rooms)
          ? json.data.rooms[0]?.id
          : null;
        setActiveRoomId(firstRoom);
      } catch (err) {
        showToast?.(
          {
            title: "Load Failed",
            description: err?.message || "Unable to load storage layout.",
          },
          true,
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  useEffect(() => {
    (async () => {
      try {
        const limit = 200;
        let offset = 0;
        const map = new Map();
        const drawerMap = new Map();
        while (true) {
          const qs = new URLSearchParams();
          qs.set("limit", String(limit));
          qs.set("offset", String(offset));
          const res = await fetch(`/api/students?${qs}`, { cache: "no-store" });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.ok) break;
          const rows = Array.isArray(json.data) ? json.data : [];
          for (const s of rows) {
            const roomId = Number(s?.room);
            if (!Number.isFinite(roomId)) continue;
            map.set(roomId, (map.get(roomId) || 0) + 1);
            const cabId = String(s?.cabinet || "").trim();
            const drawerId = Number(s?.drawer);
            if (cabId && Number.isFinite(drawerId)) {
              const key = `${roomId}|${cabId}|${drawerId}`;
              drawerMap.set(key, (drawerMap.get(key) || 0) + 1);
            }
          }
          if (rows.length < limit) break;
          offset += limit;
          if (offset > 20000) break;
        }
        setStudentRoomUsage(map);
        setStudentDrawerUsage(drawerMap);
      } catch {
        // silent; server-side save validation still protects integrity
      }
    })();
  }, []);

  const activeRoomStudentCount = useMemo(() => {
    if (!activeRoom) return 0;
    return Number(studentRoomUsage.get(Number(activeRoom.id)) || 0);
  }, [activeRoom, studentRoomUsage]);

  useEffect(() => {
    if (!activeRoom || !selectedCabinetId) {
      const firstCabinet = activeRoom?.cabinets?.[0]?.id || null;
      setSelectedCabinetId(firstCabinet);
    } else if (activeRoom && selectedCabinetId) {
      const exists = activeRoom.cabinets.some(
        (c) => c.id === selectedCabinetId,
      );
      if (!exists) setSelectedCabinetId(activeRoom.cabinets[0]?.id || null);
    }
  }, [activeRoom, selectedCabinetId]);

  function updateCabinet(roomId, cabinetId, updater) {
    setLayout((prev) => {
      if (!prev) return prev;
      const rooms = prev.rooms.map((r) => {
        if (r.id !== roomId) return r;
        const cabinets = r.cabinets.map((c) => {
          if (c.id !== cabinetId) return c;
          return updater(c);
        });
        return { ...r, cabinets };
      });
      return { ...prev, rooms };
    });
  }

  function updateRoom(roomId, updater) {
    setLayout((prev) => {
      if (!prev) return prev;
      const rooms = prev.rooms.map((r) => (r.id === roomId ? updater(r) : r));
      rooms.sort((a, b) => a.id - b.id);
      return { ...prev, rooms };
    });
  }

  function getNextRoomId(rooms) {
    const max = Math.max(0, ...(rooms || []).map((r) => Number(r.id) || 0));
    return max + 1;
  }

  function addRoom() {
    let createdRoomId = null;
    setLayout((prev) => {
      if (!prev) return prev;
      const nextId = getNextRoomId(prev.rooms);
      createdRoomId = nextId;
      const next = {
        id: nextId,
        name: `Room ${nextId}`,
        cabinets: [],
        door: getDefaultDoor(),
      };
      return {
        ...prev,
        rooms: [...prev.rooms, next].sort((a, b) => a.id - b.id),
      };
    });
    setSelectedCabinetId(null);
    if (createdRoomId != null) {
      setActiveRoomId(createdRoomId);
    }
  }

  function removeActiveRoom() {
    if (!layout || !activeRoom) return;
    if (activeRoomStudentCount > 0) {
      showToast?.(
        {
          title: "Cannot Remove Room",
          description: `Room ${activeRoom.id} has ${activeRoomStudentCount} student record(s) still assigned.`,
        },
        true,
      );
      return;
    }
    if (activeRoom.cabinets?.length) {
      showToast?.(
        {
          title: "Cannot Remove Room",
          description: "Remove all cabinets first before deleting a room.",
        },
        true,
      );
      return;
    }
    setLayout((prev) => {
      if (!prev) return prev;
      const rooms = prev.rooms.filter((r) => r.id !== activeRoom.id);
      return { ...prev, rooms };
    });
    const fallback =
      layout.rooms.find((r) => r.id !== activeRoom.id)?.id || null;
    setActiveRoomId(fallback);
    setSelectedCabinetId(null);
  }

  function resetActiveRoomCabinets() {
    if (!layout || !activeRoom) return;
    if (activeRoomStudentCount > 0) {
      showToast?.(
        {
          title: "Cannot Reset Room",
          description: `Room ${activeRoom.id} has ${activeRoomStudentCount} student record(s) still assigned.`,
        },
        true,
      );
      return;
    }
    if (!activeRoom.cabinets?.length) {
      showToast?.({
        title: "Nothing to Reset",
        description: "This room has no cabinet layout to clear.",
      });
      return;
    }
    updateRoom(activeRoom.id, (r) => ({
      ...r,
      cabinets: [],
    }));
    setSelectedCabinetId(null);
    showToast?.({
      title: "Layout Reset",
      description:
        "Room cleared. Save to apply. Blocked if students still reference this room.",
    });
  }

  function applyTemplateToActiveRoom() {
    if (!activeRoom) return;
    const tpl = ROOM_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;
    const targetLocKeys = new Set();
    const targetOpts = [];
    for (const c of tpl.cabinets || []) {
      for (const d of c.drawerIds || []) {
        const key = `${activeRoom.id}|${c.id}|${Number(d)}`;
        targetLocKeys.add(key);
        targetOpts.push({
          key,
          label: `Room ${activeRoom.id} / Cabinet ${c.id} / Drawer ${Number(d)}`,
        });
      }
    }
    const conflicts = [];
    for (const c of activeRoom.cabinets || []) {
      for (const d of c.drawerIds || []) {
        const sourceKey = `${activeRoom.id}|${c.id}|${Number(d)}`;
        const usedCount = Number(studentDrawerUsage.get(sourceKey) || 0);
        if (usedCount <= 0) continue;
        if (targetLocKeys.has(sourceKey)) continue;
        conflicts.push({
          sourceKey,
          sourceLabel: `Room ${activeRoom.id} / Cabinet ${c.id} / Drawer ${Number(d)}`,
          count: usedCount,
        });
      }
    }
    if (conflicts.length > 0) {
      const nextDraft = {};
      for (const c of conflicts) {
        nextDraft[c.sourceKey] = "";
      }
      setTemplateConflictRows(conflicts);
      setTemplateTargetOptions(targetOpts);
      setTemplateMappingDraft(nextDraft);
      setTemplateApplyPayload({
        roomId: activeRoom.id,
        templateId: tpl.id,
      });
      setReassignmentMode("");
      setDragSourceKey("");
      setTemplateConflictOpen(true);
      return;
    }
    updateRoom(activeRoom.id, (r) => ({
      ...r,
      cabinets: (tpl.cabinets || []).map((c) => ({
        id: c.id,
        rect: { ...c.rect },
        rotation: Number(c.rotation) === 90 ? 90 : 0,
        drawerIds: [...(c.drawerIds || [1])],
      })),
      door: r.door || getDefaultDoor(),
    }));
    setSelectedCabinetId(null);
    showToast?.({
      title: "Template Applied",
      description: `"${tpl.name}" has been loaded into the active room.`,
    });
  }

  function buildTemplateLayoutPreview(baseLayout, roomId, templateId) {
    const tpl = ROOM_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return baseLayout;
    return {
      ...baseLayout,
      rooms: (baseLayout.rooms || []).map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              cabinets: (tpl.cabinets || []).map((c) => ({
                id: c.id,
                rect: { ...c.rect },
                rotation: Number(c.rotation) === 90 ? 90 : 0,
                drawerIds: [...(c.drawerIds || [1])],
              })),
              door: r.door || getDefaultDoor(),
            },
      ),
    };
  }

  function buildAutoMappings() {
    const usedTargets = new Set();
    const next = {};
    const sortedTargets = [...templateTargetOptions];
    for (const row of templateConflictRows) {
      const parsed = String(row.sourceKey || "").split("|");
      const sourceCab = String(parsed[1] || "").trim();
      const sourceDrawer = String(parsed[2] || "").trim();
      const preferred = sortedTargets.find(
        (t) =>
          !usedTargets.has(t.key) &&
          t.key.endsWith(`|${sourceCab}|${sourceDrawer}`),
      );
      const fallback =
        preferred ||
        sortedTargets.find((t) => !usedTargets.has(t.key)) ||
        sortedTargets[0];
      next[row.sourceKey] = fallback?.key || "";
      if (fallback?.key) usedTargets.add(fallback.key);
    }
    return next;
  }

  function openApplyPreview() {
    if (!reassignmentMode) {
      showToast?.(
        {
          title: "Choose Reassignment Mode",
          description: "Select Manual or Auto before continuing.",
        },
        true,
      );
      return;
    }
    if (reassignmentMode === "auto") {
      const next = buildAutoMappings();
      setTemplateMappingDraft(next);
    }
    const draft =
      reassignmentMode === "auto" ? buildAutoMappings() : templateMappingDraft;
    const hasMissing = templateConflictRows.some(
      (r) => !String(draft[r.sourceKey] || "").trim(),
    );
    if (hasMissing) {
      showToast?.(
        {
          title: "Incomplete Mapping",
          description: "Assign a target drawer for all in-use source drawers.",
        },
        true,
      );
      return;
    }
    const rows = templateConflictRows.map((r) => {
      const toKey = String(draft[r.sourceKey] || "");
      const toLabel =
        templateTargetOptions.find((t) => t.key === toKey)?.label || toKey;
      return {
        fromKey: r.sourceKey,
        fromLabel: r.sourceLabel,
        count: r.count,
        toKey,
        toLabel,
      };
    });
    setApplyPreviewRows(rows);
    setApplyPreviewOpen(true);
  }

  async function applyTemplateWithMappings() {
    if (!layout || !templateApplyPayload?.roomId || !templateApplyPayload?.templateId) {
      showToast?.(
        {
          title: "Apply Failed",
          description: "Missing template apply context. Try applying the template again.",
        },
        true,
      );
      return;
    }
    const nextLayout = buildTemplateLayoutPreview(
      layout,
      templateApplyPayload.roomId,
      templateApplyPayload.templateId,
    );
    const reassignments = applyPreviewRows.map((r) => ({
      fromKey: r.fromKey,
      toKey: r.toKey,
    }));
    setSaving(true);
    try {
      const previousLayoutSnapshot = JSON.parse(JSON.stringify(layout));
      const res = await fetch("/api/storage-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout: nextLayout,
          reassignments,
          skipUsageCheck: true,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Template apply failed");
      }
      setLayout(json.data);
      setTemplateConflictOpen(false);
      setApplyPreviewOpen(false);
      setTemplateApplyPayload(null);
      setReassignmentMode("");
      setDragSourceKey("");
      const breakdown = Array.isArray(json?.movedBreakdown) ? json.movedBreakdown : [];
      setApplyReportRows(breakdown);
      setApplyReportOpen(true);
      showToast?.({
        title: "Template Applied",
        description: `Template applied with reassignment. ${Number(json?.movedCount || 0)} student record(s) moved.`,
      });
    } catch (err) {
      showToast?.(
        {
          title: "Apply Failed",
          description: err?.message || "Unable to apply template with reassignment.",
        },
        true,
      );
    } finally {
      setSaving(false);
    }
  }

  function addCabinet() {
    if (!activeRoom) return;
    const baseId = `CAB-${(activeRoom.cabinets?.length || 0) + 1}`;
    let id = baseId;
    const existing = new Set(activeRoom.cabinets.map((c) => c.id));
    let n = 1;
    while (existing.has(id)) {
      n += 1;
      id = `CAB-${n}`;
    }
    const cab = {
      id,
      rect: { x: 0.05, y: 0.05, w: 0.15, h: 0.35 },
      rotation: 0,
      drawerIds: [1, 2, 3, 4],
    };
    updateRoom(activeRoom.id, (r) => ({
      ...r,
      cabinets: [...r.cabinets, cab].sort((a, b) =>
        String(a.id).localeCompare(String(b.id)),
      ),
    }));
    setSelectedCabinetId(id);
  }

  function removeSelectedCabinet() {
    if (!activeRoom || !selectedCabinet) return;
    updateRoom(activeRoom.id, (r) => ({
      ...r,
      cabinets: r.cabinets.filter((c) => c.id !== selectedCabinet.id),
    }));
    const fallback =
      activeRoom.cabinets.find((c) => c.id !== selectedCabinet.id)?.id || null;
    setSelectedCabinetId(fallback);
  }

  function rotateSelectedCabinet() {
    if (!activeRoom || !selectedCabinet) return;
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => {
      const nextRotation = Number(c.rotation) === 90 ? 0 : 90;
      return clampCabinetToRoom({ ...c, rotation: nextRotation });
    });
  }

  function addDrawerToSelected() {
    if (!activeRoom || !selectedCabinet) return;
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => {
      const ids = Array.isArray(c.drawerIds) ? c.drawerIds : [];
      const max = Math.max(0, ...ids.map((d) => (Number.isFinite(d) ? d : 0)));
      return { ...c, drawerIds: [...ids, max + 1] };
    });
  }

  function removeDrawerFromSelected() {
    if (!activeRoom || !selectedCabinet) return;
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => {
      const ids = Array.isArray(c.drawerIds) ? c.drawerIds : [];
      if (ids.length <= 1) return c;
      return { ...c, drawerIds: ids.slice(0, -1) };
    });
  }

  function updateSelectedRectFromNormalized(newRect) {
    if (!activeRoom || !selectedCabinet) return;
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => {
      const { w, h } = getCabinetEffectiveSize(c);
      const x = clamp(newRect.x, 0, Math.max(0, 1 - w));
      const y = clamp(newRect.y, 0, Math.max(0, 1 - h));
      return { ...c, rect: { ...c.rect, x, y } };
    });
  }

  function updateSelectedSizeNormalized(nextW, nextH) {
    if (!activeRoom || !selectedCabinet) return;
    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => {
      const rot = Number(c.rotation) === 90 ? 90 : 0;
      const x = Number(c.rect?.x) || 0;
      const y = Number(c.rect?.y) || 0;
      const requestedW = clamp(Number(nextW), MIN_SIZE, 1);
      const requestedH = clamp(Number(nextH), MIN_SIZE, 1);
      const effW = rot === 90 ? requestedH : requestedW;
      const effH = rot === 90 ? requestedW : requestedH;
      const maxEffW = Math.max(MIN_SIZE, 1 - x);
      const maxEffH = Math.max(MIN_SIZE, 1 - y);
      const finalEffW = clamp(effW, MIN_SIZE, maxEffW);
      const finalEffH = clamp(effH, MIN_SIZE, maxEffH);
      const finalW = rot === 90 ? finalEffH : finalEffW;
      const finalH = rot === 90 ? finalEffW : finalEffH;
      return {
        ...c,
        rect: { ...c.rect, w: finalW, h: finalH },
      };
    });
  }

  function updateSelectedSizeFromPointer(relX, relY) {
    if (!activeRoom || !selectedCabinet) return;
    const rot = Number(selectedCabinet.rotation) === 90 ? 90 : 0;
    const x = Number(selectedCabinet.rect?.x) || 0;
    const y = Number(selectedCabinet.rect?.y) || 0;

    const maxW = Math.max(MIN_SIZE, 1 - x);
    const maxH = Math.max(MIN_SIZE, 1 - y);
    const effW = clamp(relX - x, MIN_SIZE, maxW);
    const effH = clamp(relY - y, MIN_SIZE, maxH);

    // rect stores canonical (unrotated) dimensions.
    const nextBaseW = rot === 90 ? effH : effW;
    const nextBaseH = rot === 90 ? effW : effH;

    updateCabinet(activeRoom.id, selectedCabinet.id, (c) => ({
      ...c,
      rect: {
        ...c.rect,
        w: clamp(nextBaseW, MIN_SIZE, 1),
        h: clamp(nextBaseH, MIN_SIZE, 1),
      },
    }));
  }

  function handleCanvasPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    if (d.pointerId !== e.pointerId) return;
    if (!canvasRef.current) return;

    const box = canvasRef.current.getBoundingClientRect();
    const relX = (e.clientX - box.left) / Math.max(1, box.width);
    const relY = (e.clientY - box.top) / Math.max(1, box.height);

    if (d.mode === "resize") {
      updateSelectedSizeFromPointer(relX, relY);
      return;
    }

    if (d.mode === "door") {
      if (!activeRoom) return;
      const nextX = clamp(relX, 0, 1);
      const nextY = clamp(relY, 0, 1);
      updateRoom(activeRoom.id, (r) => ({
        ...r,
        door: { x: nextX, y: nextY },
      }));
      return;
    }

    const x = relX - d.offsetX;
    const y = relY - d.offsetY;

    const clampedX = clamp(x, 0, 1 - d.effW);
    const clampedY = clamp(y, 0, 1 - d.effH);

    updateSelectedRectFromNormalized({
      ...selectedCabinet.rect,
      x: clampedX,
      y: clampedY,
    });
  }

  function handleCanvasPointerUp(e) {
    const d = dragRef.current;
    if (!d) return;
    if (d.pointerId !== e.pointerId) return;
    dragRef.current = null;
  }

  async function saveLayout() {
    if (!layout) return;
    setSaving(true);
    try {
      const res = await fetch("/api/storage-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Save failed");
      setLayout(json.data);
      showToast?.({
        title: "Layout Saved",
        description: "All room and cabinet changes have been applied.",
      });
    } catch (err) {
      showToast?.(
        {
          title: "Save Failed",
          description: err?.message || "Unable to save storage layout.",
        },
        true,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full h-full animate-fade-in">
        <div className="p-5 border-b border-gray-200 bg-gray-50">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-72 mt-2" />
        </div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-3 items-center">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>
            <Skeleton
              className="w-full rounded-brand"
              style={{ aspectRatio: "16 / 10" }}
            />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-[420px] w-full rounded-brand" />
          </div>
        </div>
      </div>
    );
  }

  if (!layout) {
    return (
      <Empty className="flex items-center justify-center h-[400px] text-gray-500 font-semibold border-0">
        <EmptyHeader className="flex flex-col items-center gap-0">
          <EmptyMedia className="mb-4">
            <i className="ph-duotone ph-layout text-3xl text-pup-maroon" />
          </EmptyMedia>
          <EmptyTitle className="text-lg font-bold">No storage layout available</EmptyTitle>
          <EmptyDescription className="text-sm font-medium">
            The system storage configuration could not be retrieved.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in w-full overflow-hidden">
      <Dialog open={applyReportOpen} onOpenChange={setApplyReportOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Apply Report</DialogTitle>
            <DialogDescription>
              Per-drawer reassignment results from the latest template apply.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-auto rounded-brand border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                  <th className="p-3 font-bold">From</th>
                  <th className="p-3 font-bold">To</th>
                  <th className="p-3 font-bold">Moved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applyReportRows.length === 0 ? (
                  <tr>
                    <td className="p-3 text-gray-600" colSpan={3}>
                      No reassignment details were returned.
                    </td>
                  </tr>
                ) : (
                  applyReportRows.map((r, idx) => (
                    <tr key={`${idx}-${r?.from?.room}-${r?.from?.cabinet}-${r?.from?.drawer}`}>
                      <td className="p-3 text-gray-900">
                        Room {r?.from?.room} / Cabinet {r?.from?.cabinet} / Drawer {r?.from?.drawer}
                      </td>
                      <td className="p-3 text-gray-900">
                        Room {r?.to?.room} / Cabinet {r?.to?.cabinet} / Drawer {r?.to?.drawer}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                          {Number(r?.moved || 0)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setApplyReportOpen(false)}>
              CLOSE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateConflictOpen} onOpenChange={setTemplateConflictOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Conflict Resolution</DialogTitle>
            <DialogDescription>
              This template would remove drawers that still contain student records.
              Choose reassignment mode first, then map drawers.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-brand border border-gray-200 p-3 bg-gray-50/60">
            <div className="text-xs font-bold uppercase text-gray-600 mb-2">Reassignment Mode</div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={reassignmentMode === "manual" ? "default" : "outline"}
                onClick={() => setReassignmentMode("manual")}
              >
                MANUAL (DRAG & DROP)
              </Button>
              <Button
                type="button"
                variant={reassignmentMode === "auto" ? "default" : "outline"}
                onClick={() => {
                  setReassignmentMode("auto");
                  setTemplateMappingDraft(buildAutoMappings());
                }}
              >
                AUTO MAP
              </Button>
            </div>
          </div>
          <div className="max-h-[55vh] overflow-auto rounded-brand border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                  <th className="p-3 font-bold">Current Drawer</th>
                  <th className="p-3 font-bold">Records</th>
                  <th className="p-3 font-bold">Move To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templateConflictRows.map((row) => (
                  <tr key={row.sourceKey}>
                    <td className="p-3 font-medium text-gray-900">{row.sourceLabel}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                        {row.count}
                      </span>
                    </td>
                    <td className="p-3">
                      <div
                        draggable={reassignmentMode === "manual"}
                        onDragStart={() => setDragSourceKey(row.sourceKey)}
                        className={`mb-2 px-2 py-1 rounded border text-xs font-bold ${
                          reassignmentMode === "manual"
                            ? "bg-white border-gray-300 cursor-grab"
                            : "bg-gray-100 border-gray-200 text-gray-500"
                        }`}
                        title={
                          reassignmentMode === "manual"
                            ? "Drag this source to a target option below"
                            : "Switch to Manual mode to drag"
                        }
                      >
                        Drag source
                      </div>
                      <div className="grid grid-cols-1 gap-1 max-h-32 overflow-auto">
                        {templateTargetOptions.map((opt) => {
                          const selected =
                            String(templateMappingDraft[row.sourceKey] || "") ===
                            opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() =>
                                setTemplateMappingDraft((prev) => ({
                                  ...prev,
                                  [row.sourceKey]: opt.key,
                                }))
                              }
                              onDragOver={(e) => {
                                if (reassignmentMode !== "manual") return;
                                e.preventDefault();
                              }}
                              onDrop={(e) => {
                                if (reassignmentMode !== "manual") return;
                                e.preventDefault();
                                const src = String(dragSourceKey || "");
                                if (!src) return;
                                setTemplateMappingDraft((prev) => ({
                                  ...prev,
                                  [src]: opt.key,
                                }));
                              }}
                              className={`text-left text-xs px-2 py-1 rounded border ${
                                selected
                                  ? "bg-red-50 border-pup-maroon text-pup-maroon font-bold"
                                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTemplateConflictOpen(false)}
            >
              CANCEL
            </Button>
            <Button type="button" onClick={openApplyPreview}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={applyPreviewOpen} onOpenChange={setApplyPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Reassignment (Before → After)</DialogTitle>
            <DialogDescription>
              Review the exact drawer movements before applying template changes.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-auto rounded-brand border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                  <th className="p-3 font-bold">Before</th>
                  <th className="p-3 font-bold">After</th>
                  <th className="p-3 font-bold">Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applyPreviewRows.map((r) => (
                  <tr key={r.fromKey}>
                    <td className="p-3 text-gray-900">{r.fromLabel}</td>
                    <td className="p-3 text-gray-900">{r.toLabel}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                        {r.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setApplyPreviewOpen(false)}>
              BACK
            </Button>
            <Button type="button" onClick={applyTemplateWithMappings}>
              APPLY TEMPLATE + REASSIGN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Unified Toolbar */}
      <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex flex-col lg:flex-row gap-6 lg:items-end shrink-0">
        {/* Group 1: Room Selection & Global Room Actions */}
        <div className="flex flex-col gap-1.5 min-w-[320px]">
          <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">
            Room Management
          </label>
          <div className="flex items-center gap-2">
            <select
              className="flex-1 h-10 bg-white border border-gray-300 rounded-brand text-sm px-3 focus:outline-none focus:ring-2 focus:ring-pup-maroon font-bold text-gray-800 shadow-sm cursor-pointer"
              value={String(activeRoomId ?? "")}
              onChange={(e) => {
                const nextId = Number(e.target.value);
                setActiveRoomId(Number.isFinite(nextId) ? nextId : null);
              }}
            >
              {layout.rooms.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name || `Room ${r.id}`}
                </option>
              ))}
            </select>
            <ButtonGroup className="h-10 shadow-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addRoom}
                    className="h-10 w-10 text-pup-maroon hover:bg-red-50"
                  >
                    <i className="ph-bold ph-plus" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Add New Room</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={removeActiveRoom}
                    className="h-10 w-10 text-gray-600 hover:bg-gray-100 hover:text-red-600"
                    disabled={!activeRoom || activeRoomStudentCount > 0}
                  >
                    <i className="ph-bold ph-trash" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Delete Active Room</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={resetActiveRoomCabinets}
                    className="h-10 w-10 text-gray-600 hover:bg-gray-100 hover:text-amber-600"
                    disabled={
                      !activeRoom ||
                      !(activeRoom.cabinets?.length > 0) ||
                      activeRoomStudentCount > 0
                    }
                  >
                    <i className="ph-bold ph-arrow-counter-clockwise" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Clear Room Layout</TooltipContent>
              </Tooltip>
            </ButtonGroup>
          </div>
        </div>

        {/* Group 2: Cabinet and Template Tools */}
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">
            Editor Tools
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={addCabinet}
              className="h-10 px-4 font-bold border-gray-300 shadow-sm hover:border-pup-maroon hover:bg-red-50/30 rounded-brand"
              disabled={!activeRoom}
            >
              <i className="ph-bold ph-plus-square mr-2 text-pup-maroon" /> ADD
              CABINET
            </Button>

            <ButtonGroup className="h-10 shadow-sm">
              <select
                className="h-full bg-white px-3 text-sm font-bold text-gray-700 focus:outline-none border border-gray-300 cursor-pointer rounded-none"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={!activeRoom}
                data-slot="select"
              >
                {ROOM_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={applyTemplateToActiveRoom}
                className="h-full px-4 font-black text-xs uppercase tracking-wider bg-gray-50 hover:bg-pup-maroon hover:text-white transition-colors"
                disabled={!activeRoom}
              >
                APPLY
              </Button>
            </ButtonGroup>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={saveLayout}
          disabled={saving}
          className="bg-pup-maroon text-white h-10 px-8 font-black uppercase tracking-widest shadow-lg hover:bg-red-900 transition-all flex items-center gap-2 rounded-brand"
        >
          <i className="ph-bold ph-floppy-disk text-lg" />
          {saving ? "SAVING..." : "SAVE LAYOUT"}
        </Button>
      </div>

      <div className="flex-1 overflow-auto min-h-0 bg-white relative">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div
              ref={canvasRef}
              className="relative w-full border border-gray-200 rounded-brand bg-gray-50 overflow-hidden"
              style={{ aspectRatio: "16 / 10" }}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
            >
              {/* subtle grid */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
                  backgroundSize: "10% 10%",
                }}
              />

              {/* Orientation marker (Door Symbol) */}
              <div
                className="absolute z-2 cursor-move group"
                style={{
                  left: `${(activeRoom?.door?.x ?? getDefaultDoor().x) * 100}%`,
                  top: `${(activeRoom?.door?.y ?? getDefaultDoor().y) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dragRef.current = {
                    pointerId: e.pointerId,
                    mode: "door",
                  };
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // ignore
                  }
                }}
              >
                <div className="relative w-10 h-10 flex items-center justify-center">
                  {/* Floor plan door quadrant symbol */}
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-400 rounded-full group-hover:bg-gray-600 transition-colors" />
                  <div className="absolute bottom-0 left-0 w-[2px] h-full bg-pup-maroon rounded-full group-hover:w-[3px] transition-all" />
                  <div className="absolute inset-0 border-t-2 border-r-2 border-pup-maroon/20 rounded-tr-full group-hover:border-pup-maroon/40 transition-colors" />

                  {/* Subtle Label */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg z-10">
                    Entrance / Door
                  </div>
                </div>
              </div>

              {activeRoom?.cabinets?.map((cab) => {
                const isSelected = cab.id === selectedCabinetId;
                const rot = Number(cab.rotation) === 90 ? 90 : 0;
                const eff = getCabinetEffectiveSize(cab);
                return (
                  <div
                    key={cab.id}
                    className={`locator-tile absolute ${isSelected ? "cabinet-located" : ""}`}
                    style={{
                      left: `${cab.rect.x * 100}%`,
                      top: `${cab.rect.y * 100}%`,
                      width: `${eff.w * 100}%`,
                      height: `${eff.h * 100}%`,
                      userSelect: "none",
                    }}
                    onPointerDown={(e) => {
                      if (!canvasRef.current) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedCabinetId(cab.id);

                      const box = canvasRef.current.getBoundingClientRect();
                      const relX =
                        (e.clientX - box.left) / Math.max(1, box.width);
                      const relY =
                        (e.clientY - box.top) / Math.max(1, box.height);

                      // Keep the cabinet's top-left under the pointer.
                      const offsetX = relX - cab.rect.x;
                      const offsetY = relY - cab.rect.y;

                      dragRef.current = {
                        pointerId: e.pointerId,
                        mode: "move",
                        offsetX,
                        offsetY,
                        effW: eff.w,
                        effH: eff.h,
                      };

                      try {
                        e.currentTarget.setPointerCapture(e.pointerId);
                      } catch {
                        // ignore
                      }
                    }}
                    title={`Cabinet ${cab.id}`}
                  >
                    {eff.w >= 0.12 && eff.h >= 0.14 ? (
                      <>
                        <div className="absolute left-2 top-2 text-[10px] font-extrabold text-gray-600">
                          CAB-{cab.id}
                        </div>
                        <div className="absolute right-2 top-2 text-[10px] font-extrabold text-gray-500">
                          {rot === 90 ? "V" : "H"}
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 text-[10px] text-gray-500 font-bold">
                          {cab.drawerIds.length} drawers
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-700">
                        CAB-{cab.id}
                      </div>
                    )}
                    {isSelected ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-sm border border-pup-maroon bg-white text-pup-maroon shadow flex items-center justify-center leading-none cursor-se-resize"
                            onPointerDown={(e) => {
                              if (!canvasRef.current) return;
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedCabinetId(cab.id);
                              dragRef.current = {
                                pointerId: e.pointerId,
                                mode: "resize",
                              };
                              try {
                                e.currentTarget.setPointerCapture(e.pointerId);
                              } catch {
                                // ignore
                              }
                            }}
                          >
                            <i className="ph-bold ph-corners-out text-[11px]" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Resize Cabinet</TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="border border-gray-200 shadow-sm rounded-brand overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                    <i className="ph-duotone ph-archive text-2xl"></i>
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-gray-900 tracking-tight leading-none">
                      Cabinet Details
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-gray-500 mt-1.5">
                      {selectedCabinet
                        ? `CAB-${selectedCabinet.id}`
                        : "Select a cabinet on the map"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {!selectedCabinet ? (
                  <Empty className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                        <i className="ph-duotone ph-mouse-left-click text-3xl text-pup-maroon"></i>
                      </EmptyMedia>
                      <EmptyTitle className="text-lg font-bold text-gray-900">No cabinet selected</EmptyTitle>
                      <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-[200px]">
                        Select a cabinet on the map to edit its properties.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={rotateSelectedCabinet}
                        className="h-10 font-bold"
                      >
                        <i className="ph-bold ph-arrow-clockwise mr-2" />
                        ROTATE
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={removeSelectedCabinet}
                        className="h-10 font-bold"
                      >
                        <i className="ph-bold ph-trash mr-2" />
                        REMOVE
                      </Button>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                          Drawer count
                        </div>
                        <div className="text-sm font-black text-gray-900">
                          {selectedCabinet.drawerIds.length}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 font-bold"
                          onClick={addDrawerToSelected}
                        >
                          <i className="ph-bold ph-plus mr-2" />
                          ADD DRAWER
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 font-bold"
                          onClick={removeDrawerFromSelected}
                          disabled={
                            (selectedCabinet.drawerIds || []).length <= 1
                          }
                        >
                          <i className="ph-bold ph-minus mr-2" />
                          REMOVE DRAWER
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                          X
                        </label>
                        <Input
                          type="number"
                          step="0.001"
                          value={selectedCabinet.rect.x}
                          onChange={(e) => {
                            if (e.target.value === "") return;
                            const x = Number(e.target.value);
                            if (!Number.isFinite(x)) return;
                            updateSelectedRectFromNormalized({
                              ...selectedCabinet.rect,
                              x,
                            });
                          }}
                          className="h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                          Y
                        </label>
                        <Input
                          type="number"
                          step="0.001"
                          value={selectedCabinet.rect.y}
                          onChange={(e) => {
                            if (e.target.value === "") return;
                            const y = Number(e.target.value);
                            if (!Number.isFinite(y)) return;
                            updateSelectedRectFromNormalized({
                              ...selectedCabinet.rect,
                              y,
                            });
                          }}
                          className="h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                          W
                        </label>
                        <Input
                          type="number"
                          step="0.001"
                          value={selectedCabinet.rect.w}
                          onChange={(e) => {
                            if (e.target.value === "") return;
                            const w = Number(e.target.value);
                            if (!Number.isFinite(w)) return;
                            updateSelectedSizeNormalized(
                              w,
                              selectedCabinet.rect.h,
                            );
                          }}
                          className="h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                          H
                        </label>
                        <Input
                          type="number"
                          step="0.001"
                          value={selectedCabinet.rect.h}
                          onChange={(e) => {
                            if (e.target.value === "") return;
                            const h = Number(e.target.value);
                            if (!Number.isFinite(h)) return;
                            updateSelectedSizeNormalized(
                              selectedCabinet.rect.w,
                              h,
                            );
                          }}
                          className="h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                        />
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-medium leading-relaxed">
                      Tip: drag cabinets on the canvas. Drawer count controls
                      available drawer slots for this cabinet.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
