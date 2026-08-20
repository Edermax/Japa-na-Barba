/* OGRITECH - SESSÃO E PERMISSÕES COM SUPABASE */

const ROLE_LABELS = {
    owner: "Proprietário",
    admin: "Administrador",
    employee: "Funcionário",
    client: "Cliente"
};

const SESSION_KEYS = [
    "japaAuth", "japaRole", "japaUserName", "japaUserRole",
    "japaUserEmail", "japaUserId", "japaBarbershopId"
];

document.documentElement.style.visibility = "hidden";

function clearLocalSession() {
    SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
}

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
    const previousUserId = sessionStorage.getItem("japaUserId");
    const previousRole = sessionStorage.getItem("japaRole");
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        clearLocalSession();
        window.location.replace("login.html");
        return;
    }

    const { data: isPlatformAdmin } = await supabaseClient.rpc("is_platform_admin");
    if (isPlatformAdmin && !location.pathname.endsWith("admin.html")) {
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
        clearLocalSession();
        window.location.replace("login.html");
        return;
    }

    if (!profile.barbershop_id || !["owner", "admin", "employee", "client"].includes(profile.role)) {
        await supabaseClient.auth.signOut();
        clearLocalSession();
        window.location.replace("login.html");
        return;
    }

    saveVerifiedSession(session.user, profile);

    if (profile.role === "client") {
        window.location.replace("cliente.html");
        return;
    }

    if (previousUserId !== session.user.id || previousRole !== profile.role) {
        window.location.reload();
        return;
    }

    await waitForDocument();
    renderUser(profile);
    document.documentElement.style.visibility = "visible";

    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            await supabaseClient.auth.signOut();
            clearLocalSession();
            window.location.replace("login.html");
        });
    }
}

initializeAuthenticatedPage().catch(() => {
    clearLocalSession();
    document.documentElement.style.visibility = "visible";
    window.location.replace("login.html");
});
