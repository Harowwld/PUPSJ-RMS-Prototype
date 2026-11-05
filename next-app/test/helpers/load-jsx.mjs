import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const { transformSync } = require("next/dist/compiled/babel/core");
const modules = new Map();

// Run the real UI modules in Node without a running Next.js server.
export function loadJsx(relativePath) {
  const filename = path.resolve(appRoot, relativePath);
  if (modules.has(filename)) return modules.get(filename).exports;
  const loadedModule = { exports: {} };
  modules.set(filename, loadedModule);
  const { code } = transformSync(fs.readFileSync(filename, "utf8"), {
    babelrc: false,
    configFile: false,
    presets: [[require.resolve("next/dist/compiled/babel/preset-react"), { runtime: "automatic" }]],
    plugins: [require.resolve("next/dist/compiled/babel/plugin-transform-modules-commonjs")],
  });
  const moduleRequire = (specifier) => {
    if (specifier.startsWith("@/") || specifier.startsWith(".")) {
      const base = specifier.startsWith("@/")
        ? path.join("src", specifier.slice(2))
        : path.relative(appRoot, path.resolve(path.dirname(filename), specifier));
      const resolved = [base, `${base}.js`, `${base}.jsx`, path.join(base, "index.js"), path.join(base, "index.jsx")]
        .find((candidate) => fs.existsSync(path.join(appRoot, candidate)) && fs.statSync(path.join(appRoot, candidate)).isFile());
      if (!resolved) throw new Error(`Cannot resolve ${specifier}`);
      return loadJsx(resolved);
    }
    return require(specifier);
  };
  new Function("require", "module", "exports", code)(moduleRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
