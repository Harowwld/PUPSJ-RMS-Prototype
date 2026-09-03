import { useState, useMemo, useEffect } from "react"
import RoomMap2D from "@/components/staff/RoomMap2D"
import PageHeader from "@/components/shared/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { FOLDER_COLORS } from "@/lib/constants"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function getStudentNoYear(studentNo) {
  const raw = String(studentNo || "").trim();
  const yearPart = raw.split("-")[0];
  const year = Number(yearPart);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
  return year;
}

export default function StorageExplorerTab({
  loading,
  locatorModel,
  selectedRoom,
  setSelectedRoom,
  setSelectedCabinet,
  setCurrentLocatorLevel,
  selectedCabinet,
  currentLocatorLevel,
  activeStudent,
  onUnfocusStudent,
  onPreviewDocument,
  onSwitchView,
}) {
  const [folderColors, setFolderColors] = useState({})

  useEffect(() => {
    const saved = localStorage.getItem("pup-folder-colors")
    if (saved) {
      try {
        setFolderColors(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to parse folder colors", e)
      }
    }
  }, [activeStudent])

  const activeStudentColor = useMemo(() => {
    if (!activeStudent) return "yellow"
    const derivedYear = getStudentNoYear(activeStudent.studentNo)
    const yearFromDb = Number(activeStudent.yearLevel)
    const year = derivedYear != null ? derivedYear : yearFromDb
    return folderColors[year] || "yellow"
  }, [activeStudent, folderColors])

  const activeTheme = FOLDER_COLORS[activeStudentColor] || FOLDER_COLORS["yellow"]

  const [roomsPage, setRoomsPage] = useState(1)
  const [roomsPerPage, setRoomsPerPage] = useState(10)
  const [expandedDrawer, setExpandedDrawer] = useState(null)

  useEffect(() => {
    if (activeStudent && selectedCabinet && String(activeStudent.cabinet) === String(selectedCabinet)) {
      setExpandedDrawer(activeStudent.drawer)
    } else {
      setExpandedDrawer(null)
    }
  }, [selectedCabinet, activeStudent])

  const totalRoomsPages = useMemo(() => {
    const rCount = (locatorModel?.rooms || []).length
    return Math.ceil(rCount / roomsPerPage) || 1
  }, [locatorModel?.rooms, roomsPerPage])

  const paginatedRooms = useMemo(() => {
    const rooms = locatorModel?.rooms || []
    const start = (roomsPage - 1) * roomsPerPage
    return rooms.slice(start, start + roomsPerPage)
  }, [locatorModel?.rooms, roomsPage, roomsPerPage])

  const breadcrumbs = useMemo(() => {
    const list = [{ level: "rooms", label: "Storage Rooms" }]
    if (selectedRoom != null) {
      list.push({ level: "cabinets", label: `Room ${selectedRoom}` })
    }
    if (selectedCabinet != null) {
      const cabLabel = String(selectedCabinet).startsWith("CAB") ? selectedCabinet : `Cab ${selectedCabinet}`
      list.push({ level: "drawers", label: cabLabel })
    }
    return list
  }, [selectedRoom, selectedCabinet])

  // Reset/auto-paginate rooms page when locator model or active student changes
  useEffect(() => {
    if (activeStudent && locatorModel?.rooms) {
      const targetRoomId = activeStudent.room;
      const targetIndex = locatorModel.rooms.findIndex(r => r.room === targetRoomId);
      if (targetIndex !== -1) {
        const page = Math.floor(targetIndex / roomsPerPage) + 1;
        setRoomsPage(page);
        return;
      }
    }
    setRoomsPage(1)
  }, [locatorModel, activeStudent, roomsPerPage])



  const mapWrap = "w-full aspect-[16/10] max-h-[600px] mx-auto max-w-4xl overflow-hidden"
  const rowClass = "flex flex-col w-full"
  const leftClass = "bg-white dark:bg-zinc-950 pt-8 flex flex-col w-full rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm"
  const innerLeftClass = "flex w-full flex-col min-h-0 flex-1 mx-auto"

  return (
    <div
      id="view-storage"
      className="animate-fade-up font-inter flex h-auto w-full flex-col gap-6"
    >
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-visible flex flex-col">
        <PageHeader
          icon="ph-folder-open"
          title="Storage Explorer"
          description="Browse and explore physical storage rooms, cabinets, and drawers."
          showBorder={false}
          titleClassName="text-[15px] font-bold text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[14px] font-normal text-[#8E8E93] dark:text-zinc-400 mt-[2px]"
          actions={
            <Button
              variant="ghost"
              onClick={() => onSwitchView("search")}
              className="h-10 px-3 font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center gap-2 rounded-brand shadow-none! border-0!"
            >
              <i className="ph-bold ph-arrow-left"></i>
              Records & Archive
            </Button>
          }
        />
      </Card>

      <div className={rowClass}>
        <div className={leftClass}>
          <div className={innerLeftClass}>
            {/* Storage Explorer Unified Header with Browser-style Back & Forward Buttons */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5EA] dark:border-white/10 pb-6 px-8">
              <div className="flex flex-col gap-2 h-8 justify-center">
                
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Location Path Text (Breadcrumbs) */}
                  <Breadcrumb className="flex items-center select-none">
                    <BreadcrumbList className="flex items-center font-medium text-[14px] text-[#8E8E93] gap-0 dark:text-zinc-400">
                      {breadcrumbs.map((b, idx) => (
                        <div
                          key={`${b.level}-${idx}`}
                          className="flex items-center gap-0"
                        >
                          {idx > 0 && (
                            <BreadcrumbSeparator className="flex items-center">
                              <span className="text-[#C7C7CC] text-[13px] mx-[7px] select-none font-normal">›</span>
                            </BreadcrumbSeparator>
                          )}
                          <BreadcrumbItem>
                            <BreadcrumbLink
                              className={cn(
                                "cursor-pointer transition-colors hover:no-underline text-[14px] font-inter",
                                currentLocatorLevel === b.level
                                  ? "text-pup-maroon font-semibold dark:text-red-400"
                                  : "text-[#8E8E93] font-medium hover:text-[#1C1C1E] dark:text-zinc-400 dark:hover:text-zinc-200"
                              )}
                              onClick={() => {
                                if (b.level === "rooms") {
                                  setCurrentLocatorLevel("rooms")
                                  setSelectedRoom(null)
                                  setSelectedCabinet(null)
                                  onUnfocusStudent?.()
                                } else if (b.level === "cabinets") {
                                  setCurrentLocatorLevel("cabinets")
                                  setSelectedCabinet(null)
                                  onUnfocusStudent?.()
                                } else if (b.level === "drawers") {
                                  setCurrentLocatorLevel("drawers")
                                }
                              }}
                            >
                              {b.label}
                            </BreadcrumbLink>
                          </BreadcrumbItem>
                        </div>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </div>

              {activeStudent && (
                <div className="flex items-center gap-[16px] sm:gap-[20px]">
                  <div className="flex flex-col text-left">
                    <span 
                      className="text-[14px] font-bold tracking-tight leading-none"
                      style={{ color: activeTheme.frontStart }}
                    >
                      {activeStudent.name}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onUnfocusStudent?.()
                    }}
                    className="h-8 px-2 font-semibold text-[13px] text-gray-500 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center gap-1.5 rounded-brand shadow-none! border-0!"
                  >
                    <i className="ph-bold ph-eye-slash text-[14px]" />
                    Unfocus
                  </Button>
                </div>
              )}
            </div>

            {/* Level Inner Content */}
            {locatorModel?.kind === "rooms" ? (
              <div className="flex flex-col w-full">
                <div className="px-8 pb-8 w-full">
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 w-full">
                    {(() => {
                      const hasActiveTarget = (locatorModel?.rooms || []).some((room) => room.isTarget)
                      return paginatedRooms.map((r) => {
                        const isTarget = r.isTarget
                        const theme = FOLDER_COLORS[activeStudentColor] || FOLDER_COLORS["yellow"]
                        const isClickable = !hasActiveTarget
                        const maxCapacity = Math.max((r.cabinetsCount || 4) * 20, 50);
                        const occupancyRate = Math.min(Math.round((r.occupiedCount / maxCapacity) * 100), 100);
                        let statusColor = "bg-[#8e8e93]/10 text-[#8e8e93] dark:bg-[#8e8e93]/20 dark:text-[#aeaeb2]";
                        let statusLabel = "Empty";
                        if (occupancyRate >= 90) {
                          statusColor = "bg-[#ff3b30]/10 text-[#ff3b30] dark:bg-[#ff453a]/25 dark:text-[#ff453a]";
                          statusLabel = "Near Capacity";
                        } else if (occupancyRate >= 50) {
                          statusColor = "bg-[#ff9500]/10 text-[#ff9500] dark:bg-[#ff9f0a]/25 dark:text-[#ff9f0a]";
                          statusLabel = "Moderate";
                        } else if (occupancyRate > 0) {
                          statusColor = "bg-[#34c759]/10 text-[#34c759] dark:bg-[#30d158]/25 dark:text-[#30d158]";
                          statusLabel = "Optimal";
                        }

                        return (
                          <div
                            key={r.room}
                            className={cn(
                              "group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-none p-5 select-none",
                              isClickable ? "cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5" : "pointer-events-none",
                              !isClickable && !isTarget && "opacity-40",
                              isTarget 
                                ? "border-transparent text-white ring-2 ring-white/10 scale-[1.01] shadow-md" 
                                : "border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-zinc-100"
                            )}
                            style={isTarget ? {
                              background: `linear-gradient(135deg, ${theme.frontStart} 0%, ${theme.frontEnd} 100%)`,
                            } : undefined}
                            onClick={() => {
                              if (isClickable) {
                                setSelectedRoom(r.room)
                                setSelectedCabinet(null)
                                setCurrentLocatorLevel("cabinets")
                              }
                            }}
                          >
                            {/* Target pulsing glow */}
                            {isTarget && (
                              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide text-white animate-pulse">
                                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                                Target Room
                              </div>
                            )}
                            {/* Non-target status badge */}
                            {!isTarget && (
                              <div className="absolute top-4 right-4">
                                <Badge className={cn("border-0 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-none", statusColor)}>
                                  {statusLabel}
                                </Badge>
                              </div>
                            )}

                            <div className="relative z-10 flex flex-col flex-1 w-full">
                              {/* Room Number */}
                              <div className="mb-3">
                                <h5 className={cn(
                                  "text-[18px] font-bold tracking-tight font-inter leading-none",
                                  isTarget ? "text-white" : "text-gray-900 dark:text-[#f2f2f7]"
                                )}>
                                  Room {r.room}
                                </h5>
                              </div>

                              {/* Stats breakdown */}
                              <div className="space-y-2 mt-1.5 flex-1">
                                <div className={cn(
                                  "flex items-center text-xs font-medium",
                                  isTarget ? "text-white/80" : "text-gray-550 dark:text-zinc-400"
                                )}>
                                  <i className="ph-bold ph-warehouse text-sm mr-2 opacity-80" />
                                  <span>{r.cabinetsCount} Cabinets installed</span>
                                </div>
                                <div className={cn(
                                  "flex items-center text-xs font-medium",
                                  isTarget ? "text-white/80" : "text-gray-550 dark:text-zinc-400"
                                )}>
                                  <i className="ph-bold ph-folder-open text-sm mr-2 opacity-80" />
                                  <span>{r.occupiedCount} Archived student folders</span>
                                </div>
                              </div>

                              {/* Occupancy Rate Progress Bar */}
                              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                  <span className={isTarget ? "text-white/70" : "text-[#8e8e93] dark:text-[#8e8e93]"}>Occupancy</span>
                                  <span className={isTarget ? "text-white font-sans" : "text-gray-700 dark:text-zinc-300 font-sans"}>{occupancyRate}%</span>
                                </div>
                                <div className={cn(
                                  "h-1.5 w-full rounded-full overflow-hidden",
                                  isTarget ? "bg-white/20" : "bg-[#f2f2f7] dark:bg-[#2c2c2e]"
                                )}>
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      isTarget 
                                        ? "bg-white" 
                                        : occupancyRate >= 90 ? "bg-[#ff3b30]" : occupancyRate >= 50 ? "bg-[#ff9500]" : "bg-[#34c759]"
                                    )}
                                    style={{ width: `${occupancyRate}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>

                {(locatorModel?.rooms || []).length > 10 && (
                  <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 dark:border-white/10 dark:bg-card mt-auto rounded-b-2xl">
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                        <span>
                          Showing {paginatedRooms.length} of {(locatorModel.rooms || []).length} rooms
                        </span>
                        <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
                          <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                          <div className="flex items-center gap-1">
                            {[10, 20, 30].map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => {
                                  setRoomsPerPage(size);
                                  setRoomsPage(1);
                                }}
                                className={`px-2 py-0.5 rounded-[4px] text-[12px] font-normal cursor-pointer transition-colors border-0 ${
                                  roomsPerPage === size
                                    ? "bg-gray-100 text-[#111111] font-medium dark:bg-white/10 dark:text-zinc-50"
                                    : "bg-transparent text-gray-455 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        disabled={roomsPage <= 1}
                        onClick={() => setRoomsPage((p) => Math.max(1, p - 1))}
                        className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                      >
                        Prev
                      </button>

                      <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                        {roomsPage}
                      </div>

                      <button
                        disabled={roomsPage >= totalRoomsPages}
                        onClick={() => setRoomsPage((p) => Math.min(totalRoomsPages, p + 1))}
                        className="h-8 bg-transparent text-[12px] font-normal text-[#8E8E93] hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : locatorModel?.kind === "cabinets" ? (
              <div className="px-8 pb-8 w-full">
                <div className={mapWrap}>
                  <RoomMap2D
                    kind="cabinets"
                    activeStudent={activeStudent}
                    activeStudentColor={activeStudentColor}
                    cabinets={locatorModel.cabinets}
                    roomDoor={locatorModel.roomDoor}
                    selectedCabinetId={selectedCabinet}
                    onCabinetClick={(cabId) => {
                      setSelectedCabinet(cabId)
                      if (cabId) {
                        setCurrentLocatorLevel("drawers")
                      } else {
                        setCurrentLocatorLevel("cabinets")
                      }
                    }}
                    onDrawerClick={(drawerId) => {
                      // Optional: Highlight drawer students in the future
                    }}
                    onPreviewDocument={onPreviewDocument}
                    onUnfocusStudent={onUnfocusStudent}
                  />
                </div>
              </div>
            ) : (
              <div className="px-8 pb-8 w-full">
                <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-center w-full max-w-7xl mx-auto">
                  <div className={cn(mapWrap, "mx-0 flex-1")}>
                    <RoomMap2D
                      kind="drawers"
                      activeStudent={activeStudent}
                      activeStudentColor={activeStudentColor}
                      cabinets={locatorModel?.cabinets || []}
                      roomDoor={locatorModel?.roomDoor}
                      selectedCabinetId={selectedCabinet}
                      drawerSlots={locatorModel?.drawers}
                      onCabinetClick={(cabId) => {
                        setSelectedCabinet(cabId)
                        if (cabId) {
                          setCurrentLocatorLevel("drawers")
                        } else {
                          setCurrentLocatorLevel("cabinets")
                        }
                      }}
                      onPreviewDocument={onPreviewDocument}
                      onUnfocusStudent={onUnfocusStudent}
                    />
                  </div>

                  {selectedCabinet && (
                    <div className="w-full lg:w-[320px] shrink-0 rounded-xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900 flex flex-col min-h-0 overflow-y-auto shadow-md select-none">
                      {/* Header */}
                      <div className="mb-4 flex items-center justify-between select-none">
                        <h5 
                          className={cn(
                            "font-bold text-[18px] tracking-tight font-sans pointer-events-none",
                            !activeStudent && "text-[#1C1C1E] dark:text-zinc-50"
                          )}
                          style={activeStudent ? { color: activeTheme.frontStart } : undefined}
                        >
                          Cabinet {selectedCabinet}
                        </h5>
                        {/* Close X Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (activeStudent) {
                              onUnfocusStudent?.()
                            }
                            setSelectedCabinet(null)
                            setCurrentLocatorLevel("cabinets")
                          }}
                          className="rounded-full p-[6px] text-[#8E8E93] hover:bg-[#F5F5F7] hover:text-gray-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-all pointer-events-auto flex items-center justify-center cursor-pointer"
                          title={activeStudent ? "Unfocus student" : "Back to Cabinets"}
                        >
                          <i className="ph-bold ph-x text-[16px]"></i>
                        </button>
                      </div>

                      {/* Drawer Slots */}
                      <div className="flex flex-col gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#8E8E93] dark:text-zinc-500 font-sans">
                          Drawer slots
                        </span>
                        <div className="flex flex-col gap-[10px] max-h-[380px] overflow-y-auto pr-1">
                          {locatorModel?.drawers?.map((d) => {
                            const isDrawerTarget = d.isTarget
                            const hasOccupants = d.count > 0
                            const hasActiveDrawerTarget = locatorModel?.drawers?.some((slot) => slot.isTarget)
                            const isClickable = !hasActiveDrawerTarget || isDrawerTarget
                            const theme = FOLDER_COLORS[activeStudentColor] || FOLDER_COLORS["yellow"]

                            // Determine row labels
                            let labelText = "Empty"
                            if (isDrawerTarget) {
                              labelText = "Target"
                            } else if (hasOccupants) {
                              labelText = d.count === 1 ? "1 record" : `${d.count} records`
                            }

                            return (
                              <div
                                key={d.drawer}
                                className={cn(
                                  "flex flex-col gap-[10px] transition-all duration-normal",
                                  !isClickable && "opacity-30 pointer-events-none select-none"
                                )}
                              >
                                {/* Drawer Row Card */}
                                <div
                                  className={cn(
                                    "flex items-center justify-between rounded-[12px] border p-3 cursor-pointer transition-all active:scale-[0.98] font-sans h-11",
                                    isDrawerTarget
                                      ? "text-white"
                                      : hasOccupants
                                        ? "border-2 border-[#0A84FF] bg-[#0A84FF]/8 text-[#0A84FF] dark:bg-[#0A84FF]/12"
                                        : "border-[#E5E5EA] bg-[#F5F5F7] hover:bg-[#EAEAEF] text-[#1C1C1E] dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                  )}
                                  style={isDrawerTarget ? {
                                    backgroundColor: theme.frontStart,
                                    borderColor: theme.frontEnd,
                                  } : undefined}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedDrawer(expandedDrawer === d.drawer ? null : d.drawer)
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <i className={cn(
                                      "ph-bold text-[16px]",
                                      isDrawerTarget
                                        ? "ph-map-pin"
                                        : hasOccupants
                                          ? "ph-folder-open text-[#0A84FF]"
                                          : "ph-folder text-[#8E8E93]"
                                    )}></i>
                                    <span className="text-[14px] font-bold">
                                      Drawer {d.drawer}
                                    </span>
                                  </div>
                                  <span className={cn(
                                    "text-[12px] font-semibold",
                                    isDrawerTarget ? "text-white/95" : hasOccupants && !isDrawerTarget ? "text-[#0A84FF]" : "text-[#8E8E93]"
                                  )}>
                                    {labelText}
                                  </span>
                                </div>

                                {/* Expanded Detail Panel */}
                                {expandedDrawer === d.drawer && hasOccupants && d.students && (
                                  <div className="ml-2 pl-3 border-l border-[#E5E5EA] dark:border-white/10 py-1.5 space-y-3 max-h-52 overflow-y-auto">
                                    {d.students.map((student) => {
                                      const isTargetPerson = activeStudent && student.studentNo === activeStudent.studentNo;
                                      return (
                                        <div
                                          key={student.studentNo}
                                          className="group/item flex flex-col gap-3 rounded-[12px] p-4 bg-[#FAFAFA] border border-[#E5E5EA] dark:bg-zinc-800/60 dark:border-white/10 transition-colors font-sans"
                                        >
                                          <div className="min-w-0 flex-1 flex items-start justify-between gap-1">
                                            <div className="min-w-0 flex-1">
                                              <p className="font-bold text-[15px] text-[#1C1C1E] dark:text-zinc-50 truncate">
                                                {student.name.toUpperCase()}
                                              </p>
                                              {/* Soft Tag for Student Number */}
                                              <div className="inline-block mt-1.5 bg-[#F5F5F7] border border-[#E5E5EA] rounded-[6px] px-2 py-0.5 text-[13px] font-normal text-[#8E8E93] dark:bg-zinc-850 dark:border-white/5 dark:text-zinc-400">
                                                {student.studentNo}
                                              </div>
                                            </div>
                                            {isTargetPerson && (
                                              <i 
                                                className="ph-fill ph-target text-sm shrink-0 animate-pulse mt-0.5" 
                                                style={{ color: theme.frontStart }}
                                              />
                                            )}
                                          </div>

                                          {/* Documents */}
                                          {student.documents && student.documents.length > 0 ? (
                                            <div className="mt-1 space-y-2">
                                              <div className="flex flex-col gap-2">
                                                {student.documents.map((doc) => {
                                                  const isApproved = doc.approvalStatus === "Approved";
                                                  const statusClass = isApproved
                                                    ? "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400 rounded-[6px]"
                                                    : "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-400 rounded-[6px]";

                                                  return (
                                                    <div
                                                      key={doc.id}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        onPreviewDocument?.(doc.docType, student.name, student.studentNo, doc.id);
                                                      }}
                                                      className="flex items-center justify-between gap-2 p-2 bg-white hover:bg-gray-50 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 border border-[#E5E5EA] dark:border-white/10 rounded-[8px] cursor-pointer transition-colors group/doc"
                                                    >
                                                      <div className="flex items-center gap-1.5 min-w-0">
                                                        <i className="ph-bold ph-file-pdf text-[16px] text-[#FF3B30] group-hover/doc:scale-105 transition-transform"></i>
                                                        <span className="truncate font-bold text-[14px] text-[#1C1C1E] dark:text-zinc-300" title={doc.filename}>
                                                          {doc.docType}
                                                        </span>
                                                      </div>
                                                      {/* Soft Status Pill */}
                                                      <span className={cn(
                                                        "text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap tracking-wide shrink-0",
                                                        statusClass
                                                      )}>
                                                        {doc.approvalStatus}
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ) : (
                                            <p className="text-[12px] font-medium text-gray-400 dark:text-zinc-500 italic mt-0.5 pl-1">
                                              No documents uploaded
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
