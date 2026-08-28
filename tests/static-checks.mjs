import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const names = await readdir(root);
const jsFiles = names.filter((name) => extname(name) === ".js");
for (const name of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", join(fileURLToPath(root), name)], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${name}: ${result.stderr}`);
}
for (const name of names.filter((name) => extname(name) === ".html")) {
  const html = await readFile(new URL(name, root), "utf8");
  if (!/^<!doctype html>/i.test(html.trimStart())) throw new Error(`${name}: DOCTYPE ausente`);
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const target = match[1];
    if (/^(https?:|#|mailto:)/.test(target) || target.includes("?") || target.startsWith("data:")) continue;
    const localTarget = target.startsWith("/") ? target.slice(1) : target;
    try { await stat(new URL(localTarget, root)); } catch { throw new Error(`${name}: referência ausente: ${target}`); }
  }
}

const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
if (manifest.display !== "standalone" || !manifest.start_url || !manifest.icons?.length) {
  throw new Error("Manifesto PWA incompleto");
}
for (const page of ["index.html", "cliente.html", "login.html"]) {
  const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
  if (!html.includes('rel="manifest"') || !html.includes('src="pwa.js"')) {
    throw new Error(`${page}: integração PWA ausente`);
  }
}
const serviceWorker = await readFile(new URL("../sw.js", import.meta.url), "utf8");
if (!serviceWorker.includes('addEventListener("fetch"') || !serviceWorker.includes('addEventListener("install"')) {
  throw new Error("Service worker incompleto");
}
const migrations = await readdir(new URL("../supabase/migrations/", import.meta.url));
if (migrations.length < 9) throw new Error("Conjunto de migrations incompleto");
console.log(`OK: ${jsFiles.length} scripts, ${names.filter((n) => extname(n) === ".html").length} páginas e ${migrations.length} migrations.`);
