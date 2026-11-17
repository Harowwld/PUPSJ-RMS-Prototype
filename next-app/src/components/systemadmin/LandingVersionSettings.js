"use client";

import Image from "next/image";
import LandingSections from "@/components/landing/LandingSections";
import LandingFooter from "@/components/landing/LandingFooter";
import RegistrarNotice from "@/components/landing/RegistrarNotice";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import useCmsDraft from "@/hooks/useCmsDraft";

export default function LandingVersionSettings({ hero, showToast, onDirtyChange }) {
  const [draft, setDraft] = useState(null);
  const { isDirty, savedData: saved, markSaved } = useCmsDraft(draft, onDirtyChange);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/landing/version?view=editor", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok || !json.ok) throw new Error(json.error);
        markSaved(json.data);
        setDraft(json.data);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError("Could not load the landing page version.");
      });
    return () => controller.abort();
  }, [loadAttempt, markSaved]);

  async function save(event) {
    event.preventDefault();
    if (saving || !isDirty) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/landing/version", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Could not save the landing page version.");
      markSaved(json.data);
      setDraft(json.data);
      showToast?.("Landing page settings published.");
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <form onSubmit={save} className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Public Landing Page Version</h2>
            <p className="mt-1 text-sm text-muted-foreground">Both versions share the content managed in this CMS.</p>
            {saved && (
              <p className="mt-2 text-xs text-muted-foreground">
                Currently live:{" "}
                <strong className="font-semibold text-foreground">
                  {saved.version === "enhanced" ? "New design" : "Original design"}
                </strong>
              </p>
            )}
          </div>
          {draft && (
            <div className="flex w-full flex-wrap items-end gap-3 sm:ml-auto sm:w-auto">
              <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium sm:min-w-60">
                Landing page version
                <Select value={draft.version} disabled={saving} onChange={(event) => setDraft({ ...draft, version: event.target.value })}>
                  <option value="classic">Original design (before DESIGN.md)</option>
                  <option value="enhanced">New design (DESIGN.md)</option>
                </Select>
              </label>
              <Button type="submit" disabled={saving || !isDirty}>
                {saving ? "Publishing…" : "Publish Settings"}
              </Button>
            </div>
          )}
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {draft ? (
          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              <span>Registrar notice title <span className="normal-case tracking-normal opacity-70">(optional)</span></span>
              <Input disabled={saving} value={draft.noticeTitle} placeholder="Registrar Office closure" maxLength={80} required={Boolean(draft.noticeDescription.trim())} onChange={(event) => setDraft({ ...draft, noticeTitle: event.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              <span>Last day shown <span className="normal-case tracking-normal opacity-70">(Manila)</span></span>
              <Input disabled={saving} type="date" value={draft.noticeEnd} required={Boolean(draft.noticeTitle.trim() || draft.noticeDescription.trim())} onChange={(event) => setDraft({ ...draft, noticeEnd: event.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
              <span>Registrar notice description <span className="normal-case tracking-normal opacity-70">(optional)</span></span>
              <Textarea disabled={saving} value={draft.noticeDescription} placeholder="The Registrar’s Office will be closed on Friday. Regular service resumes Monday." rows={3} maxLength={240} required={Boolean(draft.noticeTitle.trim())} onChange={(event) => setDraft({ ...draft, noticeDescription: event.target.value })} />
            </label>
          </div>
        ) : error ? (
          <Button type="button" variant="outline" onClick={() => { setError(""); setLoadAttempt(loadAttempt + 1); }}>Retry loading settings</Button>
        ) : <p role="status" className="text-sm text-muted-foreground">Loading version settings…</p>}
      </form>
      {draft && <LandingVersionPreview draft={draft} hero={hero} />}
    </div>
  );
}


function LandingVersionPreview({ draft, hero }) {
  const classic = draft.version === "classic";
  const photo = hero?.slides?.[0];
  const photoView = (
    <Image src={photo?.src || "/assets/pup/landing-1.jpg"} alt={photo?.alt || "PUP San Juan campus"}
      fill sizes="100vw" className="object-cover" />
  );

  return (
    <section aria-labelledby="landing-version-preview" className="mt-6 border-t border-border pt-5">
      <h3 id="landing-version-preview" className="text-base font-semibold">Landing Page Preview</h3>
      <div role="region" aria-label="Scrollable landing page preview" tabIndex={0} className="mt-4 max-h-[75vh] w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-white text-[#1d1d1f]">
        <div inert className="isolate overflow-x-hidden [--brand-accent:#800000] [--brand-foreground:#fff]">
          <div className={`flex items-center justify-between gap-4 border-b border-[#e6e6e8] px-4 py-2 text-xs ${classic ? "bg-[#f5f5f8]" : "bg-white"}`}>
            <div className="flex items-center gap-2 font-semibold">
              <Image src="/assets/branding/black-icon.png" alt={classic ? "eManage" : ""} width={16} height={16} />
              {!classic && "eManage"}
            </div>
            <span className="hidden sm:inline">About · How It Works · Catalog · FAQ · Contacts</span>
            <span className={`shrink-0 px-2 py-1 ${classic ? "" : "rounded-full border border-[#86868b]"}`}>Sign In</span>
          </div>
          {(draft.noticeTitle.trim() || draft.noticeDescription.trim()) && (
            <RegistrarNotice title={draft.noticeTitle.trim() || "Registrar notice"} description={draft.noticeDescription.trim()} />
          )}
          <div className={`relative isolate grid place-items-center px-5 text-center ${classic ? "min-h-72 overflow-hidden bg-zinc-900 py-10 text-white" : "py-10 sm:py-12"}`}>
            {classic && (
              <div className="absolute inset-0 -z-10">
                {photoView}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/50" />
                <div className="absolute inset-0 bg-[#800000]/25" />
              </div>
            )}
            <div className="min-w-0 max-w-xl break-words">
              <p className={`text-xl leading-tight sm:text-3xl ${classic ? "font-extrabold" : "font-semibold"}`}>
                <span className="block">{hero?.headlineLine1 || "Tanglaw ng Bayan,"}</span>
                <span className="block">{hero?.headlineLine2 || "Dambana ng Kagitingan."}</span>
              </p>
              {hero?.description && <p className={`mx-auto mt-3 max-w-md text-xs leading-relaxed ${classic ? "text-zinc-200" : "text-[#707070]"}`}>{hero.description}</p>}
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-semibold">
                <span className={`bg-[#800000] px-3 py-2 text-white ${classic ? "rounded-xl" : "rounded-full"}`}>{hero?.ctaText || "Request a Document"}</span>
                {!classic && <span className="rounded-full border border-[#86868b] px-3 py-2">Browse Documents</span>}
              </div>
            </div>
          </div>
          {!classic && <div className="relative aspect-[3/1] min-h-32 overflow-hidden bg-[#f5f5f7]">{photoView}</div>}
          <LandingSections classic={classic} contained />
          <LandingFooter classic={classic} />
        </div>
      </div>
    </section>
  );
}
