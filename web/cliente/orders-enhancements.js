(() => {
  const $e = id => document.getElementById(id);

  function mlStatus(o) {
    const t = String(o?.observacoes || "");
    const m = [...t.matchAll(/\[ML_STATUS\](novo|preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/g)];
    return m.length ? m.at(-1)[1] : "preparo";
  }

  function mlSetStatus(text, status) {
    return String(text || "")
      .replace(/\n?\n?\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g, "")
      .trim() + `\n\n[ML_STATUS]${status}[/ML_STATUS]`;
  }

  function mlItems(o) {
    const m = String(o?.observacoes || "").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/);
    if (!m) return [];
    try { return JSON.parse(decodeURIComponent(m[1])); }
    catch { return []; }
  }

  function waNumber(phone) {
    let n = String(phone || "").replace(/\D/g, "");
    if (n.length === 10 || n.length === 11) n = "55" + n;
    return n;
  }

  function openWA(order, msg = "") {
    const n = waNumber(order?.telefone);
    if (!n) return alert("Este pedido não possui WhatsApp/telefone cadastrado.");
    location.href = `https://wa.me/${n}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
  }

  function build() {
    const page = $e("page-comandas");
    if (!page) return;

    page.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Pedidos</h1>
          <p>Acompanhe e confirme os pedidos em tempo real.</p>
        </div>
      </div>

      <div class="ml-order-tabs">
        <button class="ml-order-tab active" data-ml-tab="novo">
          Novos <b id="mlCountNovo">0</b>
        </button>
        <button class="ml-order-tab" data-ml-tab="preparo">
          Em preparo <b id="mlCountPrep">0</b>
        </button>
        <button class="ml-order-tab" data-ml-tab="entrega">
          Em entrega <b id="mlCountDelivery">0</b>
        </button>
      </div>

      <div id="mlOrderError" class="ml-order-error" style="display:none"></div>
      <div id="mlPanelNovo" class="ml-order-panel"></div>
      <div id="mlPanelPrep" class="ml-order-panel hidden"></div>
      <div id="mlPanelDelivery" class="ml-order-panel hidden"></div>
    `;

    page.querySelectorAll(".ml-order-tab").forEach(button => {
      button.onclick = () => {
        page.querySelectorAll(".ml-order-tab").forEach(x => x.classList.remove("active"));
        page.querySelectorAll(".ml-order-panel").forEach(x => x.classList.add("hidden"));
        button.classList.add("active");

        const id = button.dataset.mlTab === "novo"
          ? "mlPanelNovo"
          : button.dataset.mlTab === "preparo"
            ? "mlPanelPrep"
            : "mlPanelDelivery";

        $e(id)?.classList.remove("hidden");
      };
    });
  }

  function showError(message) {
    const box = $e("mlOrderError");
    if (!box) return;
    box.style.display = "block";
    box.innerHTML = `<strong>Erro ao carregar pedidos</strong><div>${esc(message)}</div>`;
  }

  function hideError() {
    const box = $e("mlOrderError");
    if (!box) return;
    box.style.display = "none";
    box.innerHTML = "";
  }

  function card(order, status) {
    const items = mlItems(order);
    const summary = items.map(item => `${item.quantidade}x ${item.nome}`).join(", ");
    const number = `#${String(order.id).slice(-5)}`;
    const time = order.created_at ? new Date(order.created_at).toLocaleString("pt-BR") : "";

    let html = `
      <div class="order-card ml-order-card">
        <div class="ml-order-top">
          <div>
            <h3>${esc(order.Cliente || "Cliente")}</h3>
            <strong>${number}</strong>
          </div>
          <span class="ml-status-pill ${status}">
            ${status === "novo" ? "Aguardando confirmação" : status === "preparo" ? "Em preparo" : "Saiu para entrega"}
          </span>
        </div>

        <div class="meta">
          ${esc(summary || "Pedido")} · ${money(order.total)} · ${time}
        </div>

        ${order.endereco ? `
          <div class="ml-order-info">
            ${esc(order.endereco)}
            ${order.referencia ? ` · ${esc(order.referencia)}` : ""}
          </div>
        ` : ""}
    `;

    if (status === "novo") {
      html += `
        <div class="ml-new-actions">
          <button class="action confirm" onclick="mlConfirmOrder('${order.id}')">Confirmar pedido</button>
          <button class="action whats" onclick="mlOpenWhats('${order.id}')">WhatsApp</button>
          <button class="action red" onclick="mlCancelNewOrder('${order.id}')">Cancelar</button>
        </div>
      `;
    } else if (status === "preparo") {
      html += `
        <div class="order-actions">
          <button class="action green" onclick="mlMoveOrder('${order.id}','entrega')">Saiu para entrega</button>
          <button class="action red" onclick="mlCancelNewOrder('${order.id}')">Cancelar</button>
          ${order.telefone ? `<button class="action whats" onclick="mlOpenWhats('${order.id}')">WhatsApp</button>` : ""}
        </div>
      `;
    } else {
      html += `
        <div class="order-actions">
          <button class="action green" onclick="mlMoveOrder('${order.id}','entregue')">Entregue</button>
          ${order.telefone ? `<button class="action whats" onclick="mlOpenWhats('${order.id}')">WhatsApp</button>` : ""}
        </div>
      `;
    }

    return html + "</div>";
  }

  async function loadOrdersDirect() {
    try {
      hideError();

      const result = await db
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false });

      if (result.error) {
        console.error("Erro Supabase pedidos:", result.error);
        showError(result.error.message);
        return [];
      }

      const orders = Array.isArray(result.data) ? result.data : [];
      state.orders = orders;
      renderOrders();
      return orders;

    } catch (error) {
      console.error("Erro inesperado ao carregar pedidos:", error);
      showError(error?.message || "Não foi possível carregar os pedidos.");
      return [];
    }
  }

  window.renderOrders = function() {
    const orders = Array.isArray(state.orders) ? state.orders : [];

    const novos = orders.filter(order => mlStatus(order) === "novo");
    const preparo = orders.filter(order => mlStatus(order) === "preparo");
    const entrega = orders.filter(order => mlStatus(order) === "entrega");

    const novoPanel = $e("mlPanelNovo");
    const preparoPanel = $e("mlPanelPrep");
    const entregaPanel = $e("mlPanelDelivery");

    if (!novoPanel || !preparoPanel || !entregaPanel) return;

    novoPanel.innerHTML = novos.length
      ? novos.map(order => card(order, "novo")).join("")
      : `<div class="empty">Nenhum pedido novo aguardando confirmação.</div>`;

    preparoPanel.innerHTML = preparo.length
      ? preparo.map(order => card(order, "preparo")).join("")
      : `<div class="empty">Nenhum pedido em preparo.</div>`;

    entregaPanel.innerHTML = entrega.length
      ? entrega.map(order => card(order, "entrega")).join("")
      : `<div class="empty">Nenhum pedido saiu para entrega.</div>`;

    if ($e("mlCountNovo")) $e("mlCountNovo").textContent = novos.length;
    if ($e("mlCountPrep")) $e("mlCountPrep").textContent = preparo.length;
    if ($e("mlCountDelivery")) $e("mlCountDelivery").textContent = entrega.length;
    if ($e("openCount")) $e("openCount").textContent = novos.length + preparo.length + entrega.length;
  };

  window.mlOpenWhats = id => {
    const order = state.orders.find(x => String(x.id) === String(id));
    if (order) openWA(order);
  };

  window.mlConfirmOrder = async id => {
    const order = state.orders.find(x => String(x.id) === String(id));
    if (!order) return;

    const result = await db
      .from("pedidos")
      .update({ observacoes: mlSetStatus(order.observacoes, "preparo") })
      .eq("id", order.id);

    if (result.error) {
      alert("Não foi possível confirmar o pedido:\n\n" + result.error.message);
      return;
    }

    await loadOrdersDirect();

    openWA(
      order,
      `Olá, ${order.Cliente || "cliente"}! Seu pedido foi confirmado e já vou começar a preparar.`
    );
  };

  window.mlCancelNewOrder = async id => {
    if (!confirm("Cancelar este pedido?")) return;

    const order = state.orders.find(x => String(x.id) === String(id));
    if (!order) return;

    const result = await db
      .from("pedidos")
      .update({ observacoes: mlSetStatus(order.observacoes, "cancelado") })
      .eq("id", order.id);

    if (result.error) {
      alert("Não foi possível cancelar o pedido:\n\n" + result.error.message);
      return;
    }

    await loadOrdersDirect();
  };

  window.mlMoveOrder = async (id, status) => {
    const order = state.orders.find(x => String(x.id) === String(id));
    if (!order) return;

    const result = await db
      .from("pedidos")
      .update({ observacoes: mlSetStatus(order.observacoes, status) })
      .eq("id", order.id);

    if (result.error) {
      alert("Não foi possível atualizar o pedido:\n\n" + result.error.message);
      return;
    }

    await loadOrdersDirect();

    if (status === "entrega" && order.telefone) {
      openWA(
        order,
        `Olá, ${order.Cliente || "cliente"}! Seu pedido saiu para entrega e está a caminho.`
      );
    }
  };

  window.finishOrder = async function() {
    if (!state.cart.length) {
      alert("Adicione pelo menos um produto.");
      return;
    }

    const nome = $("cliente").value.trim();

    if (!nome) {
      alert("Informe o nome do cliente.");
      return;
    }

    const phone = $("telefone").value.trim();
    const addr = $("endereco").value.trim();
    const ref = $("referencia").value.trim();
    const obs = $("observacoes").value.trim();
    const fee = Number($("taxaEntrega").value || 0);

    const items = state.cart.map(item => ({
      nome: item.nome,
      quantidade: item.quantidade,
      preco: item.preco,
      adicionais: item.adicionais,
      obs: item.obs
    }));

    const total =
      state.cart.reduce(
        (sum, item) => sum + item.preco * item.quantidade,
        0
      ) + fee;

    const finalObs =
      packItems(items, obs) +
      `\n[ML_ENTREGA]${fee}[/ML_ENTREGA]` +
      `\n[ML_STATUS]novo[/ML_STATUS]`;

    const result = await db
      .from("pedidos")
      .insert({
        Cliente: nome,
        telefone: phone,
        endereco: addr,
        referencia: ref,
        observacoes: finalObs,
        total: total
      })
      .select()
      .single();

    if (result.error) {
      alert("Erro ao salvar o pedido:\n\n" + result.error.message);
      return;
    }

    if (phone && !state.clients.some(c => c.telefone === phone)) {
      await db
        .from("clientes")
        .upsert(
          {
            nome,
            telefone: phone,
            endereco: addr,
            referencia: ref
          },
          { onConflict: "telefone" }
        );
    }

    state.cart = [];
    closeCart();

    ["cliente", "telefone", "endereco", "referencia", "observacoes"].forEach(id => {
      if ($(id)) $(id).value = "";
    });

    $("taxaEntrega").value = 0;

    await loadOrdersDirect();

    if (typeof go === "function") go("comandas");
  };

  build();

  setTimeout(loadOrdersDirect, 300);

  setInterval(loadOrdersDirect, 5000);

  try {
    db
      .channel("miguel-lanches-pedidos")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos"
        },
        () => loadOrdersDirect()
      )
      .subscribe();
  } catch (error) {
    console.error("Realtime não pôde ser iniciado:", error);
  }

  setTimeout(() => {
    if (Array.isArray(state.orders)) renderOrders();
  }, 1000);

})();
