import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const pageUrl = new URL("https://ogritech.com.br/agendar/");
pageUrl.searchParams.set("empresa", "ogritech-agenda-bot");
pageUrl.searchParams.set("env", "staging");

async function fetchText(url, label) {
  const startedAt = performance.now();
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Ogritech-Agenda-UI-Smoke/1.0" }
  });
  const text = await response.text();
  assert.equal(response.ok, true, `${label}: HTTP ${response.status}`);
  return { text, durationMs: performance.now() - startedAt, finalUrl: response.url };
}

const page = await fetchText(pageUrl, "Página pública da agenda");
assert.match(page.finalUrl, /^https:\/\/ogritech\.com\.br\/agendar\//);

for (const contract of [
  'id="bookingForm"',
  'id="serviceChoices"',
  'id="professionalChoices"',
  'id="bookingDate"',
  'id="slotChoices"',
  'id="clientName"',
  'id="clientPhone"',
  'id="clientEmail"',
  'id="privacyConsent"',
  'id="submitBooking"',
  'id="successReference"',
  'id="cancelBookingButton"'
]) assert.ok(page.text.includes(contract), `Contrato visual ausente: ${contract}`);

assert.match(page.text, /id="privacyConsent"[^>]+required/);
assert.match(page.text, /Política de Privacidade/);
assert.match(page.text, /agendar\.js/);
assert.match(page.text, /supabase-config\.js/);

const frontendUrl = new URL("agendar.js", page.finalUrl);
const configUrl = new URL("../supabase-config.js", page.finalUrl);
const [frontend, config] = await Promise.all([
  fetchText(frontendUrl, "JavaScript da agenda"),
  fetchText(configUrl, "Configuração pública")
]);

for (const rpc of [
  "public_booking_page",
  "public_available_slots",
  "public_create_appointment",
  "public_get_appointment",
  "public_cancel_appointment"
]) assert.ok(frontend.text.includes(rpc), `RPC ausente na página publicada: ${rpc}`);

assert.match(frontend.text, /params\.get\("empresa"\)/);
assert.match(frontend.text, /accepted_privacy/);
assert.match(frontend.text, /localStorage\.setItem/);
assert.match(config.text, /REQUESTED_OGRITECH_ENV/);
assert.match(config.text, /fuesdztsvrkkgnbqhcxi\.supabase\.co/);

const timings = [page.durationMs, frontend.durationMs, config.durationMs];
const report = {
  executedAt: new Date().toISOString(),
  environment: "staging",
  target: pageUrl.href,
  pageDelivered: true,
  bookingFormContract: "passed",
  privacyConsentContract: "passed",
  managementContract: "passed",
  stagingSelectionContract: "passed",
  resourcesMeasured: timings.length,
  slowestResourceMs: Math.round(Math.max(...timings))
};

if (process.env.AGENDA_UI_REPORT) {
  await mkdir(dirname(process.env.AGENDA_UI_REPORT), { recursive: true });
  await writeFile(process.env.AGENDA_UI_REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify(report, null, 2));
