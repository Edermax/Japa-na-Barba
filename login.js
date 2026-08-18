/* =========================================================
   JAPA NA BARBA - LOGIN AUTOMÁTICO POR PERFIL

   Não existe mais seletor visual de tipo de usuário.

   O sistema identifica automaticamente o perfil através
   do e-mail e senha digitados.

   Perfis disponíveis:
   - Proprietário
   - Funcionário
   - Cliente

   IMPORTANTE:
   Este sistema de autenticação ainda é um protótipo frontend.
   Em produção, a validação deverá ocorrer no backend.
   ========================================================= */

// Elementos da tela.
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");

// =========================================================
// USUÁRIOS DE DEMONSTRAÇÃO
//
// Estas informações não são exibidas na tela.
// Elas são utilizadas apenas pela lógica do protótipo.
// =========================================================
const DEMO_USERS = [
    {
        role: "owner",
        email: "admin@japanabarba.com",
        password: "123456",
        name: "Administrador",
        roleLabel: "Proprietário",
        destination: "index.html"
    },

    {
        role: "employee",
        email: "funcionario@japanabarba.com",
        password: "123456",
        name: "Carlos",
        roleLabel: "Funcionário",
        destination: "index.html"
    },

    {
        role: "client",
        email: "cliente@japanabarba.com",
        password: "123456",
        name: "João Silva",
        roleLabel: "Cliente",
        destination: "cliente.html"
    }
];

// =========================================================
// SE O USUÁRIO JÁ ESTIVER LOGADO
// =========================================================
if (sessionStorage.getItem("japaAuth") === "true") {

    const currentRole =
        sessionStorage.getItem("japaRole");

    // Cliente vai para sua área exclusiva.
    if (currentRole === "client") {
        window.location.href = "cliente.html";
    }

    // Proprietário e funcionário usam o painel principal.
    else {
        window.location.href = "index.html";
    }
}

// =========================================================
// ENVIO DO FORMULÁRIO
// =========================================================
loginForm.addEventListener("submit", (event) => {

    // Evita recarregar a página.
    event.preventDefault();

    // Normaliza o e-mail digitado.
    const email =
        emailInput.value.trim().toLowerCase();

    const password =
        passwordInput.value;

    // Procura automaticamente um usuário cujas
    // credenciais correspondam às digitadas.
    const authenticatedUser =
        DEMO_USERS.find((user) => {
            return (
                user.email === email &&
                user.password === password
            );
        });

    // =====================================================
    // LOGIN CORRETO
    // =====================================================
    if (authenticatedUser) {

        // Guarda os dados da sessão.
        sessionStorage.setItem(
            "japaAuth",
            "true"
        );

        sessionStorage.setItem(
            "japaRole",
            authenticatedUser.role
        );

        sessionStorage.setItem(
            "japaUserName",
            authenticatedUser.name
        );

        sessionStorage.setItem(
            "japaUserRole",
            authenticatedUser.roleLabel
        );

        // E-mail usado para vincular o cliente aos seus próprios agendamentos.
        sessionStorage.setItem(
            "japaUserEmail",
            authenticatedUser.email
        );

        // Mensagem genérica.
        // Não revela o tipo de usuário na tela de login.
        loginMessage.textContent =
            "Login realizado com sucesso.";

        loginMessage.className =
            "login-message success";

        // Abre automaticamente a área correta.
        setTimeout(() => {
            window.location.href =
                authenticatedUser.destination;
        }, 300);

        return;
    }

    // =====================================================
    // LOGIN INCORRETO
    // =====================================================
    loginMessage.textContent =
        "E-mail ou senha incorretos.";

    loginMessage.className =
        "login-message error";
});
