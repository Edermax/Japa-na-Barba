import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const config = await readFile(new URL("supabase-config.js", root), "utf8");
const stagingBlock = config.match(/staging:\s*Object\.freeze\(\{([\s\S]*?)\}\)/)?.[1] ?? "";
const apiUrl = stagingBlock.match(/url:\s*"([^"]+)"/)?.[1];
const publishableKey = stagingBlock.match(/publishableKey:\s*"([^"]+)"/)?.[1];

assert.equal(apiUrl, "https://fuesdztsvrkkgnbqhcxi.supabase.co", "A simulação só pode executar no staging conhecido");
assert.match(publishableKey ?? "", /^sb_publishable_/, "Chave pública de staging ausente");

async function requestRpc(name, body) {
  const startedAt = performance.now();
  const response = await fetch(`${apiUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, payload, durationMs: performance.now() - startedAt };
}

async function rpc(name, body) {
  const result = await requestRpc(name, body);
  assert.equal(result.ok, true, `${name}: ${result.payload?.message ?? `HTTP ${result.status}`}`);
  return result;
}

function isoDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

const slug = "ogritech-agenda-bot";
const targetBookings = 6;
const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const reservations = [];
const timings = [];
let cleanupErrors = 0;

try {
  const pageResult = await rpc("public_booking_page", { target_slug: slug });
  timings.push(pageResult.durationMs);
  const { business, services, professionals } = pageResult.payload;
  assert.equal(business.slug, slug);
  assert.ok(services.length > 0, "Nenhum serviço sintético disponível");
  assert.ok(professionals.length > 0, "Nenhum profissional sintético disponível");

  const service = services[0];
  const professional = professionals[0];
  const slots = [];
  for (let daysAhead = 1; daysAhead <= 14 && slots.length < targetBookings; daysAhead += 1) {
    const date = isoDate(daysAhead);
    const slotsResult = await rpc("public_available_slots", {
      target_slug: slug,
      target_service_id: service.id,
      target_employee_id: professional.id,
      target_date: date
    });
    timings.push(slotsResult.durationMs);
    for (const item of slotsResult.payload) {
      slots.push({ date, time: String(item.slot_time).slice(0, 5) });
      if (slots.length === targetBookings) break;
    }
  }
  assert.equal(slots.length, targetBookings, `São necessários ${targetBookings} horários livres`);

  for (const [index, slot] of slots.entries()) {
    const createResult = await rpc("public_create_appointment", {
      target_slug: slug,
      target_service_id: service.id,
      target_employee_id: professional.id,
      target_date: slot.date,
      target_time: slot.time,
      supplied_name: `BOT Piloto Cliente ${index + 1} ${runId}`,
      supplied_email: `agenda.piloto+${runId}-${index + 1}@example.invalid`,
      supplied_phone: `1199999${String(index).padStart(4, "0")}`,
      accepted_privacy: true,
      website: ""
    });
    timings.push(createResult.durationMs);
    assert.match(createResult.payload.reference, /^[A-F0-9]+$/);
    assert.ok(createResult.payload.token);
    reservations.push({ ...slot, ...createResult.payload });
  }

  for (const reservation of reservations) {
    const readResult = await rpc("public_get_appointment", {
      target_reference: reservation.reference,
      target_token: reservation.token
    });
    timings.push(readResult.durationMs);
    assert.equal(readResult.payload.reference, reservation.reference);
    assert.equal(readResult.payload.can_cancel, true);
  }

  const isolated = await rpc("public_get_appointment", {
    target_reference: reservations[0].reference,
    target_token: reservations[1].token
  });
  timings.push(isolated.durationMs);
  assert.equal(isolated.payload, null, "Um cliente não pode consultar a reserva de outro");
} finally {
  for (const reservation of reservations) {
    try {
      const cancelResult = await requestRpc("public_cancel_appointment", {
        target_reference: reservation.reference,
        target_token: reservation.token
      });
      timings.push(cancelResult.durationMs);
      if (!cancelResult.ok || cancelResult.payload !== true) cleanupErrors += 1;
    } catch {
      cleanupErrors += 1;
    }
  }
}

assert.equal(reservations.length, targetBookings);
assert.equal(cleanupErrors, 0, "A limpeza deixou reservas sintéticas ativas");

const sortedTimings = timings.toSorted((a, b) => a - b);
const percentileIndex = Math.max(0, Math.ceil(sortedTimings.length * 0.95) - 1);
console.log(JSON.stringify({
  environment: "staging",
  simulation: "assisted-pilot-day",
  clientsSimulated: reservations.length,
  bookingsCreated: reservations.length,
  bookingsCancelled: reservations.length,
  crossClientIsolation: "passed",
  cleanup: "passed",
  requestsMeasured: timings.length,
  p95Ms: Math.round(sortedTimings[percentileIndex])
}, null, 2));
