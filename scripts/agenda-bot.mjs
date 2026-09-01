import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const config = await readFile(new URL("supabase-config.js", root), "utf8");
const stagingBlock = config.match(/staging:\s*Object\.freeze\(\{([\s\S]*?)\}\)/)?.[1] ?? "";
const apiUrl = stagingBlock.match(/url:\s*"([^"]+)"/)?.[1];
const publishableKey = stagingBlock.match(/publishableKey:\s*"([^"]+)"/)?.[1];

assert.equal(apiUrl, "https://fuesdztsvrkkgnbqhcxi.supabase.co", "O bot só pode executar no staging conhecido");
assert.match(publishableKey ?? "", /^sb_publishable_/, "Chave pública de staging ausente");

async function requestRpc(name, body) {
  const response = await fetch(`${apiUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, payload };
}

async function rpc(name, body, { expectError = false } = {}) {
  const { ok, status, payload } = await requestRpc(name, body);
  if (expectError) {
    assert.equal(ok, false, `${name} deveria rejeitar a operação`);
    return payload;
  }
  assert.equal(ok, true, `${name}: ${payload?.message ?? `HTTP ${status}`}`);
  return payload;
}

function isoDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

const slug = "ogritech-agenda-bot";
const page = await rpc("public_booking_page", { target_slug: slug });
assert.equal(page.business.slug, slug);
assert.ok(page.services.length > 0, "Nenhum serviço sintético disponível");
assert.ok(page.professionals.length > 0, "Nenhum profissional sintético disponível");

const service = page.services[0];
const professional = page.professionals[0];
let chosen;
for (let daysAhead = 1; daysAhead <= 14 && !chosen; daysAhead += 1) {
  const date = isoDate(daysAhead);
  const slots = await rpc("public_available_slots", {
    target_slug: slug,
    target_service_id: service.id,
    target_employee_id: professional.id,
    target_date: date
  });
  if (slots.length) chosen = { date, time: String(slots[0].slot_time).slice(0, 5) };
}
assert.ok(chosen, "Nenhum horário disponível nos próximos 14 dias");

const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const bookingInput = {
  target_slug: slug,
  target_service_id: service.id,
  target_employee_id: professional.id,
  target_date: chosen.date,
  target_time: chosen.time,
  supplied_name: `BOT Ogritech ${runId}`,
  supplied_email: `agenda.bot+${runId}@example.invalid`,
  supplied_phone: "11999990000",
  accepted_privacy: true,
  website: ""
};

const booking = await rpc("public_create_appointment", bookingInput);
assert.match(booking.reference, /^[A-F0-9]+$/);
assert.ok(booking.token, "Token de gestão não retornado");

const duplicate = await rpc("public_create_appointment", bookingInput, { expectError: true });
assert.match(duplicate?.message ?? "", /Horário indisponível/i);

const noConsent = await rpc("public_create_appointment", {
  ...bookingInput,
  target_time: "17:30",
  supplied_email: `agenda.bot+sem-consentimento-${runId}@example.invalid`,
  accepted_privacy: false
}, { expectError: true });
assert.match(noConsent?.message ?? "", /aceitar o aviso de privacidade/i);

const honeypot = await rpc("public_create_appointment", {
  ...bookingInput,
  target_time: "17:30",
  supplied_email: `agenda.bot+honeypot-${runId}@example.invalid`,
  website: "https://spam.invalid"
}, { expectError: true });
assert.match(honeypot?.message ?? "", /Não foi possível concluir/i);

const beforeCancel = await rpc("public_get_appointment", {
  target_reference: booking.reference,
  target_token: booking.token
});
assert.equal(beforeCancel.reference, booking.reference);
assert.equal(beforeCancel.can_cancel, true);

const cancelled = await rpc("public_cancel_appointment", {
  target_reference: booking.reference,
  target_token: booking.token
});
assert.equal(cancelled, true);

const afterCancel = await rpc("public_get_appointment", {
  target_reference: booking.reference,
  target_token: booking.token
});
assert.equal(afterCancel.status, "cancelled");
assert.equal(afterCancel.can_cancel, false);

const wrongToken = await rpc("public_get_appointment", {
  target_reference: booking.reference,
  target_token: "token-incorreto"
});
assert.equal(wrongToken, null);

const concurrencyBase = {
  ...bookingInput,
  supplied_name: `BOT concorrência ${runId}`
};
const contenders = await Promise.all([
  requestRpc("public_create_appointment", {
    ...concurrencyBase,
    supplied_email: `agenda.bot+concorrencia-a-${runId}@example.invalid`,
    supplied_phone: "11999990001"
  }),
  requestRpc("public_create_appointment", {
    ...concurrencyBase,
    supplied_email: `agenda.bot+concorrencia-b-${runId}@example.invalid`,
    supplied_phone: "11999990002"
  })
]);
const winners = contenders.filter((item) => item.ok);
const rejected = contenders.filter((item) => !item.ok);
assert.equal(winners.length, 1, "A corrida deve produzir exatamente uma reserva");
assert.equal(rejected.length, 1, "A corrida deve rejeitar exatamente uma reserva");
assert.match(rejected[0].payload?.message ?? "", /Horário indisponível/i);
const concurrencyBooking = winners[0].payload;
assert.equal(await rpc("public_cancel_appointment", {
  target_reference: concurrencyBooking.reference,
  target_token: concurrencyBooking.token
}), true);

console.log(JSON.stringify({
  environment: "staging",
  bot: page.business.name,
  slot: chosen,
  reference: booking.reference,
  checks: {
    publicPage: "passed",
    availability: "passed",
    create: "passed",
    duplicateRejection: "passed",
    privacyRejection: "passed",
    honeypotRejection: "passed",
    readByToken: "passed",
    invalidTokenIsolation: "passed",
    cancelByToken: "passed",
    concurrentDoubleBookingProtection: "passed",
    concurrencyCleanup: "passed"
  }
}, null, 2));
