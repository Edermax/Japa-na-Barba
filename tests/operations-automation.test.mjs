import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const load = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("backup diário publica e resolve incidente operacional", async () => {
  const workflow = await load(".github/workflows/backup-production.yml");
  assert.match(workflow, /issues: write/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /\$\{\{ job\.status \}\}/);
  assert.match(workflow, /production-backup/);
  assert.match(workflow, /Falha no backup diário de produção/);
  assert.match(workflow, /state: "closed"/);
});

test("workflows usam gerações atuais das Actions de artefato", async () => {
  const paths = [
    ".github/workflows/backup-production.yml",
    ".github/workflows/go-live-readiness.yml",
    ".github/workflows/pilot-agenda-synthetic.yml",
    ".github/workflows/restore-drill.yml"
  ];
  const workflows = (await Promise.all(paths.map(load))).join("\n");
  assert.doesNotMatch(workflows, /actions\/(?:upload|download)-artifact@v[1-6]\b/);
  assert.match(workflows, /actions\/upload-artifact@v7/);
  assert.match(workflows, /actions\/download-artifact@v8/);
});
