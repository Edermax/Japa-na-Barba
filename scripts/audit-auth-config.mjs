import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export function assessAuthConfig(environment, config) {
  const minimumLength = Number(config.password_min_length ?? 0);
  const requiredCharacters = String(config.password_required_characters ?? "");
  const findings = [];
  if (minimumLength < 8) findings.push(`password_min_length=${minimumLength}; mínimo recomendado=8`);
  return {
    environment,
    passwordMinLength: minimumLength,
    passwordRequiredCharactersConfigured: requiredCharacters.length > 0,
    leakedPasswordProtection: Boolean(config.password_hibp_enabled),
    passwordChangeReauthentication: Boolean(config.security_update_password_require_reauthentication),
    emailAutoconfirm: Boolean(config.mailer_autoconfirm),
    signupDisabled: Boolean(config.disable_signup),
    passed: findings.length === 0,
    findings
  };
}

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN não configurado");
  const targets = [
    ["staging", "fuesdztsvrkkgnbqhcxi"],
    ["production", "mvzcoaiiwytycdqcvydf"]
  ];
  if (process.env.REMEDIATE_STAGING_PASSWORD_MIN_LENGTH === "true") {
    const [, stagingRef] = targets[0];
    const response = await fetch(`https://api.supabase.com/v1/projects/${stagingRef}/config/auth`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password_min_length: 8 })
    });
    if (!response.ok) throw new Error(`staging: correção retornou HTTP ${response.status}`);
    console.log("staging: password_min_length atualizado para 8; produção não foi alterada");
  }
  if (process.env.REMEDIATE_PRODUCTION_PASSWORD_MIN_LENGTH === "true") {
    const [, productionRef] = targets[1];
    const response = await fetch(`https://api.supabase.com/v1/projects/${productionRef}/config/auth`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password_min_length: 8 })
    });
    if (!response.ok) throw new Error(`production: correção retornou HTTP ${response.status}`);
    console.log("production: password_min_length atualizado para 8");
  }
  const results = [];
  for (const [environment, projectRef] of targets) {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`${environment}: Management API retornou HTTP ${response.status}`);
    results.push(assessAuthConfig(environment, await response.json()));
  }
  const report = { checkedAt: new Date().toISOString(), results };
  console.log(JSON.stringify(report, null, 2));
  if (process.env.AUTH_CONFIG_REPORT) {
    await writeFile(process.env.AUTH_CONFIG_REPORT, `${JSON.stringify(report, null, 2)}\n`);
  }
  const failed = results.filter((result) => !result.passed);
  if (failed.length) throw new Error(`Configuração de senha insuficiente: ${failed.map((x) => x.environment).join(", ")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await run();
