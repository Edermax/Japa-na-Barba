import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const origin = "https://ogritech.com.br";

function matches(html, pattern) {
  return [...html.matchAll(pattern)];
}

export function inspectHtml(html, url) {
  const failures = [];
  const ids = matches(html, /\sid=["']([^"']+)["']/gi).map((item) => item[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const imagesWithoutAlt = matches(html, /<img\b(?![^>]*\balt=)[^>]*>/gi).length;
  const blankLinksWithoutNoopener = matches(html, /<a\b(?=[^>]*target=["']_blank["'])(?![^>]*rel=["'][^"']*noopener)[^>]*>/gi).length;
  const buttonsWithoutName = matches(html, /<button\b([^>]*)>([\s\S]*?)<\/button>/gi).filter((item) => {
    const attrs = item[1];
    const text = item[2].replace(/<[^>]+>/g, "").trim();
    return !text && !/aria-label=["'][^"']+["']/i.test(attrs) && !/title=["'][^"']+["']/i.test(attrs);
  }).length;
  const h1Count = matches(html, /<h1(?:\s|>)/gi).length;
  if (!/<html[^>]+lang=["']pt-BR["']/i.test(html)) failures.push("Idioma pt-BR ausente");
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) failures.push("Viewport ausente");
  if (matches(html, /<title>[^<]+<\/title>/gi).length !== 1) failures.push("Título ausente ou duplicado");
  if (h1Count !== 1) failures.push(`Quantidade de H1: ${h1Count}`);
  if (!/<main(?:\s|>)/i.test(html)) failures.push("Elemento main ausente");
  if (duplicateIds.length) failures.push(`IDs duplicados: ${duplicateIds.join(", ")}`);
  if (imagesWithoutAlt) failures.push(`${imagesWithoutAlt} imagem(ns) sem atributo alt`);
  if (blankLinksWithoutNoopener) failures.push(`${blankLinksWithoutNoopener} link(s) _blank sem noopener`);
  if (buttonsWithoutName) failures.push(`${buttonsWithoutName} botão(ões) sem nome acessível`);
  return { url, failures, duplicateIds, imagesWithoutAlt, blankLinksWithoutNoopener, buttonsWithoutName, h1Count };
}

async function fetchPage(url) {
  const response = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Ogritech-Site-Integrity/1.0" } });
  return { response, html: await response.text() };
}

async function main() {
const sitemap = await fetch(`${origin}/sitemap.xml`).then((response) => response.text());
const urls = [...new Set(matches(sitemap, /<loc>([^<]+)<\/loc>/g).map((item) => item[1]))];
const pages = [];
const internalTargets = new Set();
for (const url of urls) {
  const { response, html } = await fetchPage(url);
  const inspection = inspectHtml(html, url);
  if (!response.ok) inspection.failures.push(`HTTP ${response.status}`);
  for (const match of matches(html, /<(?:a|link|script|img)\b[^>]*(?:href|src)=["']([^"']+)["']/gi)) {
    const raw = match[1];
    if (/^(?:#|mailto:|tel:|javascript:|data:)/i.test(raw)) continue;
    const target = new URL(raw, url);
    if (target.origin === origin && !target.pathname.startsWith("/cdn-cgi/")) { target.hash = ""; internalTargets.add(target.href); }
  }
  pages.push(inspection);
}

const links = [];
for (const url of internalTargets) {
  const response = await fetch(url, { method: "HEAD", redirect: "follow", headers: { "User-Agent": "Ogritech-Site-Integrity/1.0" } });
  links.push({ url, status: response.status, ok: response.ok });
}
const failures = [
  ...pages.flatMap((page) => page.failures.map((failure) => `${page.url}: ${failure}`)),
  ...links.filter((link) => !link.ok).map((link) => `${link.url}: HTTP ${link.status}`)
];
const report = { checkedAt: new Date().toISOString(), pagesScanned: pages.length, internalTargetsChecked: links.length, pages, brokenLinks: links.filter((link) => !link.ok), failures, verdict: failures.length ? "NAO_APROVADO" : "APROVADO" };
const outputDir = new URL("../outputs/go-live/", import.meta.url);
await mkdir(outputDir, { recursive: true });
await writeFile(new URL("integrity-audit.json", outputDir), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
