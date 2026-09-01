import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const output = new URL("../outputs/go-live/", import.meta.url);
await mkdir(output, { recursive: true });

async function json(name) {
  try { return JSON.parse(await readFile(new URL(name, output), "utf8")); } catch { return null; }
}

const gate = await json("gate.json");
const audit = await json("public-audit.json");
const integrity = await json("integrity-audit.json");
const evidenceFiles = [
  "docs/evidencias/homologacao-interna-staging-2026-08-31.md",
  "docs/evidencias/backup-producao-2026-08-30.md",
  "docs/evidencias/restauracao-backup-producao-2026-08-30.md",
  "docs/evidencias/monitoramento-producao-2026-08-31.md",
  "docs/evidencias/cloudflare-dns-2026-08-31.md",
  "docs/evidencias/auditoria-publica-2026-09-01.md",
  "docs/evidencias/captacao-contato-staging-2026-09-01.md",
  "docs/evidencias/jornadas-comerciais-staging-2026-09-01.md",
  "docs/PLANO_ENTRADA_OPERACAO_STATUS.md",
  "docs/SLA_SUPORTE_ESCALONAMENTO.md"
];
const manifest = [];
for (const path of evidenceFiles) {
  const bytes = await readFile(new URL(path, root));
  manifest.push({ path, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length });
}

const overall = !gate || !audit || !integrity ? "INCOMPLETO" : [audit.verdict, integrity.verdict].includes("NAO_APROVADO") ? "NAO_APROVADO" : gate.verdict;
const summary = [
  "# Pacote automático de evidências de go-live",
  "",
  `Gerado em: ${new Date().toISOString()}`,
  `Resultado consolidado: **${overall}**`,
  "",
  `- Gate operacional: ${gate?.verdict || "ausente"}`,
  `- Auditoria pública: ${audit?.verdict || "ausente"}`,
  `- Integridade, links e semântica: ${integrity?.verdict || "ausente"}`,
  `- Incidentes abertos: ${gate?.openIncidents ?? "desconhecido"}`,
  `- Evidências ausentes: ${gate?.missingEvidence?.length ?? "desconhecido"}`,
  "",
  "## Falhas técnicas públicas",
  ...(audit?.failures?.length ? audit.failures.map((item) => `- ${item}`) : ["- Nenhuma detectada."]),
  ...(integrity?.failures?.length ? integrity.failures.map((item) => `- ${item}`) : []),
  "",
  "## Bloqueios de operação",
  ...(gate?.humanBlockers?.length ? gate.humanBlockers.map((item) => `- ${item}`) : ["- Nenhum detectado."]),
  "",
  "## Integridade das evidências",
  ...manifest.map((item) => `- \`${item.path}\` — ${item.sha256} (${item.bytes} bytes)`),
  ""
].join("\n");
await writeFile(new URL("SUMMARY.md", output), summary);
await writeFile(new URL("manifest.json", output), `${JSON.stringify({ generatedAt: new Date().toISOString(), overall, files: manifest }, null, 2)}\n`);
console.log(JSON.stringify({ overall, evidenceFiles: manifest.length }, null, 2));
