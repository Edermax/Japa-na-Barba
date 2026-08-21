/* Entrada nos ambientes demonstrativos a partir da vitrine por segmento. */
const DEMO_ROLE_LABELS = {
    owner: "Proprietário",
    employee: "Funcionário",
    client: "Cliente"
};

function demoDateFromToday(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function saveDemoSession(role, business) {
    const names = { owner: business.owner, employee: business.employee, client: business.client };
    const emails = {
        owner: `gestor.${business.key}@demo.ogritech.com.br`,
        employee: `funcionario.${business.key}@demo.ogritech.com.br`,
        client: `cliente.${business.key}@demo.ogritech.com.br`
    };
    sessionStorage.setItem("japaAuth", "true");
    sessionStorage.setItem("japaRole", role);
    sessionStorage.setItem("japaUserName", names[role]);
    sessionStorage.setItem("japaUserRole", DEMO_ROLE_LABELS[role]);
    sessionStorage.setItem("japaUserEmail", emails[role]);
    sessionStorage.setItem("japaUserId", `demo-${business.key}-${role}`);
    sessionStorage.setItem("japaBarbershopId", `demo-${business.key}`);
    sessionStorage.setItem("japaDemo", "true");
    sessionStorage.setItem("japaDemoSegment", business.key);
}

function seedDemoAppointments(business) {
    const key = `japaNaBarbaAppointments:demo-${business.key}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, JSON.stringify([
        { id: `demo-${business.key}-1`, clientName: business.client, clientEmail: `cliente.${business.key}@demo.ogritech.com.br`, service: business.services[0][0], professional: business.professionals[0], date: demoDateFromToday(1), time: "10:00", status: "confirmed", createdBy: "client" },
        { id: `demo-${business.key}-2`, clientName: "Ana Martins", clientEmail: "ana@demo.ogritech.com.br", service: business.services[1][0], professional: business.professionals[0], date: demoDateFromToday(0), time: "18:00", status: "requested", createdBy: "client" },
        { id: `demo-${business.key}-3`, clientName: "Pedro Rocha", clientEmail: "pedro@demo.ogritech.com.br", service: business.services[2][0], professional: business.professionals[1] || business.professionals[0], date: demoDateFromToday(1), time: "13:30", status: "confirmed", createdBy: "owner" }
    ]));
}

function enterSegmentDemo(role) {
    const key = new URLSearchParams(window.location.search).get("segmento") || "barbearia";
    const business = { key, ...(window.OGRITECH_BUSINESSES[key] || window.OGRITECH_BUSINESSES.barbearia) };
    if (!DEMO_ROLE_LABELS[role]) return;
    supabaseClient.auth.signOut({ scope: "local" }).catch(() => {});
    saveDemoSession(role, business);
    seedDemoAppointments(business);
    window.location.replace(role === "client" ? "cliente.html" : "index.html");
}

document.querySelectorAll("[data-demo-role]").forEach((button) => {
    button.addEventListener("click", () => enterSegmentDemo(button.dataset.demoRole));
});
