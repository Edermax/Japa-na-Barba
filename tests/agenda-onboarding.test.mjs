import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateAgendaOnboarding } from "../scripts/validate-agenda-onboarding.mjs";

const loadModel = async () => JSON.parse(await readFile("config/agenda-onboarding-modelo.json", "utf8"));

test("modelo de onboarding está pronto para simulação e mantém publicação desligada", async () => {
  const model = await loadModel();
  const result = validateAgendaOnboarding(model);
  assert.equal(result.status, "PRONTA_PARA_SIMULACAO");
  assert.equal(model.company.publicBookingEnabled, false);
  assert.equal(model.synthetic, true);
  assert.equal(result.errors.length, 0);
});

test("onboarding bloqueia profissional sem jornada e serviço inexistente", async () => {
  const model = await loadModel();
  model.weeklySchedule = model.weeklySchedule.filter((x) => x.professionalCode !== "PROF-02");
  model.professionals[0].serviceCodes.push("SERV-404");
  const result = validateAgendaOnboarding(model);
  assert.equal(result.status, "BLOQUEADA");
  assert.ok(result.errors.some((error) => error.includes("SERV-404")));
  assert.ok(result.errors.some((error) => error.includes("PROF-02")));
});
