import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

function parseTesseractTsv(tsv, pageIndex) {
  const rows = tsv.split(/\r?\n/).filter(Boolean).map((row) => row.split("\t"));
  const header = rows.shift();
  const columns = Object.fromEntries(header.map((name, index) => [name, index]));
  const value = (row, name) => row[columns[name]];
  const page = rows.find((row) => Number(value(row, "level")) === 1);
  const width = Number(value(page || [], "width"));
  const height = Number(value(page || [], "height"));
  if (!width || !height) throw new Error("Tesseract did not return image dimensions.");

  const lines = new Map();
  const observations = [];
  for (const row of rows) {
    if (Number(value(row, "level")) !== 5) continue;
    const text = String(value(row, "text") || "").trim();
    const confidence = Number(value(row, "conf"));
    const left = Number(value(row, "left"));
    const top = Number(value(row, "top"));
    const boxWidth = Number(value(row, "width"));
    const boxHeight = Number(value(row, "height"));
    if (!text || confidence < 0 || boxWidth <= 0 || boxHeight <= 0) continue;

    const key = ["block_num", "par_num", "line_num"].map((field) => value(row, field)).join(":");
    if (!lines.has(key)) lines.set(key, []);
    lines.get(key).push(text);
    observations.push({
      text,
      x: left / width,
      y: top / height,
      width: boxWidth / width,
      height: boxHeight / height,
    });
  }

  return {
    page: { pageIndex, width, height, observations },
    text: Array.from(lines.values(), (words) => words.join(" ")).join("\n"),
  };
}

async function recognizeImage(filePath, pageIndex) {
  const { stdout } = await execFileAsync("tesseract", [filePath, "stdout", "tsv"], {
    maxBuffer: 32 * 1024 * 1024,
  });
  return parseTesseractTsv(stdout, pageIndex);
}

export async function performTesseractOcr(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const isPdf = extension === ".pdf";
  let imagePaths = [filePath];
  let tempDir;

  if (isPdf) {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "pupsj-ocr-"));
    const prefix = path.join(tempDir, "page");
    try {
      await execFileAsync("pdftoppm", ["-png", "-r", "300", filePath, prefix], {
        maxBuffer: 8 * 1024 * 1024,
      });
      imagePaths = (await readdir(tempDir))
        .filter((name) => /^page-\d+\.png$/.test(name))
        .sort((a, b) => Number(a.match(/page-(\d+)/)[1]) - Number(b.match(/page-(\d+)/)[1]))
        .map((name) => path.join(tempDir, name));
      if (imagePaths.length === 0) throw new Error("Could not render any pages from the PDF.");
    } catch (error) {
      await rm(tempDir, { recursive: true, force: true });
      throw error;
    }
  }

  try {
    const pages = [];
    const text = [];
    for (const [pageIndex, imagePath] of imagePaths.entries()) {
      const result = await recognizeImage(imagePath, pageIndex);
      pages.push(result.page);
      text.push(result.text);
    }
    return { text: text.filter(Boolean).join("\n"), pages };
  } finally {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  }
}
