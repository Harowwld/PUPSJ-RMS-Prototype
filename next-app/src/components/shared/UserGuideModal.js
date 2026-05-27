"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

const TABS = [
  { id: "general", label: "General", icon: "ph-bold ph-info" },
  { id: "staff", label: "Staff Guide", icon: "ph-bold ph-users-three" },
  { id: "admin", label: "Admin Guide", icon: "ph-bold ph-shield-star" },
];

export default function UserGuideModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl w-[95vw] p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl flex flex-col max-h-[90vh] rounded-brand dark:bg-card dark:border-white/10">
        <Tabs
          defaultValue="general"
          value={activeTab}
          onValueChange={setActiveTab}
          orientation="vertical"
          className="flex flex-col h-full overflow-hidden lg:flex-row"
        >
          {/* Sidebar Navigation */}
          <aside className="w-full lg:w-64 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200 p-4 shrink-0 dark:bg-card dark:border-white/10">
            <div className="mb-6 px-2 hidden lg:block">
              <h2 className="text-xl font-black text-pup-maroon dark:text-primary tracking-tight">User Guide</h2>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1 dark:text-zinc-400">Documentation</p>
            </div>

            <TabsList className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 h-auto bg-transparent rounded-none">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-brand text-sm font-bold transition-all whitespace-nowrap lg:whitespace-normal data-active:bg-pup-maroon data-active:text-white data-active:shadow-md data-active:shadow-red-900/20 text-gray-600 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 border-0 justify-start w-full dark:text-zinc-300 dark:bg-red-950/30`}
                >
                  <i className={`${tab.icon} text-lg`}></i>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <DialogHeader className="p-6 border-b border-gray-100 shrink-0 bg-white dark:border-white/10 dark:bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight dark:text-zinc-50">
                    {TABS.find(t => t.id === activeTab)?.label}
                  </DialogTitle>
                  <DialogDescription className="text-sm font-medium text-gray-500 mt-1 dark:text-zinc-400">
                    {activeTab === 'general' && "Welcome to the PUP E-MANAGE Student Record Keeping System."}
                    {activeTab === 'staff' && "Learn how to manage students, scan documents, and process requests."}
                    {activeTab === 'admin' && "Technical procedures for system administrators and records heads."}
                  </DialogDescription>
                </div>
                <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon dark:text-primary flex items-center justify-center shrink-0 dark:bg-red-950/30">
                  <i className={`${TABS.find(t => t.id === activeTab)?.icon.replace('ph-bold', 'ph-duotone')} text-2xl`}></i>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto bg-white font-inter dark:bg-card">
              <TabsContent value="general" className="p-8 m-0 border-0 focus-visible:ring-0">
                <div className="animate-fade-in space-y-8">
                  <div className="bg-blue-50 border border-blue-100 rounded-brand p-4 flex gap-4 dark:bg-blue-950/30">
                    <i className="ph-fill ph-info text-blue-500 text-2xl shrink-0"></i>
                    <div>
                      <h4 className="font-black text-blue-900 text-sm uppercase tracking-wide">Notice</h4>
                      <p className="text-sm text-blue-800 font-medium leading-relaxed mt-1">
                        This guide covers the digital mechanics of the Records Keeping System Prototype. For institutional policies, refer to the official PUP Records Management Manual.
                      </p>
                    </div>
                  </div>

                  <section>
                    <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2 dark:text-zinc-50">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 dark:bg-muted dark:text-zinc-300">
                        <i className="ph-bold ph-stack"></i>
                      </div>
                      Core Principles
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { title: "Security", icon: "ph-lock-key", desc: "All student records are encrypted and access is audited in real-time." },
                        { title: "Efficiency", icon: "ph-lightning", desc: "OCR technology extracts data automatically to reduce manual entry." },
                        { title: "Organization", icon: "ph-layout", desc: "Digital records mirror physical storage for seamless retrieval." }
                      ].map((item, i) => (
                        <div key={i} className="p-4 rounded-brand border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">
                          <i className={`ph-bold ${item.icon} text-pup-maroon dark:text-primary text-xl mb-3 block`}></i>
                          <h5 className="font-bold text-gray-900 text-sm dark:text-zinc-50">{item.title}</h5>
                          <p className="text-xs text-gray-600 mt-2 font-medium leading-relaxed dark:text-zinc-300">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </TabsContent>

              <TabsContent value="staff" className="p-8 m-0 border-0 focus-visible:ring-0">
                <div className="animate-fade-in space-y-8">
                  <section className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2 dark:text-zinc-50 dark:border-white/10">
                      <i className="ph-bold ph-magnifying-glass text-pup-maroon dark:text-primary"></i>
                      Document Retrieval
                    </h3>
                    <div className="bg-white rounded-brand border border-gray-200 overflow-hidden shadow-sm dark:bg-card dark:border-white/10">
                      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between dark:bg-card dark:border-white/10">
                        <span className="text-xs font-black text-gray-700 uppercase dark:text-zinc-200">Workflow</span>
                        <span className="px-2 py-0.5 rounded bg-pup-maroon text-[9px] font-black text-white uppercase tracking-widest">Standard</span>
                      </div>
                      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-red-100 text-pup-maroon dark:text-primary flex items-center justify-center text-xs font-black shrink-0">1</div>
                            <p className="text-sm font-medium text-gray-700 dark:text-zinc-200">Search for the student using the <strong>Documents</strong> tab filter.</p>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-red-100 text-pup-maroon dark:text-primary flex items-center justify-center text-xs font-black shrink-0">2</div>
                            <p className="text-sm font-medium text-gray-700 dark:text-zinc-200">Check the <strong>Status</strong> column. If <span className="text-red-600 font-bold underline">Missing</span>, you must retrieve the physical file.</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-red-100 text-pup-maroon dark:text-primary flex items-center justify-center text-xs font-black shrink-0">3</div>
                            <p className="text-sm font-medium text-gray-700 dark:text-zinc-200">Use the <strong>Request Details</strong> pane to see exactly where the file is stored (Room, Cabinet, Drawer).</p>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-red-100 text-pup-maroon dark:text-primary flex items-center justify-center text-xs font-black shrink-0">4</div>
                            <p className="text-sm font-medium text-gray-700 dark:text-zinc-200">Click <strong>Locate on Map</strong> to visualize the drawer&apos;s position in the room.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2 dark:text-zinc-50 dark:border-white/10">
                      <i className="ph-bold ph-scan text-pup-maroon dark:text-primary"></i>
                      Scanning & Digitization
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-brand border border-gray-200 bg-white flex gap-4 dark:border-white/10 dark:bg-card">
                        <i className="ph-bold ph-file-pdf text-3xl text-red-500 shrink-0"></i>
                        <div>
                          <h5 className="font-bold text-gray-900 text-sm dark:text-zinc-50">Batch Scanning</h5>
                          <p className="text-xs text-gray-600 mt-1 font-medium leading-relaxed dark:text-zinc-300">Use the <strong>Scan/Upload</strong> tab to upload documents. OCR will automatically attempt to read the Student Number.</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-brand border border-gray-200 bg-white flex gap-4 dark:border-white/10 dark:bg-card">
                        <i className="ph-bold ph-shield-check text-3xl text-green-500 shrink-0"></i>
                        <div>
                          <h5 className="font-bold text-gray-900 text-sm dark:text-zinc-50">Verification</h5>
                          <p className="text-xs text-gray-600 mt-1 font-medium leading-relaxed dark:text-zinc-300">Always verify the OCR output. Incorrect student numbers will cause the document to be unsearchable.</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </TabsContent>

              <TabsContent value="admin" className="p-8 m-0 border-0 focus-visible:ring-0">
                <div className="animate-fade-in space-y-8">
                  <section className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2 dark:text-zinc-50 dark:border-white/10">
                      <i className="ph-bold ph-layout text-pup-maroon dark:text-primary"></i>
                      Storage Configuration
                    </h3>
                    <p className="text-sm text-gray-600 font-medium leading-relaxed dark:text-zinc-300">
                      Administrators manage the 2D visual map of the archive rooms. When physical cabinets are moved, the digital layout must be updated in the <strong>Storage Layout Editor</strong>.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-brand p-4 flex gap-3 dark:bg-amber-950/30">
                      <i className="ph-fill ph-warning text-amber-500 text-xl shrink-0 mt-0.5"></i>
                      <p className="text-xs text-amber-900 m-0 font-bold">
                        DANGER: Removing a room or cabinet that currently contains student records is restricted. You must reassign all student locations before deleting storage entities.
                      </p>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2 dark:text-zinc-50 dark:border-white/10">
                      <i className="ph-bold ph-activity text-pup-maroon dark:text-primary"></i>
                      Accountability & Security
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-4 p-4 rounded-brand border border-gray-200 bg-white dark:border-white/10 dark:bg-card">
                        <i className="ph-bold ph-list-magnifying-glass text-xl text-gray-600 shrink-0 dark:text-zinc-300"></i>
                        <div>
                          <h5 className="font-bold text-gray-900 text-sm dark:text-zinc-50">Audit Logs</h5>
                          <p className="text-xs text-gray-600 mt-1 font-medium dark:text-zinc-300">Every action (login, upload, delete) is tracked by IP address and timestamp. Use the export feature for compliance reporting.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 rounded-brand border border-gray-200 bg-white dark:border-white/10 dark:bg-card">
                        <i className="ph-bold ph-database text-xl text-gray-600 shrink-0 dark:text-zinc-300"></i>
                        <div>
                          <h5 className="font-bold text-gray-900 text-sm dark:text-zinc-50">Backups</h5>
                          <p className="text-xs text-gray-600 mt-1 font-medium dark:text-zinc-300">Regularly perform backups from the Maintenance tab. Backups include all database records and can be encrypted for off-site storage.</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </TabsContent>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0 gap-3 dark:bg-card dark:border-white/10">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-6 h-11 border-gray-300 font-bold rounded-brand dark:border-white/10"
              >
                Close
              </Button>
              <Button
                onClick={onClose}
                className="px-6 h-11 bg-linear-to-b from-red-800 to-pup-maroon border-[3px] border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 rounded-brand"
              >
                Acknowledge <i className="ph-bold ph-check ml-2"></i>
              </Button>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

