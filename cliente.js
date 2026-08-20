/* =========================================================
   OGRITECH - ÁREA DO CLIENTE DA BARBEARIA
   ETAPA 5: Agenda integrada.

   Os agendamentos criados aqui usam a mesma chave de
   localStorage utilizada pelo painel administrativo.
   ========================================================= */

// =========================================================
// 1. PROTEÇÃO DA PÁGINA
// =========================================================
document.documentElement.style.visibility = "hidden";

// =========================================================
// 2. SESSÃO DO CLIENTE
// =========================================================
let loggedClientName = "Cliente";
let loggedClientEmail = "";
let clientBarbershopId = "";

// =========================================================
// 3. ELEMENTOS
// =========================================================
const clientUserName =
    document.getElementById("clientUserName");

const clientLogout =
    document.getElementById("clientLogout");

const openClientAppointment =
    document.getElementById("openClientAppointment");

const closeClientAppointment =
    document.getElementById("closeClientAppointment");

const clientAppointmentModal =
    document.getElementById("clientAppointmentModal");

const clientAppointmentForm =
    document.getElementById("clientAppointmentForm");

const clientAppointmentsList =
    document.getElementById("clientAppointmentsList");

const clientAppointmentsEmpty =
    document.getElementById("clientAppointmentsEmpty");

const nextClientAppointment =
    document.getElementById("nextClientAppointment");

const clientService =
    document.getElementById("clientService");

const clientProfessional =
    document.getElementById("clientProfessional");

const clientDate =
    document.getElementById("clientDate");

const clientTime =
    document.getElementById("clientTime");

// =========================================================
// 4. CONFIGURAÇÃO
// =========================================================
function appointmentsStorageKey() {
    return `japaNaBarbaAppointments:${clientBarbershopId}`;
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

// =========================================================
// 5. FUNÇÕES UTILITÁRIAS
// =========================================================
function createId() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayISO() {
    const today = new Date();
    const year = today.getFullYear();
    const month =
        String(today.getMonth() + 1).padStart(2, "0");
    const day =
        String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatClientDate(date) {
    if (!date) return "";

    const [year, month, day] =
        date.split("-");

    return `${day}/${month}/${year}`;
}

function getAppointments() {
    try {
        const appointments = JSON.parse(
            localStorage.getItem(
                appointmentsStorageKey()
            )
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
    } catch {
        return [];
    }
}

function saveAppointments(appointments) {
    localStorage.setItem(
        appointmentsStorageKey(),
        JSON.stringify(appointments)
    );
}

function myAppointments() {
    return getAppointments().filter(
        (appointment) =>
            appointment.clientEmail === loggedClientEmail
    );
}

// Horário cancelado volta a ficar livre.
function isTimeOccupied(date, time, professional) {
    return getAppointments().some(
        (appointment) =>
            appointment.date === date &&
            appointment.time === time &&
            appointment.professional === professional &&
            appointment.status !== "cancelled"
    );
}

// =========================================================
// 6. DADOS DO CLIENTE
// =========================================================
// =========================================================
// 7. RENDERIZAÇÃO DOS AGENDAMENTOS
// =========================================================
function renderClientAppointments() {
    const appointments =
        myAppointments()
            .sort((a, b) =>
                `${a.date}T${a.time}`
                    .localeCompare(
                        `${b.date}T${b.time}`
                    )
            );

    clientAppointmentsList.innerHTML = "";

    if (appointments.length === 0) {
        clientAppointmentsEmpty
            .classList.remove("hidden");

        nextClientAppointment.textContent =
            "Nenhum";

        return;
    }

    clientAppointmentsEmpty
        .classList.add("hidden");

    appointments.forEach((appointment) => {
        const info =
            STATUS_INFO[appointment.status] ||
            STATUS_INFO.requested;

        const item =
            document.createElement("article");

        item.className =
            "client-appointment-card";

        const canCancel =
            appointment.status === "requested" ||
            appointment.status === "confirmed";

        item.innerHTML = `
            <div>
                <span class="client-appointment-date">
                    ${escapeHtml(formatClientDate(appointment.date))}
                    •
                    ${escapeHtml(appointment.time)}
                </span>

                <strong>
                    ${escapeHtml(appointment.service)}
                </strong>

                <small>
                    Profissional: ${escapeHtml(appointment.professional)}
                </small>
            </div>

            <div class="client-appointment-actions">

                <span class="status ${info.className}">
                    ${info.label}
                </span>

                ${
                    canCancel
                        ? `
                            <button
                                type="button"
                                class="table-button delete"
                                data-cancel-appointment="${appointment.id}"
                            >
                                Cancelar
                            </button>
                        `
                        : ""
                }

            </div>
        `;

        clientAppointmentsList
            .appendChild(item);
    });

    // Próximo horário ativo.
    const nowKey = `${todayISO()}T${new Date().toTimeString().slice(0, 5)}`;
    const next =
        appointments.find(
            (appointment) =>
                appointment.status !== "cancelled" &&
                appointment.status !== "completed" &&
                `${appointment.date}T${appointment.time}` >= nowKey
        );

    nextClientAppointment.textContent =
        next
            ? `${formatClientDate(next.date)} às ${next.time}`
            : "Nenhum";
}

// =========================================================
// 8. MODAL
// =========================================================
openClientAppointment.addEventListener(
    "click",
    () => {
        clientAppointmentForm.reset();
        clientDate.min = todayISO();

        clientAppointmentModal
            .classList.remove("hidden");
    }
);

closeClientAppointment.addEventListener(
    "click",
    () => {
        clientAppointmentModal
            .classList.add("hidden");
    }
);

clientAppointmentModal.addEventListener(
    "click",
    (event) => {
        if (event.target === clientAppointmentModal) {
            clientAppointmentModal
                .classList.add("hidden");
        }
    }
);

// =========================================================
// 9. NOVO AGENDAMENTO
// =========================================================
clientAppointmentForm.addEventListener(
    "submit",
    (event) => {
        event.preventDefault();

        if (
            isTimeOccupied(
                clientDate.value,
                clientTime.value,
                clientProfessional.value
            )
        ) {
            alert(
                "Esse horário já está ocupado para o profissional escolhido. Selecione outro horário."
            );

            return;
        }

        const appointments =
            getAppointments();

        appointments.push({
            id: createId(),
            clientName: loggedClientName,
            clientEmail: loggedClientEmail,
            service: clientService.value,
            professional: clientProfessional.value,
            date: clientDate.value,
            time: clientTime.value,

            // Agendamento feito pelo cliente precisa
            // ser confirmado pela equipe.
            status: "requested",

            createdBy: "client",
            createdAt: new Date().toISOString()
        });

        saveAppointments(appointments);

        clientAppointmentForm.reset();

        clientAppointmentModal
            .classList.add("hidden");

        renderClientAppointments();

        alert(
            "Agendamento solicitado. Aguarde a confirmação da barbearia."
        );
    }
);

// =========================================================
// 10. CANCELAMENTO PELO CLIENTE
// =========================================================
clientAppointmentsList.addEventListener(
    "click",
    (event) => {
        const cancelButton =
            event.target.closest(
                "[data-cancel-appointment]"
            );

        if (!cancelButton) return;

        const confirmed =
            confirm(
                "Deseja cancelar este agendamento?"
            );

        if (!confirmed) return;

        const appointments =
            getAppointments();

        const index =
            appointments.findIndex(
                (appointment) =>
                    appointment.id ===
                    cancelButton.dataset.cancelAppointment
            );

        if (
            index < 0 ||
            appointments[index].clientEmail !== loggedClientEmail ||
            !["requested", "confirmed"].includes(appointments[index].status)
        ) return;

        // Em vez de apagar o registro, alteramos o status.
        // Isso preserva o histórico.
        appointments[index].status =
            "cancelled";

        appointments[index].updatedAt =
            new Date().toISOString();

        saveAppointments(appointments);
        renderClientAppointments();
    }
);

// =========================================================
// 11. LOGOUT
// =========================================================
clientLogout.addEventListener(
    "click",
    async () => {
        await supabaseClient.auth.signOut();
        ["japaAuth", "japaRole", "japaUserName", "japaUserRole", "japaUserEmail", "japaUserId", "japaBarbershopId", "japaDemo"]
            .forEach((key) => sessionStorage.removeItem(key));
        window.location.replace("login.html");
    }
);

// =========================================================
// 12. INICIALIZAÇÃO
// =========================================================
function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[character]));
}

async function initializeClientPage() {
    if (
        sessionStorage.getItem("japaDemo") === "true" &&
        sessionStorage.getItem("japaRole") === "client" &&
        sessionStorage.getItem("japaBarbershopId") === "demo-ogritech"
    ) {
        loggedClientName = sessionStorage.getItem("japaUserName") || "Cliente";
        loggedClientEmail = sessionStorage.getItem("japaUserEmail") || "";
        clientBarbershopId = "demo-ogritech";
        clientUserName.textContent = loggedClientName;
        clientDate.min = todayISO();
        document.documentElement.style.visibility = "visible";
        renderClientAppointments();
        return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.replace("login.html");
        return;
    }

    const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("barbershop_id, full_name, role, active")
        .eq("id", session.user.id)
        .single();

    if (error || !profile?.active || profile.role !== "client" || !profile.barbershop_id) {
        if (profile?.role && profile.role !== "client") {
            window.location.replace("index.html");
            return;
        }
        await supabaseClient.auth.signOut();
        window.location.replace("login.html");
        return;
    }

    loggedClientName = profile.full_name || "Cliente";
    loggedClientEmail = session.user.email || "";
    clientBarbershopId = profile.barbershop_id;
    clientUserName.textContent = loggedClientName;
    clientDate.min = todayISO();
    document.documentElement.style.visibility = "visible";
    renderClientAppointments();
}

initializeClientPage().catch(() => window.location.replace("login.html"));
