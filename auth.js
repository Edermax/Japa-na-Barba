/* OGRITECH - SESSÃO E PERMISSÕES COM SUPABASE */

const ROLE_LABELS = {
    owner: "Proprietário",
    admin: "Administrador",
    employee: "Funcionário",
    client: "Cliente"
};
const PLATFORM_OWNER_ID = "852ca2d2-6249-4c7c-9f9b-5550695121e5";

function waitForDocument() {
    if (document.readyState !== "loading") return Promise.resolve();
    return new Promise((resolve) => {
        document.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
}

function saveVerifiedSession(user, profile) {
    sessionStorage.setItem("japaAuth", "true");
    sessionStorage.setItem("japaRole", profile.role);
    sessionStorage.setItem("japaUserName", profile.full_name);
    sessionStorage.setItem("japaUserRole", ROLE_LABELS[profile.role] || "Usuário");
    sessionStorage.setItem("japaUserEmail", user.email || "");
    sessionStorage.setItem("japaUserId", user.id);
    sessionStorage.setItem("japaBarbershopId", profile.barbershop_id);
}

function renderUser(profile) {
    const nameElement = document.getElementById("loggedUserName");
    const roleElement = document.getElementById("loggedUserRole");
    const avatar = document.querySelector(".avatar");

    if (nameElement) nameElement.textContent = profile.full_name;
    if (roleElement) roleElement.textContent = ROLE_LABELS[profile.role] || "Usuário";

    if (avatar) {
        avatar.textContent = profile.full_name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }

    if (profile.role === "employee") {
        document
            .querySelectorAll('[data-section="financeiro"], [data-section="configuracoes"]')
            .forEach((item) => item.classList.add("hidden"));

        const eyebrow = document.querySelector(".topbar .eyebrow");
        if (eyebrow) eyebrow.textContent = "PAINEL DO FUNCIONÁRIO";

        document
            .querySelectorAll("#quickAddProfessional, #quickFinancial")
            .forEach((button) => button.classList.add("hidden"));
    }
}

async function initializeAuthenticatedPage() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        sessionStorage.clear();
        window.location.replace("login.html");
        return;
    }

    if (session.user.id === PLATFORM_OWNER_ID && !location.pathname.endsWith("admin.html")) {
        window.location.replace("admin.html");
        return;
    }

    const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("barbershop_id, full_name, role, active")
        .eq("id", session.user.id)
        .single();

    if (error || !profile?.active) {
        await supabaseClient.auth.signOut();
        sessionStorage.clear();
        window.location.replace("login.html");
        return;
    }

    saveVerifiedSession(session.user, profile);

    if (profile.role === "client") {
        window.location.replace("cliente.html");
        return;
    }

    await waitForDocument();
    renderUser(profile);

    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            await supabaseClient.auth.signOut();
            sessionStorage.clear();
            window.location.replace("login.html");
        });
    }
}

initializeAuthenticatedPage();
