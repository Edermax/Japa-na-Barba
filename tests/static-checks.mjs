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
  if (!html.includes("<!DOCTYPE html>")) throw new Error(`${name}: DOCTYPE ausente`);
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const target = match[1];
    if (/^(https?:|#|mailto:)/.test(target) || target.includes("?") || target.startsWith("data:")) continue;
    try { await stat(new URL(target, root)); } catch { throw new Error(`${name}: referência ausente: ${target}`); }
  }
}
const migrations = await readdir(new URL("../supabase/migrations/", import.meta.url));
if (migrations.length < 9) throw new Error("Conjunto de migrations incompleto");
console.log(`OK: ${jsFiles.length} scripts, ${names.filter((n) => extname(n) === ".html").length} páginas e ${migrations.length} migrations.`);
