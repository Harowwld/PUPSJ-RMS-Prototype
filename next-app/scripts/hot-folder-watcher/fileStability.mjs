import fs from "node:fs";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForStableFile(filePath, {
  maxWaitMs = 30000,
  pollIntervalMs = 500,
  stableReadings = 2,
} = {}) {
  const start = Date.now();
  let previousSize = -1;
  let stableCount = 0;

  while (Date.now() - start < maxWaitMs) {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return false;
    }
    if (stat.size > 0 && stat.size === previousSize) {
      stableCount += 1;
      if (stableCount >= stableReadings) return true;
    } else {
      stableCount = 0;
    }
    previousSize = stat.size;
    await sleep(pollIntervalMs);
  }
  return false;
}
