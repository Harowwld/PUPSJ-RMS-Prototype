"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const statuses = ["Pending", "InProgress", "Ready", "Completed", "Cancelled"];

export default function RegistrarODRSTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("Pending");
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await fetch("/api/registrar/document-requests", { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) setRows(json.data);
    else showToast?.({ title: "Load failed", description: json?.error || "Unable to load requests." }, true);
  };

  useEffect(() => {
    const timer = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const save = async () => {
    const res = await fetch(`/api/registrar/document-requests/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, message }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) return showToast?.({ title: "Update failed", description: json?.error || "Unable to save." }, true);
    setMessage("");
    setSelected(json.data);
    await load();
  };

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[1fr_360px]">
      <section className="rounded-brand bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Student Document Requests</h2>
        <div className="mt-4 space-y-2">
          {rows.length === 0 ? (
            <div className="rounded-brand border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
              <p className="text-sm font-semibold text-gray-700">No document requests yet.</p>
              <p className="mt-1 text-xs text-gray-500">New student requests will appear here.</p>
            </div>
          ) : (
            rows.map((item) => (
              <button key={item.id} onClick={() => { setSelected(item); setStatus(item.status); setMessage(""); }} className="block w-full rounded border p-3 text-left text-sm hover:bg-gray-50">
                <strong>{item.doc_type}</strong>
                <span className="ml-2 text-gray-600">{item.status}</span>
                <p className="text-gray-600">{item.student_name} · {item.student_no}</p>
              </button>
            ))
          )}
        </div>
      </section>
      <aside className="rounded-brand bg-white p-5 shadow-sm">
        {selected ? (
          <>
            <h3 className="font-bold">{selected.doc_type}</h3>
            <select className="mt-4 w-full rounded border p-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <textarea className="mt-3 w-full rounded border p-2 text-sm" placeholder="Student-visible update" value={message} onChange={(e) => setMessage(e.target.value)} />
            <Button className="mt-3 bg-pup-maroon text-white" onClick={save}>Publish update</Button>
          </>
        ) : (
          <p className="text-sm text-gray-600">Select a request.</p>
        )}
      </aside>
    </div>
  );
}
