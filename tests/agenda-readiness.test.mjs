import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const load = (path) => readFile(new URL(path, root), "utf8");

test("agenda pública mantém o contrato completo da jornada", async () => {
  const [frontend, page, migration, schedulingMigration] = await Promise.all([
    load("agendar/agendar.js"),
    load("agendar/index.html"),
    load("supabase/migrations/20260829100629_public_booking_flow.sql"),
    load("supabase/migrations/20260825213752_harden_operations_and_scheduling.sql")
  ]);

  for (const rpc of [
    "public_booking_page",
    "public_available_slots",
    "public_create_appointment",
    "public_get_appointment",
    "public_cancel_appointment"
  ]) {
    assert.match(frontend, new RegExp(`rpc\\(\\"${rpc}\\"`), `${rpc} ausente no frontend`);
    assert.match(migration, new RegExp(`function public\\.${rpc}`, "i"), `${rpc} ausente no banco`);
  }

  assert.match(frontend, /accepted_privacy:\$\("privacyConsent"\)\.checked/);
  assert.match(frontend, /error\.code===\"23505\"/);
  assert.match(frontend, /localStorage\.setItem\(`ogritechPublicBooking:/);
  assert.match(page, /id="privacyConsent"[^>]+required/);
  assert.match(schedulingMigration, /business_appointments_no_employee_overlap/i);
  assert.match(migration, /Muitas tentativas/i);
  assert.match(migration, /digest\(secret_token,'sha256'\)/i);
});

test("painel permite preparar e controlar a agenda pública", async () => {
  const [panel, app] = await Promise.all([load("painel/index.html"), load("script.js")]);
  for (const id of [
    "settingsOpenTime",
    "settingsCloseTime",
    "settingsPublicSlug",
    "settingsPublicBookingEnabled",
    "publicBookingLink"
  ]) assert.match(panel, new RegExp(`id=\\"${id}\\"`), `${id} ausente no painel`);

  for (const contract of [
    "save_staff_availability",
    "set_public_booking_settings",
    "get_public_booking_settings",
    "create_appointment",
    "transition_appointment_status"
  ]) assert.ok(app.includes(contract), `${contract} ausente no painel`);
});

test("arquivo de publicação declara os cabeçalhos mínimos", async () => {
  const headers = await load("_headers");
  for (const required of [
    "Content-Security-Policy:",
    "frame-ancestors 'none'",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "Permissions-Policy:",
    "Strict-Transport-Security:",
    "X-Content-Type-Options: nosniff",
    "X-Frame-Options: DENY"
  ]) assert.ok(headers.includes(required), `${required} ausente em _headers`);
});

test("runbook impede ativação sem piloto real e homologação", async () => {
  const runbook = await load("docs/PILOTO_AGENDA_EXECUCAO.md");
  assert.match(runbook, /Japa na Barba.*demonstrativa/i);
  assert.match(runbook, /seis jornadas aprovadas/i);
  assert.match(runbook, /Rollback:/i);
  assert.match(runbook, /Empresa piloto real \| PENDENTE/);
});

test("gate e monitor sintético permanecem restritos ao staging", async () => {
  const [packageJson, workflow, bot] = await Promise.all([
    load("package.json"),
    load(".github/workflows/monitor-agenda-staging.yml"),
    load("scripts/agenda-bot.mjs")
  ]);
  assert.match(packageJson, /"validate:agenda-pilot": "npm run validate && npm run test:agenda-bot"/);
  assert.match(workflow, /npm run validate:agenda-pilot/);
  assert.match(workflow, /cron: "17 \*\/6 \* \* \*"/);
  assert.match(workflow, /staging-agenda-monitor/);
  assert.doesNotMatch(workflow, /production/i);
  assert.match(bot, /O bot só pode executar no staging conhecido/);
  assert.match(bot, /concurrentDoubleBookingProtection/);
  assert.match(bot, /concurrencyCleanup/);
});

test("simulação assistida representa vários clientes e sempre limpa as reservas", async () => {
  const [pilotDay, workflow] = await Promise.all([
    load("scripts/agenda-pilot-day-bot.mjs"),
    load(".github/workflows/pilot-agenda-synthetic.yml")
  ]);
  assert.match(pilotDay, /targetBookings = 6/);
  assert.match(pilotDay, /crossClientIsolation/);
  assert.match(pilotDay, /finally\s*\{/);
  assert.match(pilotDay, /public_cancel_appointment/);
  assert.match(pilotDay, /A simulação só pode executar no staging conhecido/);
  assert.match(pilotDay, /AGENDA_PILOT_REPORT/);
  assert.match(workflow, /PILOT_START: "2026-09-01"/);
  assert.match(workflow, /PILOT_END: "2026-09-14"/);
  assert.match(workflow, /npm run test:agenda-pilot-day/);
  assert.match(workflow, /retention-days: 30/);
  assert.match(workflow, /actions\/upload-artifact@v6/);
  assert.match(workflow, /synthetic-agenda-pilot/);
  assert.match(workflow, /synthetic-agenda-pilot-log/);
  assert.match(workflow, /Diário operacional da agenda — 14 dias/);
  assert.match(workflow, /Encerramento —/);
  assert.match(workflow, /pilot-diary-summary\.cjs/);
  assert.match(workflow, /APROVADO TECNICAMENTE/);
  assert.match(workflow, /summary\.approved/);
  assert.doesNotMatch(workflow, /production/i);
});
