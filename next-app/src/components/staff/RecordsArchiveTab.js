"use client";

import { useState } from "react";

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

export default function RecordsArchiveTab({
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

  return (
    <div id="view-search" className="h-full flex flex-col gap-6 p-6 overflow-y-auto animate-fade-in font-inter">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-black text-pup-maroon tracking-tight">Records Archive</h2>
          <p className="text-sm font-medium text-gray-500 mt-1 max-w-2xl">
            Navigate through the physical and digital storage layout to locate and preview student record folders within the university repository.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-4 items-stretch overflow-hidden">
        <section className="w-full lg:w-1/4 bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm flex-shrink-0 h-full overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xs font-bold text-pup-maroon uppercase tracking-wide mb-3">
            Quick Find
          </h2>
          <div className="relative group">
            <i className="ph-bold ph-magnifying-glass absolute left-3 top-3 text-gray-500 group-focus-within:text-pup-maroon"></i>
            <Input
              type="text"
              placeholder="Search ID or Name..."
              className="w-full pl-10 pr-3 h-11 bg-white border border-gray-300 rounded-brand text-sm font-medium focus-visible:ring-pup-maroon focus-visible:border-pup-maroon transition-all placeholder-gray-500 text-gray-900"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {quickQuery.trim().length < 2 ? (
            <div className="text-center py-10 text-gray-500 flex flex-col items-center opacity-80">
              <i className="ph-bold ph-magnifying-glass text-3xl mb-2"></i>
              <span className="text-sm font-medium">Search for direct access</span>
            </div>
          ) : isQuickSearching ? (
            <div className="p-4 text-center text-sm font-medium text-gray-500">
              Searching...
            </div>
          ) : quickResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-gray-500 py-8">
              <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-3 shadow-sm">
                <i className="ph-duotone ph-magnifying-glass text-2xl text-pup-maroon"></i>
              </div>
              <div className="text-sm font-bold text-gray-900">
                No records found
              </div>
              <div className="text-xs font-medium text-gray-600 mt-1 max-w-[200px]">
                We couldn&apos;t find any students matching your search.
              </div>            </div>
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
                onClick={() => onBreadcrumbClick({ level: "courses" })}
                className="text-gray-500 hover:text-pup-maroon hover:bg-transparent transition-colors h-8 w-8"
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
                <Button variant="ghost" size="sm" className={`h-7 px-2 text-xs font-bold ${listType === 'card' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`} onClick={() => setListType('card')}>
                  <i className="ph-bold ph-squares-four" /> Card
                </Button>
                <Button variant="ghost" size="sm" className={`h-7 px-2 text-xs font-bold ${listType === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`} onClick={() => setListType('table')}>
                  <i className="ph-bold ph-list-dashes" /> Table
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {students.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-12">
                <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                  <i className="ph-duotone ph-users-three text-3xl text-pup-maroon"></i>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  No student records yet
                </div>
                <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                  Register your first student record in the Upload tab. After that,
                  you can browse, search, and locate folders here.
                </div>
                <Button
                  type="button"
                  onClick={() => onSwitchView("upload")}
                  className="mt-6 bg-pup-maroon text-white px-5 py-5 rounded-brand font-bold text-sm hover:bg-red-900 transition-colors flex items-center gap-2"
                >
                  <i className="ph-bold ph-upload-simple"></i> Go to Register / Upload
                </Button>
              </div>
            ) : currentLevel !== "students" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in">
                {explorerItems.map((it, index) => (
                  <Card
                    key={index}
                    className={`folder-card bg-white p-5 rounded-brand flex flex-col items-center justify-center text-center gap-2 h-36 ${
                      it.disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
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
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-12">
                <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                  <i className="ph-duotone ph-folder-open text-3xl text-pup-maroon"></i>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  No students in this section
                </div>
                <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                  There are no student records filed under this specific section yet.
                </div>
              </div>
            ) : listType === "card" ? (
              <div className="flex flex-col gap-2">
                {explorerItems.map((row, index) => (
                  <div
                    key={index}
                    className="group flex items-center justify-between p-4 bg-white border border-gray-300 rounded-brand hover:border-pup-maroon cursor-pointer transition-all shadow-sm"
                    onClick={() => onLocateStudent(row.student)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-10 h-10 border border-gray-200">
                        <AvatarFallback className="bg-gray-100 text-gray-600 group-hover:text-pup-maroon font-bold transition-colors">
                          <i className="ph-bold ph-user text-xl"></i>
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-bold text-base text-gray-900">
                          {row.student.name}
                        </h4>
                        <div className="flex gap-2 items-center mt-1">
                          <Badge variant="outline" className="font-mono text-xs text-gray-600 rounded">
                            {row.student.studentNo}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button variant="ghost" size="sm" className="text-xs uppercase font-bold tracking-wide text-gray-400 group-hover:text-pup-maroon hover:bg-transparent px-0">
                        View Location
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border text-left border-gray-200 rounded-brand overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[80px]">Profile</TableHead>
                      <TableHead>Student No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {explorerItems.map((row) => (
                      <TableRow
                        key={row.key}
                        className="cursor-pointer hover:bg-red-50/30 group transition-colors"
                        onClick={() => onLocateStudent(row.student)}
                      >
                        <TableCell>
                          <Avatar className="w-8 h-8 mx-auto">
                            <AvatarFallback className="bg-gray-100 text-gray-500 text-xs font-bold group-hover:text-pup-maroon transition-colors">
                              <i className="ph-bold ph-user text-sm"></i>
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-600 font-medium">{row.student.studentNo}</TableCell>
                        <TableCell className="font-bold text-gray-900 group-hover:text-pup-maroon transition-colors">{row.student.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-medium shadow-none">
                            CAB-{row.student.cabinet} • D-{row.student.drawer}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-gray-400 group-hover:text-pup-maroon uppercase font-bold text-[10px] tracking-wider h-7">
                            Locate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <div className="h-[40%] min-h-[250px] bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm relative min-h-0">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-brand">
            <h3 className="font-bold text-pup-maroon text-sm flex items-center gap-2">
              <i className="ph-fill ph-drawers text-lg"></i> Storage Layout
            </h3>
            <div className="flex gap-4 text-xs font-medium text-gray-600">
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
          </div>

          <div className="flex-1 flex overflow-hidden min-h-0">
            <div className="w-2/3 bg-gray-100 p-4 h-full min-h-0 overflow-y-auto">
              <div className="w-full h-full">
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
                    <div className="grid grid-cols-4 gap-3">
                      {locatorModel.cabinets.map((c) => (
                        <div
                          key={c.cab}
                          className={`locator-tile p-3 rounded-brand flex flex-col h-full ${
                            c.isTarget ? "cabinet-located" : ""
                          }`}
                          onClick={() => {
                            setSelectedCabinet(c.cab);
                            setCurrentLocatorLevel("drawers");
                          }}
                        >
                          <div className="text-center mb-2">
                            <i className="ph-duotone ph-archive-box text-3xl text-gray-600"></i>
                            <h5 className="font-bold text-base text-gray-900 leading-tight mt-1">
                              CAB-{c.cab}
                            </h5>
                          </div>
                          <div className="flex-1 bg-gray-50/50 p-2 rounded text-xs font-semibold text-gray-500 flex items-center justify-center">
                            {c.occupiedCount} Folders
                          </div>
                        </div>
                      ))}
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
                    <div className="flex justify-center w-full p-2">
                      <div className="border border-gray-300 p-2 rounded-brand bg-white relative flex flex-col h-full w-[30%] min-h-0">
                        <div className="absolute -top-2 left-2 bg-white px-2 text-xs font-bold text-gray-600 border border-gray-300 rounded-sm">
                          CAB-{selectedCabinet}
                        </div>
                        <div className="flex-1 flex flex-col gap-3 mt-3 min-h-0">
                          {locatorModel.drawers.map((d) => {
                            const countText =
                              d.count === 1 ? "1 Folder" : `${d.count} Folders`;
                            const drawerClass =
                              d.count > 0
                                ? "drawer-occupied"
                                : "bg-white border-gray-200 text-gray-300";
                            return (
                              <div
                                key={d.drawer}
                                className={`drawer-box flex-1 rounded-brand flex items-center justify-center transition-all border locator-tile ${drawerClass} ${
                                  d.isTarget ? "drawer-located" : ""
                                }`}
                              >
                                {d.count > 0 ? (
                                  <span
                                    className={`text-xs font-bold ${
                                      d.isTarget
                                        ? "text-pup-maroon"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {countText}
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-gray-400">
                                    0 Folders
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="w-1/3 border-l border-gray-200 bg-white flex flex-col overflow-hidden min-h-0">
              <div className="p-4 h-full flex flex-col overflow-hidden min-h-0">
                {!activeStudent ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                    <i className="ph-duotone ph-mouse-left-click text-5xl mb-3"></i>
                    <span className="text-sm font-medium">
                      Select a student to view
                      <br />
                      location & documents
                    </span>
                  </div>
                ) : (
                  <div className="h-full flex flex-col min-h-0">
                    <div className="mb-4 flex-shrink-0">
                      <div className="text-xs uppercase font-bold text-gray-500 mb-1 tracking-wide">
                        Physical Location
                      </div>
                      <div className="text-2xl font-black text-pup-maroon">
                        ROOM-{activeStudent.room} • CAB-{activeStudent.cabinet} • D-{activeStudent.drawer}
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
                      <ul className="flex-1 overflow-y-auto space-y-2 text-sm text-gray-700 pr-2">
                        {activeStudentDocs.length === 0 ? (
                          <li className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-8">
                            <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-3 shadow-sm">
                              <i className="ph-duotone ph-files text-2xl text-pup-maroon"></i>
                            </div>
                            <div className="text-sm font-bold text-gray-900">
                              No documents found
                            </div>
                            <div className="text-xs font-medium text-gray-600 mt-1 max-w-[200px]">
                              This student has no scanned documents on file.
                            </div>
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
                                <i className="ph-bold ph-arrow-square-out text-gray-400 ml-auto group-hover:text-pup-maroon opacity-0 group-hover:opacity-100 transition-all shrink-0"></i>
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
        </div>
      </section>
      </div>
    </div>
  );
}
