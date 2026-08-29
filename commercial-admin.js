(() => {
    const byId = (id) => document.getElementById(id);
    const formatMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    const notify = (element, message, error = false) => {
        if (!element) return;
        element.textContent = message;
        element.classList.toggle("error", error);
    };
    const friendlyError = (error) => error?.message || "Não foi possível concluir a operação.";
    let landingRecord = null;
    let menuRecord = null;

    async function loadLandingAdmin() {
        if (!BARBERSHOP_ID || IS_DEMO) return;
        const [{ data: page, error }, { data: leads }] = await Promise.all([
            supabaseClient.from("landing_pages").select("*").eq("barbershop_id", BARBERSHOP_ID).maybeSingle(),
            supabaseClient.from("landing_page_leads").select("id,name,email,phone,message,status,created_at").eq("barbershop_id", BARBERSHOP_ID).order("created_at", { ascending: false }).limit(100)
        ]);
        if (error) return notify(byId("landingMessage"), friendlyError(error), true);
        landingRecord = page;
        byId("landingTitle").value = page?.title || businessConfig.name;
        byId("landingSlug").value = page?.slug || "";
        byId("landingSubtitle").value = page?.subtitle || "";
        byId("landingWhatsapp").value = page?.whatsapp_phone || "";
        byId("landingEmail").value = page?.contact_email || "";
        byId("landingPublished").checked = Boolean(page?.published);
        const link = byId("landingPublicLink");
        if (page?.published) {
            link.href = ogritechEnvironmentUrl(`/pagina/?empresa=${encodeURIComponent(page.slug)}`);
            link.classList.remove("hidden");
        } else link.classList.add("hidden");
        byId("landingLeadsList").innerHTML = (leads || []).map((lead) => `<article><header><div><strong>${escapeHtml(lead.name)}</strong><p>${escapeHtml(lead.email || lead.phone)}</p></div><span class="commercial-badge">${escapeHtml(lead.status)}</span></header><p>${escapeHtml(lead.message || "Sem mensagem")}</p><small>${new Date(lead.created_at).toLocaleString("pt-BR")}</small></article>`).join("") || "<p class='section-description'>Nenhum lead recebido.</p>";
    }

    byId("landingSettingsForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const published = byId("landingPublished").checked;
        const payload = {
            barbershop_id: BARBERSHOP_ID,
            slug: byId("landingSlug").value.trim().toLowerCase(),
            title: byId("landingTitle").value.trim(),
            subtitle: byId("landingSubtitle").value.trim(),
            whatsapp_phone: byId("landingWhatsapp").value.trim() || null,
            contact_email: byId("landingEmail").value.trim() || null,
            published,
            published_at: published ? (landingRecord?.published_at || new Date().toISOString()) : null
        };
        notify(byId("landingMessage"), "Salvando...");
        const { error } = await supabaseClient.from("landing_pages").upsert(payload, { onConflict: "barbershop_id" });
        notify(byId("landingMessage"), error ? friendlyError(error) : "Landing Page salva.", Boolean(error));
        if (!error) loadLandingAdmin();
    });

    async function loadQuotesAdmin() {
        if (!BARBERSHOP_ID || IS_DEMO) return;
        const { data, error } = await supabaseClient.from("quote_requests")
            .select("id,public_reference,client_name,client_email,client_phone,service_interest,briefing,status,created_at,quote_proposals(id,status,total_amount,version)")
            .eq("barbershop_id", BARBERSHOP_ID).order("created_at", { ascending: false }).limit(100);
        const list = byId("quoteRequestsList");
        if (error) return list.innerHTML = `<p>${escapeHtml(friendlyError(error))}</p>`;
        list.innerHTML = (data || []).map((request) => {
            const proposal = [...(request.quote_proposals || [])].sort((a,b) => b.version-a.version)[0];
            return `<article><header><div><strong>${escapeHtml(request.client_name)} · ${escapeHtml(request.service_interest)}</strong><p>${escapeHtml(request.client_email || request.client_phone)}</p></div><span class="commercial-badge">${escapeHtml(proposal?.status || request.status)}</span></header><p>${escapeHtml(Object.values(request.briefing || {}).join(" · ") || "Briefing sem detalhes adicionais")}</p><div class="commercial-actions">${proposal ? `<span>${formatMoney.format(Number(proposal.total_amount))}</span>` : `<button class="table-button edit" data-create-proposal="${request.id}" data-client="${escapeHtml(request.client_name)}">Criar proposta</button>`}</div></article>`;
        }).join("") || "<p class='section-description'>Nenhuma solicitação recebida.</p>";
        list.querySelectorAll("[data-create-proposal]").forEach((button) => button.addEventListener("click", () => {
            byId("quoteRequestId").value = button.dataset.createProposal;
            byId("quoteComposerTitle").textContent = `Proposta para ${button.dataset.client}`;
            byId("proposalTitle").value = `Proposta comercial — ${button.dataset.client}`;
            byId("quoteComposer").classList.remove("hidden");
            byId("quoteComposer").scrollIntoView({ behavior: "smooth" });
        }));
    }

    byId("quoteProposalForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const requestId = byId("quoteRequestId").value;
        notify(byId("proposalMessage"), "Criando proposta...");
        const { data: versions } = await supabaseClient.from("quote_proposals").select("version").eq("quote_request_id", requestId).order("version", { ascending: false }).limit(1);
        const { data: proposal, error } = await supabaseClient.from("quote_proposals").insert({
            barbershop_id: BARBERSHOP_ID, quote_request_id: requestId,
            version: (versions?.[0]?.version || 0) + 1, title: byId("proposalTitle").value.trim(),
            scope: byId("proposalScope").value.trim(), valid_until: byId("proposalValidUntil").value || null
        }).select("id").single();
        if (error) return notify(byId("proposalMessage"), friendlyError(error), true);
        const { error: itemError } = await supabaseClient.from("quote_proposal_items").insert({
            barbershop_id: BARBERSHOP_ID, proposal_id: proposal.id,
            description: byId("proposalItemDescription").value.trim(), quantity: 1,
            unit_price: Number(byId("proposalItemPrice").value)
        });
        if (itemError) {
            await supabaseClient.from("quote_proposals").delete().eq("id", proposal.id);
            return notify(byId("proposalMessage"), friendlyError(itemError), true);
        }
        const { data: sent, error: sendError } = await supabaseClient.rpc("send_quote_proposal", { target_proposal_id: proposal.id });
        if (sendError) return notify(byId("proposalMessage"), friendlyError(sendError), true);
        const url = ogritechEnvironmentUrl(`/proposta/?referencia=${encodeURIComponent(sent.reference)}&token=${encodeURIComponent(sent.token)}`);
        notify(byId("proposalMessage"), "Proposta criada. Copie o link abaixo:");
        const anchor = document.createElement("a"); anchor.href = url; anchor.target = "_blank"; anchor.rel = "noopener"; anchor.textContent = url; byId("proposalMessage").append(" ", anchor);
        loadQuotesAdmin();
    });

    async function loadMenuAdmin() {
        if (!BARBERSHOP_ID || IS_DEMO) return;
        const [{ data: menu, error }, { data: orders }] = await Promise.all([
            supabaseClient.from("online_menus").select("*,menu_categories(id,name,sort_order,menu_items(id,name,active,available,menu_item_prices(id,label,price,promotional_price,active)))").eq("barbershop_id", BARBERSHOP_ID).maybeSingle(),
            supabaseClient.from("menu_orders").select("id,public_reference,customer_name,fulfillment_type,status,total_amount,created_at").eq("barbershop_id", BARBERSHOP_ID).order("created_at", { ascending: false }).limit(100)
        ]);
        if (error) return notify(byId("menuMessage"), friendlyError(error), true);
        menuRecord = menu;
        byId("menuTitle").value = menu?.title || businessConfig.name;
        byId("menuSlug").value = menu?.slug || "";
        byId("menuDescription").value = menu?.description || "";
        byId("menuMinimum").value = menu?.minimum_order || 0;
        byId("menuDeliveryFee").value = menu?.delivery_fee || 0;
        byId("menuAcceptsDelivery").checked = Boolean(menu?.accepts_delivery);
        byId("menuPublished").checked = Boolean(menu?.published);
        const link=byId("menuPublicLink"); if(menu?.published){link.href=ogritechEnvironmentUrl(`/cardapio/?empresa=${encodeURIComponent(menu.slug)}`);link.classList.remove("hidden")}else link.classList.add("hidden");
        const categories = [...(menu?.menu_categories || [])].sort((a,b)=>a.sort_order-b.sort_order);
        byId("menuCatalogList").innerHTML = categories.map((category)=>`<article><strong>${escapeHtml(category.name)}</strong>${(category.menu_items||[]).map((item)=>`<p>${escapeHtml(item.name)} — ${(item.menu_item_prices||[]).map((price)=>formatMoney.format(Number(price.promotional_price ?? price.price))).join(" / ")}</p>`).join("")}</article>`).join("") || "<p class='section-description'>Nenhum item cadastrado.</p>";
        byId("menuOrdersList").innerHTML = (orders||[]).map((order)=>`<article><header><div><strong>#${escapeHtml(order.public_reference)} · ${escapeHtml(order.customer_name)}</strong><p>${formatMoney.format(Number(order.total_amount))}</p></div><span class="commercial-badge">${escapeHtml(order.status)}</span></header>${!["completed","cancelled","rejected"].includes(order.status)?`<div class="commercial-actions"><button class="table-button edit" data-order-status="confirmed" data-order="${order.id}">Confirmar</button><button class="table-button edit" data-order-status="completed" data-order="${order.id}">Concluir</button></div>`:""}</article>`).join("") || "<p class='section-description'>Nenhum pedido recebido.</p>";
        byId("menuOrdersList").querySelectorAll("[data-order]").forEach((button)=>button.addEventListener("click",async()=>{await supabaseClient.from("menu_orders").update({status:button.dataset.orderStatus,[button.dataset.orderStatus==="completed"?"completed_at":"confirmed_at"]:new Date().toISOString()}).eq("id",button.dataset.order);loadMenuAdmin()}));
    }

    byId("menuSettingsForm")?.addEventListener("submit", async (event) => {
        event.preventDefault(); const published=byId("menuPublished").checked;
        const { error } = await supabaseClient.from("online_menus").upsert({barbershop_id:BARBERSHOP_ID,slug:byId("menuSlug").value.trim().toLowerCase(),title:byId("menuTitle").value.trim(),description:byId("menuDescription").value.trim(),minimum_order:Number(byId("menuMinimum").value||0),delivery_fee:Number(byId("menuDeliveryFee").value||0),accepts_pickup:true,accepts_delivery:byId("menuAcceptsDelivery").checked,published,published_at:published?(menuRecord?.published_at||new Date().toISOString()):null},{onConflict:"barbershop_id"});
        notify(byId("menuMessage"),error?friendlyError(error):"Cardápio salvo.",Boolean(error)); if(!error)loadMenuAdmin();
    });

    byId("menuItemForm")?.addEventListener("submit", async (event) => {
        event.preventDefault(); if(!menuRecord)return notify(byId("menuMessage"),"Salve o cardápio antes de adicionar itens.",true);
        const categoryName=byId("menuCategoryName").value.trim(); let {data:category}=await supabaseClient.from("menu_categories").select("id").eq("menu_id",menuRecord.id).eq("name",categoryName).maybeSingle();
        if(!category){const created=await supabaseClient.from("menu_categories").insert({barbershop_id:BARBERSHOP_ID,menu_id:menuRecord.id,name:categoryName}).select("id").single();if(created.error)return notify(byId("menuMessage"),friendlyError(created.error),true);category=created.data}
        const createdItem=await supabaseClient.from("menu_items").insert({barbershop_id:BARBERSHOP_ID,category_id:category.id,name:byId("menuItemName").value.trim()}).select("id").single();
        if(createdItem.error)return notify(byId("menuMessage"),friendlyError(createdItem.error),true);
        const price=await supabaseClient.from("menu_item_prices").insert({barbershop_id:BARBERSHOP_ID,menu_item_id:createdItem.data.id,label:byId("menuPriceLabel").value.trim()||"Padrão",price:Number(byId("menuItemPrice").value)});
        if(price.error){await supabaseClient.from("menu_items").delete().eq("id",createdItem.data.id);return notify(byId("menuMessage"),friendlyError(price.error),true)}
        event.target.reset();byId("menuPriceLabel").value="Padrão";loadMenuAdmin();
    });

    window.loadLandingAdmin = loadLandingAdmin;
    window.loadQuotesAdmin = loadQuotesAdmin;
    window.loadMenuAdmin = loadMenuAdmin;
})();
