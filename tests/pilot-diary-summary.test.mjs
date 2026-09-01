import test from "node:test";
import assert from "node:assert/strict";
import summaryModule from "../scripts/pilot-diary-summary.cjs";

const { parseDiaryComment, summarizePilotEntries } = summaryModule;

function entry(day, overrides = {}) {
  return {
    date: `2026-09-${String(day).padStart(2, "0")}`,
    clients: 6,
    created: 6,
    cancelled: 6,
    isolation: "passed",
    cleanup: "passed",
    requests: 21,
    p95Ms: 500 + day,
    ...overrides
  };
}

test("aprova somente 14 dias únicos, limpos e sem incidente", () => {
  const result = summarizePilotEntries(Array.from({ length: 14 }, (_, index) => entry(index + 1)));
  assert.equal(result.approved, true);
  assert.equal(result.uniqueDays, 14);
  assert.equal(result.totalCreated, 84);
  assert.equal(result.totalCancelled, 84);
  assert.equal(result.maxP95Ms, 514);
});

test("bloqueia resumo incompleto, inseguro ou com incidente", () => {
  const result = summarizePilotEntries([
    ...Array.from({ length: 13 }, (_, index) => entry(index + 1)),
    entry(13),
    entry(14, { cancelled: 5, cleanup: "failed" })
  ], { openIncidents: 1 });
  assert.equal(result.approved, false);
  assert.equal(result.uniqueDays, 14);
  assert.deepEqual(result.unsafeDays, ["2026-09-14"]);
  assert.equal(result.openIncidents, 1);
});

test("extrai os indicadores do comentário diário", () => {
  const parsed = parseDiaryComment(`### 2026-09-01 — aprovado
- Clientes simulados: 6
- Reservas criadas/canceladas: 6/6
- Isolamento entre clientes: passed
- Limpeza: passed
- Requisições medidas: 21
- p95: 167 ms`);
  assert.deepEqual(parsed, entry(1, { p95Ms: 167 }));
});
