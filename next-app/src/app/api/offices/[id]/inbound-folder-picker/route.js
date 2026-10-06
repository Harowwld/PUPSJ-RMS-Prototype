import { NextResponse } from "next/server";
import { access, constants } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";

export const runtime = "nodejs";

function pickFolder() {
  return new Promise((resolve, reject) => {
    let command;
    let args;
    if (process.platform === "darwin") {
      command = "osascript";
      args = ["-e", "POSIX path of (choose folder with prompt \"Select scanner inbound folder\")"];
    } else if (process.platform === "win32") {
      command = "powershell.exe";
      args = ["-NoProfile", "-STA", "-Command", "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = 'Select scanner inbound folder'; if ($dialog.ShowDialog() -eq 'OK') { [Console]::Write($dialog.SelectedPath) }"];
    } else {
      command = "zenity";
      args = ["--file-selection", "--directory", "--title=Select scanner inbound folder"];
    }

    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 || !stdout.trim()) {
        const error = new Error(stderr.trim() || "Folder selection was cancelled or the native picker is unavailable.");
        error.cancelled = code === 1 || code === 255;
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export async function POST(req, { params }) {
  const auth = await requireSystemAdmin(req);
  if (auth.error || !auth.user) {
    return createAuthErrorResponse(auth.error || "System administrator access required", auth.error?.startsWith("Access denied") ? 403 : 401);
  }

  try {
    const folder = await pickFolder();
    const resolved = path.resolve(folder);
    await access(resolved, constants.R_OK | constants.W_OK | constants.X_OK);
    return NextResponse.json({ ok: true, data: { path: resolved } });
  } catch (error) {
    if (error.cancelled) return NextResponse.json({ ok: false, cancelled: true }, { status: 200 });
    return NextResponse.json({ ok: false, error: "Could not select a readable folder on the application host. Run the app and watcher on the scanner computer, and ensure a native folder picker is available." }, { status: 503 });
  }
}
