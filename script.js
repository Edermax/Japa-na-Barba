/* =========================================================
   JAPA NA BARBA - JAVASCRIPT PRINCIPAL
   ETAPA 5: Agenda integrada.

   Nesta etapa:
   - cliente cria um horário;
   - funcionário visualiza sua própria agenda;
   - proprietário visualiza todos os profissionais;
   - proprietário/funcionário alteram o status;
   - horários ocupados não podem ser duplicados.

   Ainda usamos localStorage para fins de estudo.
   ========================================================= */

// =========================================================
// 1. CHAVES DE ARMAZENAMENTO
// =========================================================
const CLIENTS_STORAGE_KEY = "japaNaBarbaClients";
const APPOINTMENTS_STORAGE_KEY = "japaNaBarbaAppointments";

// =========================================================
// 2. SESSÃO ATUAL
// =========================================================
const currentRole = sessionStorage.getItem("japaRole") || "owner";
const currentUserName = sessionStorage.getItem("japaUserName") || "Administrador";

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

const openAppointmentButton = document.getElementById("newAppointment");
const agendaNewAppointment = document.getElementById("agendaNewAppointment");

// Dashboard.
const todayAppointmentCount = document.getElementById("todayAppointmentCount");
const todayAppointmentSubtitle = document.getElementById("todayAppointmentSubtitle");
const dashboardAppointmentList = document.getElementById("dashboardAppointmentList");
const dashboardAppointmentEmpty = document.getElementById("dashboardAppointmentEmpty");
const viewAgenda = document.getElementById("viewAgenda");

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
// 5. STORAGE DA AGENDA
// =========================================================
function getAppointments() {
    try {
        return JSON.parse(
            localStorage.getItem(APPOINTMENTS_STORAGE_KEY)
        ) || [];
    } catch (error) {
        console.error("Erro ao ler a agenda:", error);
        return [];
    }
}

function saveAppointments(appointments) {
    localStorage.setItem(
        APPOINTMENTS_STORAGE_KEY,
        JSON.stringify(appointments)
    );

    renderAgenda();
    renderDashboardAgenda();
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
    } else {
        // Módulos ainda não implementados continuam usando
        // o dashboard como tela de apoio.
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
    const saved =
        localStorage.getItem(CLIENTS_STORAGE_KEY);

    if (!saved) {
        const starterClients = [
            {
                id: createId(),
                name: "João Silva",
                phone: "(16) 99911-2233",
                email: "cliente@japanabarba.com",
                birthday: "1990-05-14",
                notes: "Prefere corte baixo nas laterais."
            },
            {
                id: createId(),
                name: "Marcos Oliveira",
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
        return JSON.parse(saved);
    } catch (error) {
        console.error("Erro ao ler clientes:", error);
        return [];
    }
}

function saveClients(clients) {
    localStorage.setItem(
        CLIENTS_STORAGE_KEY,
        JSON.stringify(clients)
    );

    updateClientCount();
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
                client.name.toLowerCase().includes(searchTerm) ||
                client.phone.toLowerCase().includes(searchTerm) ||
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
                <div class="table-actions">
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
// 11. INICIALIZAÇÃO
// =========================================================
updateClientCount();
renderClients();
renderDashboardAgenda();
renderAgenda();
