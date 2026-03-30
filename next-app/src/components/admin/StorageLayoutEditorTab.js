"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function parseDrawerIds(text) {
  const raw = String(text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ids = raw
    .map((v) => (v.includes("-") ? null : Number(v)))
    .filter((v) => Number.isFinite(v) && Number.isInteger(v) && v >= 1);
  const unique = Array.from(new Set(ids));
  unique.sort((a, b) => a - b);
  return unique;
}

export default function StorageLayoutEditorTab({ showToast }) {
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeRoomId, setActiveRoomId] = useState(null);
  const [selectedCabinetId, setSelectedCabinetId] = useState(null);

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

  const drawerIdsText = useMemo(() => {
    if (!selectedCabinet) return "";
    return (selectedCabinet.drawerIds || []).join(",");
  }, [selectedCabinet]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/storage-layout", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load layout");
        setLayout(json.data);
        const firstRoom = Array.isArray(json.data?.rooms) ? json.data.rooms[0]?.id : null;
        setActiveRoomId(firstRoom);
      } catch (err) {
        showToast?.(err?.message || "Failed to load storage layout", true);
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  useEffect(() => {
    if (!activeRoom || !selectedCabinetId) {
      const firstCabinet = activeRoom?.cabinets?.[0]?.id || null;
      setSelectedCabinetId(firstCabinet);
    } else if (activeRoom && selectedCabinetId) {
      const exists = activeRoom.cabinets.some((c) => c.id === selectedCabinetId);
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
    setLayout((prev) => {
      if (!prev) return prev;
      const nextId = getNextRoomId(prev.rooms);
      const next = {
        id: nextId,
        name: `Room ${nextId}`,
        cabinets: [],
      };
      return { ...prev, rooms: [...prev.rooms, next].sort((a, b) => a.id - b.id) };
    });
    setTimeout(() => {
      setActiveRoomId((prevId) => prevId);
    }, 0);
  }

  function removeActiveRoom() {
    if (!layout || !activeRoom) return;
    if (activeRoom.cabinets?.length) {
      showToast?.("Remove cabinets first before deleting a room.", true);
      return;
    }
    setLayout((prev) => {
      if (!prev) return prev;
      const rooms = prev.rooms.filter((r) => r.id !== activeRoom.id);
      return { ...prev, rooms };
    });
    const fallback = layout.rooms.find((r) => r.id !== activeRoom.id)?.id || null;
    setActiveRoomId(fallback);
    setSelectedCabinetId(null);
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
      cabinets: [...r.cabinets, cab].sort((a, b) => String(a.id).localeCompare(String(b.id))),
    }));
    setSelectedCabinetId(id);
  }

  function removeSelectedCabinet() {
    if (!activeRoom || !selectedCabinet) return;
    updateRoom(activeRoom.id, (r) => ({
      ...r,
      cabinets: r.cabinets.filter((c) => c.id !== selectedCabinet.id),
    }));
    const fallback = activeRoom.cabinets.find((c) => c.id !== selectedCabinet.id)?.id || null;
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
      showToast?.("Storage layout saved.");
    } catch (err) {
      showToast?.(err?.message || "Failed to save storage layout", true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500 font-semibold">
        Loading storage layout...
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-500 font-semibold">
        No storage layout available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in w-full overflow-hidden">
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col lg:flex-row gap-4 justify-between lg:items-center">
        <div>
          <CardTitle className="font-bold text-gray-900 text-base">Storage Layout Editor</CardTitle>
          <CardDescription className="text-xs font-medium text-gray-500 mt-0.5">
            Drag steel cabinets into their real-room positions and configure drawer IDs per cabinet.
          </CardDescription>
        </div>
        <div className="flex gap-3 items-center">
          <Button
            type="button"
            variant="outline"
            onClick={addRoom}
            className="h-10 px-4 font-bold"
          >
            <i className="ph-bold ph-plus" /> Add Room
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={removeActiveRoom}
            className="h-10 px-4 font-bold"
            disabled={!activeRoom}
          >
            <i className="ph-bold ph-trash" /> Remove Room
          </Button>
          <Button
            onClick={saveLayout}
            disabled={saving}
            className="bg-pup-maroon text-white h-10 px-5 font-bold shadow-sm flex items-center gap-2 hover:bg-red-900 transition-colors"
          >
            <i className="ph-bold ph-floppy-disk" /> {saving ? "Saving..." : "Save Layout"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0 bg-white relative">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex gap-3 items-center mb-4">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Room</label>
              <select
                className="w-full h-12 bg-white border border-gray-300 rounded-brand text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon transition-colors font-medium text-gray-700"
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
              <Button
                type="button"
                variant="outline"
                onClick={addCabinet}
                className="h-10 px-4 font-bold"
                disabled={!activeRoom}
              >
                <i className="ph-bold ph-plus" /> Add Cabinet
              </Button>
            </div>

            <div
              ref={canvasRef}
              className="relative w-full border border-gray-200 rounded-brand bg-gray-50 overflow-hidden"
              style={{ aspectRatio: "16 / 10" }}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
            >
              {/* subtle grid */}
              <div className="absolute inset-0 pointer-events-none opacity-40" style={{
                backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
                backgroundSize: "10% 10%",
              }} />

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
                      const relX = (e.clientX - box.left) / Math.max(1, box.width);
                      const relY = (e.clientY - box.top) / Math.max(1, box.height);

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
                    <div className="absolute left-2 top-2 text-[10px] font-extrabold text-gray-600">
                      CAB-{cab.id}
                    </div>
                    <div className="absolute right-2 top-2 text-[10px] font-extrabold text-gray-500">
                      {rot === 90 ? "V" : "H"}
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 text-[10px] text-gray-500 font-bold">
                      {cab.drawerIds.length} drawers
                    </div>
                    {isSelected ? (
                      <button
                        type="button"
                        className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-sm border border-pup-maroon bg-white text-pup-maroon shadow"
                        title="Resize cabinet"
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
                        <i className="ph-bold ph-corners-out text-[10px]" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="border border-gray-200 shadow-sm rounded-brand overflow-hidden">
              <CardHeader className="p-4 border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-gray-900 text-sm font-extrabold">
                  Cabinet Details
                </CardTitle>
                <CardDescription className="text-gray-500 text-xs font-medium mt-0.5">
                  {selectedCabinet ? `CAB-${selectedCabinet.id}` : "Select a cabinet on the map"}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4">
                {!selectedCabinet ? (
                  <div className="text-gray-500 text-sm font-semibold">
                    No cabinet selected
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={rotateSelectedCabinet}
                        className="h-10 px-4 font-bold"
                      >
                        <i className="ph-bold ph-arrow-clockwise" /> Rotate
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={removeSelectedCabinet}
                        className="h-10 px-4 font-bold"
                      >
                        <i className="ph-bold ph-trash" /> Remove
                      </Button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                        Drawer IDs (comma-separated)
                      </label>
                      <Input
                        value={drawerIdsText}
                        onChange={(e) => {
                          const parsed = parseDrawerIds(e.target.value);
                          if (!parsed.length) return;
                          updateCabinet(activeRoom.id, selectedCabinet.id, (c) => ({
                            ...c,
                            drawerIds: parsed,
                          }));
                        }}
                        placeholder="e.g. 1,2,3,4"
                        className="h-12 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                      />
                      <div className="text-xs text-gray-500 font-medium mt-2">
                        Drawer count: <b>{selectedCabinet.drawerIds.length}</b>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button type="button" variant="outline" className="h-9 px-3 font-bold" onClick={addDrawerToSelected}>
                          <i className="ph-bold ph-plus" /> Drawer
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 px-3 font-bold"
                          onClick={removeDrawerFromSelected}
                          disabled={(selectedCabinet.drawerIds || []).length <= 1}
                        >
                          <i className="ph-bold ph-minus" /> Drawer
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                          X
                        </label>
                        <Input
                          value={Number(selectedCabinet.rect.x).toFixed(3)}
                          onChange={(e) => {
                            const x = Number(e.target.value);
                            if (!Number.isFinite(x)) return;
                            updateSelectedRectFromNormalized({ ...selectedCabinet.rect, x });
                          }}
                          className="h-12 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                          Y
                        </label>
                        <Input
                          value={Number(selectedCabinet.rect.y).toFixed(3)}
                          onChange={(e) => {
                            const y = Number(e.target.value);
                            if (!Number.isFinite(y)) return;
                            updateSelectedRectFromNormalized({ ...selectedCabinet.rect, y });
                          }}
                          className="h-12 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                        />
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 font-medium leading-relaxed">
                      Tip: drag cabinets on the canvas. Drawer IDs affect dropdown options and the SLV drawer view.
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

