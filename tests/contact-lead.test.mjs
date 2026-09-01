import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260901214241_platform_contact_leads.sql", import.meta.url), "utf8");
const html = await readFile(new URL("../contato/index.html", import.meta.url), "utf8");
const script = await readFile(new URL("../contato/contato.js", import.meta.url), "utf8");

test("contato corporativo usa fila segura somente em staging", () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.platform_contact_leads from public, anon, authenticated/i);
  assert.match(migration, /security definer[\s\S]*set search_path/i);
  assert.match(migration, /Muitas tentativas/);
  assert.match(html, /name="website"/);
  assert.match(html, /supabase-config\.js/);
  assert.match(script, /OGRITECH_ENV !== "staging"/);
  assert.match(script, /public_submit_platform_contact/);
  assert.match(script, /mailto:contato@ogritech\.com\.br/);
});
