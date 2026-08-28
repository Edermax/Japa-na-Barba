/* OGRITECH - DEFINIÇÃO DE NOVA SENHA */

const updatePasswordForm = document.getElementById("updatePasswordForm");
const recoveryCredentialFields = document.getElementById("recoveryCredentialFields");
const recoveryEmailInput = document.getElementById("recoveryEmail");
const recoveryCodeInput = document.getElementById("recoveryCode");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const updatePasswordMessage = document.getElementById("updatePasswordMessage");
const invalidRecoveryMessage = document.getElementById("invalidRecoveryMessage");
const updateButton = updatePasswordForm.querySelector('button[type="submit"]');
const backToLoginLink = document.getElementById("backToLoginLink");
const passwordToggleButtons = updatePasswordForm.querySelectorAll("[data-password-target]");
const loginUrl = window.ogritechEnvironmentUrl("login/");

backToLoginLink.href = loginUrl;
recoveryEmailInput.value = sessionStorage.getItem("ogritechRecoveryEmail") || "";

passwordToggleButtons.forEach((toggleButton) => {
    toggleButton.addEventListener("click", () => {
        const passwordInput = document.getElementById(toggleButton.dataset.passwordTarget);
        const isVisible = passwordInput.type === "text";
        passwordInput.type = isVisible ? "password" : "text";
        toggleButton.setAttribute("aria-pressed", String(!isVisible));
        toggleButton.setAttribute("aria-label", isVisible ? "Mostrar senha" : "Ocultar senha");
        toggleButton.title = isVisible ? "Mostrar senha" : "Ocultar senha";
        toggleButton.classList.toggle("is-visible", !isVisible);
        passwordInput.focus();
    });
});

const recoveryUrl = new URL(window.location.href);
const recoveryHash = new URLSearchParams(recoveryUrl.hash.replace(/^#/, ""));
const hasRecoveryCallback =
    recoveryUrl.searchParams.has("code") ||
    recoveryHash.get("type") === "recovery";
let recoveryInitialized = false;
let recoveryAccessToken = null;

function showRecoveryForm(session) {
    if (!session || recoveryInitialized) return;
    recoveryInitialized = true;
    invalidRecoveryMessage.classList.add("hidden");
    updatePasswordForm.classList.remove("hidden");
    recoveryCredentialFields.classList.add("hidden");
    recoveryEmailInput.required = false;
    recoveryCodeInput.required = false;
    updatePasswordMessage.textContent = "Use pelo menos 8 caracteres.";
}

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (
        event === "PASSWORD_RECOVERY" ||
        (event === "SIGNED_IN" && hasRecoveryCallback)
    ) {
        showRecoveryForm(session);
    }
});

async function initializeRecovery() {
    const accessToken = recoveryHash.get("access_token");

    if (accessToken) {
        const { data, error } = await supabaseClient.auth.getUser(accessToken);

        if (!error && data.user) {
            recoveryAccessToken = accessToken;
            showRecoveryForm({ user: data.user });
            return;
        }
    }

    const authCode = recoveryUrl.searchParams.get("code");
    if (authCode) {
        const { data, error } = await supabaseClient.auth.exchangeCodeForSession(authCode);
        if (!error && data.session) {
            showRecoveryForm(data.session);
            recoveryUrl.searchParams.delete("code");
            window.history.replaceState({}, document.title, recoveryUrl);
            return;
        }
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && hasRecoveryCallback) showRecoveryForm(session);

    if (hasRecoveryCallback) {
        window.setTimeout(() => {
            if (recoveryInitialized) return;
            updatePasswordMessage.textContent =
                "O link não pôde ser validado. Digite abaixo o código mais recente recebido por e-mail.";
            updatePasswordMessage.className = "login-message error";
        }, 3000);
    }
}

updatePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const newPassword = newPasswordInput.value;
    const confirmation = confirmPasswordInput.value;

    if (newPassword.length < 8) {
        updatePasswordMessage.textContent =
            "A senha precisa ter pelo menos 8 caracteres.";
        updatePasswordMessage.className = "login-message error";
        return;
    }

    if (newPassword !== confirmation) {
        updatePasswordMessage.textContent = "As senhas não coincidem.";
        updatePasswordMessage.className = "login-message error";
        return;
    }

    updateButton.disabled = true;
    updatePasswordMessage.textContent = recoveryInitialized
        ? "Salvando nova senha..."
        : "Validando código de recuperação...";
    updatePasswordMessage.className = "login-message";

    if (!recoveryInitialized) {
        const email = recoveryEmailInput.value.trim().toLowerCase();
        const token = recoveryCodeInput.value.trim();
        const { data, error } = await supabaseClient.auth.verifyOtp({
            email,
            token,
            type: "recovery"
        });

        if (error || !data.session) {
            updatePasswordMessage.textContent =
                "Código inválido ou expirado. Use o código do e-mail mais recente.";
            updatePasswordMessage.className = "login-message error";
            updateButton.disabled = false;
            return;
        }

        showRecoveryForm(data.session);
        updatePasswordMessage.textContent = "Salvando nova senha...";
    }

    let updateError = null;

    if (recoveryAccessToken) {
        const response = await fetch(`${window.OGRITECH_SUPABASE_URL}/auth/v1/user`, {
            method: "PUT",
            headers: {
                apikey: window.OGRITECH_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${recoveryAccessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password: newPassword })
        });

        if (!response.ok) updateError = new Error("Falha ao atualizar a senha.");
    } else {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });
        updateError = error;
    }

    if (updateError) {
        updatePasswordMessage.textContent =
            "Não foi possível atualizar a senha. Solicite um novo link.";
        updatePasswordMessage.className = "login-message error";
        updateButton.disabled = false;
        return;
    }

    if (recoveryAccessToken) {
        await fetch(`${window.OGRITECH_SUPABASE_URL}/auth/v1/logout?scope=global`, {
            method: "POST",
            headers: {
                apikey: window.OGRITECH_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${recoveryAccessToken}`
            }
        });
        recoveryAccessToken = null;
        const cleanUrl = new URL(window.location.href);
        cleanUrl.hash = "";
        window.history.replaceState({}, document.title, cleanUrl);
    } else {
        await supabaseClient.auth.signOut();
    }
    sessionStorage.clear();
    updatePasswordMessage.textContent =
        "Senha atualizada. Redirecionando para o login...";
    updatePasswordMessage.className = "login-message success";
    updatePasswordForm.reset();
    updateButton.disabled = true;
    window.setTimeout(() => window.location.replace(loginUrl), 2000);
});

initializeRecovery();
