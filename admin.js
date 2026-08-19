/* OGRITECH — ADMINISTRAÇÃO DA PLATAFORMA */
const SEGMENTS = {
    "Barbearia": { icon: "✂", color: "#f0d477" }, "Salão de beleza": { icon: "✦", color: "#d173df" },
    "Manicure": { icon: "◇", color: "#f18fb4" }, "Bronzeamento": { icon: "☀", color: "#f0ad4e" },
    "Professor de música": { icon: "♫", color: "#6ba8f7" }, "Personal training": { icon: "◆", color: "#65d39b" },
    "Outro": { icon: "●", color: "#8fa3aa" }
};
let businesses = [], plans = [], selectedBusinessId = null;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const $ = (id) => document.getElementById(id);
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

async function validatePlatformAdmin() {
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
    const [businessResult, planResult] = await Promise.all([
        supabaseClient.from("saas_clients").select("*").order("created_at", { ascending: true }),
        supabaseClient.from("saas_plans").select("*").eq("active", true).order("display_order")
    ]);
    if (businessResult.error) throw businessResult.error;
    if (planResult.error) throw planResult.error;
    businesses = businessResult.data || [];
    plans = planResult.data || [];
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
        <td><div class="admin-row-actions"><button data-action="edit" data-id="${business.id}">Editar</button><button class="danger" data-action="delete" data-id="${business.id}">Excluir</button></div></td></tr>`;
    }).join("");
    $("businessEmpty").classList.toggle("hidden", filtered.length > 0);
    document.querySelector(".business-table-wrap").classList.toggle("hidden", filtered.length === 0);
}

function renderPlans() {
    $("plansGrid").innerHTML = plans.map((plan) => `<article class="plan-card ${plan.featured ? "featured" : ""}">${plan.featured ? '<span class="recommended-plan">MAIS ESCOLHIDO</span>' : ""}<p class="platform-kicker">${escapeHtml(plan.name)}</p><strong>${money.format(plan.monthly_fee)}<small>/mês</small></strong><p>${escapeHtml(plan.description)}</p><ul>${(plan.features || []).map((feature) => `<li>✓ ${escapeHtml(feature)}</li>`).join("")}</ul></article>`).join("");
}

function refreshViews() { renderSummary(); renderSegments(); renderBusinesses(); renderPlans(); }
function populateSelectors() {
    $("businessSegment").innerHTML = Object.keys(SEGMENTS).map((segment) => `<option>${segment}</option>`).join("");
    $("segmentFilter").innerHTML = '<option value="all">Todos os segmentos</option>' + Object.keys(SEGMENTS).map((segment) => `<option>${segment}</option>`).join("");
    $("businessPlan").innerHTML = plans.map((plan) => `<option value="${escapeHtml(plan.name)}" data-price="${plan.monthly_fee}">${escapeHtml(plan.name)}</option>`).join("");
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
    const { error } = await (id ? supabaseClient.from("saas_clients").update(payload).eq("id", id) : supabaseClient.from("saas_clients").insert(payload));
    $("saveBusinessButton").disabled = false;
    if (error) { $("businessFormMessage").textContent = error.code === "23505" ? "Já existe um negócio com esse nome ou e-mail." : "Não foi possível salvar o negócio."; $("businessFormMessage").className = "form-message error"; return; }
    await loadData(); refreshViews(); closeModals();
}

async function toggleBusinessStatus(business) {
    const status = business.status === "Ativo" ? "Suspenso" : "Ativo";
    const { error } = await supabaseClient.from("saas_clients").update({ status }).eq("id", business.id);
    if (error) return alert("Não foi possível alterar o status.");
    await loadData(); refreshViews(); closeModals();
}

async function deleteBusiness(business) {
    if (!confirm(`Excluir o cadastro de ${business.name}? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabaseClient.from("saas_clients").delete().eq("id", business.id);
    if (error) return alert("Não foi possível excluir o negócio.");
    await loadData(); refreshViews();
}

function bindEvents() {
    $("businessSearch").addEventListener("input", renderBusinesses); $("segmentFilter").addEventListener("change", renderBusinesses);
    $("newBusinessButton").addEventListener("click", () => openBusinessForm()); $("businessPlan").addEventListener("change", syncPlanPrice); $("businessForm").addEventListener("submit", saveBusiness);
    document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModals));
    document.querySelectorAll(".platform-modal").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) closeModals(); }));
    $("businessTableBody").addEventListener("click", (event) => { const button = event.target.closest("[data-action]"); if (!button) return; const business = businesses.find((item) => item.id === button.dataset.id); if (!business) return; if (button.dataset.action === "detail") openBusinessDetail(business); if (button.dataset.action === "edit") openBusinessForm(business); if (button.dataset.action === "delete") deleteBusiness(business); });
    $("detailEditButton").addEventListener("click", () => { const business = businesses.find((item) => item.id === selectedBusinessId); closeModals(); openBusinessForm(business); });
    $("detailStatusButton").addEventListener("click", () => toggleBusinessStatus(businesses.find((item) => item.id === selectedBusinessId)));
    $("platformLogout").addEventListener("click", async () => { await supabaseClient.auth.signOut(); sessionStorage.clear(); window.location.replace("login.html"); });
}

async function initializeDashboard() {
    try { if (!await validatePlatformAdmin()) return; await loadData(); populateSelectors(); refreshViews(); bindEvents(); $("adminLoading").classList.add("hidden"); }
    catch (error) { $("adminLoading").textContent = "Não foi possível carregar a administração da Ogritech."; console.error("Erro no painel Ogritech:", error.message); }
}
initializeDashboard();
