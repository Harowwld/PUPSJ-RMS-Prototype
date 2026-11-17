"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function LandingSectionPreview({ children }) {
  const [version, setVersion] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/landing/version", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.ok || !["classic", "enhanced"].includes(result.data?.version)) {
          throw new Error("Published landing page version unavailable.");
        }
        setVersion(result.data.version);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [attempt]);

  if (failed) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-destructive">Could not load the published landing page design.</p>
        <Button type="button" variant="outline" onClick={() => { setFailed(false); setAttempt(attempt + 1); }}>
          Retry Preview
        </Button>
      </div>
    );
  }

  if (!version) return <p role="status" className="text-sm text-muted-foreground">Loading the published design…</p>;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white text-[#1d1d1f] [--brand-accent:#800000] [--brand-foreground:#fff]">
      {children(version === "classic")}
    </div>
  );
}
