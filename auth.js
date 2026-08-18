/* =========================================================
   JAPA NA BARBA - CONTROLE DE SESSÃO E PERMISSÕES
   ========================================================= */

// Confere se existe uma sessão válida.
const isAuthenticated =
    sessionStorage.getItem("japaAuth") === "true";

const loggedRole =
    sessionStorage.getItem("japaRole");

// Cliente não deve entrar no painel administrativo.
if (!isAuthenticated) {
    window.location.href = "login.html";
} else if (loggedRole === "client") {
    window.location.href = "cliente.html";
}

// Recupera dados da sessão.
const loggedUserName =
    sessionStorage.getItem("japaUserName") || "Usuário";

const loggedUserRole =
    sessionStorage.getItem("japaUserRole") || "Usuário";

document.addEventListener("DOMContentLoaded", () => {

    const nameElement =
        document.getElementById("loggedUserName");

    const roleElement =
        document.getElementById("loggedUserRole");

    const logoutButton =
        document.getElementById("logoutButton");

    const avatar =
        document.querySelector(".avatar");

    // Exibe nome e cargo.
    if (nameElement) {
        nameElement.textContent = loggedUserName;
    }

    if (roleElement) {
        roleElement.textContent = loggedUserRole;
    }

    // Cria as iniciais do usuário.
    if (avatar) {
        avatar.textContent =
            loggedUserName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
    }

    // =====================================================
    // PERMISSÕES DO FUNCIONÁRIO
    // =====================================================
    if (loggedRole === "employee") {

        // Funcionário não vê módulos administrativos sensíveis.
        document
            .querySelectorAll(
                '[data-section="financeiro"], ' +
                '[data-section="configuracoes"]'
            )
            .forEach((item) => {
                item.classList.add("hidden");
            });

        // Identifica visualmente o painel.
        const eyebrow =
            document.querySelector(".topbar .eyebrow");

        if (eyebrow) {
            eyebrow.textContent = "PAINEL DO FUNCIONÁRIO";
        }

        // Botões administrativos rápidos são escondidos.
        document
            .querySelectorAll(
                "#quickAddProfessional, " +
                "#quickFinancial"
            )
            .forEach((button) => {
                button.classList.add("hidden");
            });
    }

    // =====================================================
    // LOGOUT
    // =====================================================
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {

            // Limpa a sessão por completo.
            sessionStorage.removeItem("japaAuth");
            sessionStorage.removeItem("japaRole");
            sessionStorage.removeItem("japaUserName");
            sessionStorage.removeItem("japaUserRole");
            sessionStorage.removeItem("japaUserEmail");

            window.location.href = "login.html";
        });
    }
});
