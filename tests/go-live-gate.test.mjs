import test from "node:test";
import assert from "node:assert/strict";
import { evaluateGate } from "../scripts/go-live-gate.mjs";

const base = { validationPassed: true, missingEvidence: [], openIncidents: 0, syntheticPilotApproved: true, closedBetaApproved: true, openChecklistItems: [] };

test("gate aprova somente quando não há falhas ou bloqueios", () => {
  assert.equal(evaluateGate(base).verdict, "APROVADO");
});

test("gate separa dependência humana de falha técnica", () => {
  const blocked = evaluateGate({ ...base, closedBetaApproved: false, openChecklistItems: ["Revisão jurídica"] });
  assert.equal(blocked.verdict, "BLOQUEADO");
  assert.equal(blocked.technicalFailures.length, 0);
  const failed = evaluateGate({ ...base, openIncidents: 1 });
  assert.equal(failed.verdict, "NAO_APROVADO");
});
