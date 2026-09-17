import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [25, 50, 75, 85, 100],
  },
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: [
    "better-sqlite3",
    "pg",
    "pdfjs-dist",
    "adm-zip",
  ],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "framer-motion",
    ],
  },
};

export default nextConfig;

