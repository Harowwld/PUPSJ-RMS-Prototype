import { createInterface } from "node:readline";
import { appendFile, access, writeFile } from "node:fs/promises";

console.log(JSON.stringify({ type: "ready" }));

for await (const line of createInterface({ input: process.stdin })) {
  const command = JSON.parse(line);
  if (command.type === "warmup") {
    try {
      await access(process.env.OCR_TEST_WARMUP_FAILURE_FILE);
      console.log(JSON.stringify({ id: command.id, type: "warmup", ok: false, error: "TextRecognition.CRImageReaderError error 1." }));
    } catch {
      console.log(JSON.stringify({ id: command.id, type: "warmup", ok: true }));
    }
    continue;
  }

  if (command.filePath.endsWith("/hang-once")) {
    const marker = `${command.filePath}.marker`;
    try {
      await access(marker);
    } catch {
      await writeFile(marker, "timed out once");
      continue;
    }
  }

  if (command.filePath.endsWith("/crash-once")) {
    const marker = `${command.filePath}.marker`;
    try {
      await access(marker);
    } catch {
      await writeFile(marker, "crashed once");
      process.exit(1);
    }
  }

  if (command.filePath.endsWith("/vision-error")) {
    console.log(JSON.stringify({ id: command.id, type: "scan", ok: false, error: "TextRecognition.CRImageReaderError error 1." }));
    continue;
  }

  if (process.env.OCR_TEST_SCAN_LOG) {
    await appendFile(process.env.OCR_TEST_SCAN_LOG, `${command.filePath}\n`);
  }
  console.log(JSON.stringify({
    id: command.id,
    type: "scan",
    ok: true,
    result: { text: `${process.pid}:${command.filePath}`, pages: [{ observations: [] }] },
  }));
}
