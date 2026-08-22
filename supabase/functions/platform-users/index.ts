import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const auth = request.headers.get("Authorization") || "";
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: allowed } = await caller.rpc("is_platform_admin");
  if (!allowed) return reply({ error: "Acesso negado" }, 403);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await request.json();
  if (body.action === "list") {
    const { data: profiles, error } = await admin.from("profiles").select("id,barbershop_id,full_name,role,active");
    if (error) return reply({ error: error.message }, 400);
    const { data: authData, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authError) return reply({ error: authError.message }, 400);
    const { data: masters } = await admin.from("platform_admins").select("user_id");
    const masterIds = new Set((masters || []).map((item) => item.user_id));
    const emails = new Map(authData.users.map((user) => [user.id, user.email || ""]));
    return reply({ users: (profiles || []).filter((profile) => !masterIds.has(profile.id)).map((profile) => ({ ...profile, email: emails.get(profile.id) || "" })) });
  }
  if (body.action === "invite") {
    if (!body.email || !body.full_name || !body.barbershop_id || !["owner", "admin", "employee", "client"].includes(body.role)) return reply({ error: "Dados inválidos" }, 400);
    const { data, error } = await admin.auth.admin.inviteUserByEmail(String(body.email).toLowerCase(), { data: { full_name: body.full_name } });
    if (error) return reply({ error: error.message }, 400);
    const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, barbershop_id: body.barbershop_id, full_name: body.full_name, role: body.role, active: true });
    if (profileError) { await admin.auth.admin.deleteUser(data.user.id); return reply({ error: profileError.message }, 400); }
    if (body.role === "employee") await admin.from("employees").insert({ barbershop_id: body.barbershop_id, name: body.full_name, specialty: body.specialty || "Atendimento geral", commission_percentage: Number(body.commission || 0), active: true });
    if (body.role === "client") await admin.from("business_clients").insert({ barbershop_id: body.barbershop_id, name: body.full_name, email: String(body.email).toLowerCase(), phone: "" });
    if (body.role === "owner") await admin.from("saas_clients").update({ contact_name: body.full_name, owner_email: String(body.email).toLowerCase(), invite_status: "Enviado" }).eq("barbershop_id", body.barbershop_id);
    return reply({ user: { id: data.user.id, email: data.user.email } });
  }
  if (body.action === "update") {
    if (!body.user_id || !body.email || !body.full_name || !body.barbershop_id || !["owner", "admin", "employee", "client"].includes(body.role)) return reply({ error: "Dados inválidos" }, 400);
    const { data: protectedUser } = await admin.from("platform_admins").select("user_id").eq("user_id", body.user_id).maybeSingle();
    if (protectedUser) return reply({ error: "O acesso master não pode ser alterado" }, 400);
    const { error: authError } = await admin.auth.admin.updateUserById(body.user_id, { email: String(body.email).toLowerCase(), user_metadata: { full_name: body.full_name } });
    if (authError) return reply({ error: authError.message }, 400);
    const { error } = await admin.from("profiles").update({ barbershop_id: body.barbershop_id, full_name: body.full_name, role: body.role }).eq("id", body.user_id);
    if (error) return reply({ error: error.message }, 400);
    return reply({ ok: true });
  }
  if (body.action === "delete") {
    const { data: protectedUser } = await admin.from("platform_admins").select("user_id").eq("user_id", body.user_id).maybeSingle();
    if (protectedUser) return reply({ error: "O acesso master não pode ser excluído" }, 400);
    const { error } = await admin.auth.admin.deleteUser(body.user_id);
    if (error) return reply({ error: error.message }, 400);
    return reply({ ok: true });
  }
  if (body.action === "delete_business") {
    const id = body.barbershop_id;
    if (!id) return reply({ error: "Negócio inválido" }, 400);
    const { data: profiles } = await admin.from("profiles").select("id").eq("barbershop_id", id);
    for (const profile of profiles || []) await admin.auth.admin.deleteUser(profile.id);
    for (const table of ["financial_entries", "privacy_requests", "business_appointments", "business_clients", "services", "employees"]) await admin.from(table).delete().eq("barbershop_id", id);
    await admin.from("saas_clients").delete().eq("barbershop_id", id);
    const { error } = await admin.from("barbershops").delete().eq("id", id);
    if (error) return reply({ error: error.message }, 400);
    return reply({ ok: true });
  }
  return reply({ error: "Ação inválida" }, 400);
});
