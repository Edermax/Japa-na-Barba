import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "https://ogritech.com.br").split(",").map((v) => v.trim()).filter(Boolean);
const headers = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff",
});
const reply = (body: unknown, status: number, origin: string | null) => new Response(JSON.stringify(body), { status, headers: headers(origin) });
const clean = (value: unknown, max = 150) => typeof value === "string" ? value.trim().slice(0, max) : "";
const validUuid = (value: unknown) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : "";
const roles = new Set(["owner", "admin", "employee", "client"]);

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (origin && !allowedOrigins.includes(origin)) return reply({ error: "Origem não autorizada" }, 403, origin);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== "POST") return reply({ error: "Método não permitido" }, 405, origin);
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) return reply({ error: "Conteúdo inválido" }, 415, origin);
  if (Number(request.headers.get("content-length") || 0) > 16_384) return reply({ error: "Requisição muito grande" }, 413, origin);

  const url = Deno.env.get("SUPABASE_URL"), anonKey = Deno.env.get("SUPABASE_ANON_KEY"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return reply({ error: "Serviço não configurado" }, 503, origin);
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: request.headers.get("Authorization") || "" } } });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) return reply({ error: "Sessão inválida" }, 401, origin);
  const { data: allowed, error: permissionError } = await caller.rpc("is_platform_admin");
  if (permissionError || !allowed) return reply({ error: "Acesso negado" }, 403, origin);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply({ error: "JSON inválido" }, 400, origin); }
  const action = clean(body.action, 40);
  const { data: withinLimit } = await caller.rpc("platform_check_rate_limit", { action_name: action, max_actions: 30 });
  if (!withinLimit) return reply({ error: "Muitas solicitações; tente novamente em um minuto" }, 429, origin);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const audit = async (success: boolean, targetId = "", details: Record<string, unknown> = {}) => {
    await admin.from("platform_admin_events").insert({ actor_id: authData.user.id, action, target_id: targetId || null, success, details });
  };

  try {
    if (action === "list") {
      const { data: profiles, error } = await admin.from("profiles").select("id,barbershop_id,full_name,role,active");
      if (error) throw error;
      const { data: authUsers, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) throw usersError;
      const emails = new Map(authUsers.users.map((user) => [user.id, user.email || ""]));
      const { data: masters, error: mastersError } = await admin.from("platform_admins").select("user_id");
      if (mastersError) throw mastersError;
      const masterIds = new Set((masters || []).map((item) => item.user_id));
      await audit(true);
      return reply({ users: (profiles || []).filter((p) => !masterIds.has(p.id)).map((p) => ({ ...p, email: emails.get(p.id) || "" })) }, 200, origin);
    }

    if (action === "invite") {
      const userEmail = clean(body.email, 320).toLowerCase(), fullName = clean(body.full_name), shopId = validUuid(body.barbershop_id), role = clean(body.role, 20);
      if (!userEmail.includes("@") || !fullName || !shopId || !roles.has(role)) return reply({ error: "Dados inválidos" }, 400, origin);
      const { data: shop } = await admin.from("barbershops").select("id,active,deleted_at").eq("id", shopId).single();
      if (!shop?.active || shop.deleted_at) return reply({ error: "Negócio indisponível" }, 400, origin);
      const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(userEmail, { data: { full_name: fullName } });
      if (inviteError) throw inviteError;
      const rollback = async () => { await admin.auth.admin.deleteUser(data.user.id); };
      const { error: profileError } = await admin.from("profiles").insert({ id: data.user.id, barbershop_id: shopId, full_name: fullName, role, active: true });
      if (profileError) { await rollback(); throw profileError; }
      const related = role === "employee"
        ? await admin.from("employees").insert({ barbershop_id: shopId, name: fullName, specialty: clean(body.specialty) || "Atendimento geral", commission_percentage: Math.min(100, Math.max(0, Number(body.commission) || 0)), active: true }).select("id").single()
        : role === "client" ? await admin.from("business_clients").insert({ barbershop_id: shopId, name: fullName, email: userEmail, phone: "" }).select("id").single()
        : role === "owner" ? await admin.from("saas_clients").update({ contact_name: fullName, owner_email: userEmail, invite_status: "Enviado" }).eq("barbershop_id", shopId) : { error: null };
      if (related.error) { await admin.from("profiles").delete().eq("id", data.user.id); await rollback(); throw related.error; }
      if (role === "employee" || role === "client") {
        const link = role === "employee" ? { employee_id: related.data?.id } : { client_record_id: related.data?.id };
        const { error: linkError } = await admin.from("profiles").update(link).eq("id", data.user.id);
        if (linkError) { await admin.from(role === "employee" ? "employees" : "business_clients").delete().eq("id", related.data?.id); await admin.from("profiles").delete().eq("id", data.user.id); await rollback(); throw linkError; }
      }
      await audit(true, data.user.id, { role, barbershop_id: shopId });
      return reply({ user: { id: data.user.id, email: data.user.email } }, 200, origin);
    }

    if (action === "update") {
      const userId = validUuid(body.user_id), userEmail = clean(body.email, 320).toLowerCase(), fullName = clean(body.full_name), shopId = validUuid(body.barbershop_id), role = clean(body.role, 20);
      if (!userId || !userEmail.includes("@") || !fullName || !shopId || !roles.has(role)) return reply({ error: "Dados inválidos" }, 400, origin);
      const { data: protectedUser } = await admin.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
      if (protectedUser) return reply({ error: "O acesso master não pode ser alterado" }, 400, origin);
      const { data: previous, error: previousError } = await admin.from("profiles").select("employee_id,client_record_id,role").eq("id", userId).single();
      if (previousError) throw previousError;
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, { email: userEmail, user_metadata: { full_name: fullName } });
      if (authUpdateError) throw authUpdateError;
      const { error } = await admin.from("profiles").update({ barbershop_id: shopId, full_name: fullName, role }).eq("id", userId);
      if (error) throw error;
      if (previous.employee_id) { const { error } = await admin.from("employees").update({ barbershop_id: shopId, name: fullName }).eq("id", previous.employee_id); if (error) throw error; }
      if (previous.client_record_id) { const { error } = await admin.from("business_clients").update({ barbershop_id: shopId, name: fullName, email: userEmail }).eq("id", previous.client_record_id); if (error) throw error; }
      await audit(true, userId, { role, barbershop_id: shopId });
      return reply({ ok: true }, 200, origin);
    }

    if (action === "delete") {
      const userId = validUuid(body.user_id);
      if (!userId) return reply({ error: "Usuário inválido" }, 400, origin);
      const { data: protectedUser } = await admin.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
      if (protectedUser) return reply({ error: "O acesso master não pode ser excluído" }, 400, origin);
      const { error } = await admin.from("profiles").update({ active: false }).eq("id", userId);
      if (error) throw error;
      const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      if (banError) throw banError;
      await audit(true, userId);
      return reply({ ok: true, archived: true }, 200, origin);
    }

    if (action === "set_active") {
      const userId = validUuid(body.user_id), active = body.active === true;
      if (!userId) return reply({ error: "Usuário inválido" }, 400, origin);
      const { data: protectedUser } = await admin.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
      if (protectedUser) return reply({ error: "O acesso master não pode ser alterado" }, 400, origin);
      const { error } = await admin.from("profiles").update({ active }).eq("id", userId);
      if (error) throw error;
      const { error: authError } = await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
      if (authError) throw authError;
      await audit(true, userId, { active });
      return reply({ ok: true }, 200, origin);
    }

    if (action === "delete_business") {
      const shopId = validUuid(body.barbershop_id);
      if (!shopId) return reply({ error: "Negócio inválido" }, 400, origin);
      const archivedAt = new Date().toISOString();
      const results = await Promise.all([
        admin.from("barbershops").update({ active: false, deleted_at: archivedAt }).eq("id", shopId),
        admin.from("profiles").update({ active: false }).eq("barbershop_id", shopId),
        admin.from("saas_clients").update({ status: "Arquivado", deleted_at: archivedAt }).eq("barbershop_id", shopId),
      ]);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
      const { data: profiles } = await admin.from("profiles").select("id").eq("barbershop_id", shopId);
      for (const profile of profiles || []) await admin.auth.admin.updateUserById(profile.id, { ban_duration: "876000h" });
      await audit(true, shopId, { archived: true });
      return reply({ ok: true, archived: true }, 200, origin);
    }
    return reply({ error: "Ação inválida" }, 400, origin);
  } catch (error) {
    await audit(false, validUuid(body.user_id) || validUuid(body.barbershop_id), { message: error instanceof Error ? error.message : "Erro desconhecido" });
    return reply({ error: "Não foi possível concluir a operação" }, 400, origin);
  }
});
