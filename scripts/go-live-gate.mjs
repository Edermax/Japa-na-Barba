import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateOperationalReadiness } from "./validate-operational-readiness.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

export function evaluateGate(input) {
  const technicalFailures = [];
  const humanBlockers = [];
  if (!input.validationPassed) technicalFailures.push("Suíte de validação não foi confirmada");
  for (const evidence of input.missingEvidence) technicalFailures.push(`Evidência ausente: ${evidence}`);
  if (input.openIncidents > 0) technicalFailures.push(`${input.openIncidents} incidente(s) técnico(s) aberto(s)`);
  if (!input.syntheticPilotApproved) humanBlockers.push("Ciclo sintético de 14 dias ainda não aprovado");
  if (!input.closedBetaApproved) humanBlockers.push("Beta fechado ainda não aprovado");
  for (const item of input.openChecklistItems) humanBlockers.push(item);
  for (const item of input.operationalBlockers ?? []) humanBlockers.push(item);
  const verdict = technicalFailures.length ? "NAO_APROVADO" : humanBlockers.length ? "BLOQUEADO" : "APROVADO";
  return { verdict, technicalFailures, humanBlockers };
}

async function githubJson(path) {
  const repository = process.env.GITHUB_REPOSITORY || "Edermax/Ogritech-site";
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "Ogritech-Go-Live-Gate/1.0" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub API ${path}: HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const evidencePaths = [
    "docs/evidencias/homologacao-interna-staging-2026-08-31.md",
    "docs/evidencias/backup-producao-2026-08-30.md",
    "docs/evidencias/restauracao-backup-producao-2026-08-30.md",
    "docs/evidencias/monitoramento-producao-2026-08-31.md",
    "docs/evidencias/cloudflare-dns-2026-08-31.md",
    "docs/evidencias/captacao-contato-staging-2026-09-01.md",
    "docs/evidencias/jornadas-comerciais-staging-2026-09-01.md",
    "docs/evidencias/auditoria-automacoes-2026-09-02.md"
  ];
  const missingEvidence = [];
  for (const path of evidencePaths) {
    try { if (!(await read(path)).trim()) missingEvidence.push(path); } catch { missingEvidence.push(path); }
  }

  const checklist = await read("docs/CHECKLIST_LANCAMENTO.md");
  const openChecklistItems = [...checklist.matchAll(/^- \[ \] (.+)$/gm)].map((match) => match[1].trim());
  const operationalReadiness = validateOperationalReadiness(JSON.parse(await read("config/operational-readiness.json")));
  const [diary, beta, pilotIncidents, stagingIncidents, productionIncidents, backupIncidents, schemaIncidents, authIncidents] = await Promise.all([
    githubJson("/issues/7"),
    githubJson("/issues/8"),
    githubJson("/issues?state=open&labels=synthetic-agenda-pilot&per_page=100"),
    githubJson("/issues?state=open&labels=staging-agenda-monitor&per_page=100"),
    githubJson("/issues?state=open&labels=production-monitor&per_page=100"),
    githubJson("/issues?state=open&labels=production-backup&per_page=100"),
    githubJson("/issues?state=open&labels=production-schema-drift&per_page=100"),
    githubJson("/issues?state=open&labels=auth-security-monitor&per_page=100")
  ]);
  const diaryComments = await githubJson("/issues/7/comments?per_page=100");
  const syntheticPilotApproved = diary.state === "closed" && diaryComments.some((item) => item.body?.includes("APROVADO TECNICAMENTE"));
  const closedBetaApproved = beta.state === "closed";
  const input = {
    checkedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || "local",
    validationPassed: process.env.VALIDATION_STATUS === "passed",
    missingEvidence,
    openIncidents: pilotIncidents.length + stagingIncidents.length + productionIncidents.length + backupIncidents.length + schemaIncidents.length + authIncidents.length,
    syntheticPilotApproved,
    closedBetaApproved,
    openChecklistItems,
    operationalBlockers: operationalReadiness.blockers
  };
  const result = { ...input, ...evaluateGate(input) };
  const markdown = [
    "# Gate automático de entrada em operação",
    "",
    `- Veredito: **${result.verdict}**`,
    `- Verificado em: ${result.checkedAt}`,
    `- Commit: ${result.commit}`,
    `- Incidentes técnicos abertos: ${result.openIncidents}`,
    `- Ciclo sintético aprovado: ${result.syntheticPilotApproved ? "sim" : "não"}`,
    `- Beta fechado aprovado: ${result.closedBetaApproved ? "sim" : "não"}`,
    "",
    "## Falhas técnicas",
    ...(result.technicalFailures.length ? result.technicalFailures.map((item) => `- ${item}`) : ["- Nenhuma."]),
    "",
    "## Bloqueios humanos ou temporais",
    ...(result.humanBlockers.length ? result.humanBlockers.map((item) => `- ${item}`) : ["- Nenhum."]),
    ""
  ].join("\n");
  const outputDir = process.env.GO_LIVE_OUTPUT_DIR || "outputs/go-live";
  await mkdir(new URL(`${outputDir}/`, root), { recursive: true });
  await writeFile(new URL(`${outputDir}/gate.json`, root), `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(new URL(`${outputDir}/gate.md`, root), markdown);
  console.log(JSON.stringify(result, null, 2));
  if (result.verdict === "NAO_APROVADO") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
