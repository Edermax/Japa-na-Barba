/* OGRITECH - AUTENTICAÇÃO COM SUPABASE */

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");
const submitButton = loginForm.querySelector('button[type="submit"]');
const forgotPasswordButton = document.getElementById("forgotPasswordButton");
const togglePasswordButton = document.getElementById("togglePasswordButton");
const demoAccessButtons = document.querySelectorAll("[data-demo-role]");
const demoSegment = document.getElementById("demoSegment");

togglePasswordButton.addEventListener("click", () => {
    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    togglePasswordButton.setAttribute("aria-pressed", String(!isVisible));
    togglePasswordButton.setAttribute("aria-label", isVisible ? "Mostrar senha" : "Ocultar senha");
    togglePasswordButton.title = isVisible ? "Mostrar senha" : "Ocultar senha";
    togglePasswordButton.querySelector("span").textContent = isVisible ? "◉" : "◎";
    passwordInput.focus();
});

const ROLE_LABELS = {
    owner: "Proprietário",
    admin: "Administrador",
    employee: "Funcionário",
    client: "Cliente"
};

function saveLocalSession(user, profile) {
    sessionStorage.removeItem("japaDemo");
    sessionStorage.removeItem("japaDemoSegment");
    sessionStorage.setItem("japaAuth", "true");
    sessionStorage.setItem("japaRole", profile.role);
    sessionStorage.setItem("japaUserName", profile.full_name);
    sessionStorage.setItem("japaUserRole", ROLE_LABELS[profile.role] || "Usuário");
    sessionStorage.setItem("japaUserEmail", user.email || "");
    sessionStorage.setItem("japaUserId", user.id);
    sessionStorage.setItem("japaBarbershopId", profile.barbershop_id);
}

async function destinationFor(role) {
    const { data: isPlatformAdmin } = await supabaseClient.rpc("is_platform_admin");
    if (isPlatformAdmin) return "admin.html";
    return role === "client" ? "cliente.html" : "index.html";
}

function dateFromToday(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function seedDemoData(business) {
    const appointmentKey = `japaNaBarbaAppointments:demo-${business.key}`;
    if (!localStorage.getItem(appointmentKey)) {
        const clientEmail = `cliente.${business.key}@demo.ogritech.com.br`;
        localStorage.setItem(appointmentKey, JSON.stringify([
            { id: `demo-${business.key}-1`, clientName: business.client, clientEmail, service: business.services[0][0], professional: business.professionals[0], date: dateFromToday(1), time: "10:00", status: "confirmed", createdBy: "client" },
            { id: `demo-${business.key}-2`, clientName: "Ana Martins", clientEmail: "ana@demo.ogritech.com.br", service: business.services[1][0], professional: business.professionals[0], date: dateFromToday(0), time: "18:00", status: "requested", createdBy: "client" },
            { id: `demo-${business.key}-3`, clientName: "Pedro Rocha", clientEmail: "pedro@demo.ogritech.com.br", service: business.services[2][0], professional: business.professionals[1] || business.professionals[0], date: dateFromToday(1), time: "13:30", status: "confirmed", createdBy: "owner" }
        ]));
    }
}

function enterDemo(role) {
    const key = demoSegment.value;
    const business = { key, ...(window.OGRITECH_BUSINESSES[key] || window.OGRITECH_BUSINESSES.barbearia) };
    const names = { owner: business.owner, employee: business.employee, client: business.client };
    const emails = { owner: `gestor.${key}@demo.ogritech.com.br`, employee: `funcionario.${key}@demo.ogritech.com.br`, client: `cliente.${key}@demo.ogritech.com.br` };
    if (!names[role]) return;

    // A demonstração não depende da rede; encerra eventual sessão real em segundo plano.
    supabaseClient.auth.signOut({ scope: "local" }).catch(() => {});
    saveLocalSession(
        { id: `demo-${key}-${role}`, email: emails[role] },
        { role, full_name: names[role], barbershop_id: `demo-${key}` }
    );
    sessionStorage.setItem("japaDemo", "true");
    sessionStorage.setItem("japaDemoSegment", key);
    seedDemoData(business);
    window.location.replace(role === "client" ? "cliente.html" : "index.html");
}

demoAccessButtons.forEach((button) => {
    button.addEventListener("click", () => enterDemo(button.dataset.demoRole));
});

async function restoreExistingSession() {
    if (sessionStorage.getItem("japaDemo") === "true") {
        const role = sessionStorage.getItem("japaRole");
        window.location.replace(role === "client" ? "cliente.html" : "index.html");
        return;
    }
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("barbershop_id, full_name, role, active")
        .eq("id", session.user.id)
        .single();

    if (error || !profile?.active) return;

    saveLocalSession(session.user, profile);
    window.location.replace(await destinationFor(profile.role));
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    loginMessage.textContent = "Entrando...";
    loginMessage.className = "login-message";

    const { data, error: loginError } = await supabaseClient.auth
        .signInWithPassword({
            email: emailInput.value.trim().toLowerCase(),
            password: passwordInput.value
        });

    if (loginError || !data.user) {
        loginMessage.textContent = "E-mail ou senha incorretos.";
        loginMessage.className = "login-message error";
        submitButton.disabled = false;
        return;
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("barbershop_id, full_name, role, active")
        .eq("id", data.user.id)
        .single();

    if (profileError || !profile) {
        await supabaseClient.auth.signOut();
        loginMessage.textContent = "Usuário sem perfil cadastrado.";
        loginMessage.className = "login-message error";
        submitButton.disabled = false;
        return;
    }

    if (!profile.active) {
        await supabaseClient.auth.signOut();
        loginMessage.textContent = "Este usuário está desativado.";
        loginMessage.className = "login-message error";
        submitButton.disabled = false;
        return;
    }

    saveLocalSession(data.user, profile);
    loginMessage.textContent = "Login realizado com sucesso.";
    loginMessage.className = "login-message success";
    window.location.replace(await destinationFor(profile.role));
});

forgotPasswordButton.addEventListener("click", async () => {
    const email = emailInput.value.trim().toLowerCase();

    if (!email) {
        loginMessage.textContent = "Informe seu e-mail para recuperar a senha.";
        loginMessage.className = "login-message error";
        emailInput.focus();
        return;
    }

    forgotPasswordButton.disabled = true;
    loginMessage.textContent = "Enviando link de recuperação...";
    loginMessage.className = "login-message";

    const redirectTo = new URL(
        "update-password.html",
        window.location.href
    ).href;

    const { error } = await supabaseClient.auth.resetPasswordForEmail(
        email,
        { redirectTo }
    );

    if (error) {
        loginMessage.textContent =
            "Não foi possível enviar agora. Aguarde um minuto e tente novamente.";
        loginMessage.className = "login-message error";
        forgotPasswordButton.disabled = false;
        return;
    }

    loginMessage.textContent =
        "Enviamos um novo link para seu e-mail. Verifique também o spam.";
    loginMessage.className = "login-message success";
    forgotPasswordButton.disabled = false;
});

restoreExistingSession();
