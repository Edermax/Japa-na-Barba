/* OGRITECH — PAINEL EXCLUSIVO DO PROPRIETÁRIO DA PLATAFORMA */
const PLATFORM_OWNER_ID = "852ca2d2-6249-4c7c-9f9b-5550695121e5";

const SEGMENTS = {
    "Barbearia": { icon: "✂", color: "#f0d477" },
    "Salão de beleza": { icon: "✦", color: "#d173df" },
    "Manicure": { icon: "◇", color: "#f18fb4" },
    "Bronzeamento": { icon: "☀", color: "#f0ad4e" },
    "Professor de música": { icon: "♫", color: "#6ba8f7" },
    "Personal training": { icon: "◆", color: "#65d39b" }
};

let businesses = [];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

async function validatePlatformOwner() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || session.user.id !== PLATFORM_OWNER_ID) {
        window.location.replace(session ? "index.html" : "login.html");
        return false;
    }

    const { data: profile, error } = await supabaseClient.from("profiles").select("full_name, active").eq("id", session.user.id).single();
    if (error || !profile?.active) {
        await supabaseClient.auth.signOut();
        window.location.replace("login.html");
        return false;
    }

    document.getElementById("platformOwnerName").textContent = profile.full_name;
    document.getElementById("adminLoading").classList.add("hidden");
    return true;
}

function renderSegments() {
    const grid = document.getElementById("segmentGrid");
    grid.innerHTML = Object.entries(SEGMENTS).map(([segment, meta]) => {
        const count = businesses.filter((business) => business.segment === segment).length;
        return `<article class="segment-card" style="--segment-color:${meta.color}"><i>${meta.icon}</i><div><strong>${segment}</strong><span>${count} negócios</span></div><b>${count}</b></article>`;
    }).join("");
}

function renderBusinesses() {
    const query = document.getElementById("businessSearch").value.trim().toLocaleLowerCase("pt-BR");
    const segment = document.getElementById("segmentFilter").value;
    const filtered = businesses.filter((business) => {
        const matchesText = `${business.name} ${business.owner}`.toLocaleLowerCase("pt-BR").includes(query);
        return matchesText && (segment === "all" || business.segment === segment);
    });

    document.getElementById("businessTableBody").innerHTML = filtered.map((business) => {
        const meta = SEGMENTS[business.segment];
        return `<tr><td><div class="business-name"><span style="--segment-color:${meta.color}">${meta.icon}</span><strong>${business.name}</strong></div></td><td>${business.segment}</td><td>${business.owner}</td><td><span class="origin-badge ${business.origin === "Cliente real" ? "real" : ""}">${business.origin}</span></td><td><span class="plan-badge">${business.plan}</span></td><td>${money.format(business.price)}</td><td><span class="active-badge">${business.status}</span></td></tr>`;
    }).join("");
    document.getElementById("businessEmpty").classList.toggle("hidden", filtered.length > 0);
    document.querySelector(".business-table-wrap").classList.toggle("hidden", filtered.length === 0);
}

async function loadBusinesses() {
    const { data, error } = await supabaseClient
        .from("saas_clients")
        .select("id, name, segment, contact_name, origin, plan, monthly_fee, status")
        .order("created_at", { ascending: true });

    if (error) throw error;

    businesses = (data || []).map((business) => ({
        id: business.id,
        name: business.name,
        segment: business.segment,
        owner: business.contact_name,
        origin: business.origin,
        plan: business.plan,
        price: Number(business.monthly_fee),
        status: business.status
    }));
}

async function initializeDashboard() {
    try {
        await loadBusinesses();
    } catch (error) {
        document.getElementById("adminLoading").textContent =
            "Não foi possível carregar a carteira de clientes.";
        document.getElementById("adminLoading").classList.remove("hidden");
        console.error("Erro ao carregar saas_clients:", error.message);
        return;
    }

    const filter = document.getElementById("segmentFilter");
    Object.keys(SEGMENTS).forEach((segment) => filter.add(new Option(segment, segment)));
    document.getElementById("businessCount").textContent = businesses.length;
    document.getElementById("segmentCount").textContent = Object.keys(SEGMENTS).length;
    document.getElementById("activeCount").textContent = businesses.filter((business) => business.status === "Ativo").length;
    document.getElementById("monthlyRevenue").textContent = money.format(businesses.reduce((total, business) => total + business.price, 0));
    renderSegments();
    renderBusinesses();
    document.getElementById("businessSearch").addEventListener("input", renderBusinesses);
    filter.addEventListener("change", renderBusinesses);
    document.getElementById("platformLogout").addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        sessionStorage.clear();
        window.location.replace("login.html");
    });
}

validatePlatformOwner().then(async (authorized) => {
    if (authorized) await initializeDashboard();
});
