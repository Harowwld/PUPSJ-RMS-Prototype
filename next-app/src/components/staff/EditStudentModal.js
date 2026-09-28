"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { canonicalizeCabinetId } from "@/lib/storageLayoutUtils";

export default function EditStudentModal({
  open,
  onOpenChange,
  student,
  courses = [],
  sections = [],
  storageLayout = null,
  onSuccess,
  showToast,
  authUser = null,
}) {
  const [name, setName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [section, setSection] = useState("");
  const [room, setRoom] = useState("");
  const [cabinet, setCabinet] = useState("");
  const [drawer, setDrawer] = useState("1");
  const [status, setStatus] = useState("Active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (student && open) {
      setFormError("");
      setName(student.name && !student.name.startsWith("enc:v1:") ? student.name : "");
      setCourseCode(student.courseCode || student.course_code || "");
      setYearLevel(String(student.yearLevel || student.year_level || ""));
      setSection(student.section || "");
      setRoom(String(student.room || "1"));
      setCabinet(canonicalizeCabinetId(student.cabinet || "A"));
      setDrawer(String(student.drawer || "1"));
      setStatus(student.status || "Active");
    }
  }, [student, open]);

  const currentRoomDef = storageLayout?.rooms?.find(
    (r) => String(r.id) === String(room)
  );
  const availableCabinets = currentRoomDef?.cabinets || [];

  const currentCabDef = availableCabinets.find(
    (c) => canonicalizeCabinetId(c.id) === canonicalizeCabinetId(cabinet)
  );
  const availableDrawers = currentCabDef?.drawerIds || [1, 2, 3, 4];

  const availableSections = sections.filter(
    (sec) =>
      String(sec.course_code || "").trim().toUpperCase() ===
      String(courseCode || "").trim().toUpperCase()
  );

  const handleRoomChange = (newRoom) => {
    setRoom(newRoom);
    const rDef = storageLayout?.rooms?.find((r) => String(r.id) === String(newRoom));
    if (rDef?.cabinets?.[0]) {
      const firstCab = canonicalizeCabinetId(rDef.cabinets[0].id);
      setCabinet(firstCab);
      const firstDrw = rDef.cabinets[0].drawerIds?.[0] || 1;
      setDrawer(String(firstDrw));
    }
  };

  const handleCabinetChange = (newCab) => {
    const cleanCab = canonicalizeCabinetId(newCab);
    setCabinet(cleanCab);
    const cabDef = availableCabinets.find(
      (c) => canonicalizeCabinetId(c.id) === cleanCab
    );
    if (cabDef?.drawerIds?.[0]) {
      setDrawer(String(cabDef.drawerIds[0]));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!student) return;
    setFormError("");

    const cleanName = name.trim().replace(/\s+/g, " ").toUpperCase();
    const cleanCourse = courseCode.trim().toUpperCase();
    const parsedYear = parseInt(yearLevel, 10);
    const cleanSec = section.trim();
    const parsedRoom = parseInt(room, 10);
    const cleanCab = canonicalizeCabinetId(cabinet);
    const parsedDrawer = parseInt(drawer, 10);

    if (!cleanName || !cleanCourse || !cleanSec) {
      setFormError("Please fill out all required fields.");
      return;
    }

    if (!Number.isFinite(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      setFormError("Please provide a valid entry year (e.g. 2024).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(student.studentNo)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          courseCode: cleanCourse,
          yearLevel: parsedYear,
          section: cleanSec,
          room: parsedRoom,
          cabinet: cleanCab,
          drawer: parsedDrawer,
          status,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to update student profile.");
      }

      showToast?.({
        title: "Student Updated",
        description: `Profile for ${student.studentNo} has been modified successfully.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setFormError(err.message || "An error occurred while updating student record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl sm:max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="bg-white p-6 pb-2 dark:bg-card border-none text-left">
            <DialogTitle className="text-[17px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
              Edit Student Profile
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
              Update registry details and archive drawer coordinates for student{" "}
              <span className="font-mono font-semibold text-gray-900 dark:text-zinc-200">
                {student?.studentNo}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 pt-2 space-y-5">
            {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              <HugeIcon  className="ph-bold ph-warning-circle mr-1.5 text-sm inline-block align-sub"></HugeIcon>
              {formError}
            </div>
          )}

          {/* Identification Section */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Student Identification
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">
                  Student Number
                </label>
                <Input
                  type="text"
                  disabled
                  value={student?.studentNo || ""}
                  className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-800/50 text-xs font-mono text-gray-500 dark:text-zinc-400 cursor-not-allowed shadow-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">
                  Full Name (Last, First) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  placeholder="DELA CRUZ, JUAN"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 shadow-xs uppercase"
                />
              </div>
            </div>
          </div>

          {/* Academic Profile */}
          <div className="space-y-4 pt-1 border-t border-gray-100 dark:border-white/5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Academic Program & Section
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">
                  Degree Program <span className="text-red-500">*</span>
                </label>
                <Select
                  value={courseCode}
                  onValueChange={(val) => {
                    setCourseCode(val);
                    setSection("");
                  }}
                  options={courses.length > 0 ? courses.map((c) => ({
                    value: c.code,
                    label: `${c.code} — ${c.name}`,
                  })) : []}
                  placeholder="Select Program"
                  buttonClassName="h-10 text-xs rounded-xl border border-gray-200 dark:border-white/10"
                />
              </div>

              <div className="md:col-span-3">
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">
                  Entry Year <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  required
                  min={2000}
                  max={2100}
                  value={yearLevel}
                  onChange={(e) => setYearLevel(e.target.value)}
                  className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 shadow-xs"
                />
              </div>

              <div className="md:col-span-3">
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">
                  Section <span className="text-red-500">*</span>
                </label>
                {availableSections.length > 0 ? (
                  <Select
                    value={section}
                    onValueChange={setSection}
                    options={availableSections.map((s) => ({
                      value: s.name,
                      label: `Section ${s.name}`,
                    }))}
                    placeholder="Select Section"
                    buttonClassName="h-10 text-xs rounded-xl border border-gray-200 dark:border-white/10"
                  />
                ) : (
                  <Input
                    type="text"
                    required
                    placeholder="e.g. 1"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 shadow-xs"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Physical Storage Coordinates */}
          <div className="space-y-4 pt-1 border-t border-gray-100 dark:border-white/5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Physical Storage Coordinates
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">
                  Archive Room <span className="text-red-500">*</span>
                </label>
                <Select
                  value={String(room)}
                  onValueChange={handleRoomChange}
                  options={(storageLayout?.rooms || []).map((r) => ({
                    value: String(r.id),
                    label: r.name || `Room ${r.id}`,
                  }))}
                  placeholder="Select Room"
                  buttonClassName="h-10 text-xs rounded-xl border border-gray-200 dark:border-white/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">
                  Cabinet Letter <span className="text-red-500">*</span>
                </label>
                <Select
                  value={canonicalizeCabinetId(cabinet)}
                  onValueChange={handleCabinetChange}
                  options={availableCabinets.map((c) => ({
                    value: canonicalizeCabinetId(c.id),
                    label: `Cabinet ${canonicalizeCabinetId(c.id)}`,
                  }))}
                  placeholder="Select Cabinet"
                  buttonClassName="h-10 text-xs rounded-xl border border-gray-200 dark:border-white/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300">
                  Drawer Number <span className="text-red-500">*</span>
                </label>
                <Select
                  value={String(drawer)}
                  onValueChange={setDrawer}
                  options={availableDrawers.map((d) => ({
                    value: String(d),
                    label: String(d).toLowerCase().startsWith("drawer") ? String(d) : `Drawer ${d}`,
                  }))}
                  placeholder="Select Drawer"
                  buttonClassName="h-10 text-xs rounded-xl border border-gray-200 dark:border-white/10"
                />
              </div>
            </div>
          </div>
          </div>

          <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <HugeIcon  className="ph-bold ph-spinner animate-spin text-sm"></HugeIcon>
                  Saving...
                </span>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
