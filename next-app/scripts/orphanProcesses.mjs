export const RMS_LAUNCHER_MARKERS = [
  "scripts/start-local-dev.mjs",
  "scripts/start-local-prod.mjs",
  "scripts/run-next-with-ocr.mjs",
];

export function parseProcessTable(output) {
  return output.split("\n").flatMap((line) => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
    if (!match) return [];
    return [{ pid: Number(match[1]), ppid: Number(match[2]), uid: Number(match[3]), command: match[4] }];
  });
}

export function findOrphanedRmsLaunchers(processes, { uid, workspacePath }) {
  return processes.filter((entry) =>
    entry.pid !== 1
    && entry.ppid === 1
    && entry.uid === uid
    && entry.cwd === workspacePath
    && RMS_LAUNCHER_MARKERS.some((marker) => entry.command.includes(marker))
  );
}

export function collectProcessTree(processes, rootPid) {
  const root = processes.find(({ pid }) => pid === rootPid) ?? { pid: rootPid, ppid: null };
  const tree = [root];
  const depths = new Map([[rootPid, 0]]);
  for (let index = 0; index < tree.length; index += 1) {
    const parentPid = tree[index].pid;
    const depth = depths.get(parentPid);
    for (const process of processes) {
      if (process.ppid !== parentPid || depths.has(process.pid)) continue;
      depths.set(process.pid, depth + 1);
      tree.push(process);
    }
  }
  return tree.sort((a, b) => (depths.get(b.pid) ?? 0) - (depths.get(a.pid) ?? 0));
}
