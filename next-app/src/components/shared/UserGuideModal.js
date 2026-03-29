"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function UserGuideModal({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl w-[90vw] p-0 overflow-hidden bg-gray-50 border-gray-200 shadow-2xl sm:rounded-sm rounded-sm flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 bg-white border-b border-gray-200 pb-5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-pup-maroon flex items-center justify-center border border-red-100 shadow-sm shrink-0">
              <i className="ph-duotone ph-book-open-text text-2xl"></i>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">
                PUP E-Manage User Guide
              </DialogTitle>
              <p className="text-sm font-medium text-gray-500 mt-0.5">
                Official documentation and core system mechanics placeholder.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 font-inter">
          <div className="prose prose-sm sm:prose-base max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-strong:text-gray-900 prose-a:text-pup-maroon prose-li:text-gray-600">
            {/* Disclaimer */}
            <div className="bg-blue-50 border border-blue-200 rounded-brand p-4 mb-8 flex gap-3">
              <i className="ph-fill ph-info text-blue-500 text-xl shrink-0 mt-0.5"></i>
              <p className="text-sm text-blue-900 m-0 font-medium">
                <strong>Preliminary Document:</strong> This is a temporary structural placeholder detailing the mechanics of the dashboard. This interface will eventually be replaced with an integrated PDF reader containing the finalized legal PUP Records Manual.
              </p>
            </div>

            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <i className="ph-fill ph-users-three text-pup-maroon"></i> System Roles
            </h3>
            <ul className="space-y-3 mb-8">
              <li>
                <strong>Staff (Registrar/Records)</strong>: Responsible for securely uploading physical documents (201 Files, Grade Sheets, Clearances), associating metadata, and issuing secure document retrieval queries.
              </li>
              <li>
                <strong>Administrators</strong>: Retain access to the Staff interface but also command the Administrative Backend. This includes managing staff credentials, auditing system logs, enforcing data backups, and monitoring system health.
              </li>
            </ul>

            <hr className="border-gray-200 my-8" />

            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <i className="ph-fill ph-folder-open text-pup-maroon"></i> Record Management (Staff Module)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-5 rounded-brand border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-2 m-0 text-base">
                  <i className="ph-duotone ph-upload-simple"></i> Uploading Files
                </h4>
                <p className="text-xs text-gray-600 m-0">
                  Navigate to the <strong>Upload</strong> tab. Utilize the robust scanner integration (or drag-and-drop mechanism) to securely digitize physical hardware into the encrypted repository. Ensure document types are tightly categorized using the intelligent dropdown selector.
                </p>
              </div>
              <div className="bg-white p-5 rounded-brand border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-2 m-0 text-base">
                  <i className="ph-duotone ph-magnifying-glass"></i> Searching Records
                </h4>
                <p className="text-xs text-gray-600 m-0">
                  In the <strong>Documents</strong> tab, input a Student ID or Name to securely pull indexed files. Preview files natively using the built-in PDF rendering engine before issuing formal print or destructive requests.
                </p>
              </div>
            </div>

            <hr className="border-gray-200 my-8" />

            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <i className="ph-fill ph-shield-star text-amber-600"></i> Administrative Operations
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-gray-900 m-0">Audit Logs & Transparency</h4>
                <p className="text-sm text-gray-600 mt-1 mb-0">
                  The system enforces strict compliance tracking. Every document uploaded, identity modified, or system backup created is securely logged and time-stamped in the <strong>Audit Logs</strong> tab for forensic review.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 m-0">Backups & Disaster Recovery</h4>
                <p className="text-sm text-gray-600 mt-1 mb-0">
                  Under <strong>Backup & Maintenance</strong>, administrators must periodically snapshot the database to ensure resilience against data degradation. These encrypted `.sqlite` snapshots can be restored instantly during critical failure protocols.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-gray-200 flex justify-end shrink-0">
          <Button
            onClick={onClose}
            className="px-6 h-10 bg-gray-900 hover:bg-black text-white font-bold shadow-sm flex items-center gap-2"
          >
            Acknowledge <i className="ph-bold ph-check"></i>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
