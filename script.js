/* =========================================================
   OGRITECH - PAINEL DA BARBEARIA
   ETAPA 5: Agenda integrada.

   Nesta etapa:
   - cliente cria um horário;
   - funcionário visualiza sua própria agenda;
   - proprietário visualiza todos os profissionais;
   - proprietário/funcionário alteram o status;
   - horários ocupados não podem ser duplicados.

   Contas reais usam Supabase; localStorage fica restrito às demonstrações.
   ========================================================= */

// =========================================================
// 1. CHAVES DE ARMAZENAMENTO
// =========================================================
const BARBERSHOP_ID = sessionStorage.getItem("japaBarbershopId");
const CLIENTS_STORAGE_KEY = `japaNaBarbaClients:${BARBERSHOP_ID}`;
const APPOINTMENTS_STORAGE_KEY = `japaNaBarbaAppointments:${BARBERSHOP_ID}`;
const SERVICES_STORAGE_KEY = `ogritechServices:${BARBERSHOP_ID}`;
const PROFESSIONALS_STORAGE_KEY = `ogritechProfessionals:${BARBERSHOP_ID}`;
const FINANCIAL_STORAGE_KEY = `ogritechFinancial:${BARBERSHOP_ID}`;
const SETTINGS_STORAGE_KEY = `ogritechSettings:${BARBERSHOP_ID}`;
const IS_DEMO = sessionStorage.getItem("japaDemo") === "true";
let appointmentsCache = [];
let clientsCache = [];
let remoteAppointmentIds = new Set();
let remoteClientIds = new Set();
let privacyRequestsCache = [];
let servicesCache = [];
let professionalsCache = [];
let financialCache = [];

// =========================================================
// 2. SESSÃO ATUAL
// =========================================================
const currentRole = sessionStorage.getItem("japaRole") || "owner";
const currentUserName = sessionStorage.getItem("japaUserName") || "Administrador";
const businessConfig = window.getOgritechBusiness();
const IS_MASTER_MODE = sessionStorage.getItem("ogritechMasterMode") === "true";
if (IS_MASTER_MODE && sessionStorage.getItem("ogritechMasterBusinessName")) {
    businessConfig.name = sessionStorage.getItem("ogritechMasterBusinessName");
}

// Neste protótipo o login do funcionário "Carlos"
// corresponde ao profissional Carlos.
const employeeProfessional =
    currentRole === "employee"
        ? currentUserName
        : null;

// =========================================================
// 3. ELEMENTOS GERAIS
// =========================================================
const pageTitle = document.getElementById("page-title");
const menuItems = document.querySelectorAll(".menu-item");

const dashboardView = document.getElementById("dashboardView");
const clientsView = document.getElementById("clientsView");
const agendaView = document.getElementById("agendaView");
const servicesView = document.getElementById("servicesView");
const professionalsView = document.getElementById("professionalsView");
const financialView = document.getElementById("financialView");
const settingsView = document.getElementById("settingsView");

const openAppointmentButton = document.getElementById("newAppointment");
const agendaNewAppointment = document.getElementById("agendaNewAppointment");

// Dashboard.
const todayAppointmentCount = document.getElementById("todayAppointmentCount");
const todayAppointmentSubtitle = document.getElementById("todayAppointmentSubtitle");
const dashboardAppointmentList = document.getElementById("dashboardAppointmentList");
const dashboardAppointmentEmpty = document.getElementById("dashboardAppointmentEmpty");
const viewAgenda = document.getElementById("viewAgenda");
const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// =========================================================
// 4. FUNÇÕES UTILITÁRIAS
// =========================================================
function createId() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(date) {
    if (!date) return "—";

    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
}

function todayISO() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function applyBusinessCustomization() {
    window.applyOgritechBusinessTheme(businessConfig);
    const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
    const tenantLogo = document.getElementById("tenantLogo");
    const tenantIcon = document.getElementById("tenantIcon");
    document.title = `Ogritech | ${businessConfig.name}`;
    document.getElementById("tenantName").textContent = businessConfig.name;
    document.getElementById("businessPanelEyebrow").textContent = `${businessConfig.name.toUpperCase()} • PAINEL ADMINISTRATIVO`;
    document.getElementById("businessRevenue").textContent = currency.format(businessConfig.revenue);
    document.getElementById("businessTicket").textContent = currency.format(businessConfig.ticket);
    const backToShowcase = document.getElementById("backToShowcase");
    if (IS_MASTER_MODE && backToShowcase) {
        backToShowcase.href = "admin.html";
        backToShowcase.textContent = "← Voltar ao painel master";
        backToShowcase.classList.remove("hidden");
    } else if (IS_DEMO && backToShowcase) {
        backToShowcase.href = `demonstracoes.html?segmento=${encodeURIComponent(businessConfig.key)}`;
        backToShowcase.classList.remove("hidden");
    }

    if (businessConfig.key === "barbearia") {
        tenantLogo.classList.remove("hidden");
        tenantIcon.classList.add("hidden");
    } else {
        tenantLogo.classList.add("hidden");
        tenantIcon.textContent = businessConfig.icon;
        tenantIcon.style.color = businessConfig.color;
        tenantIcon.classList.remove("hidden");
    }

    const clientsMenu = document.querySelector('[data-section="clientes"]');
    if (clientsMenu) clientsMenu.innerHTML = `<span>♙</span>${escapeHtml(businessConfig.clientPlural)}`;

    document.getElementById("popularServices").innerHTML = businessConfig.services.map((service, index) =>
        `<div class="service"><i style="color:${businessConfig.color}">${escapeHtml(businessConfig.icon)}</i><div><strong>${escapeHtml(service[0])}</strong><span>${86 - index * 13} atendimentos</span></div><b>${currency.format(service[1])}</b></div>`
    ).join("");

    const serviceOptions = '<option value="">Selecione</option>' + businessConfig.services.map((service) =>
        `<option value="${escapeHtml(service[0])}">${escapeHtml(service[0])} — ${currency.format(service[1])}</option>`
    ).join("");
    const professionalOptions = businessConfig.professionals.map((name) =>
        `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
    ).join("");
    document.getElementById("appointmentService").innerHTML = serviceOptions;
    document.getElementById("appointmentProfessional").innerHTML = '<option value="">Selecione</option>' + professionalOptions;
    document.getElementById("agendaProfessionalFilter").innerHTML = '<option value="all">Todos</option>' + professionalOptions;
}

applyBusinessCustomization();

const STATUS_INFO = {
    requested: {
        label: "Solicitado",
        className: "pending"
    },
    confirmed: {
        label: "Confirmado",
        className: "confirmed"
    },
    completed: {
        label: "Concluído",
        className: "completed"
    },
    cancelled: {
        label: "Cancelado",
        className: "cancelled"
    },
    no_show: {
        label: "Não compareceu",
        className: "no-show"
    }
};

function statusInfo(status) {
    return STATUS_INFO[status] || STATUS_INFO.requested;
}

// =========================================================
// 5. DADOS DA AGENDA (SUPABASE; LOCALSTORAGE SOMENTE NO DEMO)
// =========================================================
function getAppointments() {
    if (!IS_DEMO) return appointmentsCache;
    try {
        const appointments = JSON.parse(
            localStorage.getItem(APPOINTMENTS_STORAGE_KEY)
        );
        return Array.isArray(appointments)
            ? appointments.filter((item) =>
                item && typeof item === "object" &&
                typeof item.id === "string" &&
                typeof item.date === "string" &&
                typeof item.time === "string" &&
                typeof item.professional === "string"
            )
            : [];
    } catch (error) {
        console.error("Erro ao ler a agenda:", error);
        return [];
    }
}

async function saveAppointments(appointments) {
    if (IS_DEMO) {
        localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
    } else {
        appointmentsCache = appointments;
        const rows = appointments.map((item) => ({
            id: item.id,
            barbershop_id: BARBERSHOP_ID,
            client_name: item.clientName,
            client_email: item.clientEmail || "",
            service: item.service,
            professional: item.professional,
            appointment_date: item.date,
            appointment_time: item.time,
            status: item.status,
            created_by: item.createdBy || currentRole,
            created_at: item.createdAt || new Date().toISOString(),
            updated_at: item.updatedAt || new Date().toISOString()
        }));
        const removedIds = [...remoteAppointmentIds].filter((id) => !appointments.some((item) => item.id === id));
        if (removedIds.length) {
            const { error } = await supabaseClient.from("business_appointments").delete().in("id", removedIds);
            if (error) { reportDataError("salvar os agendamentos", error); return false; }
        }
        if (rows.length) {
            const { error } = await supabaseClient.from("business_appointments").upsert(rows);
            if (error) { reportDataError("salvar os agendamentos", error); return false; }
        }
        remoteAppointmentIds = new Set(appointments.map((item) => item.id));
    }

    renderAgenda();
    renderDashboardAgenda();
    renderBusinessIndicators();
    return true;
}

function appointmentFromDatabase(row) {
    return { id: row.id, clientName: row.client_name, clientEmail: row.client_email, service: row.service,
        professional: row.professional, date: row.appointment_date, time: String(row.appointment_time).slice(0, 5),
        status: row.status, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at };
}

function reportDataError(action, error) {
    console.error(`Erro ao ${action}:`, error);
    alert(`Não foi possível ${action}. Verifique a conexão e tente novamente.`);
}

// Verifica conflito de horário para o mesmo profissional.
// Cancelados não bloqueiam o horário.
function isTimeOccupied(date, time, professional, ignoreId = null) {
    return getAppointments().some((appointment) => {
        return (
            appointment.id !== ignoreId &&
            appointment.date === date &&
            appointment.time === time &&
            appointment.professional === professional &&
            appointment.status !== "cancelled"
        );
    });
}

// Funcionário só pode enxergar seus próprios atendimentos.
function appointmentsAllowedForCurrentUser(appointments) {
    if (currentRole === "employee") {
        return appointments.filter(
            (appointment) =>
                appointment.professional === employeeProfessional
        );
    }

    return appointments;
}

// =========================================================
// 6. MODAL DE AGENDAMENTO ADMINISTRATIVO
// =========================================================
const appointmentModal = document.getElementById("appointmentModal");
const closeAppointmentButton = document.getElementById("closeModal");
const appointmentForm = document.getElementById("appointmentForm");

const appointmentClientName = document.getElementById("appointmentClientName");
const appointmentService = document.getElementById("appointmentService");
const appointmentProfessional = document.getElementById("appointmentProfessional");
const appointmentDate = document.getElementById("appointmentDate");
const appointmentTime = document.getElementById("appointmentTime");
const appointmentMessage = document.getElementById("appointmentMessage");

function openAppointmentModal() {
    appointmentForm.reset();
    appointmentMessage.textContent = "";
    appointmentMessage.className = "form-message";

    // Funcionário agenda apenas para si.
    if (currentRole === "employee") {
        appointmentProfessional.value = employeeProfessional;
        appointmentProfessional.disabled = true;
    } else {
        appointmentProfessional.disabled = false;
    }

    appointmentDate.min = todayISO();
    appointmentModal.classList.remove("hidden");
}

function closeAppointmentModal() {
    appointmentModal.classList.add("hidden");
    appointmentForm.reset();
    appointmentProfessional.disabled = false;
}

openAppointmentButton.addEventListener("click", openAppointmentModal);
agendaNewAppointment.addEventListener("click", openAppointmentModal);

closeAppointmentButton.addEventListener("click", closeAppointmentModal);

appointmentModal.addEventListener("click", (event) => {
    if (event.target === appointmentModal) {
        closeAppointmentModal();
    }
});

appointmentForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const professional =
        currentRole === "employee"
            ? employeeProfessional
            : appointmentProfessional.value;

    if (
        isTimeOccupied(
            appointmentDate.value,
            appointmentTime.value,
            professional
        )
    ) {
        appointmentMessage.textContent =
            "Este profissional já possui um atendimento nesse horário.";

        appointmentMessage.className =
            "form-message error";

        return;
    }

    const appointments = getAppointments();

    appointments.push({
        id: createId(),
        clientName: appointmentClientName.value.trim(),
        clientEmail: "",
        service: appointmentService.value,
        professional,
        date: appointmentDate.value,
        time: appointmentTime.value,

        // Criado pela equipe já entra confirmado.
        status: "confirmed",

        createdBy: currentRole,
        createdAt: new Date().toISOString()
    });

    saveAppointments(appointments);

    closeAppointmentModal();

    showSection("agenda");

    const agendaMenuItem =
        document.querySelector('[data-section="agenda"]');

    menuItems.forEach((menu) =>
        menu.classList.remove("active")
    );

    agendaMenuItem.classList.add("active");
});

// =========================================================
// 7. NAVEGAÇÃO
// =========================================================
const titles = {
    dashboard: "Dashboard",
    clientes: "Clientes",
    agenda: "Agenda",
    servicos: "Serviços",
    profissionais: "Profissionais",
    financeiro: "Financeiro",
    configuracoes: "Configurações"
};

function hideAllViews() {
    dashboardView.classList.add("hidden");
    clientsView.classList.add("hidden");
    agendaView.classList.add("hidden");
    servicesView.classList.add("hidden");
    professionalsView.classList.add("hidden");
    financialView.classList.add("hidden");
    settingsView.classList.add("hidden");
}

function showSection(section) {
    hideAllViews();

    if (section === "clientes") {
        clientsView.classList.remove("hidden");
        openAppointmentButton.classList.add("hidden");
        renderClients();
    } else if (section === "agenda") {
        agendaView.classList.remove("hidden");
        openAppointmentButton.classList.remove("hidden");
        renderAgenda();
    } else if (section === "servicos") {
        servicesView.classList.remove("hidden");
        openAppointmentButton.classList.add("hidden");
        renderServices();
    } else if (section === "profissionais") {
        professionalsView.classList.remove("hidden");
        openAppointmentButton.classList.add("hidden");
        renderProfessionals();
    } else if (section === "financeiro") {
        financialView.classList.remove("hidden");
        openAppointmentButton.classList.add("hidden");
        renderFinancial();
    } else if (section === "configuracoes") {
        settingsView.classList.remove("hidden");
        openAppointmentButton.classList.add("hidden");
        renderSettings();
    } else {
        dashboardView.classList.remove("hidden");
        openAppointmentButton.classList.remove("hidden");
        renderDashboardAgenda();
    }

    pageTitle.textContent =
        titles[section] || "Dashboard";
}

menuItems.forEach((item) => {
    item.addEventListener("click", (event) => {
        event.preventDefault();

        menuItems.forEach((menu) =>
            menu.classList.remove("active")
        );

        item.classList.add("active");
        showSection(item.dataset.section);
    });
});

viewAgenda.addEventListener("click", () => {
    const agendaItem =
        document.querySelector('[data-section="agenda"]');

    menuItems.forEach((menu) =>
        menu.classList.remove("active")
    );

    agendaItem.classList.add("active");
    showSection("agenda");
});

// =========================================================
// 8. DASHBOARD: AGENDA DE HOJE
// =========================================================
function renderDashboardAgenda() {
    const today = todayISO();

    let appointments =
        appointmentsAllowedForCurrentUser(
            getAppointments()
        )
        .filter((appointment) =>
            appointment.date === today &&
            appointment.status !== "cancelled"
        )
        .sort((a, b) =>
            a.time.localeCompare(b.time)
        );

    todayAppointmentCount.textContent =
        appointments.length;

    todayAppointmentSubtitle.textContent =
        currentRole === "employee"
            ? `Agenda de ${employeeProfessional}`
            : "Todos os profissionais";

    dashboardAppointmentList.innerHTML = "";

    if (appointments.length === 0) {
        dashboardAppointmentEmpty.classList.remove("hidden");
        return;
    }

    dashboardAppointmentEmpty.classList.add("hidden");

    appointments.slice(0, 5).forEach((appointment) => {
        const info = statusInfo(appointment.status);

        const item = document.createElement("div");
        item.className = "appointment";

        item.innerHTML = `
            <b class="time">${escapeHtml(appointment.time)}</b>

            <div class="appointment-info">
                <strong>${escapeHtml(appointment.clientName)}</strong>
                <span>
                    ${escapeHtml(appointment.service)}
                    •
                    ${escapeHtml(appointment.professional)}
                </span>
            </div>

            <em class="status ${info.className}">
                ${info.label}
            </em>
        `;

        dashboardAppointmentList.appendChild(item);
    });
}

// =========================================================
// 8.1. DASHBOARD: INDICADORES DE GESTÃO
// =========================================================
function serviceFinancials(serviceName) {
    const service = businessConfig.services.find((item) => item[0] === serviceName);
    const price = Number(service?.[1]) || 0;
    const cost = Number.isFinite(Number(service?.[3])) ? Number(service[3]) : price * 0.4;
    return { price, cost };
}

function completedAppointmentsForMonth(year, month) {
    return getAppointments().filter((appointment) => {
        const date = new Date(`${appointment.date}T12:00:00`);
        return appointment.status === "completed" && date.getFullYear() === year && date.getMonth() === month;
    });
}

function renderBusinessIndicators() {
    const globalMargin = document.getElementById("globalProfitMargin");
    if (!globalMargin) return;

    const now = new Date();
    const completed = getAppointments().filter((item) => item.status === "completed");
    let totalRevenue = 0;
    let totalCost = 0;
    const byCategory = new Map();

    completed.forEach((appointment) => {
        const { price, cost } = serviceFinancials(appointment.service);
        totalRevenue += price;
        totalCost += cost;
        const current = byCategory.get(appointment.service) || { revenue: 0, cost: 0 };
        current.revenue += price;
        current.cost += cost;
        byCategory.set(appointment.service, current);
    });

    globalMargin.textContent = totalRevenue ? `${Math.round(((totalRevenue - totalCost) / totalRevenue) * 100)}%` : "—";
    document.getElementById("globalProfitMarginSubtitle").textContent = totalRevenue ? `${moneyFormatter.format(totalRevenue - totalCost)} de lucro estimado` : "Sem atendimentos concluídos";
    document.getElementById("categoryMarginList").innerHTML = businessConfig.services.map((service) => {
        const values = byCategory.get(service[0]);
        const financials = values || serviceFinancials(service[0]);
        const revenue = values ? values.revenue : financials.price;
        const cost = values ? values.cost : financials.cost;
        const margin = revenue ? Math.round(((revenue - cost) / revenue) * 100) : 0;
        return `<div class="metric-row"><span>${escapeHtml(service[0])}</span><strong>${margin}%<small>${values ? "realizado" : "estimativa"}</small></strong></div>`;
    }).join("");

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 60);
    const appointments = getAppointments();
    const inactiveClients = getClients().map((client) => {
        const history = appointments.filter((item) => item.clientName.trim().toLowerCase() === String(client.name).trim().toLowerCase() && item.status !== "cancelled").sort((a, b) => b.date.localeCompare(a.date));
        return { client, lastDate: history[0]?.date || null };
    }).filter((item) => !item.lastDate || new Date(`${item.lastDate}T12:00:00`) < cutoff);

    document.getElementById("inactiveClientCount").textContent = inactiveClients.length;
    document.getElementById("inactiveClientList").innerHTML = inactiveClients.slice(0, 5).map(({ client, lastDate }) => `<div class="metric-row"><span>${escapeHtml(client.name)}</span><strong>${lastDate ? formatDate(lastDate) : "Nunca agendou"}<small>último agendamento</small></strong></div>`).join("");
    document.getElementById("inactiveClientEmpty").classList.toggle("hidden", inactiveClients.length > 0);

    const revenueOf = (items) => items.reduce((sum, item) => sum + serviceFinancials(item.service).price, 0);
    const currentRevenue = revenueOf(completedAppointmentsForMonth(now.getFullYear(), now.getMonth()));
    const previousRevenue = revenueOf(completedAppointmentsForMonth(now.getFullYear() - 1, now.getMonth()));
    const variation = previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : null;
    document.getElementById("currentYearLabel").textContent = String(now.getFullYear());
    document.getElementById("previousYearLabel").textContent = String(now.getFullYear() - 1);
    document.getElementById("currentYearRevenue").textContent = moneyFormatter.format(currentRevenue);
    document.getElementById("previousYearRevenue").textContent = moneyFormatter.format(previousRevenue);
    const comparison = document.getElementById("yearComparison");
    comparison.textContent = variation === null ? "—" : `${variation >= 0 ? "+" : ""}${variation.toFixed(1).replace(".", ",")}%`;
    comparison.classList.toggle("positive", variation !== null && variation >= 0);
    document.getElementById("yearComparisonSubtitle").textContent = previousRevenue ? "Variação do faturamento no período" : "Sem base no mesmo mês do ano passado";
}

function renderPrivacyRequests() {
    const list = document.getElementById("privacyRequestList");
    if (!list) return;
    const pending = privacyRequestsCache.filter((item) => !["completed", "rejected"].includes(item.status));
    document.getElementById("privacyRequestCount").textContent = pending.length;
    list.innerHTML = pending.slice(0, 5).map((item) => `<div class="metric-row"><span>${escapeHtml(item.requester_name)}<small>${escapeHtml(item.request_type)} · ${formatDate(String(item.created_at).slice(0, 10))}</small></span><strong><button class="table-button edit" data-complete-privacy="${item.id}">Concluir</button></strong></div>`).join("");
    document.getElementById("privacyRequestEmpty").classList.toggle("hidden", pending.length > 0);
}

document.getElementById("privacyRequestList")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-complete-privacy]");
    if (!button || !confirm("Marcar esta solicitação como concluída? Confirme somente após atender o titular.")) return;
    const { error } = await supabaseClient.from("privacy_requests").update({ status: "completed" }).eq("id", button.dataset.completePrivacy);
    if (error) return reportDataError("atualizar a solicitação", error);
    const request = privacyRequestsCache.find((item) => item.id === button.dataset.completePrivacy);
    if (request) request.status = "completed";
    renderPrivacyRequests();
});

function navigateTo(section) {
    menuItems.forEach((menu) => menu.classList.toggle("active", menu.dataset.section === section));
    showSection(section);
}

// =========================================================
// 9. TELA AGENDA
// =========================================================
const agendaDateFilter = document.getElementById("agendaDateFilter");
const agendaProfessionalFilter = document.getElementById("agendaProfessionalFilter");
const agendaStatusFilter = document.getElementById("agendaStatusFilter");
const agendaList = document.getElementById("agendaList");
const agendaEmpty = document.getElementById("agendaEmpty");

// Começa mostrando o dia atual.
agendaDateFilter.value = todayISO();

if (currentRole === "employee") {
    agendaProfessionalFilter.value = employeeProfessional;
    agendaProfessionalFilter.disabled = true;
}

function renderAgenda() {
    if (!agendaList) return;

    let appointments =
        appointmentsAllowedForCurrentUser(
            getAppointments()
        );

    const selectedDate =
        agendaDateFilter.value;

    const selectedProfessional =
        agendaProfessionalFilter.value;

    const selectedStatus =
        agendaStatusFilter.value;

    if (selectedDate) {
        appointments = appointments.filter(
            (appointment) =>
                appointment.date === selectedDate
        );
    }

    if (
        currentRole !== "employee" &&
        selectedProfessional !== "all"
    ) {
        appointments = appointments.filter(
            (appointment) =>
                appointment.professional === selectedProfessional
        );
    }

    if (selectedStatus !== "all") {
        appointments = appointments.filter(
            (appointment) =>
                appointment.status === selectedStatus
        );
    }

    appointments.sort((a, b) => {
        return `${a.date}T${a.time}`
            .localeCompare(`${b.date}T${b.time}`);
    });

    agendaList.innerHTML = "";

    if (appointments.length === 0) {
        agendaEmpty.classList.remove("hidden");
        return;
    }

    agendaEmpty.classList.add("hidden");

    appointments.forEach((appointment) => {
        const info = statusInfo(appointment.status);

        const card = document.createElement("article");
        card.className = "agenda-card";

        // Botões dependem do status atual.
        const actions = [];

        if (appointment.status === "requested") {
            actions.push(
                `<button class="table-button edit" data-agenda-status="${appointment.id}" data-new-status="confirmed">Confirmar</button>`
            );
        }

        if (
            appointment.status === "confirmed" ||
            appointment.status === "requested"
        ) {
            actions.push(
                `<button class="table-button success" data-agenda-status="${appointment.id}" data-new-status="completed">Concluir</button>`
            );

            actions.push(
                `<button class="table-button warning" data-agenda-status="${appointment.id}" data-new-status="no_show">Não compareceu</button>`
            );

            actions.push(
                `<button class="table-button delete" data-agenda-status="${appointment.id}" data-new-status="cancelled">Cancelar</button>`
            );
        }

        card.innerHTML = `
            <div class="agenda-time-block">
                <strong>${escapeHtml(appointment.time)}</strong>
                <span>${formatDate(appointment.date)}</span>
            </div>

            <div class="agenda-client-block">
                <strong>${escapeHtml(appointment.clientName)}</strong>
                <span>
                    ${escapeHtml(appointment.service)}
                    •
                    ${escapeHtml(appointment.professional)}
                </span>
                <small>
                    Origem:
                    ${
                        appointment.createdBy === "client"
                            ? "Cliente"
                            : appointment.createdBy === "employee"
                                ? "Funcionário"
                                : "Proprietário"
                    }
                </small>
            </div>

            <div class="agenda-status-block">
                <span class="status ${info.className}">
                    ${info.label}
                </span>

                <div class="agenda-card-actions">
                    ${actions.join("")}
                </div>
            </div>
        `;

        agendaList.appendChild(card);
    });
}

agendaDateFilter.addEventListener("change", renderAgenda);
agendaProfessionalFilter.addEventListener("change", renderAgenda);
agendaStatusFilter.addEventListener("change", renderAgenda);

agendaList.addEventListener("click", (event) => {
    const button =
        event.target.closest("[data-agenda-status]");

    if (!button) return;

    const appointmentId =
        button.dataset.agendaStatus;

    const newStatus =
        button.dataset.newStatus;

    const appointments =
        getAppointments();

    const index =
        appointments.findIndex(
            (appointment) =>
                appointment.id === appointmentId
        );

    if (index < 0) return;

    if (
        currentRole === "employee" &&
        appointments[index].professional !== employeeProfessional
    ) return;

    appointments[index].status = newStatus;
    appointments[index].updatedAt =
        new Date().toISOString();

    saveAppointments(appointments);
});

// =========================================================
// 10. MÓDULO DE CLIENTES
// =========================================================
const clientCount = document.getElementById("clientCount");

const clientModal = document.getElementById("clientModal");
const closeClientModalButton = document.getElementById("closeClientModal");
const newClientButton = document.getElementById("newClientButton");
const quickAddClient = document.getElementById("quickAddClient");
const clientForm = document.getElementById("clientForm");
const clientSearch = document.getElementById("clientSearch");
const clientsTableBody = document.getElementById("clientsTableBody");
const emptyClients = document.getElementById("emptyClients");

const clientId = document.getElementById("clientId");
const clientName = document.getElementById("clientName");
const clientPhone = document.getElementById("clientPhone");
const clientEmail = document.getElementById("clientEmail");
const clientBirthday = document.getElementById("clientBirthday");
const clientNotes = document.getElementById("clientNotes");
const clientModalEyebrow = document.getElementById("clientModalEyebrow");
const clientModalTitle = document.getElementById("clientModalTitle");

function getClients() {
    if (!IS_DEMO) return clientsCache;
    const saved =
        localStorage.getItem(CLIENTS_STORAGE_KEY);

    if (!saved) {
        const starterClients = [
            {
                id: createId(),
                name: businessConfig.client,
                phone: "(16) 99911-2233",
                email: `cliente.${businessConfig.key}@demo.ogritech.com.br`,
                birthday: "1990-05-14",
                notes: `Cadastro demonstrativo de ${businessConfig.clientLabel.toLowerCase()}.`
            },
            {
                id: createId(),
                name: businessConfig.clientLabel === "Paciente" ? "Renata Alves" : "Marcos Oliveira",
                phone: "(16) 99844-5566",
                email: "marcos@email.com",
                birthday: "1987-09-21",
                notes: ""
            }
        ];

        localStorage.setItem(
            CLIENTS_STORAGE_KEY,
            JSON.stringify(starterClients)
        );

        return starterClients;
    }

    try {
        const clients = JSON.parse(saved);
        return Array.isArray(clients)
            ? clients.filter((item) => item && typeof item === "object" && typeof item.id === "string")
            : [];
    } catch (error) {
        console.error("Erro ao ler clientes:", error);
        return [];
    }
}

async function saveClients(clients) {
    if (IS_DEMO) {
        localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    } else {
        clientsCache = clients;
        const rows = clients.map((client) => ({ id: client.id, barbershop_id: BARBERSHOP_ID,
            name: client.name, phone: client.phone || "", email: client.email || "",
            birthday: client.birthday || null, notes: client.notes || "" }));
        const removedIds = [...remoteClientIds].filter((id) => !clients.some((client) => client.id === id));
        if (removedIds.length) {
            const { error } = await supabaseClient.from("business_clients").delete().in("id", removedIds);
            if (error) { reportDataError("salvar os clientes", error); return false; }
        }
        if (rows.length) {
            const { error } = await supabaseClient.from("business_clients").upsert(rows);
            if (error) { reportDataError("salvar os clientes", error); return false; }
        }
        remoteClientIds = new Set(clients.map((client) => client.id));
    }

    updateClientCount();
    renderBusinessIndicators();
    return true;
}

function updateClientCount() {
    clientCount.textContent =
        getClients().length;
}

function renderClients() {
    const searchTerm =
        clientSearch.value.trim().toLowerCase();

    const clients =
        getClients().filter((client) => {
            return (
                String(client.name || "").toLowerCase().includes(searchTerm) ||
                String(client.phone || "").toLowerCase().includes(searchTerm) ||
                (client.email || "").toLowerCase().includes(searchTerm)
            );
        });

    clientsTableBody.innerHTML = "";

    if (clients.length === 0) {
        emptyClients.classList.remove("hidden");
        return;
    }

    emptyClients.classList.add("hidden");

    clients.forEach((client) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td><strong>${escapeHtml(client.name)}</strong></td>
            <td>${escapeHtml(client.phone)}</td>
            <td>${escapeHtml(client.email || "—")}</td>
            <td>${formatDate(client.birthday)}</td>
            <td>
                <div class="table-actions ${currentRole === "employee" ? "hidden" : ""}">
                    <button class="table-button edit" data-edit-client="${client.id}">Editar</button>
                    <button class="table-button delete" data-delete-client="${client.id}">Excluir</button>
                </div>
            </td>
        `;

        clientsTableBody.appendChild(row);
    });
}

function openNewClientModal() {
    clientForm.reset();
    clientId.value = "";
    clientModalEyebrow.textContent = "NOVO CLIENTE";
    clientModalTitle.textContent = "Cadastrar cliente";
    clientModal.classList.remove("hidden");
    clientName.focus();
}

function openEditClientModal(id) {
    const client =
        getClients().find(
            (item) => item.id === id
        );

    if (!client) return;

    clientId.value = client.id;
    clientName.value = client.name;
    clientPhone.value = client.phone;
    clientEmail.value = client.email;
    clientBirthday.value = client.birthday;
    clientNotes.value = client.notes;

    clientModalEyebrow.textContent =
        "EDITAR CLIENTE";

    clientModalTitle.textContent =
        "Atualizar cadastro";

    clientModal.classList.remove("hidden");
}

function closeClientModal() {
    clientModal.classList.add("hidden");
    clientForm.reset();
    clientId.value = "";
}

newClientButton.addEventListener(
    "click",
    openNewClientModal
);

quickAddClient.addEventListener("click", () => {
    const clientsMenuItem =
        document.querySelector('[data-section="clientes"]');

    menuItems.forEach((menu) =>
        menu.classList.remove("active")
    );

    clientsMenuItem.classList.add("active");
    showSection("clientes");
    openNewClientModal();
});

closeClientModalButton.addEventListener(
    "click",
    closeClientModal
);

clientModal.addEventListener("click", (event) => {
    if (event.target === clientModal) {
        closeClientModal();
    }
});

clientForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const clients = getClients();

    const clientData = {
        id: clientId.value || createId(),
        name: clientName.value.trim(),
        phone: clientPhone.value.trim(),
        email: clientEmail.value.trim(),
        birthday: clientBirthday.value,
        notes: clientNotes.value.trim()
    };

    const existingIndex =
        clients.findIndex(
            (client) =>
                client.id === clientData.id
        );

    if (existingIndex >= 0) {
        clients[existingIndex] = clientData;
    } else {
        clients.push(clientData);
    }

    saveClients(clients);
    closeClientModal();
    renderClients();
});

clientSearch.addEventListener(
    "input",
    renderClients
);

clientsTableBody.addEventListener(
    "click",
    (event) => {

        const editButton =
            event.target.closest(
                "[data-edit-client]"
            );

        const deleteButton =
            event.target.closest(
                "[data-delete-client]"
            );

        if (editButton) {
            openEditClientModal(
                editButton.dataset.editClient
            );
        }

        if (deleteButton) {
            const id =
                deleteButton.dataset.deleteClient;

            const client =
                getClients().find(
                    (item) =>
                        item.id === id
                );

            if (!client) return;

            const confirmed =
                confirm(
                    `Deseja realmente excluir ${client.name}?`
                );

            if (confirmed) {
                const updatedClients =
                    getClients().filter(
                        (item) =>
                            item.id !== id
                    );

                saveClients(updatedClients);
                renderClients();
            }
        }
    }
);

// =========================================================
// 11. SERVIÇOS, EQUIPE, FINANCEIRO E CONFIGURAÇÕES
// =========================================================
function readDemoCollection(key, fallback) {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(saved)) return saved;
    } catch (error) { console.error("Dados demonstrativos inválidos:", error); }
    const initial = fallback();
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
}

function getServices() {
    if (!IS_DEMO) return servicesCache;
    return readDemoCollection(SERVICES_STORAGE_KEY, () => businessConfig.services.map((item) => ({
        id: createId(), name: item[0], price: Number(item[1]), description: item[2] || "",
        cost: Number(item[3]) || 0, category: item[4] || "Geral", duration_minutes: Number(item[5]) || 30
    })));
}

function getProfessionals() {
    if (!IS_DEMO) return professionalsCache;
    return readDemoCollection(PROFESSIONALS_STORAGE_KEY, () => businessConfig.professionals.map((name) => ({
        id: createId(), name, specialty: "Atendimento geral", commission_percentage: 0
    })));
}

function syncOperationalOptions() {
    const services = getServices();
    const professionals = getProfessionals();
    businessConfig.services = services.map((item) => [item.name, Number(item.price), item.description || "", Number(item.cost), item.category, Number(item.duration_minutes)]);
    businessConfig.professionals = professionals.map((item) => item.name);
    applyBusinessCustomization();
    renderBusinessIndicators();
}

async function persistService(item) {
    if (IS_DEMO) {
        const items = getServices();
        const index = items.findIndex((current) => current.id === item.id);
        if (index >= 0) items[index] = item; else items.push(item);
        localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(items));
        servicesCache = items;
    } else {
        const row = { barbershop_id: BARBERSHOP_ID, name: item.name, description: item.description, category: item.category,
            duration_minutes: item.duration_minutes, price: item.price, cost: item.cost, active: true };
        if (item.id) row.id = item.id;
        const { data, error } = await supabaseClient.from("services").upsert(row).select().single();
        if (error) return reportDataError("salvar o serviço", error);
        const index = servicesCache.findIndex((current) => current.id === data.id);
        if (index >= 0) servicesCache[index] = data; else servicesCache.push(data);
    }
    syncOperationalOptions(); renderServices(); closeGenericModal("serviceModal");
}

async function persistProfessional(item) {
    if (IS_DEMO) {
        const items = getProfessionals();
        const index = items.findIndex((current) => current.id === item.id);
        if (index >= 0) items[index] = item; else items.push(item);
        localStorage.setItem(PROFESSIONALS_STORAGE_KEY, JSON.stringify(items));
        professionalsCache = items;
    } else {
        const row = { barbershop_id: BARBERSHOP_ID, name: item.name, specialty: item.specialty,
            commission_percentage: item.commission_percentage, active: true };
        if (item.id) row.id = item.id;
        const { data, error } = await supabaseClient.from("employees").upsert(row).select().single();
        if (error) return reportDataError("salvar o profissional", error);
        const index = professionalsCache.findIndex((current) => current.id === data.id);
        if (index >= 0) professionalsCache[index] = data; else professionalsCache.push(data);
    }
    syncOperationalOptions(); renderProfessionals(); closeGenericModal("professionalModal");
}

function renderServices() {
    document.getElementById("servicesTableBody").innerHTML = getServices().map((service) => `<tr><td><strong>${escapeHtml(service.name)}</strong><small class="table-subtitle">${escapeHtml(service.description || "Sem descrição")}</small></td><td>${escapeHtml(service.category || "Geral")}</td><td>${Number(service.duration_minutes) || 30} min</td><td>${moneyFormatter.format(service.price)}</td><td>${moneyFormatter.format(service.cost || 0)}</td><td><div class="table-actions"><button class="table-button edit" data-edit-service="${service.id}">Editar</button><button class="table-button delete" data-delete-service="${service.id}">Excluir</button></div></td></tr>`).join("");
}

function renderProfessionals() {
    document.getElementById("professionalsTableBody").innerHTML = getProfessionals().map((professional) => {
        const future = getAppointments().filter((item) => item.professional === professional.name && item.date >= todayISO() && !["cancelled", "completed"].includes(item.status)).length;
        return `<tr><td><strong>${escapeHtml(professional.name)}</strong></td><td>${escapeHtml(professional.specialty || "Atendimento geral")}</td><td>${Number(professional.commission_percentage || 0).toLocaleString("pt-BR")}%</td><td><button class="table-button edit" data-professional-agenda="${escapeHtml(professional.name)}">${future} próximos</button></td><td><div class="table-actions"><button class="table-button edit" data-edit-professional="${professional.id}">Editar</button><button class="table-button delete" data-delete-professional="${professional.id}">Excluir</button></div></td></tr>`;
    }).join("");
}

function closeGenericModal(id) { document.getElementById(id).classList.add("hidden"); }
function openServiceModal(service = {}) {
    document.getElementById("serviceForm").reset();
    document.getElementById("serviceId").value = service.id || "";
    document.getElementById("serviceName").value = service.name || "";
    document.getElementById("serviceCategory").value = service.category || "Geral";
    document.getElementById("serviceDuration").value = service.duration_minutes || 30;
    document.getElementById("servicePrice").value = service.price ?? "";
    document.getElementById("serviceCost").value = service.cost || 0;
    document.getElementById("serviceDescription").value = service.description || "";
    document.getElementById("serviceModalTitle").textContent = service.id ? "Editar serviço" : "Novo serviço";
    document.getElementById("serviceModal").classList.remove("hidden");
}
function openProfessionalModal(professional = {}) {
    document.getElementById("professionalForm").reset();
    document.getElementById("professionalId").value = professional.id || "";
    document.getElementById("professionalName").value = professional.name || "";
    document.getElementById("professionalSpecialty").value = professional.specialty || "";
    document.getElementById("professionalCommission").value = professional.commission_percentage || 0;
    document.getElementById("professionalModalTitle").textContent = professional.id ? "Editar profissional" : "Novo profissional";
    document.getElementById("professionalModal").classList.remove("hidden");
}

document.getElementById("newServiceButton").addEventListener("click", () => openServiceModal());
document.getElementById("quickAddService").addEventListener("click", () => { navigateTo("servicos"); openServiceModal(); });
document.getElementById("newProfessionalButton").addEventListener("click", () => openProfessionalModal());
document.getElementById("quickAddProfessional").addEventListener("click", () => { navigateTo("profissionais"); openProfessionalModal(); });
document.getElementById("quickFinancial").addEventListener("click", () => navigateTo("financeiro"));
document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => closeGenericModal(button.dataset.closeModal)));

document.getElementById("serviceForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await persistService({ id: document.getElementById("serviceId").value || createId(), name: document.getElementById("serviceName").value.trim(), category: document.getElementById("serviceCategory").value.trim(), duration_minutes: Number(document.getElementById("serviceDuration").value), price: Number(document.getElementById("servicePrice").value), cost: Number(document.getElementById("serviceCost").value), description: document.getElementById("serviceDescription").value.trim() });
});
document.getElementById("professionalForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await persistProfessional({ id: document.getElementById("professionalId").value || createId(), name: document.getElementById("professionalName").value.trim(), specialty: document.getElementById("professionalSpecialty").value.trim(), commission_percentage: Number(document.getElementById("professionalCommission").value) });
});

document.getElementById("servicesTableBody").addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-service]"); const remove = event.target.closest("[data-delete-service]");
    if (edit) openServiceModal(getServices().find((item) => item.id === edit.dataset.editService));
    if (remove && confirm("Excluir este serviço? Ele deixará de aparecer em novos agendamentos.")) {
        const id = remove.dataset.deleteService;
        if (IS_DEMO) localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(getServices().filter((item) => item.id !== id)));
        else { const { error } = await supabaseClient.from("services").update({ active: false }).eq("id", id); if (error) return reportDataError("excluir o serviço", error); servicesCache = servicesCache.filter((item) => item.id !== id); }
        syncOperationalOptions(); renderServices();
    }
});
document.getElementById("professionalsTableBody").addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-professional]"); const remove = event.target.closest("[data-delete-professional]"); const agenda = event.target.closest("[data-professional-agenda]");
    if (edit) openProfessionalModal(getProfessionals().find((item) => item.id === edit.dataset.editProfessional));
    if (agenda) { navigateTo("agenda"); agendaDateFilter.value = ""; agendaProfessionalFilter.value = agenda.dataset.professionalAgenda; renderAgenda(); }
    if (remove && confirm("Remover este profissional dos novos agendamentos?")) {
        const id = remove.dataset.deleteProfessional;
        if (IS_DEMO) localStorage.setItem(PROFESSIONALS_STORAGE_KEY, JSON.stringify(getProfessionals().filter((item) => item.id !== id)));
        else { const { error } = await supabaseClient.from("employees").update({ active: false }).eq("id", id); if (error) return reportDataError("remover o profissional", error); professionalsCache = professionalsCache.filter((item) => item.id !== id); }
        syncOperationalOptions(); renderProfessionals();
    }
});

function getFinancialEntries() { return IS_DEMO ? readDemoCollection(FINANCIAL_STORAGE_KEY, () => []) : financialCache; }
function renderFinancial() {
    const start = document.getElementById("financeStart").value; const end = document.getElementById("financeEnd").value; const type = document.getElementById("financeTypeFilter").value;
    const entries = getFinancialEntries().filter((item) => (!start || item.occurred_on >= start) && (!end || item.occurred_on <= end) && (type === "all" || item.entry_type === type)).sort((a,b) => b.occurred_on.localeCompare(a.occurred_on));
    const income = entries.filter((item) => item.entry_type === "income").reduce((sum, item) => sum + Number(item.amount), 0); const expense = entries.filter((item) => item.entry_type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
    document.getElementById("financeIncome").textContent = moneyFormatter.format(income); document.getElementById("financeExpense").textContent = moneyFormatter.format(expense); document.getElementById("financeBalance").textContent = moneyFormatter.format(income - expense);
    document.getElementById("financialTableBody").innerHTML = entries.map((item) => `<tr><td>${formatDate(item.occurred_on)}</td><td><strong>${escapeHtml(item.description)}</strong></td><td>${escapeHtml(item.category)}</td><td><span class="status ${item.entry_type === "income" ? "completed" : "cancelled"}">${item.entry_type === "income" ? "Entrada" : "Saída"}</span></td><td>${moneyFormatter.format(item.amount)}</td><td><button class="table-button delete" data-delete-financial="${item.id}">Excluir</button></td></tr>`).join("");
    document.getElementById("financialEmpty").classList.toggle("hidden", entries.length > 0);
}
document.getElementById("newFinancialButton").addEventListener("click", () => { document.getElementById("financialForm").reset(); document.getElementById("financialDate").value = todayISO(); document.getElementById("financialModal").classList.remove("hidden"); });
["financeStart", "financeEnd", "financeTypeFilter"].forEach((id) => document.getElementById(id).addEventListener("change", renderFinancial));
document.getElementById("financialForm").addEventListener("submit", async (event) => {
    event.preventDefault(); const item = { id: createId(), entry_type: document.getElementById("financialType").value, description: document.getElementById("financialDescription").value.trim(), category: document.getElementById("financialCategory").value.trim(), amount: Number(document.getElementById("financialAmount").value), occurred_on: document.getElementById("financialDate").value, payment_method: document.getElementById("financialPayment").value, status: "paid", notes: "" };
    if (IS_DEMO) localStorage.setItem(FINANCIAL_STORAGE_KEY, JSON.stringify([...getFinancialEntries(), item])); else { const { data, error } = await supabaseClient.from("financial_entries").insert({ ...item, barbershop_id: BARBERSHOP_ID }).select().single(); if (error) return reportDataError("salvar o lançamento", error); financialCache.push(data); }
    closeGenericModal("financialModal"); renderFinancial();
});
document.getElementById("financialTableBody").addEventListener("click", async (event) => { const button = event.target.closest("[data-delete-financial]"); if (!button || !confirm("Excluir este lançamento?")) return; const id = button.dataset.deleteFinancial; if (IS_DEMO) localStorage.setItem(FINANCIAL_STORAGE_KEY, JSON.stringify(getFinancialEntries().filter((item) => item.id !== id))); else { const { error } = await supabaseClient.from("financial_entries").delete().eq("id", id); if (error) return reportDataError("excluir o lançamento", error); financialCache = financialCache.filter((item) => item.id !== id); } renderFinancial(); });

function getSettings() { try { return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)) || {}; } catch { return {}; } }
function renderSettings() { const settings = getSettings(); document.getElementById("settingsBusinessName").value = settings.name || businessConfig.name; document.getElementById("settingsSegment").value = settings.segment || businessConfig.segment; document.getElementById("settingsOpenTime").value = settings.openTime || "09:00"; document.getElementById("settingsCloseTime").value = settings.closeTime || "18:00"; document.getElementById("settingsSlotDuration").value = settings.slotDuration || "60"; }
document.getElementById("settingsForm").addEventListener("submit", (event) => { event.preventDefault(); const settings = { name: document.getElementById("settingsBusinessName").value.trim(), segment: document.getElementById("settingsSegment").value.trim(), openTime: document.getElementById("settingsOpenTime").value, closeTime: document.getElementById("settingsCloseTime").value, slotDuration: document.getElementById("settingsSlotDuration").value }; if (settings.closeTime <= settings.openTime) { document.getElementById("settingsMessage").textContent = "O encerramento deve ser posterior ao início."; document.getElementById("settingsMessage").className = "form-message error"; return; } localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)); businessConfig.name = settings.name; businessConfig.segment = settings.segment; applyBusinessCustomization(); document.getElementById("settingsMessage").textContent = "Configurações salvas."; document.getElementById("settingsMessage").className = "form-message success-message"; });

// =========================================================
// 12. INICIALIZAÇÃO
// =========================================================
function validUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
}

async function importLocalDataOnce() {
    const migrationKey = `ogritechSupabaseMigration:${BARBERSHOP_ID}`;
    if (localStorage.getItem(migrationKey) || IS_DEMO || currentRole === "employee") return;

    try {
        const localAppointments = JSON.parse(localStorage.getItem(APPOINTMENTS_STORAGE_KEY) || "[]");
        const localClients = JSON.parse(localStorage.getItem(CLIENTS_STORAGE_KEY) || "[]");
        if (Array.isArray(localAppointments) && localAppointments.length) {
            const knownIds = new Set(appointmentsCache.map((item) => item.id));
            const imported = localAppointments.filter((item) => !knownIds.has(item.id))
                .map((item) => ({ ...item, id: validUuid(item.id) ? item.id : createId() }));
            if (imported.length && !await saveAppointments([...appointmentsCache, ...imported])) throw new Error("Falha ao importar agendamentos");
        }
        if (Array.isArray(localClients) && localClients.length) {
            const knownIds = new Set(clientsCache.map((item) => item.id));
            const imported = localClients.filter((item) => !knownIds.has(item.id))
                .map((item) => ({ ...item, id: validUuid(item.id) ? item.id : createId() }));
            if (imported.length && !await saveClients([...clientsCache, ...imported])) throw new Error("Falha ao importar clientes");
        }
        localStorage.setItem(migrationKey, new Date().toISOString());
        localStorage.removeItem(APPOINTMENTS_STORAGE_KEY);
        localStorage.removeItem(CLIENTS_STORAGE_KEY);
    } catch (error) {
        console.error("Erro ao importar dados locais:", error);
    }
}

async function loadOperationalData() {
    if (IS_DEMO) return;
    const [appointmentsResult, clientsResult, privacyResult, servicesResult, employeesResult, financialResult] = await Promise.all([
        supabaseClient.from("business_appointments").select("*").eq("barbershop_id", BARBERSHOP_ID),
        supabaseClient.from("business_clients").select("*").eq("barbershop_id", BARBERSHOP_ID),
        supabaseClient.from("privacy_requests").select("*").eq("barbershop_id", BARBERSHOP_ID).order("created_at", { ascending: false }),
        supabaseClient.from("services").select("*").eq("barbershop_id", BARBERSHOP_ID).eq("active", true).order("name"),
        supabaseClient.from("employees").select("*").eq("barbershop_id", BARBERSHOP_ID).eq("active", true).order("name"),
        supabaseClient.from("financial_entries").select("*").eq("barbershop_id", BARBERSHOP_ID).order("occurred_on", { ascending: false })
    ]);
    if (appointmentsResult.error) throw appointmentsResult.error;
    if (clientsResult.error) throw clientsResult.error;
    if (privacyResult.error) throw privacyResult.error;
    if (servicesResult.error) throw servicesResult.error;
    if (employeesResult.error) throw employeesResult.error;
    if (financialResult.error) throw financialResult.error;
    appointmentsCache = (appointmentsResult.data || []).map(appointmentFromDatabase);
    clientsCache = (clientsResult.data || []).map((row) => ({ id: row.id, name: row.name, phone: row.phone,
        email: row.email, birthday: row.birthday || "", notes: row.notes || "" }));
    remoteAppointmentIds = new Set(appointmentsCache.map((item) => item.id));
    remoteClientIds = new Set(clientsCache.map((item) => item.id));
    privacyRequestsCache = privacyResult.data || [];
    servicesCache = servicesResult.data || [];
    professionalsCache = employeesResult.data || [];
    financialCache = financialResult.data || [];
    if (servicesCache.length) businessConfig.services = servicesCache.map((service) => [service.name, Number(service.price), service.description || "", Number(service.cost), service.category, service.duration_minutes]);
    if (professionalsCache.length) businessConfig.professionals = professionalsCache.map((employee) => employee.name);
    applyBusinessCustomization();
    await importLocalDataOnce();
}

async function initializeOperationalDashboard() {
    const savedSettings = getSettings();
    if (savedSettings.name) businessConfig.name = savedSettings.name;
    if (savedSettings.segment) businessConfig.segment = savedSettings.segment;
    if (!BARBERSHOP_ID) return;
    await loadOperationalData();
    updateClientCount();
    renderClients();
    renderDashboardAgenda();
    renderBusinessIndicators();
    renderPrivacyRequests();
    renderAgenda();
    renderServices();
    renderProfessionals();
    renderFinancial();
}

initializeOperationalDashboard().catch((error) => reportDataError("carregar os dados", error));
