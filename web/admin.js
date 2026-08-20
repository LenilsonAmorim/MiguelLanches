/* MIGUEL LANCHES — ADMIN LIMPO
   Painel único: login, pedidos, cardápio, categorias, clientes,
   destaques, relatórios, impressão 58 mm e configurações.
   Sem scripts auxiliares duplicados.
*/
(() => {
  "use strict";

  const cfg = window.ML_CONFIG || {};
  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_KEY) {
    console.error("ML_CONFIG/Supabase não configurado.");
    return;
  }

  const db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
  const $ = id => document.getElementById(id);
  const money = v => Number(v || 0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
  const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

  let orders = [];
  let products = [];
  let cats = [];
  let clients = [];
  let channel = null;
  let audioCtx = null;
  let audioArmed = false;

  window.db = db;
  window.orders = orders;
  window.products = products;
  window.cats = cats;
  window.clients = clients;
  window.money = money;
  window.esc = esc;

  function toast(text) {
    const el = $("toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(window._mlToast);
    window._mlToast = setTimeout(() => el.classList.remove("show"), 2400);
  }
  window.toast = toast;

  function statusOf(v) {
    const m = String(v || "").match(/\[ML_STATUS\](novo|preparo|entrega|entregue|cancelado)\[\/ML_STATUS\]/);
    return m?.[1] || "novo";
  }
  function statusLabel(s) {
    return ({
      novo:"Novo",
      preparo:"Preparando",
      entrega:"Saiu para entrega",
      entregue:"Entregue",
      cancelado:"Cancelado"
    })[s] || s;
  }
  function itemsOf(v) {
    const m = String(v || "").match(/\[ML_ITENS\]([\s\S]*?)\[\/ML_ITENS\]/);
    if (!m) return [];
    try { return JSON.parse(decodeURIComponent(m[1])); } catch { return []; }
  }

  function syncGlobals() {
    window.orders = orders;
    window.products = products;
    window.cats = cats;
    window.clients = clients;
  }

  function armAudio() {
    if (audioArmed) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      audioArmed = true;
    } catch (_) {}
  }
  function beep() {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === "suspended") audioCtx.resume();
      const now = audioCtx.currentTime;
      [0, .16, .32].forEach((d, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = "sine";
        o.frequency.value = i === 1 ? 880 : 660;
        g.gain.setValueAtTime(0, now + d);
        g.gain.linearRampToValueAtTime(.16, now + d + .02);
        g.gain.exponentialRampToValueAtTime(.001, now + d + .12);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(now + d); o.stop(now + d + .13);
      });
    } catch (_) {}
  }

  async function isAdmin() {
    const s = await db.auth.getSession();
    if (!s.data?.session) return false;
    const r = await db.rpc("is_admin");
    return !r.error && r.data === true;
  }

  async function login() {
    const u = $("user")?.value.trim().toLowerCase();
    const p = $("pass")?.value || "";
    if (!u || !p) {
      $("msg").textContent = "Preencha usuário e senha.";
      return;
    }

    const e = await db.rpc("get_admin_login_email", {p_username:u});
    if (e.error || !e.data) {
      $("msg").textContent = "Usuário ou senha inválidos.";
      return;
    }

    const r = await db.auth.signInWithPassword({email:e.data, password:p});
    if (r.error || !(await isAdmin())) {
      await db.auth.signOut();
      $("msg").textContent = "Usuário ou senha inválidos.";
      return;
    }

    start();
  }
  window.login = login;

  function start() {
    $("login")?.classList.add("hidden");
    $("app")?.classList.remove("hidden");
    armAudio();
    setupRealtime();
    load();
  }

  async function logout() {
    if (channel) {
      await db.removeChannel(channel);
      channel = null;
    }
    await db.auth.signOut();
    $("app")?.classList.add("hidden");
    $("login")?.classList.remove("hidden");
    if ($("pass")) $("pass").value = "";
  }

  function setupRealtime() {
    if (channel) db.removeChannel(channel);

    channel = db.channel("miguel-lanches-admin-clean")
      .on("postgres_changes", {event:"INSERT", schema:"public", table:"pedidos"}, () => {
        beep();
        load();
      })
      .on("postgres_changes", {event:"UPDATE", schema:"public", table:"pedidos"}, () => load())
      .on("postgres_changes", {event:"DELETE", schema:"public", table:"pedidos"}, () => load())
      .on("postgres_changes", {event:"*", schema:"public", table:"produtos"}, () => load())
      .on("postgres_changes", {event:"*", schema:"public", table:"categorias"}, () => load())
      .subscribe(s => {
        const el = $("connection");
        if (!el) return;
        el.textContent = s === "SUBSCRIBED" ? "● Online" : "Reconectando...";
        el.style.color = s === "SUBSCRIBED" ? "#198754" : "#d19a00";
      });
  }

  async function load() {
    try {
      const [o,p,c,cl] = await Promise.all([
        db.from("pedidos").select("*").order("created_at",{ascending:false}).limit(500),
        db.from("produtos").select("*,categorias(nome,emoji)").order("ordem"),
        db.from("categorias").select("*").order("ordem"),
        db.from("clientes").select("*").order("nome")
      ]);

      if (o.error) {
        toast("Erro nos pedidos: " + o.error.message);
        return;
      }

      orders = o.data || [];
      products = p.data || [];
      cats = c.data || [];
      clients = cl.data || [];
      syncGlobals();
      render();
    } catch (e) {
      console.error(e);
      toast("Não foi possível atualizar o painel.");
    }
  }
  window.load = load;

  function render() {
    renderOrders();
    renderDashboard();
    renderProducts();
    renderCats();
    renderClients();
    renderPromos();
    renderReports();
    renderConfig();
  }

  function renderOrders() {
    const groups = [
      ["novo","Novos"],
      ["preparo","Preparando"],
      ["entrega","Saiu para entrega"],
      ["entregue","Entregues"],
      ["cancelado","Cancelados"]
    ];

    const board = $("orders");
    if (!board) return;

    board.innerHTML = groups.map(([s,title]) => {
      const arr = orders.filter(o => statusOf(o.observacoes) === s);
      return `<div class="column" data-status="${s}">
        <h2>${title}<small>${arr.length}</small></h2>
        ${arr.map(orderCard).join("") || "<p class='muted'>Nenhum pedido.</p>"}
      </div>`;
    }).join("");

    $("badge").textContent = orders.filter(o => statusOf(o.observacoes) === "novo").length;
    renderStatusTabs();
    bindOrderButtons();
  }
  window.renderOrders = renderOrders;

  function renderStatusTabs() {
    const tabs = $("statusTabs");
    if (!tabs) return;

    const groups = [
      ["novo","Novos"],["preparo","Preparando"],["entrega","Saiu para entrega"],
      ["entregue","Entregues"],["cancelado","Cancelados"]
    ];

    tabs.innerHTML = groups.map(([s,t],i) => {
      const count = orders.filter(o => statusOf(o.observacoes) === s).length;
      return `<button type="button" class="status-tab ${i===0?"active":""}" data-status-tab="${s}">
        ${t}<small>${count}</small>
      </button>`;
    }).join("");

    tabs.querySelectorAll("[data-status-tab]").forEach(btn => {
      btn.onclick = () => {
        tabs.querySelectorAll(".status-tab").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        document.querySelector(`.column[data-status="${btn.dataset.statusTab}"]`)
          ?.scrollIntoView({behavior:"smooth", block:"nearest", inline:"center"});
      };
    });
  }

  function orderCard(o) {
    const s = statusOf(o.observacoes);
    const items = itemsOf(o.observacoes);
    const cliente = o.cliente || o.Cliente || "Cliente";
    const endereco = o.endereco || "Retirada";

    return `<article class="order ${s==="novo"?"new":""}" draggable="true" data-order-id="${esc(o.id)}">
      <h3>Pedido #${esc(String(o.id).slice(-5))}</h3>
      <small>${o.created_at ? new Date(o.created_at).toLocaleString("pt-BR") : ""}</small>
      <p><b>${esc(cliente)}</b><br>${esc(o.telefone || "")}</p>
      <div class="items">${items.length
        ? items.map(i => `${esc(i.quantidade)}x ${esc(i.nome)} — ${money(Number(i.preco||0)*Number(i.quantidade||1))}`).join("<br>")
        : "Itens do pedido"}</div>
      <small>${esc(endereco)}${o.referencia ? "<br>Ref.: "+esc(o.referencia) : ""}</small>
      <div class="ototal"><b>Total</b><b>${money(o.total)}</b></div>
      <div class="actions">
        <button class="black" type="button" data-print="${esc(o.id)}">Imprimir</button>
        ${s==="novo" ? `<button class="primary" type="button" data-next="${esc(o.id)}" data-status="preparo">Preparar</button>
                         <button class="red" type="button" data-next="${esc(o.id)}" data-status="cancelado">Cancelar</button>` : ""}
        ${s==="preparo" ? `<button class="blue" type="button" data-next="${esc(o.id)}" data-status="entrega">Saiu para entrega</button>` : ""}
        ${s==="entrega" ? `<button class="green" type="button" data-next="${esc(o.id)}" data-status="entregue">Entregue</button>` : ""}
      </div>
    </article>`;
  }

  function bindOrderButtons() {
    document.querySelectorAll("[data-next]").forEach(btn => {
      btn.onclick = () => moveOrder(btn.dataset.next, btn.dataset.status);
    });

    document.querySelectorAll("[data-print]").forEach(btn => {
      btn.onclick = () => printOrder(orders.find(o => String(o.id) === String(btn.dataset.print)));
    });

    document.querySelectorAll(".order").forEach(card => {
      card.addEventListener("dragstart", e => {
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", card.dataset.orderId);
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
    });

    document.querySelectorAll(".column").forEach(col => {
      col.addEventListener("dragover", e => {
        e.preventDefault();
        col.classList.add("drop-ready");
      });
      col.addEventListener("dragleave", e => {
        if (!col.contains(e.relatedTarget)) col.classList.remove("drop-ready");
      });
      col.addEventListener("drop", e => {
        e.preventDefault();
        col.classList.remove("drop-ready");
        const id = e.dataTransfer.getData("text/plain");
        if (id) moveOrder(id, col.dataset.status);
      });
    });
  }

  async function moveOrder(id,status) {
    const o = orders.find(x => String(x.id) === String(id));
    if (!o) return;
    if (status === "cancelado" && !confirm("Cancelar este pedido?")) return;

    const clean = String(o.observacoes || "")
      .replace(/\n?\[ML_STATUS\].*?\[\/ML_STATUS\]/, "");
    const obs = clean + `\n[ML_STATUS]${status}[/ML_STATUS]`;

    const r = await db.from("pedidos").update({observacoes:obs}).eq("id",o.id);
    if (r.error) toast(r.error.message);
    else {
      toast("Pedido atualizado: " + statusLabel(status));
      await load();
    }
  }

  function renderDashboard() {
    const active = orders.filter(o => statusOf(o.observacoes) !== "cancelado");
    const sum = active.reduce((a,o) => a + Number(o.total||0), 0);

    $("stats").innerHTML = [
      ["Pedidos",active.length],
      ["Faturamento",money(sum)],
      ["Novos",orders.filter(o => statusOf(o.observacoes)==="novo").length],
      ["Preparando",orders.filter(o => statusOf(o.observacoes)==="preparo").length]
    ].map(([a,b]) => `<div class="stat"><small>${a}</small><b>${b}</b></div>`).join("");

    $("recent").innerHTML = orders.slice(0,10).map(o =>
      `<div class="mini-product"><span>#${esc(String(o.id).slice(-5))} — ${esc(o.cliente||o.Cliente||"Cliente")}
      <small class="muted"> ${statusLabel(statusOf(o.observacoes))}</small></span><b>${money(o.total)}</b></div>`
    ).join("") || "<p class='muted'>Nenhum pedido.</p>";

    $("featuredProducts").innerHTML = products.filter(p => p.destaque).map(p =>
      `<div class="mini-product"><span>${esc(p.nome)}</span><b>${money(p.preco)}</b></div>`
    ).join("") || "<p class='muted'>Nenhum produto em destaque.</p>";
  }

  function renderProducts() {
    const tbody = $("products");
    if (!tbody) return;
    const q = ($("ps")?.value || "").toLowerCase();

    tbody.innerHTML = products
      .filter(p => String(p.nome||"").toLowerCase().includes(q))
      .map(p => `<tr>
        <td><b>${esc(p.nome)}</b></td>
        <td>${esc(p.categorias?.nome || "Sem categoria")}</td>
        <td>${money(p.preco)}</td>
        <td><button class="table-btn ${p.ativo===false?"soldout":""}" data-active="${esc(p.id)}">${p.ativo===false?"Esgotado":"Disponível"}</button></td>
        <td><button class="table-btn" data-feature="${esc(p.id)}">${p.destaque?"★ Destaque":"☆ Destacar"}</button></td>
        <td>
          <button class="table-btn" data-edit="${esc(p.id)}">Editar</button>
          <button class="table-btn" data-options="${esc(p.id)}">Opções</button>
          <button class="table-btn danger-text" data-delete="${esc(p.id)}">Excluir</button>
        </td>
      </tr>`).join("") || `<tr><td colspan="6">Nenhum produto encontrado.</td></tr>`;

    tbody.querySelectorAll("[data-active]").forEach(b => b.onclick = async () => {
      const p = products.find(x => String(x.id) === String(b.dataset.active));
      if (!p) return;
      const r = await db.from("produtos").update({ativo:p.ativo===false}).eq("id",p.id);
      if (r.error) toast(r.error.message);
      else { toast(p.ativo===false ? "Produto disponível." : "Produto esgotado."); load(); }
    });

    tbody.querySelectorAll("[data-feature]").forEach(b => b.onclick = async () => {
      const p = products.find(x => String(x.id) === String(b.dataset.feature));
      if (!p) return;
      const r = await db.from("produtos").update({destaque:!p.destaque}).eq("id",p.id);
      if (r.error) toast(r.error.message); else load();
    });

    tbody.querySelectorAll("[data-edit]").forEach(b => b.onclick = () =>
      productModal(products.find(x => String(x.id) === String(b.dataset.edit)))
    );

    tbody.querySelectorAll("[data-options]").forEach(b => b.onclick = () =>
      openProductOptions(products.find(x => String(x.id) === String(b.dataset.options)))
    );

    tbody.querySelectorAll("[data-delete]").forEach(b => b.onclick = async () => {
      const p = products.find(x => String(x.id) === String(b.dataset.delete));
      if (!p || !confirm(`Excluir "${p.nome}" definitivamente?`)) return;
      const r = await db.from("produtos").delete().eq("id",p.id);
      if (r.error) toast("Não foi possível excluir: " + r.error.message);
      else { toast("Produto excluído."); load(); }
    });
  }
  window.renderProducts = renderProducts;

  function renderCats() {
    const host = $("cats");
    if (!host) return;

    host.innerHTML = cats.map(c => `<div class="cat-admin">
      <span class="emoji">${esc(c.emoji||"📦")}</span>
      <div><strong>${esc(c.nome)}</strong><small>Ordem ${esc(c.ordem||0)} · ${c.ativo===false?"Inativa":"Ativa"}</small></div>
      <div class="cat-actions">
        <button class="table-btn" data-cat-edit="${esc(c.id)}">Editar</button>
        <button class="table-btn" data-cat-toggle="${esc(c.id)}">${c.ativo===false?"Ativar":"Desativar"}</button>
      </div>
    </div>`).join("") || "<p>Nenhuma categoria.</p>";

    host.querySelectorAll("[data-cat-edit]").forEach(b => b.onclick = () =>
      catModal(cats.find(c => String(c.id) === String(b.dataset.catEdit)))
    );
    host.querySelectorAll("[data-cat-toggle]").forEach(b => b.onclick = async () => {
      const c = cats.find(x => String(x.id) === String(b.dataset.catToggle));
      if (!c) return;
      const r = await db.from("categorias").update({ativo:c.ativo===false}).eq("id",c.id);
      if (r.error) toast(r.error.message); else load();
    });
  }

  function renderClients() {
    const host = $("clients");
    if (!host) return;
    const q = ($("cs")?.value || "").toLowerCase();

    host.innerHTML = clients
      .filter(c => String(c.nome||"").toLowerCase().includes(q) || String(c.telefone||"").includes(q))
      .map(c => {
        const os = orders.filter(o => (o.telefone||"") === c.telefone);
        return `<tr><td><b>${esc(c.nome)}</b></td><td>${esc(c.telefone||"")}</td><td>${os.length}</td>
          <td>${money(os.reduce((a,o)=>a+Number(o.total||0),0))}</td></tr>`;
      }).join("") || "<tr><td colspan='4'>Nenhum cliente.</td></tr>";
  }

  function renderPromos() {
    const host = $("featuredProductsPromo");
    if (!host) return;
    host.innerHTML = products.filter(p => p.destaque).map(p =>
      `<div class="mini-product"><span>${esc(p.nome)}</span><b>${money(p.preco)}</b></div>`
    ).join("") || "<p class='muted'>Nenhum produto em destaque.</p>";
  }

  function renderReports() {
    const active = orders.filter(o => statusOf(o.observacoes) !== "cancelado");
    const sum = active.reduce((a,o)=>a+Number(o.total||0),0);
    $("reports").innerHTML = [
      ["Faturamento",money(sum)],
      ["Pedidos",active.length],
      ["Ticket médio",money(active.length ? sum/active.length : 0)],
      ["Cancelados",orders.filter(o=>statusOf(o.observacoes)==="cancelado").length]
    ].map(([a,b]) => `<div class="stat"><small>${a}</small><b>${b}</b></div>`).join("");
  }

  function renderConfig() {
    const c = JSON.parse(localStorage.getItem("ml_admin_config") || "{}");
    if ($("store")) $("store").value = c.store || "Miguel Lanches";
    if ($("phoneStore")) $("phoneStore").value = c.phone || "";
    if ($("fee")) $("fee").value = c.fee ?? "";
  }

  function openModal(html) {
    if (!$("modal") || !$("body")) return;
    $("body").innerHTML = html;
    $("modal").classList.remove("hidden");
  }
  function closeModal() { $("modal")?.classList.add("hidden"); }
  window.openModal = openModal;
  window.closeModal = closeModal;

  async function productModal(product) {
    const editing = !!product;
    openModal(`<h2>${editing?"Editar produto":"Novo produto"}</h2>
      <div class="modal-form">
        <label>Nome<input id="mName" value="${esc(product?.nome||"")}"></label>
        <label>Descrição<textarea id="mDesc" rows="3">${esc(product?.descricao||"")}</textarea></label>
        <label>Preço<input id="mPrice" type="number" min="0" step="0.01" value="${product?.preco??""}"></label>
        <label>Categoria<select id="mCat">${cats.map(c =>
          `<option value="${esc(c.id)}" ${String(c.id)===String(product?.categoria_id)?"selected":""}>${esc(c.nome)}</option>`
        ).join("")}</select></label>
        <label>Emoji<input id="mEmoji" value="${esc(product?.emoji||"🍔")}"></label>
        <label>Imagem URL<input id="mImg" value="${esc(product?.imagem_url||"")}"></label>
        <label>Ordem<input id="mOrder" type="number" value="${product?.ordem??0}"></label>
        <div class="modal-actions"><button class="btn" id="cancelModal">Cancelar</button>
        <button class="btn primary" id="saveProduct">Salvar</button></div>
      </div>`);

    $("cancelModal").onclick = closeModal;
    $("saveProduct").onclick = async () => {
      const base = {
        nome:$("mName").value.trim(),
        preco:Number($("mPrice").value||0),
        categoria_id:$("mCat").value||null,
        emoji:$("mEmoji").value.trim()||"🍔",
        imagem_url:$("mImg").value.trim()||null,
        ordem:Number($("mOrder").value||0)
      };
      const desc = $("mDesc").value.trim();
      if (!base.nome) return toast("Informe o nome.");
      if (base.preco < 0) return toast("Preço inválido.");

      let r = editing
        ? await db.from("produtos").update({...base,descricao:desc||null}).eq("id",product.id)
        : await db.from("produtos").insert({...base,descricao:desc||null,ativo:true,destaque:false});

      if (r.error && /descricao.*column|schema cache|PGRST204/i.test(r.error.message||"")) {
        r = editing
          ? await db.from("produtos").update(base).eq("id",product.id)
          : await db.from("produtos").insert({...base,ativo:true,destaque:false});
      }

      if (r.error) toast("Erro ao salvar: " + r.error.message);
      else { closeModal(); toast("Produto salvo."); load(); }
    };
  }
  window.productModal = productModal;

  async function openProductOptions(product) {
    if (!product?.id) return;
    const [c,o] = await Promise.all([
      db.from("configuracao_opcoes").select("*").eq("produto_id",product.id).maybeSingle(),
      db.from("opcoes_produto").select("*").eq("produto_id",product.id).order("ordem")
    ]);
    if (o.error) return toast("A tabela de opções não está disponível no Supabase.");

    const cat = String(product.categorias?.nome||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    const inferred = cat.includes("pizza")||cat.includes("pastel") ? "sabor_preco"
      : cat.includes("suco")||cat.includes("milk")||cat.includes("creme")||cat.includes("acai") ? "sabor"
      : "adicional_preco";
    const type = c.data?.tipo || inferred;
    const limit = Math.max(1,Number(c.data?.limite||1));

    openModal(`<div class="options-editor">
      <div class="muted">OPÇÕES DO PRODUTO</div><h2>${esc(product.nome)}</h2>
      <label>Tipo<select id="optType">
        <option value="nenhuma" ${type==="nenhuma"?"selected":""}>Sem opções</option>
        <option value="sabor_preco" ${type==="sabor_preco"?"selected":""}>Sabores + valor</option>
        <option value="adicional_preco" ${type==="adicional_preco"?"selected":""}>Adicionais + valor</option>
        <option value="sabor" ${type==="sabor"?"selected":""}>Sabores sem valor</option>
      </select></label>
      <label>Limite de escolhas<input id="optLimit" type="number" min="1" max="20" value="${limit}"></label>
      <div id="optionRows">${(o.data||[]).map(optionRow).join("")}</div>
      <div class="modal-actions"><button class="btn" id="addOpt">+ Adicionar opção</button>
      <button class="btn primary" id="saveOpts">Salvar opções</button></div>
    </div>`);

    $("addOpt").onclick = () => {
      $("optionRows").insertAdjacentHTML("beforeend",optionRow(null));
      bindOptionDeletes();
    };
    $("saveOpts").onclick = () => saveOptions(product.id);
    bindOptionDeletes();
  }
  window.openProductOptions = openProductOptions;

  function optionRow(o) {
    return `<div class="option-row" data-id="${esc(o?.id||"")}" style="display:grid;grid-template-columns:1fr 130px auto auto;gap:8px;align-items:center;margin:8px 0">
      <input class="oname" placeholder="Nome da opção" value="${esc(o?.nome||"")}">
      <input class="oprice" type="number" min="0" step="0.01" placeholder="Adicional" value="${Number(o?.preco_adicional||0)}">
      <label><input class="oactive" type="checkbox" ${o?.ativo!==false?"checked":""}> Disponível</label>
      <button type="button" class="btn danger delopt">Excluir</button>
    </div>`;
  }
  function bindOptionDeletes() {
    document.querySelectorAll(".delopt").forEach(b => b.onclick = async () => {
      const row = b.closest(".option-row");
      const id = row?.dataset.id;
      if (!row) return;
      if (!id) return row.remove();
      if (!confirm("Excluir esta opção?")) return;
      const r = await db.from("opcoes_produto").delete().eq("id",id);
      if (r.error) toast(r.error.message); else row.remove();
    });
  }

  async function saveOptions(pid) {
    const tipo = $("optType").value;
    const limite = Math.max(1,Math.min(20,Number($("optLimit").value||1)));

    const c = await db.from("configuracao_opcoes").upsert(
      {produto_id:pid,tipo,limite,updated_at:new Date().toISOString()},
      {onConflict:"produto_id"}
    );
    if (c.error) return toast("Erro: " + c.error.message);

    const rows = [...document.querySelectorAll("#optionRows .option-row")];
    for (let i=0;i<rows.length;i++) {
      const row = rows[i];
      const nome = row.querySelector(".oname").value.trim();
      if (!nome) continue;
      const data = {
        produto_id:pid,
        nome,
        preco_adicional:Number(row.querySelector(".oprice").value||0),
        ativo:row.querySelector(".oactive").checked,
        ordem:i
      };
      const id = row.dataset.id;
      const r = id
        ? await db.from("opcoes_produto").update(data).eq("id",id)
        : await db.from("opcoes_produto").insert(data);
      if (r.error) return toast("Erro ao salvar opção: " + r.error.message);
    }

    toast("Opções salvas.");
    closeModal();
  }

  function catModal(c) {
    const editing = !!c;
    openModal(`<h2>${editing?"Editar categoria":"Nova categoria"}</h2>
      <div class="modal-form">
        <label>Nome<input id="mcName" value="${esc(c?.nome||"")}"></label>
        <label>Emoji<input id="mcEmoji" value="${esc(c?.emoji||"📦")}"></label>
        <label>Ordem<input id="mcOrder" type="number" value="${c?.ordem??0}"></label>
        <div class="modal-actions"><button class="btn" id="mcCancel">Cancelar</button>
        <button class="btn primary" id="mcSave">Salvar</button></div>
      </div>`);

    $("mcCancel").onclick = closeModal;
    $("mcSave").onclick = async () => {
      const data = {
        nome:$("mcName").value.trim(),
        emoji:$("mcEmoji").value.trim()||"📦",
        ordem:Number($("mcOrder").value||0)
      };
      if (!data.nome) return toast("Informe o nome.");
      const r = editing
        ? await db.from("categorias").update(data).eq("id",c.id)
        : await db.from("categorias").insert({...data,ativo:true});
      if (r.error) toast("Erro: " + r.error.message);
      else { closeModal(); toast("Categoria salva."); load(); }
    };
  }

  function printOrder(o) {
    if (!o) return toast("Pedido não encontrado.");
    const items = itemsOf(o.observacoes);
    const feeMatch = String(o.observacoes||"").match(/\[ML_ENTREGA\]([\s\S]*?)\[\/ML_ENTREGA\]/);
    const fee = Number(feeMatch?.[1] || 0);

    const lines = items.length
      ? items.map(i => `<div class="item"><span>${esc(i.quantidade)}x ${esc(i.nome)}</span><b>${money(Number(i.preco||0)*Number(i.quantidade||1))}</b></div>`).join("")
      : `<div class="item"><span>Itens do pedido</span><b>${money(o.total)}</b></div>`;

    const total = Number(o.total||0);
    const win = window.open("", "_blank", "width=380,height=700");
    if (!win) return toast("Permita pop-ups para imprimir.");

    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${esc(String(o.id).slice(-5))}</title>
      <style>
        @page{size:58mm auto;margin:0}
        *{box-sizing:border-box}
        body{width:58mm;margin:0;padding:4mm 3mm;font:12px/1.35 Arial,sans-serif;color:#000}
        h1{font-size:15px;text-align:center;margin:0 0 6px}
        .center{text-align:center}.line{border-top:1px dashed #000;margin:6px 0}
        .item{display:flex;justify-content:space-between;gap:5px;margin:5px 0}
        .item span{max-width:70%}.item b{white-space:nowrap}
        .total{display:flex;justify-content:space-between;font-size:14px;font-weight:900;margin-top:7px}
        .muted{font-size:10px}
        @media print{button{display:none}}
      </style></head><body>
      <h1>MIGUEL LANCHES</h1>
      <div class="center">PEDIDO #${esc(String(o.id).slice(-5))}</div>
      <div class="muted">${o.created_at?new Date(o.created_at).toLocaleString("pt-BR"):""}</div>
      <div class="line"></div>
      <b>CLIENTE:</b> ${esc(o.cliente||"Cliente")}<br>
      <b>TELEFONE:</b> ${esc(o.telefone||"")}<br>
      <b>ENDEREÇO:</b> ${esc(o.endereco||"Retirada")}<br>
      ${o.referencia?`<b>REF:</b> ${esc(o.referencia)}<br>`:""}
      <div class="line"></div>${lines}
      ${fee?`<div class="item"><span>Taxa de entrega</span><b>${money(fee)}</b></div>`:""}
      <div class="line"></div>
      <div class="total"><span>TOTAL</span><span>${money(total)}</span></div>
      <div class="line"></div>
      <b>OBSERVAÇÕES:</b><br>
      ${esc(String(o.observacoes||"").replace(/\[[A-Z_]+\][\s\S]*?\[\/[A-Z_]+\]/g,"").trim() || "—")}
      <div class="line"></div><div class="center"><b>Obrigado!</b></div>
      <script>window.onload=()=>setTimeout(()=>window.print(),200)<\/script>
      </body></html>`);
    win.document.close();
  }
  window.printOrder = printOrder;

  function exportCSV() {
    const head = ["Pedido","Data","Cliente","Telefone","Endereço","Total","Status"];
    const rows = orders.map(o => [
      String(o.id).slice(-5),
      o.created_at ? new Date(o.created_at).toLocaleString("pt-BR") : "",
      o.cliente || "",
      o.telefone || "",
      o.endereco || "",
      Number(o.total||0).toFixed(2).replace(".",","),
      statusLabel(statusOf(o.observacoes))
    ]);
    const csv = [head,...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "miguel-lanches-pedidos.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function saveConfig() {
    const c = {
      store:$("store")?.value.trim() || "Miguel Lanches",
      phone:$("phoneStore")?.value.trim() || "",
      fee:Number($("fee")?.value || 0)
    };
    localStorage.setItem("ml_admin_config",JSON.stringify(c));
    window.DELIVERY_FEE = c.fee;
    toast("Configurações salvas.");
  }

  function setupNavigation() {
    const map = {
      dashboard:"Dashboard",pedidos:"Pedidos",cardapio:"Cardápio",categorias:"Categorias",
      clientes:"Clientes",promocoes:"Promoções",relatorios:"Relatórios",
      impressoras:"Impressoras",config:"Configurações"
    };

    document.querySelectorAll(".nav-btn").forEach(btn => btn.onclick = () => {
      const page = btn.dataset.page;
      document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));
      document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      $(`page-${page}`)?.classList.add("active");
      $("title").textContent = map[page] || "Painel";
      $("side")?.classList.remove("open");
    });
  }

  function setup() {
    setupNavigation();

    $("loginBtn")?.addEventListener("click",login);
    $("pass")?.addEventListener("keydown",e=>{if(e.key==="Enter")login()});
    $("user")?.addEventListener("keydown",e=>{if(e.key==="Enter")$("pass")?.focus()});
    $("logout")?.addEventListener("click",logout);
    $("refresh")?.addEventListener("click",load);
    $("menu")?.addEventListener("click",()=>$("side")?.classList.toggle("open"));
    $("close")?.addEventListener("click",closeModal);
    $("newProduct")?.addEventListener("click",()=>productModal(null));
    $("newCat")?.addEventListener("click",()=>catModal(null));
    $("ps")?.addEventListener("input",renderProducts);
    $("cs")?.addEventListener("input",renderClients);
    $("csv")?.addEventListener("click",exportCSV);
    $("save")?.addEventListener("click",saveConfig);
    $("test")?.addEventListener("click",()=>printOrder({
      id:"00001",created_at:new Date().toISOString(),cliente:"Teste",telefone:"",
      endereco:"Impressão de teste",total:10,observacoes:"[ML_ITENS]"+encodeURIComponent(JSON.stringify([
        {nome:"Produto de teste",quantidade:1,preco:10}
      ]))+"[/ML_ITENS]"
    }));

    ["click","touchstart","keydown"].forEach(ev=>window.addEventListener(ev,armAudio,{once:true,passive:true}));

    db.auth.getSession().then(async s => {
      if (s.data?.session && await isAdmin()) start();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",setup);
  else setup();

  // Recuperação silenciosa caso o Realtime fique indisponível.
  setInterval(() => {
    if (!$("app")?.classList.contains("hidden") && !document.hidden) load();
  }, 10000);

  // Estilos pequenos que pertencem ao comportamento do admin limpo.
  const style = document.createElement("style");
  style.textContent = `
    .status-tabs{display:flex;gap:8px;overflow:auto;padding:4px 0 12px}
    .status-tab{border:1px solid #ddd;background:#fff;border-radius:10px;padding:9px 12px;font-weight:800;white-space:nowrap;cursor:pointer}
    .status-tab.active{background:#111;color:#fff}
    .status-tab small{margin-left:6px;opacity:.7}
    .order.dragging{opacity:.55}
    .column.drop-ready{outline:2px dashed #999;outline-offset:4px}
    .danger-text{color:#c62828!important}
    .soldout{color:#c62828!important;border-color:#efb2b2!important;background:#fff4f4!important}
    .options-editor{display:grid;gap:12px}
    .options-editor label{display:grid;gap:5px;font-weight:800;font-size:13px}
    .options-editor input,.options-editor select{padding:10px;border:1px solid #ddd;border-radius:10px}
    .option-row{border:1px solid #eee;border-radius:10px;padding:8px}
    @media(max-width:650px){.option-row{grid-template-columns:1fr 1fr!important}.option-row label{grid-column:1}.option-row button{grid-column:2}}
  `;
  document.head.appendChild(style);
})();
