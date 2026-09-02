import assert from "node:assert/strict";
import test from "node:test";
import { assessAuthConfig } from "../scripts/audit-auth-config.mjs";

test("auditoria Auth bloqueia senha mínima abaixo de oito", () => {
  const result = assessAuthConfig("staging", { password_min_length: 6 });
  assert.equal(result.passed, false);
  assert.match(result.findings[0], /mínimo recomendado=8/);
});

test("auditoria Auth não exige recurso HIBP indisponível no plano gratuito", () => {
  const result = assessAuthConfig("production", {
    password_min_length: 8,
    password_required_characters: "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789",
    password_hibp_enabled: false
  });
  assert.equal(result.passed, true);
  assert.equal(result.leakedPasswordProtection, false);
  assert.equal(result.passwordRequiredCharactersConfigured, true);
});
