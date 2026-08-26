/* OGRITECH - DEFINIÇÃO DE NOVA SENHA */

const updatePasswordForm = document.getElementById("updatePasswordForm");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const updatePasswordMessage = document.getElementById("updatePasswordMessage");
const invalidRecoveryMessage = document.getElementById("invalidRecoveryMessage");
const updateButton = updatePasswordForm.querySelector('button[type="submit"]');
const backToLoginLink = document.getElementById("backToLoginLink");
const passwordToggleButtons = updatePasswordForm.querySelectorAll("[data-password-target]");
const loginUrl = window.ogritechEnvironmentUrl("login.html");

backToLoginLink.href = loginUrl;

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

function showRecoveryForm(session) {
    if (!session || recoveryInitialized) return;
    recoveryInitialized = true;
    invalidRecoveryMessage.classList.add("hidden");
    updatePasswordForm.classList.remove("hidden");
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
    const authCode = recoveryUrl.searchParams.get("code");
    if (authCode) {
        const { data, error } = await supabaseClient.auth.exchangeCodeForSession(authCode);
        if (!error) showRecoveryForm(data.session);
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && hasRecoveryCallback) showRecoveryForm(session);

    window.setTimeout(() => {
        if (recoveryInitialized) return;
        invalidRecoveryMessage.textContent =
            "Este link é inválido ou expirou. Solicite um novo link na tela de login.";
        invalidRecoveryMessage.className = "login-message error";
    }, 3000);
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
    updatePasswordMessage.textContent = "Salvando nova senha...";
    updatePasswordMessage.className = "login-message";

    const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
    });

    if (error) {
        updatePasswordMessage.textContent =
            "Não foi possível atualizar a senha. Solicite um novo link.";
        updatePasswordMessage.className = "login-message error";
        updateButton.disabled = false;
        return;
    }

    await supabaseClient.auth.signOut();
    sessionStorage.clear();
    updatePasswordMessage.textContent =
        "Senha atualizada. Redirecionando para o login...";
    updatePasswordMessage.className = "login-message success";
    updatePasswordForm.reset();
    updateButton.disabled = true;
    window.setTimeout(() => window.location.replace(loginUrl), 2000);
});

initializeRecovery();
