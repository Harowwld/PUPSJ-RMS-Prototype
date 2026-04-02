"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";

function randomRef() {
  return `scan-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/** Secure context: HTTPS or localhost — required for `navigator.mediaDevices` on most mobile browsers */
function canUseCamera() {
  if (typeof navigator === "undefined") return false;
  const md = navigator.mediaDevices;
  return typeof md?.getUserMedia === "function";
}

function detectPlatform() {
  if (typeof navigator === "undefined") {
    return { isAndroid: false, isIOS: false };
  }
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  return { isAndroid, isIOS };
}

export default function ScanLinkPage() {
  const [state, setState] = useState("linking");
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [token, setToken] = useState("");
  const [phoneLabel, setPhoneLabel] = useState("");
  const [filename, setFilename] = useState("phone-scan.pdf");
  const [cameraError, setCameraError] = useState("");
  const [videoStream, setVideoStream] = useState(null);
  const [captured, setCaptured] = useState([]);
  const [busy, setBusy] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  /** null until client mount — avoids auto-camera before we know Android vs iOS */
  const [platform, setPlatform] = useState(null);
  const fileInputRef = useRef(null);

  const canSend = useMemo(() => state === "paired" && sessionId && token, [state, sessionId, token]);
  const cameraSupported = useMemo(() => canUseCamera(), []);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const sid = parseInt(String(url.searchParams.get("session") || ""), 10);
    const tok = String(url.searchParams.get("token") || "").trim();
    setSessionId(Number.isFinite(sid) ? sid : null);
    setToken(tok);
    setPhoneLabel(
      `${navigator?.platform || "Phone"} ${navigator?.userAgentData?.mobile ? "Mobile" : "Browser"}`
    );
  }, []);

  useEffect(() => {
    if (!sessionId || !token) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/scan-session/${sessionId}/complete-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, phoneLabel }),
        });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok || !json?.ok) {
          setState("error");
          setMessage(json?.error || "Link failed");
          return;
        }
        setState("paired");
        setMessage("Phone linked. Keep this page open while scanning.");
      } catch {
        if (!alive) return;
        setState("error");
        setMessage("Unable to connect");
      }
    })();
    return () => {
      alive = false;
    };
  }, [sessionId, token, phoneLabel]);

  useEffect(() => {
    if (!canSend) return;
    const timer = setInterval(() => {
      fetch(`/api/scan-session/${sessionId}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => {
        // ignore heartbeat failures
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [canSend, sessionId, token]);

  /** iOS / desktop: auto-request camera when paired. Android: use "Start camera" button instead. */
  useEffect(() => {
    if (state !== "paired" || platform === null) return;
    if (!canUseCamera()) {
      if (platform.isIOS) {
        setCameraError(
          "Camera is not available on this connection. iPhone Safari only allows the camera on HTTPS (or localhost). Use “Choose PDF” below, or open this app through an HTTPS tunnel (e.g. ngrok / cloudflared) so the address starts with https://."
        );
      } else if (platform.isAndroid) {
        setCameraError(
          "Camera is not available on this connection. On Android Chrome, the camera usually requires HTTPS (except localhost). Tap “Start camera” after using HTTPS, or use “Choose PDF” below."
        );
      } else {
        setCameraError(
          "Camera is not available (secure context required). Use HTTPS or localhost, or choose a PDF below."
        );
      }
      return;
    }
    if (platform.isAndroid) {
      setCameraError("");
      return;
    }

    let stream;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        stream = s;
        setVideoStream(s);
      } catch (e) {
        setCameraError(e?.message || "Camera permission denied");
      }
    })();
    return () => {
      try {
        stream?.getTracks?.().forEach((t) => t.stop());
      } catch {
        // ignore
      }
    };
  }, [state, platform]);

  useEffect(() => {
    return () => {
      try {
        videoStream?.getTracks?.().forEach((t) => t.stop());
      } catch {
        // ignore
      }
    };
  }, [videoStream]);

  const startAndroidCamera = useCallback(async () => {
    if (!canUseCamera()) return;
    setCameraError("");
    setCameraStarting(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setVideoStream(s);
      setMessage("Camera ready. Capture one or more pages, then upload the PDF.");
    } catch (e) {
      setCameraError(e?.message || "Camera permission denied");
    } finally {
      setCameraStarting(false);
    }
  }, []);

  const capturePage = async () => {
    setCameraError("");
    try {
      const video = document.getElementById("scanVideo");
      if (!video) throw new Error("Video not ready");
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, w, h);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85)
      );
      if (!blob) throw new Error("Capture failed");
      setCaptured((prev) => {
        const next = [...prev, blob];
        setMessage(`Captured ${next.length} page(s).`);
        return next;
      });
    } catch (e) {
      setCameraError(e?.message || "Capture failed");
    }
  };

  const uploadPdf = async () => {
    if (!canSend) return;
    if (captured.length === 0) {
      setMessage("Capture at least one page first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const pdf = await PDFDocument.create();
      for (const blob of captured) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const img = await pdf.embedJpg(bytes);
        const page = pdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const pdfBytes = await pdf.save();
      const file = new File([pdfBytes], filename || "phone-scan.pdf", {
        type: "application/pdf",
      });

      const form = new FormData();
      form.set("token", token);
      form.set("clientRef", randomRef());
      form.set("file", file);

      const res = await fetch(`/api/scan-session/${sessionId}/upload`, {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Upload failed");
      setMessage("Uploaded PDF to staff tab.");
      setCaptured([]);
    } catch (err) {
      setMessage(err?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const uploadPickedPdf = async (fileList) => {
    const file = fileList?.[0];
    if (!file || !canSend) return;
    if (String(file.type || "") !== "application/pdf") {
      setMessage("Please choose a PDF file.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("token", token);
      form.set("clientRef", randomRef());
      form.set("file", file);
      const res = await fetch(`/api/scan-session/${sessionId}/upload`, {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Upload failed");
      setMessage("Uploaded PDF to staff tab.");
    } catch (err) {
      setMessage(err?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendIncoming = async () => {
    try {
      const res = await fetch(`/api/scan-session/${sessionId}/incoming`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          clientRef: randomRef(),
          filename,
          mimeType: "image/jpeg",
          sizeBytes: 100000,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Sync failed");
      setMessage("Incoming metadata synced to staff tab.");
    } catch (err) {
      setMessage(err?.message || "Sync failed");
    }
  };

  const isAndroid = platform?.isAndroid;
  const isIOS = platform?.isIOS;
  const showAndroidCameraStart =
    canSend &&
    cameraSupported &&
    isAndroid &&
    !videoStream &&
    state === "paired";
  const showCameraScanner = cameraSupported && !!videoStream;

  return (
    <main className="min-h-screen bg-gray-50 p-5 font-inter">
      <div className="max-w-md mx-auto rounded-brand border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-pup-maroon">Phone Scanner Link</h1>
        <p className="mt-1 text-sm text-gray-600 font-medium">
          Link and sync status for staff Scan & Upload.
        </p>
        <div className="mt-4 text-sm font-bold text-gray-800">
          Status:{" "}
          <span className="text-pup-maroon">
            {state === "linking" ? "Linking..." : state === "paired" ? "Paired" : "Error"}
          </span>
        </div>
        {message ? <div className="mt-2 text-xs text-gray-600 font-medium">{message}</div> : null}

        {showAndroidCameraStart ? (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-600 mb-2">
              Android: allow camera access, then capture pages. Pages are combined into one PDF for staff.
            </p>
            <button
              type="button"
              disabled={busy || cameraStarting}
              onClick={startAndroidCamera}
              className={`w-full h-12 rounded-brand font-bold text-sm ${
                busy || cameraStarting
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-pup-maroon text-white hover:bg-red-900"
              }`}
            >
              {cameraStarting ? "Opening camera…" : "Start camera & scan"}
            </button>
          </div>
        ) : null}

        <div className="mt-5">
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Capture filename</label>
          <input
            className="form-input"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="phone-scan.pdf"
          />
        </div>

        {cameraError ? (
          <div className="mt-3 p-2 rounded-brand border border-amber-200 bg-amber-50 text-amber-950 text-xs font-medium leading-relaxed">
            {cameraError}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          <div className="text-xs font-bold text-gray-700 uppercase">
            {isAndroid && cameraSupported
              ? "Or upload an existing PDF"
              : isIOS
                ? "Upload a PDF (recommended on iPhone over HTTP)"
                : "Or upload a PDF from this phone"}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => uploadPickedPdf(e.target.files)}
          />
          <button
            type="button"
            disabled={!canSend || busy}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-11 rounded-brand font-bold text-sm border ${
              !canSend || busy
                ? "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-200"
                : "bg-white border border-gray-300 text-gray-800 hover:border-pup-maroon"
            }`}
          >
            {busy ? "Uploading..." : "Choose PDF from phone"}
          </button>
        </div>

        {showCameraScanner ? (
          <>
            <div className="mt-4 border border-gray-200 rounded-brand overflow-hidden bg-black min-h-[200px]">
              <video
                id="scanVideo"
                className="w-full h-auto min-h-[200px]"
                autoPlay
                playsInline
                muted
                ref={(node) => {
                  if (!node || !videoStream) return;
                  if (node.srcObject !== videoStream) node.srcObject = videoStream;
                }}
              />
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={!canSend || busy || !videoStream}
                onClick={capturePage}
                className={`flex-1 h-11 rounded-brand font-bold text-sm ${
                  !canSend || busy || !videoStream
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-white border border-gray-300 text-gray-800 hover:border-pup-maroon"
                }`}
              >
                Capture page ({captured.length})
              </button>
              <button
                type="button"
                disabled={!canSend || busy || captured.length === 0}
                onClick={uploadPdf}
                className={`flex-1 h-11 rounded-brand font-bold text-sm ${
                  !canSend || busy || captured.length === 0
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-pup-maroon text-white hover:bg-red-900"
                }`}
              >
                {busy ? "Uploading..." : "Upload scanned PDF"}
              </button>
            </div>
          </>
        ) : null}

        <button
          type="button"
          disabled={!canSend}
          onClick={sendIncoming}
          className={`mt-4 w-full h-11 rounded-brand font-bold text-sm ${
            canSend
              ? "bg-pup-maroon text-white hover:bg-red-900"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Sync Incoming Metadata
        </button>
      </div>
    </main>
  );
}
