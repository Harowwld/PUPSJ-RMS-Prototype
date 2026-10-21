/**
 * Pure transition evaluator for external storage drive state changes.
 * 
 * Determines whether a hardware drive change event (connected or disconnected)
 * has occurred, prevents spurious disconnect alerts from simulation mode,
 * preserves disconnected drive metadata, and chooses the appropriate presentation
 * channel (modal when viewing backup management, toast when on other tabs).
 */

export function evaluateDriveStateTransition({
  prev = null,
  current = null,
  lastRealDrive = null,
  currentView = "",
} = {}) {
  const currentConnected = Boolean(current?.connected);
  const currentIsEmulated = Boolean(current?.isEmulated);

  const nextState = current
    ? {
        connected: currentConnected,
        isEmulated: currentIsEmulated,
        label: current.label || null,
        path: current.path || null,
        freeFormatted: current.freeFormatted || null,
        totalFormatted: current.totalFormatted || null,
      }
    : null;

  let nextLastRealDrive = lastRealDrive ? { ...lastRealDrive } : null;
  if (currentConnected && !currentIsEmulated) {
    nextLastRealDrive = {
      label: current.label || "PUPSJ_BACKUP",
      path: current.path || null,
      freeFormatted: current.freeFormatted || null,
      totalFormatted: current.totalFormatted || null,
    };
  }

  // 1. First poll on mount: establish baseline state without firing any event
  if (prev === null) {
    return {
      nextState,
      nextLastRealDrive,
      event: null,
    };
  }

  const prevConnected = Boolean(prev.connected);
  const prevIsEmulated = Boolean(prev.isEmulated);

  const isBackupView = currentView === "backup" || currentView === "system";
  const channel = isBackupView ? "modal" : "toast";

  // 2. Real physical drive connected:
  // Transition from disconnected -> connected, and current is NOT emulated
  if (!prevConnected && currentConnected && !currentIsEmulated) {
    return {
      nextState,
      nextLastRealDrive,
      event: {
        type: "connected",
        channel,
        label: current.label || current.path || "PUPSJ_BACKUP",
        path: current.path || null,
        freeFormatted: current.freeFormatted || null,
        totalFormatted: current.totalFormatted || null,
      },
    };
  }

  // 3. Real physical drive disconnected:
  // Transition from connected -> disconnected, where previous state was a REAL drive (NOT emulated)
  if (prevConnected && !prevIsEmulated && !currentConnected) {
    const fallbackLabel = prev.label || "PUPSJ_BACKUP";
    const driveInfo = nextLastRealDrive || {
      label: fallbackLabel,
      path: prev.path || null,
      freeFormatted: prev.freeFormatted || null,
      totalFormatted: prev.totalFormatted || null,
    };

    return {
      nextState,
      nextLastRealDrive,
      event: {
        type: "disconnected",
        channel,
        label: driveInfo.label || fallbackLabel,
        path: driveInfo.path || null,
        freeFormatted: driveInfo.freeFormatted || null,
        totalFormatted: driveInfo.totalFormatted || null,
      },
    };
  }

  // 4. Transitions involving simulation/demo mode:
  // - Turning ON demo simulation (was disconnected, now connected with isEmulated: true)
  // - Turning OFF demo simulation (was connected with isEmulated: true, now disconnected)
  // These are intentional developer/demo actions and must NEVER trigger a real hardware disconnect modal or toast.
  return {
    nextState,
    nextLastRealDrive,
    event: null,
  };
}
