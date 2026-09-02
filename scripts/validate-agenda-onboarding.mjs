import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const VALID_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateAgendaOnboarding(model) {
  const errors = [];
  const company = model?.company ?? {};
  const rules = model?.rules ?? {};
  const services = Array.isArray(model?.services) ? model.services : [];
  const professionals = Array.isArray(model?.professionals) ? model.professionals : [];
  const schedule = Array.isArray(model?.weeklySchedule) ? model.weeklySchedule : [];
  if (model?.environment !== "staging") errors.push("environment deve permanecer staging no modelo");
  if (model?.synthetic !== true) errors.push("o modelo deve ser explicitamente sintético");
  if (!company.name || !company.slug || !company.timezone) errors.push("empresa exige nome, slug e fuso horário");
  if (!String(company.operatorEmail ?? "").endsWith(".invalid")) errors.push("e-mail do modelo deve usar domínio .invalid");
  if (company.publicBookingEnabled !== false) errors.push("agendamento público deve iniciar desativado");
  for (const [key, value] of Object.entries(rules)) {
    if (!Number.isInteger(value) || value <= 0) errors.push(`regra ${key} deve ser um inteiro positivo`);
  }
  if (services.length === 0) errors.push("cadastre pelo menos um serviço");
  const serviceCodes = new Set();
  for (const service of services) {
    if (!service.code || serviceCodes.has(service.code)) errors.push(`código de serviço inválido ou duplicado: ${service.code ?? "vazio"}`);
    serviceCodes.add(service.code);
    if (!service.name || !Number.isInteger(service.durationMinutes) || service.durationMinutes <= 0) errors.push(`serviço ${service.code ?? "sem código"} exige nome e duração positiva`);
    if (!Number.isInteger(service.priceCents) || service.priceCents < 0) errors.push(`serviço ${service.code ?? "sem código"} exige preço válido`);
  }
  if (professionals.length === 0) errors.push("cadastre pelo menos um profissional");
  const professionalCodes = new Set();
  for (const professional of professionals) {
    if (!professional.code || professionalCodes.has(professional.code)) errors.push(`código profissional inválido ou duplicado: ${professional.code ?? "vazio"}`);
    professionalCodes.add(professional.code);
    if (!professional.name || !professional.serviceCodes?.length) errors.push(`profissional ${professional.code ?? "sem código"} exige nome e serviço`);
    for (const code of professional.serviceCodes ?? []) if (!serviceCodes.has(code)) errors.push(`profissional ${professional.code} referencia serviço inexistente: ${code}`);
  }
  for (const professional of professionals) {
    if (!schedule.some((entry) => entry.professionalCode === professional.code)) errors.push(`profissional sem jornada: ${professional.code}`);
  }
  for (const entry of schedule) {
    if (!professionalCodes.has(entry.professionalCode)) errors.push(`jornada referencia profissional inexistente: ${entry.professionalCode}`);
    if (!Number.isInteger(entry.weekday) || entry.weekday < 0 || entry.weekday > 6) errors.push(`dia da semana inválido para ${entry.professionalCode}`);
    if (!VALID_TIME.test(entry.start) || !VALID_TIME.test(entry.end) || entry.start >= entry.end) errors.push(`intervalo inválido para ${entry.professionalCode}: ${entry.start}-${entry.end}`);
  }
  return {
    status: errors.length === 0 ? "PRONTA_PARA_SIMULACAO" : "BLOQUEADA",
    counts: { services: services.length, professionals: professionals.length, scheduleRanges: schedule.length },
    errors
  };
}

async function run() {
  const path = process.argv[2] ?? "config/agenda-onboarding-modelo.json";
  const result = validateAgendaOnboarding(JSON.parse(await readFile(path, "utf8")));
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await run();
