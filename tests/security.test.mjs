import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
test("não versiona credenciais privilegiadas nem administrador fixo", async () => {
  const files = ["supabase-config.js", "supabase/functions/platform-users/index.ts"];
  const source = (await Promise.all(files.map((file) => readFile(new URL(file, root), "utf8")))).join("\n");
  assert.doesNotMatch(source, /service_role\s*[=:]\s*["'][A-Za-z0-9_-]+/i);
  assert.doesNotMatch(source, /852ca2d2-6249-4c7c-9f9b-5550695121e5/i);
});

test("função administrativa restringe origem, método, tamanho e autenticação", async () => {
  const source = await readFile(new URL("supabase/functions/platform-users/index.ts", root), "utf8");
  for (const marker of ["allowedOrigins", "request.method !== \"POST\"", "content-length", "caller.auth.getUser", "platform_check_rate_limit"]) assert.ok(source.includes(marker), marker);
});

test("agendamento real usa RPC validada", async () => {
  const migration = await readFile(new URL("supabase/migrations/202608220001_harden_schema_and_booking.sql", root), "utf8");
  assert.match(migration, /create or replace function public\.create_appointment/);
  assert.match(migration, /Horário indisponível/);
  assert.match(migration, /Serviço ou profissional inválido/);
});

test("cobranças da plataforma são isoladas e transacionais", async () => {
  const migration = await readFile(new URL("supabase/migrations/202608240001_platform_billing.sql", root), "utf8");
  for (const marker of [
    "create table if not exists public.platform_invoices",
    "create table if not exists public.platform_payments",
    "create table if not exists public.platform_refunds",
    "public.is_platform_admin()",
    "create or replace function public.platform_create_invoice",
    "create or replace function public.platform_record_payment",
    "create or replace function public.platform_register_refund",
    "for update",
    "platform_billing_audit_log"
  ]) assert.ok(migration.includes(marker), marker);
  assert.match(migration, /Pagamento excede o saldo da fatura/);
  assert.match(migration, /Crédito maior que o saldo disponível/);
});
