/* OGRITECH — ADMINISTRAÇÃO DA PLATAFORMA */
const SEGMENTS = {
    "Barbearia": { icon: "✂", color: "#f0d477" }, "Salão de beleza": { icon: "✦", color: "#d173df" },
    "Manicure": { icon: "◇", color: "#f18fb4" }, "Bronzeamento": { icon: "☀", color: "#f0ad4e" },
    "Professor de música": { icon: "♫", color: "#6ba8f7" }, "Personal training": { icon: "◆", color: "#65d39b" },
    "Outro": { icon: "●", color: "#8fa3aa" }
};
let businesses = [], plans = [], users = [], selectedBusinessId = null;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const $ = (id) => document.getElementById(id);
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

async function validatePlatformAdmin() {
    sessionStorage.removeItem("ogritechMasterMode"); sessionStorage.removeItem("ogritechMasterBusinessId"); sessionStorage.removeItem("ogritechMasterBusinessName");
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { window.location.replace("login.html"); return false; }
    const { data: isAdmin, error } = await supabaseClient.rpc("is_platform_admin");
    if (error || !isAdmin) { window.location.replace("index.html"); return false; }
    const { data: profile } = await supabaseClient.from("profiles").select("full_name, active").eq("id", session.user.id).single();
    if (!profile?.active) { await supabaseClient.auth.signOut(); window.location.replace("login.html"); return false; }
    $("platformOwnerName").textContent = profile.full_name;
    return true;
}

async function loadData() {
    const [businessResult, planResult, profileResult] = await Promise.all([
        supabaseClient.from("saas_clients").select("*").order("created_at", { ascending: true }),
        supabaseClient.from("saas_plans").select("*").eq("active", true).order("display_order"),
        supabaseClient.from("profiles").select("id,barbershop_id,full_name,role,active").order("full_name")
    ]);
    if (businessResult.error) throw businessResult.error;
    if (planResult.error) throw planResult.error;
    if (profileResult.error) throw profileResult.error;
    businesses = businessResult.data || [];
    plans = planResult.data || [];
    users = (profileResult.data || []).filter((profile) => profile.id !== sessionStorage.getItem("japaUserId")).map((profile) => ({ ...profile, email: "" }));
}

function renderSummary() {
    const active = businesses.filter((business) => business.status === "Ativo");
    $("businessCount").textContent = businesses.length;
    $("segmentCount").textContent = new Set(businesses.map((business) => business.segment)).size;
    $("activeCount").textContent = active.length;
    $("monthlyRevenue").textContent = money.format(active.reduce((sum, business) => sum + Number(business.monthly_fee), 0));
}

function renderSegments() {
    $("segmentGrid").innerHTML = [...new Set(businesses.map((business) => business.segment))].map((segment) => {
        const meta = SEGMENTS[segment] || SEGMENTS.Outro;
        const count = businesses.filter((business) => business.segment === segment).length;
        return `<article class="segment-card" style="--segment-color:${meta.color}"><i>${meta.icon}</i><div><strong>${escapeHtml(segment)}</strong><span>${count} negócio${count === 1 ? "" : "s"}</span></div><b>${count}</b></article>`;
    }).join("");
}

function renderBusinesses() {
    const query = $("businessSearch").value.trim().toLocaleLowerCase("pt-BR"), segment = $("segmentFilter").value;
    const filtered = businesses.filter((business) => `${business.name} ${business.contact_name} ${business.owner_email || ""}`.toLocaleLowerCase("pt-BR").includes(query) && (segment === "all" || business.segment === segment));
    $("businessTableBody").innerHTML = filtered.map((business) => {
        const meta = SEGMENTS[business.segment] || SEGMENTS.Outro;
        return `<tr><td><button class="business-link" data-action="detail" data-id="${business.id}"><span style="--segment-color:${meta.color}">${meta.icon}</span><strong>${escapeHtml(business.name)}</strong></button></td>
        <td>${escapeHtml(business.segment)}</td><td>${escapeHtml(business.contact_name)}</td><td><span class="origin-badge ${business.origin === "Cliente real" ? "real" : ""}">${escapeHtml(business.origin)}</span></td>
        <td><span class="plan-badge">${escapeHtml(business.plan)}</span></td><td>${money.format(business.monthly_fee)}</td><td><span class="${business.status === "Ativo" ? "active-badge" : "suspended-badge"}">${escapeHtml(business.status)}</span></td>
        <td><div class="admin-row-actions"><button data-action="operate" data-id="${business.id}">Operar</button><button data-action="edit" data-id="${business.id}">Editar</button><button class="danger" data-action="delete" data-id="${business.id}">Excluir</button></div></td></tr>`;
    }).join("");
    $("businessEmpty").classList.toggle("hidden", filtered.length > 0);
    document.querySelector(".business-table-wrap").classList.toggle("hidden", filtered.length === 0);
}

function renderPlans() {
    $("plansGrid").innerHTML = plans.map((plan) => {
        const features = Array.isArray(plan.features) ? plan.features : [];
        return `<article class="plan-card ${plan.featured ? "featured" : ""}">${plan.featured ? '<span class="recommended-plan">MAIS ESCOLHIDO</span>' : ""}<p class="platform-kicker">${escapeHtml(plan.name)}</p><strong>${money.format(plan.monthly_fee)}<small>/mês</small></strong><p>${escapeHtml(plan.description)}</p><ul>${features.map((feature) => `<li>✓ ${escapeHtml(feature)}</li>`).join("")}</ul></article>`;
    }).join("");
}

const roleLabels = { owner: "Proprietário", admin: "Gestor", employee: "Funcionário", client: "Cliente final" };
function renderUsers() {
    if (!$("usersTableBody") || !$("userBusinessFilter")) return;
    const filter = $("userBusinessFilter").value;
    const filtered = users.filter((user) => filter === "all" || user.barbershop_id === filter);
    $("usersTableBody").innerHTML = filtered.map((user) => { const business = businesses.find((item) => item.barbershop_id === user.barbershop_id); return `<tr><td><strong>${escapeHtml(user.full_name)}</strong></td><td>${escapeHtml(user.email || "—")}</td><td>${escapeHtml(business?.name || "Sem vínculo")}</td><td><span class="plan-badge">${escapeHtml(roleLabels[user.role] || user.role)}</span></td><td><span class="${user.active ? "active-badge" : "suspended-badge"}">${user.active ? "Ativo" : "Inativo"}</span></td><td><div class="admin-row-actions"><button data-user-action="edit" data-id="${user.id}">Editar</button><button data-user-action="toggle" data-id="${user.id}">${user.active ? "Desativar" : "Ativar"}</button><button class="danger" data-user-action="delete" data-id="${user.id}">Excluir</button></div></td></tr>`; }).join("");
    $("usersEmpty").classList.toggle("hidden", filtered.length > 0);
}

function refreshViews() { renderSummary(); renderSegments(); renderBusinesses(); renderPlans(); renderUsers(); }
function populateSelectors() {
    $("businessSegment").innerHTML = Object.keys(SEGMENTS).map((segment) => `<option>${segment}</option>`).join("");
    $("segmentFilter").innerHTML = '<option value="all">Todos os segmentos</option>' + Object.keys(SEGMENTS).map((segment) => `<option>${segment}</option>`).join("");
    $("businessPlan").innerHTML = plans.map((plan) => `<option value="${escapeHtml(plan.name)}" data-price="${plan.monthly_fee}">${escapeHtml(plan.name)}</option>`).join("");
    const businessOptions = businesses.filter((business) => business.barbershop_id).map((business) => `<option value="${business.barbershop_id}">${escapeHtml(business.name)}</option>`).join("");
    if ($("userBusiness")) $("userBusiness").innerHTML = businessOptions;
    if ($("userBusinessFilter")) $("userBusinessFilter").innerHTML = '<option value="all">Todos os negócios</option>' + businessOptions;
}

function openBusinessForm(business = null) {
    $("businessForm").reset(); $("businessFormMessage").textContent = ""; $("businessId").value = business?.id || "";
    $("businessModalTitle").textContent = business ? "Editar negócio" : "Cadastrar novo negócio";
    if (business) {
        $("businessName").value = business.name; $("businessSegment").value = business.segment; $("businessOwner").value = business.contact_name;
        $("businessEmail").value = business.owner_email || ""; $("businessPhone").value = business.phone || ""; $("businessPlan").value = business.plan;
        $("businessPrice").value = business.monthly_fee; $("businessOrigin").value = business.origin; $("businessNotes").value = business.notes || "";
    } else syncPlanPrice();
    $("businessModal").classList.remove("hidden");
}

function openBusinessDetail(business) {
    selectedBusinessId = business.id; $("detailBusinessName").textContent = business.name;
    $("detailBusinessMeta").textContent = `${business.segment} • ${business.plan} • ${business.status}`;
    $("detailStats").innerHTML = `<article><span>Usuários</span><strong>${business.user_count || 0}</strong></article><article><span>Clientes</span><strong>${business.client_count || 0}</strong></article><article><span>Agendamentos</span><strong>${business.appointment_count || 0}</strong></article><article><span>Faturamento</span><strong>${money.format(business.business_revenue || 0)}</strong></article>`;
    $("detailInformation").innerHTML = `<p><span>Responsável</span><strong>${escapeHtml(business.contact_name)}</strong></p><p><span>E-mail</span><strong>${escapeHtml(business.owner_email || "Não informado")}</strong></p><p><span>Telefone</span><strong>${escapeHtml(business.phone || "Não informado")}</strong></p><p><span>Convite</span><strong>${escapeHtml(business.invite_status || "Pendente")}</strong></p><p class="full-detail"><span>Observações</span><strong>${escapeHtml(business.notes || "Sem observações")}</strong></p>`;
    $("detailStatusButton").textContent = business.status === "Ativo" ? "Suspender" : "Reativar";
    $("businessDetailModal").classList.remove("hidden");
}

function closeModals() { document.querySelectorAll(".platform-modal").forEach((modal) => modal.classList.add("hidden")); }
function syncPlanPrice() { const option = $("businessPlan").selectedOptions[0]; if (option) $("businessPrice").value = option.dataset.price; }

async function saveBusiness(event) {
    event.preventDefault(); const id = $("businessId").value;
    const payload = { name: $("businessName").value.trim(), segment: $("businessSegment").value, contact_name: $("businessOwner").value.trim(), owner_email: $("businessEmail").value.trim().toLowerCase(), phone: $("businessPhone").value.trim() || null, plan: $("businessPlan").value, monthly_fee: Number($("businessPrice").value), origin: $("businessOrigin").value, notes: $("businessNotes").value.trim() || null };
    if (!id) payload.invite_status = "Pendente";
    $("saveBusinessButton").disabled = true; $("businessFormMessage").textContent = "Salvando...";
    let error;
    if (id) {
        const current = businesses.find((item) => item.id === id);
        ({ error } = await supabaseClient.from("saas_clients").update(payload).eq("id", id));
        if (!error && current?.barbershop_id) ({ error } = await supabaseClient.from("barbershops").update({ name: payload.name }).eq("id", current.barbershop_id));
    } else {
        ({ error } = await supabaseClient.rpc("platform_create_business", { business_name: payload.name, business_segment: payload.segment, responsible_name: payload.contact_name, responsible_email: payload.owner_email, business_phone: payload.phone || "", plan_name: payload.plan, plan_price: payload.monthly_fee, business_origin: payload.origin, business_notes: payload.notes || "" }));
    }
    $("saveBusinessButton").disabled = false;
    if (error) { $("businessFormMessage").textContent = error.code === "23505" ? "Já existe um negócio com esse nome ou e-mail." : "Não foi possível salvar o negócio."; $("businessFormMessage").className = "form-message error"; return; }
    await loadData(); populateSelectors(); refreshViews(); closeModals();
}

async function toggleBusinessStatus(business) {
    const status = business.status === "Ativo" ? "Suspenso" : "Ativo";
    const { error } = await supabaseClient.from("saas_clients").update({ status }).eq("id", business.id);
    if (error) return alert("Não foi possível alterar o status.");
    await loadData(); refreshViews(); closeModals();
}

async function deleteBusiness(business) {
    if (!confirm(`Excluir o cadastro de ${business.name}? Esta ação não pode ser desfeita.`)) return;
    let error;
    if (business.barbershop_id) {
        const result = await supabaseClient.functions.invoke("platform-users", { body: { action: "delete_business", barbershop_id: business.barbershop_id } });
        error = result.error || (result.data?.error ? new Error(result.data.error) : null);
    } else ({ error } = await supabaseClient.from("saas_clients").delete().eq("id", business.id));
    if (error) return alert("Não foi possível excluir o negócio.");
    await loadData(); populateSelectors(); refreshViews();
}

function operateBusiness(business) {
    if (!business.barbershop_id) return alert("Este cadastro ainda não está vinculado a uma unidade operacional.");
    sessionStorage.setItem("ogritechMasterMode", "true");
    sessionStorage.setItem("ogritechMasterBusinessId", business.barbershop_id);
    sessionStorage.setItem("ogritechMasterBusinessName", business.name);
    sessionStorage.setItem("japaBarbershopId", business.barbershop_id);
    sessionStorage.setItem("japaRole", "owner");
    sessionStorage.setItem("japaUserRole", "Master Ogritech");
    window.location.assign("index.html");
}

function updateEmployeeFields() { document.querySelectorAll(".employee-field").forEach((field) => field.classList.toggle("hidden", $("userRole").value !== "employee")); }
function openUserForm(businessId = "", user = null) { if (!$("userForm")) return alert("Atualize a página para carregar o módulo de usuários."); $("userForm").reset(); $("userFormMessage").textContent = ""; $("userId").value = user?.id || ""; $("userModalTitle").textContent = user ? "Editar usuário" : "Adicionar usuário"; $("saveUserButton").textContent = user ? "Salvar alterações" : "Enviar convite"; if (businessId) $("userBusiness").value = businessId; if (user) { $("userBusiness").value = user.barbershop_id; $("userRole").value = user.role; $("userName").value = user.full_name; $("userEmail").value = user.email; } updateEmployeeFields(); $("userModal").classList.remove("hidden"); }
async function saveUser(event) {
    event.preventDefault(); $("saveUserButton").disabled = true; $("userFormMessage").textContent = "Enviando convite...";
    const { data, error } = await supabaseClient.functions.invoke("platform-users", { body: { action: $("userId").value ? "update" : "invite", user_id: $("userId").value || undefined, barbershop_id: $("userBusiness").value, role: $("userRole").value, full_name: $("userName").value.trim(), email: $("userEmail").value.trim().toLowerCase(), specialty: $("userSpecialty").value.trim(), commission: Number($("userCommission").value || 0) } });
    $("saveUserButton").disabled = false;
    if (error || data?.error) { $("userFormMessage").textContent = data?.error || "Não foi possível enviar o convite."; $("userFormMessage").className = "form-message error"; return; }
    await loadData(); populateSelectors(); refreshViews(); closeModals();
}

function bindEvents() {
    $("businessSearch").addEventListener("input", renderBusinesses); $("segmentFilter").addEventListener("change", renderBusinesses);
    $("newBusinessButton").addEventListener("click", () => openBusinessForm()); $("businessPlan").addEventListener("change", syncPlanPrice); $("businessForm").addEventListener("submit", saveBusiness);
    document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModals));
    document.querySelectorAll(".platform-modal").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) closeModals(); }));
    $("businessTableBody").addEventListener("click", (event) => { const button = event.target.closest("[data-action]"); if (!button) return; const business = businesses.find((item) => item.id === button.dataset.id); if (!business) return; if (button.dataset.action === "detail") openBusinessDetail(business); if (button.dataset.action === "operate") operateBusiness(business); if (button.dataset.action === "edit") openBusinessForm(business); if (button.dataset.action === "delete") deleteBusiness(business); });
    $("detailEditButton").addEventListener("click", () => { const business = businesses.find((item) => item.id === selectedBusinessId); closeModals(); openBusinessForm(business); });
    $("detailStatusButton").addEventListener("click", () => {
        const business = businesses.find((item) => item.id === selectedBusinessId);
        if (business) toggleBusinessStatus(business);
    });
    $("detailOperateButton")?.addEventListener("click", () => { const business = businesses.find((item) => item.id === selectedBusinessId); if (business) operateBusiness(business); });
    $("detailAddUserButton")?.addEventListener("click", () => { const business = businesses.find((item) => item.id === selectedBusinessId); closeModals(); openUserForm(business?.barbershop_id); });
    $("newUserButton")?.addEventListener("click", () => openUserForm()); $("userRole")?.addEventListener("change", updateEmployeeFields); $("userForm")?.addEventListener("submit", saveUser); $("userBusinessFilter")?.addEventListener("change", renderUsers);
    $("usersTableBody")?.addEventListener("click", async (event) => { const button = event.target.closest("[data-user-action]"); if (!button) return; const user = users.find((item) => item.id === button.dataset.id); if (!user) return; if (button.dataset.userAction === "edit") return openUserForm(user.barbershop_id, user); if (button.dataset.userAction === "toggle") { const { error } = await supabaseClient.from("profiles").update({ active: !user.active }).eq("id", user.id); if (error) return alert("Não foi possível alterar o usuário."); } else if (button.dataset.userAction === "delete") { if (!confirm(`Excluir o acesso de ${user.full_name}?`)) return; const result = await supabaseClient.functions.invoke("platform-users", { body: { action: "delete", user_id: user.id } }); if (result.error || result.data?.error) return alert("Não foi possível excluir o usuário."); } await loadData(); refreshViews(); });
    $("platformLogout").addEventListener("click", async () => { await supabaseClient.auth.signOut(); sessionStorage.clear(); window.location.replace("login.html"); });
}

async function initializeDashboard() {
    try { if (!await validatePlatformAdmin()) return; await loadData(); populateSelectors(); refreshViews(); bindEvents(); $("adminLoading").classList.add("hidden"); }
    catch (error) { $("adminLoading").textContent = `Não foi possível carregar a administração da Ogritech. ${error?.message || "Tente atualizar a página."}`; console.error("Erro no painel Ogritech:", error); }
}
initializeDashboard();
