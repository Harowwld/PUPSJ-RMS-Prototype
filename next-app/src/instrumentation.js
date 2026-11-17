export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initBackupScheduler } = await import("./lib/backupScheduler.js");
    initBackupScheduler();
    const { initWorkflowEmailWorker } = await import("./lib/workflowEmailWorker.js");
    initWorkflowEmailWorker();
    const { initWorkflowReminderScheduler } = await import("./lib/workflowReminderScheduler.js");
    initWorkflowReminderScheduler();
    const { initReceiptFileCleanup } = await import("./lib/receiptFileCleanup.js");
    initReceiptFileCleanup();
  }
}
