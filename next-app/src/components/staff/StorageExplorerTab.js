import useUrlPage from "@/hooks/useUrlPage"
import useOsasViewPreference from "@/hooks/useOsasViewPreference";

import { Fragment, useState, useMemo, useEffect, useRef } from "react"
import RoomMap2D from "@/components/staff/RoomMap2D"
import PageHeader from "@/components/shared/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardGroup, CardHeader, CardTitle } from "@/components/ui/card"
import { IdentifierBadge, TableStatus } from "@/components/ui/table"
import { ContentReveal } from "@/components/ui/motion"
import { cn } from "@/lib/utils"
import { FOLDER_COLORS } from "@/lib/constants"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import StorageExplorerSkeleton from "@/components/staff/skeletons/StorageExplorerSkeleton"
import TablePagination from "@/components/shared/TablePagination";
import { ArrowDown01Icon, ArrowRight01Icon, Cancel01Icon, File02Icon, FolderOpenIcon, ViewOffIcon, WarehouseIcon } from "hugeicons-react";
function getStudentNoYear(studentNo) {
  const raw = String(studentNo || "").trim();
  const yearPart = raw.split("-")[0];
  const year = Number(yearPart);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
  return year;
}

function getCabinetLabel(cabinet) {
  const label = String(cabinet)
  return label.toUpperCase().startsWith("CAB") || label.toUpperCase().includes("ORGANIZATION")
    ? label
    : `Cabinet ${label}`
}

function getDrawerLabel(drawer) {
  const label = String(drawer)
  return label.toLowerCase().startsWith("drawer") ? label : `Drawer ${label}`
}

export default function StorageExplorerTab({
  loading,
  locatorModel,
  selectedRoom,
  setSelectedRoom,
  setSelectedCabinet,
  setCurrentLocatorLevel,
  selectedCabinet,
  activeStudent,
  onUnfocusStudent,
  onLocateStudent,
  onPreviewDocument,
  onSwitchView,
  officeLabel = "Registrar",
}) {
  const isOsas = officeLabel === "OSAS";
  const [folderColors, setFolderColors] = useState({})

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem("pup-folder-colors")
      if (saved) {
        try {
          setFolderColors(JSON.parse(saved))
        } catch (e) {
          console.error("Failed to parse folder colors", e)
        }
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [activeStudent])

  const activeStudentColor = useMemo(() => {
    if (!activeStudent) return "yellow"
    if (isOsas) {
      return activeStudent.category === "Academic" ? "blue" : "emerald"
    }
    const derivedYear = getStudentNoYear(activeStudent.studentNo)
    const yearFromDb = Number(activeStudent.yearLevel)
    const year = derivedYear != null ? derivedYear : yearFromDb
    return folderColors[year] || "yellow"
  }, [activeStudent, folderColors, isOsas])

  const activeTheme = FOLDER_COLORS[activeStudentColor] || FOLDER_COLORS["yellow"]

  const [roomsPage, setRoomsPage] = useUrlPage()
  const [roomsPerPage, setRoomsPerPage] = useOsasViewPreference("storage_explorer", "roomsPerPage", 10)
  const [expandedDrawer, setExpandedDrawer] = useState(null)

  const locatedDrawer = locatorModel?.drawers?.find((drawer) => drawer.isTarget)?.drawer ?? null
  const locatedDrawerRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => setExpandedDrawer(null), 0)
    return () => clearTimeout(timer)
  }, [selectedRoom, selectedCabinet])

  useEffect(() => {
    if (locatedDrawer == null) return
    const timer = setTimeout(() => setExpandedDrawer(locatedDrawer), 0)
    return () => clearTimeout(timer)
  }, [activeStudent, locatedDrawer, selectedRoom, selectedCabinet])

  useEffect(() => {
    if (locatedDrawer == null || String(expandedDrawer) !== String(locatedDrawer)) return
    const frame = requestAnimationFrame(() => {
      locatedDrawerRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "instant" })
    })
    return () => cancelAnimationFrame(frame)
  }, [activeStudent, expandedDrawer, locatedDrawer])

  const paginatedRooms = useMemo(() => {
    const rooms = locatorModel?.rooms || []
    const start = (roomsPage - 1) * roomsPerPage
    return rooms.slice(start, start + roomsPerPage)
  }, [locatorModel?.rooms, roomsPage, roomsPerPage])

  const breadcrumbs = useMemo(() => {
    const list = [{ level: "rooms", label: "Storage Rooms" }]
    if (selectedRoom != null) {
      const roomDef = locatorModel?.rooms?.find((r) => String(r.room) === String(selectedRoom))
      const roomLabel = locatorModel?.roomName || roomDef?.name || `Room ${selectedRoom}`
      list.push({ level: "cabinets", label: roomLabel })
    }
    if (selectedCabinet != null) {
      list.push({ level: "drawers", label: getCabinetLabel(selectedCabinet) })
      if (locatedDrawer != null) list.push({ level: "located-drawer", label: getDrawerLabel(locatedDrawer) })
    }
    return list
  }, [selectedRoom, selectedCabinet, locatorModel, locatedDrawer])

  // Reset/auto-paginate rooms page when locator model or active student changes
  useEffect(() => {
    const timer = setTimeout(() => {
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
    }, 0)
    return () => clearTimeout(timer)
  }, [locatorModel, activeStudent, roomsPerPage, setRoomsPage])



  const isInsideRoom = (locatorModel?.kind === "cabinets" || locatorModel?.kind === "drawers")
  const hasTargetRoom = locatorModel?.rooms?.some((room) => room.isTarget)
  const isDrawerLevel = locatorModel?.kind === "drawers"
  const cabinets = locatorModel?.cabinets || []
  const hasTargetCabinet = cabinets.some((cabinet) => cabinet.isTarget)
  const hasTargetDrawer = locatedDrawer != null
  const openCabinet = (cabinetId) => {
    setSelectedCabinet(cabinetId)
    setCurrentLocatorLevel(cabinetId ? "drawers" : "cabinets")
  }

  return (
    <div
      id="view-storage"
      className={cn(
        "animate-fade-up font-jakarta flex w-full flex-col gap-6",
        isInsideRoom ? "flex-1 h-full min-h-0 overflow-hidden" : "flex-[1_0_auto] h-auto"
      )}
    >
      {/* ONE Single Card Container encapsulating Header, Breadcrumbs & 2D Storage Explorer */}
      <Card
        className={cn(
          "flex w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta",
          isInsideRoom ? "flex-1 h-full min-h-0" : "flex-[1_0_auto] h-auto"
        )}
      >
        <PageHeader
          icon="FolderOpenIcon"
          title={
            <span className="flex items-center gap-2">
              <span>Storage Explorer</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                {locatorModel?.rooms?.length ? `${locatorModel.rooms.length} ${locatorModel.rooms.length === 1 ? "room" : "rooms"}` : "Archive Map"}
              </span>
            </span>
          }
          description={
            isOsas
              ? "Browse and explore physical storage archives, cabinets, and drawer organization folders."
              : "Browse and explore physical storage rooms, cabinets, and drawers."
          }
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSwitchView("search")}
              title="Return to Records & Archive"
              className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Return to Records
            </Button>
          }
        />

        {/* Navigation Toolbar / Location Breadcrumbs */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card">
          <Breadcrumb aria-label="Storage location" className="min-w-0">
            <BreadcrumbList className="min-h-8">
              {breadcrumbs.map(({ level, label }, index) => (
                <Fragment key={level}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {index === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage>{label}</BreadcrumbPage>
                    ) : level === "drawers" ? (
                      <span>{label}</span>
                    ) : (
                      <BreadcrumbLink
                        render={<button type="button" />}
                        onClick={() => {
                          if (level === "rooms") {
                            setCurrentLocatorLevel("rooms")
                            setSelectedRoom(null)
                            setSelectedCabinet(null)
                            onUnfocusStudent?.()
                          } else {
                            openCabinet(null)
                            onUnfocusStudent?.()
                          }
                        }}
                      >
                        {label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

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
                      setExpandedDrawer(null)
                      onUnfocusStudent?.()
                    }}
                    className="h-8 px-2 font-semibold text-[13px] text-gray-500 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center gap-1.5 rounded-brand shadow-none! border-0!"
                  >
                    <ViewOffIcon size="1em"  className="text-[14px]" />
                    Unfocus
                  </Button>
                </div>
              )}
            </div>

            {/* Level Inner Content */}
            <div
              className={cn(
                "flex w-full flex-col mx-auto bg-white dark:bg-card rounded-b-2xl",
                isInsideRoom ? "flex-1 min-h-0 pt-4 overflow-y-auto lg:overflow-hidden" : "flex-[1_0_auto] pt-6"
              )}
            >
              {loading && !locatorModel ? (
              <StorageExplorerSkeleton embedded={true} />
            ) : locatorModel?.kind === "rooms" ? (
              <div className="flex flex-[1_0_auto] flex-col w-full">
                <div className="px-8 pb-8 w-full flex-[1_0_auto]">
                  <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4">
                    {paginatedRooms.map((room) => {
                      const name = room.name || `Room ${room.room}`
                      const folderType = isOsas ? "organization" : "student"

                      return (
                        <Card
                          key={room.room}
                          className={cn(
                            "relative gap-3 transition-shadow",
                            !hasTargetRoom && "hover:shadow-md",
                            hasTargetRoom && !room.isTarget && "opacity-50"
                          )}
                          style={room.isTarget ? { borderColor: activeTheme.frontEnd } : undefined}
                        >
                          <CardHeader className="flex min-h-6 items-center justify-between gap-2">
                            <CardTitle className="min-w-0 truncate" title={name}>{name}</CardTitle>
                            {room.isTarget ? (
                              <Badge
                                variant="secondary"
                                className="shrink-0"
                                style={{ backgroundColor: `color-mix(in srgb, ${activeTheme.frontStart} 22%, transparent)` }}
                              >
                                Located
                              </Badge>
                            ) : !hasTargetRoom && (
                              <ArrowRight01Icon size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="h-28 overflow-hidden rounded-xl" aria-hidden="true">
                              <RoomMap2D
                                kind="cabinets"
                                cabinets={room.cabinets}
                                roomDoor={room.door}
                                isPreview
                              />
                            </div>
                          </CardContent>
                          <CardFooter className="flex-wrap gap-x-4 gap-y-2 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              <WarehouseIcon size={14} aria-hidden="true" />
                              <span><strong className="font-semibold tabular-nums text-foreground">{room.cabinetsCount}</strong> {room.cabinetsCount === 1 ? "cabinet" : "cabinets"}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <FolderOpenIcon size={14} aria-hidden="true" />
                              <span><strong className="font-semibold tabular-nums text-foreground">{room.occupiedCount}</strong> {folderType} {room.occupiedCount === 1 ? "folder" : "folders"}</span>
                            </span>
                          </CardFooter>
                          {!hasTargetRoom && (
                            <button
                              type="button"
                              aria-label={`Open ${name}`}
                              className="absolute inset-0 z-20 cursor-pointer rounded-2xl outline-none transition-colors active:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
                              onClick={() => {
                                setSelectedRoom(room.room)
                                setSelectedCabinet(null)
                                setCurrentLocatorLevel("cabinets")
                              }}
                            />
                          )}
                        </Card>
                      )
                    })}
                  </div>
                </div>

                {(locatorModel?.rooms || []).length > 0 && <TablePagination label="Storage room pages" page={roomsPage} pageSize={roomsPerPage} totalCount={locatorModel.rooms.length} displayedCount={paginatedRooms.length} onPageChange={setRoomsPage} onPageSizeChange={setRoomsPerPage} />}
              </div>
            ) : isInsideRoom ? (
              <div className="flex w-full flex-col gap-4 px-6 pb-6 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-6">
                <section aria-label="Room Plan" className="flex h-72 min-w-0 flex-col gap-2 lg:h-full lg:flex-1">
                  <h2 className="text-sm font-semibold text-foreground">Room Plan</h2>
                  <div className="min-h-0 flex-1">
                    <RoomMap2D
                      kind={locatorModel.kind}
                      activeStudent={activeStudent}
                      activeStudentColor={activeStudentColor}
                      cabinets={cabinets}
                      roomDoor={locatorModel.roomDoor}
                      selectedCabinetId={selectedCabinet}
                      drawerSlots={locatorModel.drawers}
                      onCabinetClick={openCabinet}
                    />
                  </div>
                </section>
                <ContentReveal
                  key={isDrawerLevel ? selectedCabinet : "cabinets"}
                  className="flex min-h-0 w-full shrink-0 lg:w-[clamp(340px,42%,400px)]"
                >
                  <Card variant="flat" className="w-full lg:min-h-0">
                    <CardHeader className="flex shrink-0 items-center justify-between gap-2">
                      <CardTitle>
                        {isDrawerLevel
                          ? getCabinetLabel(selectedCabinet)
                          : "Cabinets"}
                      </CardTitle>
                      {isDrawerLevel && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-full"
                          aria-label="Back to cabinets"
                          title="Back to cabinets"
                          onClick={() => {
                            if (activeStudent) onUnfocusStudent?.()
                            openCabinet(null)
                          }}
                        >
                          <Cancel01Icon size={16} aria-hidden="true" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="lg:min-h-0 lg:overflow-y-auto">
                      {!isDrawerLevel ? (
                        cabinets.length > 0 ? (
                          <CardGroup>
                            {cabinets.map((cabinet) => (
                              <Button
                                key={cabinet.cab}
                                type="button"
                                variant="ghost"
                                disabled={hasTargetCabinet && !cabinet.isTarget}
                                className="h-auto min-h-12 w-full justify-start gap-3 rounded-none px-3.5 py-2.5 text-left whitespace-normal focus-visible:ring-inset"
                                onClick={() => openCabinet(cabinet.cab)}
                              >
                                <WarehouseIcon size={16} className="text-muted-foreground" aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[13px] font-semibold">{cabinet.cab}</span>
                                  <span className="block text-xs font-normal text-muted-foreground">
                                    {cabinet.drawerIds?.length ?? 0} {cabinet.drawerIds?.length === 1 ? "drawer" : "drawers"}
                                  </span>
                                </span>
                                {cabinet.isTarget && <Badge variant="secondary">Located</Badge>}
                                <ArrowRight01Icon size={16} className="text-muted-foreground" aria-hidden="true" />
                              </Button>
                            ))}
                          </CardGroup>
                        ) : <p className="text-xs text-muted-foreground">No cabinets in this room.</p>
                      ) : locatorModel.drawers?.length ? (
                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold text-muted-foreground">Cabinet Front</h3>
                          <CardGroup className="border-2 border-border bg-muted/30">
                            {locatorModel.drawers.map((d) => {
                              const hasOccupants = d.count > 0
                              const isExpanded = String(expandedDrawer) === String(d.drawer)
                              const drawerLabel = getDrawerLabel(d.drawer)
                              const occupantLabel = isOsas ? "organization" : "record"
                              const countLabel = hasOccupants
                                ? `${d.count} ${occupantLabel}${d.count === 1 ? "" : "s"}`
                                : "Empty"

                              return (
                                <div key={d.drawer}>
                                  <Button
                                    ref={d.isTarget ? locatedDrawerRef : undefined}
                                    type="button"
                                    variant="ghost"
                                    disabled={hasTargetDrawer && !d.isTarget}
                                    aria-expanded={isExpanded}
                                    className="h-auto min-h-12 w-full justify-start gap-3 rounded-none px-3.5 py-2.5 text-left whitespace-normal focus-visible:ring-inset"
                                    style={d.isTarget ? {
                                      backgroundColor: `color-mix(in srgb, ${activeTheme.frontStart} 16%, transparent)`,
                                    } : undefined}
                                    onClick={() => setExpandedDrawer(isExpanded ? null : d.drawer)}
                                  >
                                    <span className="h-1.5 w-5 shrink-0 rounded-full bg-foreground/25" aria-hidden="true" />
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-[13px] font-semibold">{drawerLabel}</span>
                                      <span className="block text-xs font-normal text-muted-foreground">
                                        {countLabel}
                                      </span>
                                    </span>
                                    {d.isTarget && <Badge variant="secondary">Located</Badge>}
                                    <ArrowDown01Icon
                                      size={16}
                                      aria-hidden="true"
                                      className={cn("text-muted-foreground transition-transform motion-reduce:transition-none", isExpanded && "rotate-180")}
                                    />
                                  </Button>

                                  {/* Expanded Detail Panel */}
                                  {isExpanded && (
                                    <div className="space-y-2 border-t border-border bg-muted/30 p-3">
                                      {hasOccupants && d.students && d.students.length > 0 ? (
                                        d.students.map((student) => {
                                          const isTargetPerson = d.isTarget && activeStudent && student.studentNo === activeStudent.studentNo;
                                          const canToggleFocus = isTargetPerson ? Boolean(onUnfocusStudent) : Boolean(onLocateStudent)
                                          const toggleFocus = () => {
                                            if (isTargetPerson) {
                                              onUnfocusStudent?.()
                                            } else {
                                              onLocateStudent?.({
                                                ...student,
                                                room: selectedRoom,
                                                cabinet: selectedCabinet,
                                                drawer: d.drawer,
                                              })
                                            }
                                          }
                                          const collapseDocuments = student.documents?.length > 3;
                                          const DocumentList = collapseDocuments ? "details" : "div";
                                          return (
                                            <Card
                                              key={student.studentNo}
                                              variant="flat"
                                              size="sm"
                                              data-focused={isTargetPerson ? "true" : undefined}
                                              className={cn(
                                                "gap-2 px-3",
                                                isTargetPerson && "border-gray-950 bg-gray-100/80 shadow-xs ring-1 ring-black/10 dark:border-white dark:bg-zinc-800 dark:ring-white/20",
                                                !isTargetPerson && canToggleFocus && "cursor-pointer hover:bg-muted/40"
                                              )}
                                              onClick={!isTargetPerson && canToggleFocus ? (event) => {
                                                if (!event.target.closest("button, a, summary")) toggleFocus()
                                              } : undefined}
                                            >
                                              <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                  <CardTitle className="truncate" title={student.name}>{student.name}</CardTitle>
                                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                    <IdentifierBadge>{student.studentNo}</IdentifierBadge>
                                                    {student.category && (
                                                      <Badge variant={student.category === "Academic" ? "info" : "success"}>
                                                        {student.category}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </div>
                                                {canToggleFocus && (
                                                  <Button
                                                    type="button"
                                                    size="xs"
                                                    variant="outline"
                                                    className="min-w-[4.5rem]"
                                                    onClick={toggleFocus}
                                                  >
                                                    {isTargetPerson ? "Unfocus" : "Focus"}
                                                  </Button>
                                                )}
                                              </div>

                                              {/* Documents */}
                                              {student.documents && student.documents.length > 0 ? (
                                                <DocumentList className="mt-1 space-y-2">
                                                  {collapseDocuments && (
                                                    <summary className="cursor-pointer py-1 text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                                      Documents ({student.documents.length})
                                                    </summary>
                                                  )}
                                                  <CardGroup>
                                                    {student.documents.map((doc) => (
                                                      <Button
                                                        key={doc.id}
                                                        type="button"
                                                        variant="ghost"
                                                        onClick={() => onPreviewDocument?.(doc.docType, student.name, student.studentNo, doc.id, doc.file_url)}
                                                        className="h-auto min-h-9 w-full justify-start gap-2 rounded-none px-2.5 py-1 text-left focus-visible:ring-inset"
                                                      >
                                                        <File02Icon size={16} className="text-muted-foreground" aria-hidden="true" />
                                                        <span className="min-w-0 flex-1 truncate" title={doc.filename}>{doc.docType}</span>
                                                        <TableStatus value={doc.approvalStatus} className="h-5 min-h-5 px-2 py-0 text-[11px] leading-none" />
                                                      </Button>
                                                    ))}
                                                </CardGroup>
                                              </DocumentList>
                                            ) : (
                                              <p className="text-xs text-muted-foreground">
                                                {isOsas ? "No official documents or proposals filed yet" : "No documents uploaded"}
                                              </p>
                                            )}
                                          </Card>
                                        );
                                      })
                                    ) : (
                                      <p className="px-1 py-2 text-xs text-muted-foreground">
                                        {isOsas ? "No organizations in this drawer." : "No student records in this drawer."}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          </CardGroup>
                        </div>
                      ) : <p className="text-xs text-muted-foreground">No drawers in this cabinet.</p>}
                    </CardContent>
                  </Card>
                </ContentReveal>
              </div>
            ) : null}
          </div>
        </Card>
    </div>
  )
}
