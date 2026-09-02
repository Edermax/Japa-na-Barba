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
