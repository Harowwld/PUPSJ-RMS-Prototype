export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initBackupScheduler } = await import("./lib/backupScheduler.js");
    initBackupScheduler();

    if (process.platform === "darwin" || process.platform === "win32") {
      const { startNativeOcrWorker } = await import("./lib/appleVisionOcr.js");
      try {
        startNativeOcrWorker();
        console.info("[OCR] Persistent native worker started.");
      } catch (error) {
          console.warn(`[OCR] Persistent worker startup failed; it will retry on the first scan: ${error.message}`);
      }
    }
  }
}
