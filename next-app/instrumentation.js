export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initBackupScheduler } = await import("./src/lib/backupScheduler.js");
    initBackupScheduler();
  }
}
