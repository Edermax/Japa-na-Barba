/* JAPA NA BARBA - DEFINIÇÃO DE NOVA SENHA */

const updatePasswordForm = document.getElementById("updatePasswordForm");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const updatePasswordMessage = document.getElementById("updatePasswordMessage");
const invalidRecoveryMessage = document.getElementById("invalidRecoveryMessage");
const updateButton = updatePasswordForm.querySelector('button[type="submit"]');

async function initializeRecovery() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        invalidRecoveryMessage.textContent =
            "Este link é inválido ou expirou. Solicite um novo link na tela de login.";
        invalidRecoveryMessage.className = "login-message error";
        return;
    }

    invalidRecoveryMessage.classList.add("hidden");
    updatePasswordForm.classList.remove("hidden");
    updatePasswordMessage.textContent = "Use pelo menos 8 caracteres.";
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
        "Senha atualizada. Você já pode voltar ao login.";
    updatePasswordMessage.className = "login-message success";
    updatePasswordForm.reset();
    updateButton.disabled = true;
});

initializeRecovery();
