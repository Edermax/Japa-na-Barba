import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const REQUIRED_CHANNELS = ["contato@ogritech.com.br", "suporte@ogritech.com.br", "financeiro@ogritech.com.br", "privacidade@ogritech.com.br"];

export function validateOperationalReadiness(config) {
  const blockers = [];
  for (const role of config?.roles ?? []) {
    if (!role.owner) blockers.push(`Nomear ${role.label}`);
    if (!role.backup) blockers.push(`Nomear substituto de ${role.label}`);
  }
  for (const address of REQUIRED_CHANNELS) {
    const channel = config?.channels?.find((item) => item.address === address);
    if (!channel) blockers.push(`Cadastrar canal ${address}`);
    else if (channel.status !== "VERIFIED") blockers.push(`Testar envio, recebimento e resposta de ${address}`);
  }
  const legal = config?.legal ?? {};
  if (!legal.corporateDataCompleted) blockers.push("Preencher dados societários");
  if (!legal.termsReviewed) blockers.push("Obter revisão jurídica dos Termos");
  if (!legal.privacyReviewed) blockers.push("Obter revisão jurídica da Política de Privacidade");
  if (!legal.controllerProcessorAgreementReviewed) blockers.push("Revisar acordo controlador-operador");
  const commercial = config?.commercial ?? {};
  if (!commercial.selectedScenario) blockers.push("Selecionar cenário de preço");
  if (!commercial.billingMethod) blockers.push("Definir método de cobrança");
  if (!commercial.fiscalIssuanceDefined) blockers.push("Definir emissão fiscal");
  if (!commercial.pilotPolicyApproved) blockers.push("Aprovar política comercial do piloto");
  const authorization = config?.authorization ?? {};
  for (const [key, label] of Object.entries({
    technicalApproved: "Aprovação técnica",
    operationalApproved: "Aprovação operacional",
    legalApproved: "Aprovação jurídica",
    commercialApproved: "Aprovação comercial",
    customerConfigurationApproved: "Homologação do cadastro do cliente",
    publishApproved: "Autorização explícita de publicação"
  })) if (authorization[key] !== true) blockers.push(label);
  const deferred = config?.deferredUntilLast ?? [];
  if (!deferred.includes("supabase_leaked_password_protection")) blockers.push("Registrar proteção contra senhas vazadas como última ativação");
  return { status: blockers.length ? "BLOQUEADO" : "APROVADO", blockers };
}

async function run() {
  const path = process.argv[2] ?? "config/operational-readiness.json";
  const result = validateOperationalReadiness(JSON.parse(await readFile(path, "utf8")));
  console.log(JSON.stringify(result, null, 2));
  if (process.env.REQUIRE_OPERATIONAL_APPROVAL === "true" && result.blockers.length) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await run();
