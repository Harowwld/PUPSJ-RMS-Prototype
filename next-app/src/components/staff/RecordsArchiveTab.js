"use client";

import { useState, useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import RoomMap2D from "@/components/staff/RoomMap2D";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";

export default function RecordsArchiveTab({
  loading,
  quickQuery,
  setQuickQuery,
  isQuickSearching,
  quickResults,
  onLocateStudent,
  breadcrumbs,
  currentLevel,
  onBreadcrumbClick,
  students,
  explorerItems,
  onSwitchView,
  locatorModel,
  selectedRoom,
  setSelectedRoom,
  setSelectedCabinet,
  setCurrentLocatorLevel,
  selectedCabinet,
  currentLocatorLevel,
  activeStudent,
  activeStudentDocs,
  onPreviewDocument,
}) {
  const [listType, setListType] = useState("card");
  const [storageFullscreen, setStorageFullscreen] = useState(false);

  useEffect(() => {
    if (!storageFullscreen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setStorageFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [storageFullscreen]);

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row w-full h-full gap-4 animate-fade-in">
        <div className="flex flex-col lg:flex-row flex-1 gap-4 items-stretch overflow-hidden">
          {/* Sidebar Skeleton */}
          <section className="w-full lg:w-1/4 bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm flex-shrink-0 h-full overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <Skeleton className="h-10 w-full rounded-brand" />
            </div>
            <div className="flex-1 p-2 space-y-1 overflow-hidden">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="p-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20 font-mono" />
                  </div>
                  <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </div>
          </section>

          {/* Main Content Skeleton */}
          <section className="w-full lg:w-3/4 flex flex-col gap-4 lg:h-full overflow-hidden min-h-0">
            {/* Explorer Skeleton */}
            <div className="h-[60%] min-h-[250px] bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm relative overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-brand" />
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-48" />
                </div>
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-brand">
                  <Skeleton className="h-7 w-16 rounded-brand" />
                  <Skeleton className="h-7 w-16 rounded-brand" />
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex-1 overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <div key={i} className="bg-white p-5 rounded-brand border border-gray-200 flex flex-col items-center justify-center gap-2 h-36 shadow-sm">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Storage Area Skeleton */}
            <div className="h-[44%] min-h-[280px] bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm overflow-hidden">
              <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white">
                <Skeleton className="h-5 w-32" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-24 rounded-brand" />
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="w-2/3 bg-gray-100 p-6 flex items-center justify-center border-r border-gray-200">
                  <Skeleton className="w-full h-full rounded-brand opacity-50" />
                </div>
                <div className="w-1/3 p-6 flex flex-col gap-6">
                  <div className="space-y-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-full rounded-brand" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="space-y-2 pt-4 border-t border-gray-100">
                    <Skeleton className="h-3 w-32" />
                    <div className="space-y-2 mt-2">
                      <Skeleton className="h-10 w-full rounded-brand" />
                      <Skeleton className="h-10 w-full rounded-brand" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const legend = (
    <div className="hidden sm:flex gap-4 text-xs font-medium text-gray-600">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 border border-gray-400 rounded-[2px] bg-white"></div>
        Empty
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 bg-gray-300 border border-gray-400 rounded-[2px]"></div>
        Occupied
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 border-2 border-pup-maroon bg-red-50 rounded-[2px]"></div>
        Target
      </div>
    </div>
  );

  function renderStorageBody(isFullscreen) {
    const mapWrap = isFullscreen
      ? "min-h-[min(55vh,640px)] flex-1 w-full"
      : "h-[380px] w-full";
    const rowClass = isFullscreen
      ? "flex flex-1 flex-col overflow-hidden min-h-0 lg:flex-row"
      : "flex-1 flex overflow-hidden min-h-0";
    const leftClass = isFullscreen
      ? "bg-gray-100 p-4 min-h-0 overflow-y-auto flex flex-1 flex-col lg:w-[min(72%,calc(100%-22rem))]"
      : "w-2/3 bg-gray-100 p-4 h-full min-h-0 overflow-y-auto";
    const innerLeftClass = isFullscreen
      ? "flex w-full flex-col min-h-0 flex-1"
      : "w-full h-full";
    const rightClass = isFullscreen
      ? "border-gray-200 bg-white flex flex-col overflow-hidden min-h-0 border-l w-full max-h-[42vh] shrink-0 border-t lg:max-h-none lg:w-[min(28rem,100%)] lg:max-w-[40vw] lg:shrink-0"
      : "w-1/3 border-l border-gray-200 bg-white flex flex-col overflow-hidden min-h-0";
    const rightInnerClass = isFullscreen
      ? "flex h-full min-h-0 flex-col overflow-hidden p-4"
      : "p-4 h-full flex flex-col overflow-hidden min-h-0";
    const ulClass = isFullscreen
      ? "flex-1 space-y-2 overflow-y-auto pr-2 text-sm text-gray-700 min-h-0"
      : "flex-1 overflow-y-auto space-y-2 text-sm text-gray-700 pr-2";

    return (
      <div className={rowClass}>
        <div className={leftClass}>
          <div className={innerLeftClass}>
            {locatorModel.kind === "rooms" ? (
              <>
                <h4 className="font-bold text-gray-700 text-lg mb-4">
                  {locatorModel.title}
                </h4>
                <div className="grid grid-cols-2 gap-4 pb-6">
                  {locatorModel.rooms.map((r) => (
                    <div
                      key={r.room}
                      className={`locator-tile p-6 rounded-brand flex flex-col items-center justify-center ${
                        r.isTarget ? "room-located" : ""
                      }`}
                      onClick={() => {
                        setSelectedRoom(r.room);
                        setSelectedCabinet(null);
                        setCurrentLocatorLevel("cabinets");
                      }}
                    >
                      <i className="ph-duotone ph-warehouse text-4xl mb-2 text-pup-maroon"></i>
                      <h5 className="font-bold text-xl text-gray-900 leading-tight">
                        ROOM {r.room}
                      </h5>
                      <span className="text-xs text-gray-500 font-semibold mt-1">
                        {r.occupiedCount} Records Stored
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : locatorModel.kind === "cabinets" ? (
              <>
                <h4 className="font-bold text-gray-700 text-lg mb-4">
                  <span
                    className="cursor-pointer hover:text-pup-maroon"
                    onClick={() => {
                      setCurrentLocatorLevel("rooms");
                      setSelectedRoom(null);
                      setSelectedCabinet(null);
                    }}
                  >
                    ← Rooms
                  </span>{" "}
                  / Room {selectedRoom} Cabinets
                </h4>
                <div className={mapWrap}>
                  <RoomMap2D
                    kind="cabinets"
                    cabinets={locatorModel.cabinets}
                    roomDoor={locatorModel.roomDoor}
                    selectedCabinetId={selectedCabinet}
                    onCabinetClick={(cabId) => {
                      setSelectedCabinet(cabId);
                      setCurrentLocatorLevel("drawers");
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <h4 className="font-bold text-gray-700 text-lg mb-4">
                  <span
                    className="cursor-pointer hover:text-pup-maroon"
                    onClick={() => setCurrentLocatorLevel("cabinets")}
                  >
                    ← Cabinets
                  </span>{" "}
                  / Room {selectedRoom} / Cabinet {selectedCabinet} Drawers
                </h4>
                <div className={mapWrap}>
                  <RoomMap2D
                    kind="drawers"
                    cabinets={locatorModel.cabinets || []}
                    roomDoor={locatorModel.roomDoor}
                    selectedCabinetId={selectedCabinet}
                    drawerSlots={locatorModel.drawers}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className={rightClass}>
          <div className={rightInnerClass}>
            {!activeStudent ? (
              <Empty className="h-full flex flex-col items-center justify-center text-center text-gray-500 border-0">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                    <i className="ph-duotone ph-mouse-left-click text-3xl text-pup-maroon"></i>
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-bold text-gray-900">Select a student</EmptyTitle>
                  <EmptyDescription className="text-sm font-medium text-gray-600 mt-1">
                    Select a student from the list to view their location and documents.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="h-full flex flex-col min-h-0">
                <div className="mb-4 flex-shrink-0">
                  <div className="text-xs uppercase font-bold text-gray-500 mb-1 tracking-wide">
                    Physical Location
                  </div>
                  <div className="text-2xl font-black text-pup-maroon">
                    ROOM-{activeStudent.room} • CAB-{activeStudent.cabinet} • D-
                    {activeStudent.drawer}
                  </div>
                  <div className="text-base font-bold text-gray-900 truncate mt-1">
                    {activeStudent.name}
                  </div>
                  <div className="text-sm text-gray-600 font-mono font-medium">
                    {activeStudent.studentNo}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="text-xs uppercase font-bold text-gray-500 mb-2 border-b border-gray-200 pb-2 shrink-0 tracking-wide">
                    Documents on File
                  </div>
                  <ul className={ulClass}>
                    {activeStudentDocs.length === 0 ? (
                      <li className="h-full py-8">
                        <Empty className="flex flex-col items-center justify-center text-center text-gray-500 border-0">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <EmptyMedia className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-3 shadow-sm">
                              <i className="ph-duotone ph-files text-2xl text-pup-maroon"></i>
                            </EmptyMedia>
                            <EmptyTitle className="text-sm font-bold text-gray-900">No documents found</EmptyTitle>
                            <EmptyDescription className="text-xs font-medium text-gray-600 mt-1 max-w-[200px]">
                              This student has no scanned documents on file.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </li>
                    ) : (
                      activeStudentDocs.map((doc) => (
                        <li key={doc.id}>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              onPreviewDocument(
                                doc.doc_type,
                                activeStudent.name,
                                activeStudent.studentNo,
                                doc.id
                              )
                            }
                            className="group flex items-center justify-start gap-3 w-full h-auto text-left p-2 rounded-brand hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-300 font-normal"
                          >
                            <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-pup-maroon group-hover:bg-pup-maroon group-hover:text-white transition-colors shrink-0">
                              <i className="ph-fill ph-file-pdf text-lg"></i>
                            </div>
                            <span className="text-gray-700 group-hover:text-pup-maroon font-bold group-hover:underline underline-offset-2 truncate">
                              {doc.doc_type}
                            </span>
                            <i className="ph-bold ph-arrow-square-out text-gray-400 ml-auto group-hover:text-pup-maroon transition-all shrink-0"></i>
                          </Button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
        <div id="view-search" className="flex flex-col lg:flex-row w-full h-full gap-4 animate-fade-in">
      <div className="flex flex-col lg:flex-row flex-1 gap-4 items-stretch overflow-hidden">
        <section className="w-full lg:w-1/4 bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm flex-shrink-0 h-full overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative group">
            <i className="ph-bold ph-magnifying-glass absolute left-3 top-3 text-gray-500 group-focus-within:text-pup-maroon"></i>
            <Input
              type="text"
              placeholder="Search ID or Name..."
              className="h-10 w-full pl-10 pr-10 bg-white border border-gray-300 rounded-brand text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon transition-all placeholder-gray-500 text-gray-900"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
            />
            {quickQuery !== "" && (
              <button
                type="button"
                onClick={() => setQuickQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pup-maroon transition-colors"
              >
                <i className="ph-bold ph-x-circle text-lg"></i>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {quickQuery.trim().length < 2 ? (
            <Empty className="text-center py-10 flex flex-col items-center border-0 mt-32">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                  <i className="ph-duotone ph-magnifying-glass text-3xl text-pup-maroon"></i>
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">Search Records</EmptyTitle>
                <EmptyDescription className="text-sm font-medium text-gray-600 mt-1">
                  Enter a student name or ID to quickly locate their records.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : isQuickSearching ? (
            <div className="p-4">
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="p-3 border-b border-gray-200 flex items-center gap-3">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-4 w-4" />
                  </div>
                ))}
              </div>
            </div>
          ) : quickResults.length === 0 ? (
            <Empty className="flex flex-col items-center justify-center text-center text-gray-500 py-8 border-0 mt-32">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                  <i className="ph-duotone ph-list-magnifying-glass text-3xl text-pup-maroon"></i>
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">No records found</EmptyTitle>
                <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-[200px]">
                  We couldn&apos;t find any students matching your search query.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            quickResults.map((s) => (
              <div
                key={s.studentNo}
                className="p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors flex justify-between items-center group"
                onClick={() => onLocateStudent(s)}
              >
                <div>
                  <div className="font-bold text-sm text-gray-800 group-hover:text-pup-maroon">
                    {s.name}
                  </div>
                  <div className="text-xs text-gray-500 font-mono font-medium">
                    {s.studentNo}
                  </div>
                </div>
                <i className="ph-bold ph-caret-right text-gray-400 group-hover:text-pup-maroon text-sm"></i>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="w-full lg:w-3/4 flex flex-col gap-4 lg:h-full overflow-y-auto min-h-0">
        <div className="h-[60%] min-h-[250px] bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm relative overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-2 text-sm bg-white sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onBreadcrumbClick({ level: "years" })}
                className="text-gray-500 hover:text-pup-maroon hover:bg-transparent transition-colors w-8"
                title="Home"
              >
                <i className="ph-bold ph-house text-lg"></i>
              </Button>
              <span className="text-gray-400 font-bold">/</span>
              <Breadcrumb>
                <BreadcrumbList className="font-semibold text-gray-700 sm:gap-2">
                  {breadcrumbs.map((b, idx) => (
                    <div key={`${b.level}-${idx}`} className="flex items-center gap-2">
                      {idx > 0 && (
                        <BreadcrumbSeparator>
                          <i className="ph-bold ph-caret-right text-sm text-gray-400"></i>
                        </BreadcrumbSeparator>
                      )}
                      <BreadcrumbItem>
                        <BreadcrumbLink
                          className={`cursor-pointer hover:text-pup-maroon hover:no-underline transition-colors ${
                            currentLevel === b.level ? "text-pup-maroon font-bold" : ""
                          }`}
                          onClick={() => onBreadcrumbClick(b)}
                        >
                          {b.label}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {currentLevel === "students" && (
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-brand">
                <Button variant="ghost" size="sm" className={`px-2 text-xs font-bold ${listType === 'card' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`} onClick={() => setListType('card')}>
                  <i className="ph-bold ph-squares-four" /> CARD
                </Button>
                <Button variant="ghost" size="sm" className={`px-2 text-xs font-bold ${listType === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`} onClick={() => setListType('table')}>
                  <i className="ph-bold ph-list-dashes" /> TABLE
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {students.length === 0 ? (
              <Empty className="h-full flex flex-col items-center justify-center text-center text-gray-500 border-0">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                    <i className="ph-duotone ph-users-three text-3xl text-pup-maroon"></i>
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-bold text-gray-900">No student records yet</EmptyTitle>
                  <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                    Register your first student record in the Upload tab. After that,
                    you can browse, search, and locate drawers here.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    type="button"
                    onClick={() => onSwitchView("upload")}
                    className="mt-4 bg-pup-maroon text-white px-5 h-10 rounded-brand font-bold text-sm hover:bg-red-900 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <i className="ph-bold ph-upload-simple"></i> GO TO REGISTER / UPLOAD
                  </Button>
                </EmptyContent>
              </Empty>
            ) : currentLevel !== "students" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in">
                {explorerItems.map((it, index) => (
                  <Card
                    key={index}
                    className={`folder-card bg-white p-5 rounded-brand flex flex-col items-center justify-center text-center gap-2 h-36 ${
                      it.disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-not-allowed"
                    }`}
                    onClick={it.onClick}
                  >
                    <i className={`ph-light ${it.icon} text-4xl text-gray-500 mb-1`}></i>
                    <h3 className="font-bold text-base text-pup-maroon leading-tight">
                      {it.title}
                    </h3>
                    <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                      {it.subtitle}
                    </span>
                  </Card>
                ))}
              </div>
            ) : explorerItems.length === 0 ? (
              <Empty className="h-full flex flex-col items-center justify-center text-center text-gray-500 border-0">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                    <i className="ph-duotone ph-drawers text-3xl text-pup-maroon"></i>
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-bold text-gray-900">No students in this year</EmptyTitle>
                  <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                    There are no student records filed under this year yet.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : listType === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
                {explorerItems.map((row, index) => (
                  <div
                    key={index}
                    className="group relative flex flex-col p-5 bg-white border border-gray-300 rounded-brand hover:border-pup-maroon hover:shadow-md cursor-pointer transition-all shadow-sm"
                    onClick={() => onLocateStudent(row.student)}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="w-12 h-12 border border-gray-100 shadow-sm shrink-0">
                        <AvatarFallback className="bg-gray-50 text-gray-400 group-hover:text-pup-maroon font-bold transition-colors">
                          <i className="ph-bold ph-user text-2xl"></i>
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-gray-900 group-hover:text-pup-maroon transition-colors truncate leading-tight text-base">
                          {row.student.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="font-mono text-[10px] font-bold text-gray-600 border-gray-200 px-1.5 py-0 rounded">
                            {row.student.studentNo}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-pup-maroon group-hover:bg-red-50 transition-colors">
                          <i className="ph-duotone ph-map-pin text-sm"></i>
                        </div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          R-{row.student.room} • C-{row.student.cabinet}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-transparent text-[10px] font-black uppercase tracking-tighter px-2">
                          D-{row.student.drawer}
                        </Badge>
                        <i className="ph-bold ph-caret-right text-gray-300 group-hover:text-pup-maroon group-hover:translate-x-0.5 transition-all"></i>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 overflow-auto rounded-brand border border-gray-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                      <th className="p-3 font-bold w-[80px] text-center">Profile</th>
                      <th className="p-3 font-bold w-48">Student No.</th>
                      <th className="p-3 font-bold">Name</th>
                      <th className="p-3 font-bold w-56">Location</th>
                      <th className="p-3 font-bold text-right w-32">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {explorerItems.map((row) => (
                      <tr
                        key={row.key}
                        className="hover:bg-gray-50 group cursor-pointer transition-colors"
                        onClick={() => onLocateStudent(row.student)}
                      >
                        <td className="p-3">
                          <Avatar className="w-8 h-8 mx-auto border border-gray-200">
                            <AvatarFallback className="bg-gray-100 text-gray-500 text-xs font-bold group-hover:text-pup-maroon transition-colors">
                              <i className="ph-bold ph-user text-sm"></i>
                            </AvatarFallback>
                          </Avatar>
                        </td>
                        <td className="p-3 font-mono text-xs text-gray-600 font-medium">
                          {row.student.studentNo}
                        </td>
                        <td className="p-3 font-bold text-gray-900 group-hover:text-pup-maroon transition-colors">
                          {row.student.name}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 font-bold uppercase text-[10px] tracking-wider px-2 py-0.5">
                            CAB-{row.student.cabinet} • D-{row.student.drawer}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-3 font-bold text-[10px] tracking-widest border-gray-300 text-gray-600 hover:text-pup-maroon hover:border-pup-maroon hover:bg-red-50 transition-all rounded-brand shadow-sm"
                          >
                            <i className="ph-bold ph-magnifying-glass-plus mr-1.5 text-xs"></i>
                            LOCATE
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {storageFullscreen ? (
          <div className="fixed inset-0 z-[100] flex min-h-0 flex-col bg-white shadow-none border-0 rounded-none">
            <div className="p-3 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2 bg-white shrink-0">
              <h3 className="font-bold text-pup-maroon text-sm flex items-center gap-2">
                <i className="ph-fill ph-drawers text-lg"></i> Storage Layout
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold border-gray-300"
                  onClick={() => setStorageFullscreen(false)}
                  title="Exit full screen (Esc)"
                >
                  <i className="ph-bold ph-corners-in mr-1.5"></i>
                  EXIT FULL SCREEN
                </Button>
                {legend}
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {renderStorageBody(true)}
            </div>
          </div>
        ) : (
          <div className="h-[44%] min-h-[280px] bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm relative min-h-0">
            <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-brand">
              <h3 className="font-bold text-pup-maroon text-sm flex items-center gap-2">
                <i className="ph-fill ph-drawers text-lg"></i> Storage Layout
              </h3>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold border-gray-300"
                  onClick={() => setStorageFullscreen(true)}
                  title="Full screen map & documents"
                >
                  <i className="ph-bold ph-corners-out mr-1.5"></i>
                  FULL SCREEN
                </Button>
                {legend}
              </div>
            </div>
            {renderStorageBody(false)}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
