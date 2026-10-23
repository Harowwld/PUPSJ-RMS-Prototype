"use client";

import React, { useState, useEffect } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
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
import { formatErrorMessage } from "@/lib/errorUtils";

export default function EditOrganizationModal({
  open,
  onOpenChange,
  organization,
  storageLayout = null,
  onSuccess,
  showToast,
}) {
  const [name, setName] = useState("");
  const [acronym, setAcronym] = useState("");
  const [category, setCategory] = useState("Academic");
  const [status, setStatus] = useState("Active");
  const [adviserName, setAdviserName] = useState("");
  const [adviserEmail, setAdviserEmail] = useState("");
  const [room, setRoom] = useState("1");
  const [cabinet, setCabinet] = useState("");
  const [drawer, setDrawer] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (organization && open) {
        const org = organization.rawOrg || organization;
        setName(org.name || "");
        setAcronym(org.acronym || "");
        setCategory(org.category || "Academic");
        setStatus(org.status || "Active");
        setAdviserName(org.adviser_name || org.adviserName || org.adviser || "");
        setAdviserEmail(org.adviser_email || org.adviserEmail || "");
        setRoom(String(org.storage_room || org.room || "1"));
        setCabinet(String(org.storage_cabinet || org.cabinet || (org.category === "Academic" ? "ACADEMIC ORGANIZATIONS" : "NON-ACADEMIC ORGANIZATIONS")));
        setDrawer(String(org.storage_drawer || org.drawer || "1"));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [organization, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = String(name || "").trim();
    if (!cleanName) {
      showToast?.({
        title: "Missing Organization Name",
        description: "Organization name is required to save record.",
      }, true);
      return;
    }

    const orgId = organization?.id || organization?.rawOrg?.id || organization?.studentNo;
    if (!orgId) {
      showToast?.({
        title: "Error",
        description: "Organization identifier is missing.",
      }, true);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/osas/organizations/${encodeURIComponent(orgId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          acronym: String(acronym || "").trim(),
          category,
          status,
          adviser_name: String(adviserName || "").trim(),
          adviser_email: String(adviserEmail || "").trim(),
          storage_room: parseInt(room, 10) || 1,
          storage_cabinet: String(cabinet || "").trim(),
          storage_drawer: parseInt(drawer, 10) || 1,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to update organization.");
      }

      showToast?.({
        title: "Organization Updated",
        description: `${cleanName} saved successfully.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          title: "Update Failed",
          description: "Could not update organization record.",
        }),
        true
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-full rounded-2xl bg-white border border-border dark:bg-zinc-900 dark:border-border p-0 shadow-2xl overflow-hidden flex flex-col gap-0 font-jakarta">
        <DialogHeader className="p-6 pb-4 bg-white dark:bg-card border-b border-border dark:border-border text-left">
          <DialogTitle className="text-base font-bold text-gray-900 dark:text-zinc-50">
            Edit Organization Record
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Update official student organization accreditation information and filing coordinates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Helping Hands Community Organization"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Acronym
                </label>
                <Input
                  type="text"
                  placeholder="e.g. HHCO"
                  value={acronym}
                  onChange={(e) => setAcronym(e.target.value)}
                  className="h-10 rounded-xl text-xs uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  usePortal={false}
                  className="h-10 rounded-xl text-xs"
                >
                  <option value="Academic">Academic</option>
                  <option value="Non-Academic">Non-Academic</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Status
                </label>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  usePortal={false}
                  className="h-10 rounded-xl text-xs"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Archived">Archived</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Faculty Adviser Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Dr. Maria Santos"
                  value={adviserName}
                  onChange={(e) => setAdviserName(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Adviser Email
                </label>
                <Input
                  type="email"
                  placeholder="e.g. maria.santos@pup.edu.ph"
                  value={adviserEmail}
                  onChange={(e) => setAdviserEmail(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Filing Coordinates */}
            <div className="pt-2 border-t border-border/80 dark:border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-2">
                Physical Archive Coordinates
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Room
                  </label>
                  <Input
                    type="number"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Cabinet
                  </label>
                  <Input
                    type="text"
                    value={cabinet}
                    onChange={(e) => setCabinet(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Drawer
                  </label>
                  <Input
                    type="number"
                    value={drawer}
                    onChange={(e) => setDrawer(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 px-6 bg-gray-50/80 dark:bg-card border-t border-border dark:border-border flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 text-xs font-semibold rounded-xl bg-pup-maroon hover:bg-pup-darkMaroon text-white dark:bg-red-600 dark:hover:bg-red-500 dark:text-white shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              {isSubmitting ? "Saving Changes..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
