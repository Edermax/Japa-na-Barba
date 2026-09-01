import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = await readFile(new URL("../supabase-config.js", import.meta.url), "utf8");
const staging = config.match(/staging:[\s\S]*?url:\s*"([^"]+)"[\s\S]*?publishableKey:\s*"([^"]+)"/);
assert(staging, "Configuração de staging ausente");
const [, apiUrl, publishableKey] = staging;
assert.equal(apiUrl, "https://fuesdztsvrkkgnbqhcxi.supabase.co", "O bot só pode executar no staging conhecido");
const slug = "bot-commercial-20260901";
const priceId = "6966ffa6-16f4-4d36-9f96-c0c235a06421";

async function rpc(name, payload, expectedStatus = 200) {
  const response = await fetch(`${apiUrl}/rest/v1/rpc/${name}`, {
    method: "POST", headers: { apikey: publishableKey, "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  assert.equal(response.status, expectedStatus, `${name}: ${JSON.stringify(body)}`);
  return body;
}

const page = await rpc("public_landing_page", { target_slug: slug });
assert.equal(page.page.slug, slug);
assert.equal(page.services.length, 1);

const lead = await rpc("public_submit_landing_lead", {
  target_slug: slug, supplied_name: "Lead Sintético", supplied_email: "bot-lead@example.com",
  supplied_phone: "11999990001", supplied_message: "Teste automatizado", accepted_privacy: true, website: ""
});
assert.equal(lead.status, "new");

const quote = await rpc("public_submit_quote_request", {
  target_slug: slug, supplied_name: "Orçamento Sintético", supplied_email: "bot-quote@example.com",
  supplied_phone: "11999990002", supplied_company: "Empresa Bot", supplied_service: "Agenda online",
  supplied_briefing: { details: "Teste automatizado" }, supplied_deadline: null,
  supplied_budget_min: 100, supplied_budget_max: 500, accepted_privacy: true, website: ""
});
assert.equal(quote.status, "received");

const proposal = await rpc("public_get_quote_proposal", { target_reference: "BOTQ20260901", target_token: "bot-proposal-token-20260901" });
assert.equal(proposal.proposal.status, "sent");
assert.equal(proposal.items.length, 1);
assert.equal(await rpc("public_respond_quote_proposal", { target_reference: "BOTQ20260901", target_token: "bot-proposal-token-20260901", target_decision: "accepted" }), true);

const menu = await rpc("public_menu", { target_slug: slug });
assert.equal(menu.menu.slug, slug);
assert.equal(menu.categories[0].items[0].prices[0].id, priceId);

const order = await rpc("public_create_menu_order", {
  target_slug: slug, supplied_name: "Comprador Sintético", supplied_email: "bot-order@example.com",
  supplied_phone: "11999990003", target_fulfillment_type: "pickup", supplied_address: {},
  supplied_notes: "Teste automatizado", supplied_items: [{ menu_item_price_id: priceId, quantity: 2 }],
  accepted_privacy: true, website: ""
});
assert.equal(order.status, "received");
assert.equal(Number(order.total_amount), 50);
const tracked = await rpc("public_get_menu_order", { target_reference: order.reference, target_token: order.token });
assert.equal(tracked.reference, order.reference);
assert.equal(tracked.items.length, 1);

await rpc("public_submit_landing_lead", { target_slug: slug, supplied_name: "Sem Consentimento", supplied_email: "bot-invalid@example.com", supplied_phone: "11999990004", supplied_message: "", accepted_privacy: false, website: "" }, 400);
await rpc("public_create_menu_order", { target_slug: slug, supplied_name: "Honeypot Bot", supplied_email: "bot-spam@example.com", supplied_phone: "11999990005", target_fulfillment_type: "pickup", supplied_address: {}, supplied_notes: "", supplied_items: [{ menu_item_price_id: priceId, quantity: 1 }], accepted_privacy: true, website: "spam" }, 400);

console.log(JSON.stringify({ ok: true, landing: true, lead: true, quote: true, proposal: true, menu: true, order: true, tracking: true, guards: true, orderReference: order.reference, quoteReference: quote.reference }));
