/* OGRITECH - AUTENTICAÇÃO COM SUPABASE */

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");
const submitButton = loginForm.querySelector('button[type="submit"]');
const forgotPasswordButton = document.getElementById("forgotPasswordButton");

const ROLE_LABELS = {
    owner: "Proprietário",
    admin: "Administrador",
    employee: "Funcionário",
    client: "Cliente"
};

function saveLocalSession(user, profile) {
    sessionStorage.setItem("japaAuth", "true");
    sessionStorage.setItem("japaRole", profile.role);
    sessionStorage.setItem("japaUserName", profile.full_name);
    sessionStorage.setItem("japaUserRole", ROLE_LABELS[profile.role] || "Usuário");
    sessionStorage.setItem("japaUserEmail", user.email || "");
    sessionStorage.setItem("japaUserId", user.id);
    sessionStorage.setItem("japaBarbershopId", profile.barbershop_id);
}

function destinationFor(role) {
    return role === "client" ? "cliente.html" : "index.html";
}

async function restoreExistingSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("barbershop_id, full_name, role, active")
        .eq("id", session.user.id)
        .single();

    if (error || !profile?.active) return;

    saveLocalSession(session.user, profile);
    window.location.replace(destinationFor(profile.role));
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
    window.location.replace(destinationFor(profile.role));
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
