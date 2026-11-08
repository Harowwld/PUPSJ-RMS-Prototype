import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [react({ include: /\.[jt]sx?$/, babel: { plugins: [["@babel/plugin-transform-react-jsx", { runtime: "automatic" }]] } })],
  resolve: {
    alias: { "@": path.resolve(rootDir, "src") },
  },
  test: {
    projects: [
      { test: { name: "unit", include: ["test/vitest/unit/**/*.test.js"], environment: "node" } },
      { test: { name: "components", include: ["test/vitest/components/**/*.test.js"], environment: "jsdom", setupFiles: ["test/vitest/setup/components.js"] } },
      { test: { name: "repository", include: ["test/vitest/integration/repos/**/*.test.js"], environment: "node", fileParallelism: false } },
      { test: { name: "api", include: ["test/vitest/integration/api/**/*.test.js"], environment: "node", fileParallelism: false } },
      { test: { name: "structural", include: ["test/vitest/structural/**/*.test.js"], environment: "node" } },
      { test: { name: "platform", include: ["test/vitest/platform/**/*.test.js"], environment: "node" } },
    ],
    exclude: [
      "node_modules/**", ".next/**", "coverage/**", "archive/**", "test/fixtures/**",
      "scripts/**", "e2e/**", "**/benchmark-*.mjs", "**/test_student_avatar.mjs",
      "**/*.spec.js", "**/*.test.mjs",
    ],
    passWithNoTests: false,
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json"],
      reportsDirectory: "./coverage/vitest",
      include: ["src/**/*.{js,jsx}"],
    },
  },
});
