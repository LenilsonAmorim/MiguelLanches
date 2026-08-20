/* Miguel Lanches — correções definitivas do Admin
   - Corrige criação/edição de produtos quando a coluna descricao não existe.
   - Faz "Opções" funcionar diretamente em cada produto.
   - Ao criar um produto, abre automaticamente o configurador de opções.
   - Permite escolher tipo, limite, nome, preço adicional e status.
   - Mantém o fluxo do quadro de pedidos com arrastar/soltar.
*/
(() => {
  "use strict";

  const cfg = window.ML_CONFIG || {};
  const fixDb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
  const $f = id => document.getElementById(id);
  const escF = v => String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
  const moneyF = v => Number(v || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  function notify(text){
    if (typeof window.toast === "function") return window.toast(text);
    const el = $f("toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }

  function openModalF(html){
    const body = $f("body"), modal = $f("modal");
    if (!body || !modal) return;
    body.innerHTML = html;
    modal.classList.remove("hidden");
  }
  function closeModalF(){
    const modal = $f("modal");
    if (modal) modal.classList.add("hidden");
  }

  function categoryName(product){
    return String(product?.categorias?.nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  }
  function inferType(product){
    const c = categoryName(product);
    if (c.includes("pizza") || c.includes("pastel")) return "sabor_preco";
    if (c.includes("suco") || c.includes("milk") || c.includes("creme") || c.includes("açaí") || c.includes("acai")) return "sabor";
    return "adicional_preco";
  }

  async function loadOptions(productId){
    const [c,o] = await Promise.all([
      fixDb.from("configuracao_opcoes").select("*").eq("produto_id",productId).maybeSingle(),
      fixDb.from("opcoes_produto").select("*").eq("produto_id",productId).order("ordem")
    ]);
    return {cfg:c.data || null, options:o.data || [], error:c.error || o.error};
  }

  window.openProductOptions = async function(product){
    if (!product?.id) return;

    const r = await loadOptions(product.id);
    if (r.error) {
      notify("Não foi possível carregar as opções. Confira as tabelas no Supabase.");
      return;
    }

    const type = r.cfg?.tipo || inferType(product);
    const limit = Math.max(1, Number(r.cfg?.limite || 1));

    const rows = (r.options || []).map(o => optionRow(o)).join("");

    openModalF(`
      <div class="options-editor">
        <div class="options-head">
          <div>
            <div class="muted">CONFIGURAÇÃO DO PRODUTO</div>
            <h2>Opções — ${escF(product.nome)}</h2>
          </div>
        </div>

        <label>Tipo de opção
          <select id="fixOptType">
            <option value="sabor_preco" ${type==="sabor_preco"?"selected":""}>Sabores + valor</option>
            <option value="adicional_preco" ${type==="adicional_preco"?"selected":""}>Adicionais + valor</option>
            <option value="sabor" ${type==="sabor"?"selected":""}>Sabores sem valor</option>
            <option value="nenhuma" ${type==="nenhuma"?"selected":""}>Sem opções</option>
          </select>
        </label>

        <label>Quantidade máxima de escolhas
          <input id="fixOptLimit" type="number" min="1" max="20" value="${limit}">
        </label>

        <div class="options-help">
          <b>Pizza / Pastel:</b> sabores + valor &nbsp; · &nbsp;
          <b>Lanches / Dogão / Churrasco:</b> adicionais + valor &nbsp; · &nbsp;
          <b>Suco / Milk Shake / Cremes / Açaí:</b> sabores sem valor.
        </div>

        <div id="fixOptionRows" class="option-rows">${rows}</div>

        <div class="modal-actions">
          <button type="button" class="btn" id="fixAddOption">+ Adicionar opção</button>
          <button type="button" class="btn primary" id="fixSaveOptions">Salvar opções</button>
        </div>
      </div>
    `);

    $f("fixAddOption").onclick = () => {
      const box = $f("fixOptionRows");
      box.insertAdjacentHTML("beforeend", optionRow(null));
    };

    $f("fixSaveOptions").onclick = async () => {
      await saveOptions(product.id);
    };

    $f("fixOptionRows").querySelectorAll(".fix-delete-option").forEach(btn => {
      btn.onclick = () => deleteOption(btn);
    });
  };

  function optionRow(o){
    return `
      <div class="fix-option-row" data-id="${escF(o?.id || "")}">
        <input class="fix-opt-name" placeholder="Nome da opção" value="${escF(o?.nome || "")}">
        <input class="fix-opt-price" type="number" min="0" step="0.01"
               placeholder="Valor adicional" value="${Number(o?.preco_adicional || 0)}">
        <label class="fix-opt-active">
          <input class="fix-opt-active-box" type="checkbox" ${o?.ativo !== false ? "checked" : ""}>
          Ativo
        </label>
        <button type="button" class="btn danger fix-delete-option">Excluir</button>
      </div>`;
  }

  async function saveOptions(productId){
    const type = $f("fixOptType").value;
    const limit = Math.max(1, Math.min(20, Number($f("fixOptLimit").value || 1)));
    const rows = [...document.querySelectorAll("#fixOptionRows .fix-option-row")];

    const c = await fixDb.from("configuracao_opcoes").upsert({
      produto_id: productId,
      tipo: type,
      limite: limit,
      updated_at: new Date().toISOString()
    }, {onConflict:"produto_id"});

    if (c.error) {
      notify("Erro ao salvar a configuração: " + c.error.message);
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nome = row.querySelector(".fix-opt-name").value.trim();
      const id = row.dataset.id;
      if (!nome) continue;

      const data = {
        produto_id: productId,
        nome,
        preco_adicional: Number(row.querySelector(".fix-opt-price").value || 0),
        ativo: row.querySelector(".fix-opt-active-box").checked,
        ordem: i
      };

      const result = id
        ? await fixDb.from("opcoes_produto").update(data).eq("id", id)
        : await fixDb.from("opcoes_produto").insert(data);

      if (result.error) {
        notify("Erro ao salvar " + nome + ": " + result.error.message);
        return;
      }
    }

    notify("Opções salvas.");
    closeModalF();
  }

  async function deleteOption(btn){
    const row = btn.closest(".fix-option-row");
    const id = row?.dataset.id;
    if (!row) return;

    if (!id) {
      row.remove();
      return;
    }

    const result = await fixDb.from("opcoes_produto").delete().eq("id", id);
    if (result.error) {
      notify("Não foi possível excluir: " + result.error.message);
      return;
    }
    row.remove();
  }

  function renderProductTable(){
    const tbody = $f("products");
    if (!tbody || !Array.isArray(window.products) && typeof products === "undefined") return;

    const list = typeof products !== "undefined" ? products : [];
    const q = ($f("ps")?.value || "").toLowerCase();

    tbody.innerHTML = list
      .filter(p => String(p.nome || "").toLowerCase().includes(q))
      .map(p => `
        <tr>
          <td><b>${escF(p.nome)}</b></td>
          <td>${escF(p.categorias?.nome || "Sem categoria")}</td>
          <td>${moneyF(p.preco)}</td>
          <td><button class="table-btn fix-active" data-id="${escF(p.id)}">${p.ativo === false ? "Ativar" : "Ativo"}</button></td>
          <td><button class="table-btn fix-feature" data-id="${escF(p.id)}">${p.destaque ? "★ Destaque" : "☆ Destacar"}</button></td>
          <td class="fix-actions">
            <button class="table-btn fix-edit" data-id="${escF(p.id)}">Editar</button>
            <button class="table-btn fix-options" data-id="${escF(p.id)}">Opções</button>
          </td>
        </tr>
      `).join("") || `<tr><td colspan="6">Nenhum produto encontrado.</td></tr>`;

    tbody.querySelectorAll(".fix-active").forEach(btn => {
      btn.onclick = async () => {
        const p = list.find(x => String(x.id) === String(btn.dataset.id));
        if (!p) return;
        const r = await fixDb.from("produtos").update({ativo:p.ativo === false}).eq("id",p.id);
        if (r.error) notify(r.error.message);
        else if (typeof load === "function") load();
      };
    });

    tbody.querySelectorAll(".fix-feature").forEach(btn => {
      btn.onclick = async () => {
        const p = list.find(x => String(x.id) === String(btn.dataset.id));
        if (!p) return;
        const r = await fixDb.from("produtos").update({destaque:!p.destaque}).eq("id",p.id);
        if (r.error) notify(r.error.message);
        else if (typeof load === "function") load();
      };
    });

    tbody.querySelectorAll(".fix-edit").forEach(btn => {
      btn.onclick = () => {
        const p = list.find(x => String(x.id) === String(btn.dataset.id));
        if (p) window.productModal(p);
      };
    });

    tbody.querySelectorAll(".fix-options").forEach(btn => {
      btn.onclick = () => {
        const p = list.find(x => String(x.id) === String(btn.dataset.id));
        if (p) window.openProductOptions(p);
      };
    });
  }

  window.productModal = function(product){
    const editing = !!product;
    const catsLocal = typeof cats !== "undefined" ? cats : [];

    openModalF(`
      <h2>${editing ? "Editar produto" : "Novo produto"}</h2>
      <div class="modal-form">
        <label>Nome
          <input id="fixName" value="${escF(product?.nome || "")}" autocomplete="off">
        </label>

        <label>Descrição
          <textarea id="fixDesc" rows="3" placeholder="Descrição exibida no cardápio">${escF(product?.descricao || "")}</textarea>
          <small class="muted">Se a coluna de descrição não existir no banco, o produto será salvo normalmente sem ela.</small>
        </label>

        <label>Preço
          <input id="fixPrice" type="number" min="0" step="0.01" value="${product?.preco ?? ""}">
        </label>

        <label>Categoria
          <select id="fixCat">
            ${catsLocal.map(c => `<option value="${escF(c.id)}" ${String(c.id)===String(product?.categoria_id)?"selected":""}>${escF(c.nome)}</option>`).join("")}
          </select>
        </label>

        <label>Emoji
          <input id="fixEmoji" value="${escF(product?.emoji || "🍔")}">
        </label>

        <label>Imagem URL
          <input id="fixImg" value="${escF(product?.imagem_url || "")}">
        </label>

        <label>Ordem
          <input id="fixOrder" type="number" value="${product?.ordem ?? 0}">
        </label>

        <div class="modal-actions">
          <button class="btn" id="fixCancel" type="button">Cancelar</button>
          <button class="btn primary" id="fixSave" type="button">Salvar e configurar opções</button>
        </div>
      </div>
    `);

    $f("fixCancel").onclick = closeModalF;

    $f("fixSave").onclick = async () => {
      const base = {
        nome: $f("fixName").value.trim(),
        preco: Number($f("fixPrice").value || 0),
        categoria_id: $f("fixCat").value || null,
        emoji: $f("fixEmoji").value.trim() || "🍔",
        imagem_url: $f("fixImg").value.trim() || null,
        ordem: Number($f("fixOrder").value || 0)
      };
      const desc = $f("fixDesc").value.trim();

      if (!base.nome) return notify("Informe o nome do produto.");
      if (base.preco < 0) return notify("O preço não pode ser negativo.");

      let result;
      let saved;

      const withDescription = {...base, descricao: desc || null};

      if (editing) {
        result = await fixDb.from("produtos").update(withDescription).eq("id", product.id).select("*").single();
        if (result.error && /descricao.*column|schema cache|PGRST204/i.test(result.error.message || "")) {
          result = await fixDb.from("produtos").update(base).eq("id", product.id).select("*").single();
        }
      } else {
        result = await fixDb.from("produtos").insert({...withDescription, ativo:true, destaque:false}).select("*").single();
        if (result.error && /descricao.*column|schema cache|PGRST204/i.test(result.error.message || "")) {
          result = await fixDb.from("produtos").insert({...base, ativo:true, destaque:false}).select("*").single();
        }
      }

      if (result.error) {
        notify("Não foi possível salvar: " + result.error.message);
        return;
      }

      saved = result.data || {...base, id:product?.id};

      closeModalF();
      if (typeof load === "function") await load();

      setTimeout(() => window.openProductOptions(saved), 120);
    };
  };

  // Ensure the table uses the fixed actions after every Admin refresh.
  const oldRender = window.renderProducts;
  window.renderProducts = function(){
    if (typeof oldRender === "function") {
      try { oldRender(); } catch (_) {}
    }
    setTimeout(renderProductTable, 0);
  };

  // If admin.js invokes renderProducts directly after this script is loaded.
  setTimeout(renderProductTable, 100);

  // Add keyboard-friendly / visual styles without changing admin.css.
  const style = document.createElement("style");
  style.textContent = `
    .fix-actions{display:flex;gap:6px;flex-wrap:wrap}
    .options-editor{display:grid;gap:14px}
    .options-editor h2{margin:0}
    .options-editor label{display:grid;gap:6px;font-weight:900;font-size:13px}
    .options-editor input,.options-editor select{border:1px solid #ddd;border-radius:10px;padding:12px;background:#fff;outline:none}
    .options-help{background:#f7f7f7;border:1px solid #e7e7e7;border-radius:10px;padding:12px;font-size:12px;line-height:1.5;color:#555}
    .option-rows{display:grid;gap:8px}
    .fix-option-row{display:grid;grid-template-columns:minmax(0,1fr) 150px auto auto;gap:7px;align-items:center;border:1px solid #eee;border-radius:10px;padding:8px}
    .fix-option-row input{min-width:0}
    .fix-opt-active{display:flex!important;align-items:center;gap:5px!important;white-space:nowrap}
    @media(max-width:650px){
      .fix-option-row{grid-template-columns:1fr 1fr}
      .fix-option-row .fix-opt-active{grid-column:1}
      .fix-option-row .fix-delete-option{grid-column:2}
      .fix-actions .table-btn{flex:1}
    }
  `;
  document.head.appendChild(style);

  // Keep the order board usable by touch/mouse; status is persisted in Supabase.
  const names = {novo:"Novos pedidos",preparo:"Preparando",entrega:"Rota de entrega",entregue:"Entregues",cancelado:"Cancelados"};

  async function moveOrderFix(id,target){
    const all = typeof orders !== "undefined" ? orders : [];
    const order = all.find(x => String(x.id) === String(id));
    if (!order) return;

    if (target === "cancelado" && !confirm("Cancelar este pedido?")) return;

    const clean = String(order.observacoes || "").replace(/\n?\[ML_STATUS\].*?\[\/ML_STATUS\]/,"");
    const obs = clean + `\n[ML_STATUS]${target}[/ML_STATUS]`;
    const r = await fixDb.from("pedidos").update({observacoes:obs}).eq("id",order.id);

    if (r.error) notify(r.error.message);
    else {
      notify("Pedido movido para " + names[target]);
      if (typeof load === "function") load();
    }
  }

  function installOrderDrag(){
    const board=$f("orders");
    if(!board || typeof orders==="undefined" || typeof statusOf!=="function") return;

    const statuses=["novo","preparo","entrega","entregue","cancelado"];
    board.querySelectorAll(".column").forEach((col,i)=>{
      const status=statuses[i];
      if(!status) return;

      col.dataset.status=status;
      col.classList.add("fix-drop-column");

      col.ondragover=e=>{e.preventDefault();col.classList.add("fix-drag-over");};
      col.ondragleave=()=>col.classList.remove("fix-drag-over");
      col.ondrop=async e=>{
        e.preventDefault();
        col.classList.remove("fix-drag-over");
        const id=e.dataTransfer?.getData("text/plain");
        if(id) await moveOrderFix(id,status);
      };
    });

    board.querySelectorAll(".order").forEach(card=>{
      const print=card.querySelector("[data-print]");
      const next=card.querySelector("[data-next]");
      const id=next?.dataset.next || print?.dataset.print;
      if(!id) return;

      card.draggable=true;
      card.classList.add("fix-draggable");

      card.ondragstart=e=>{
        e.dataTransfer.setData("text/plain",String(id));
        card.classList.add("fix-dragging");
      };
      card.ondragend=()=>card.classList.remove("fix-dragging");
    });
  }

  const oldOrders = window.renderOrders;
  if(typeof oldOrders === "function"){
    window.renderOrders = function(){
      oldOrders();
      setTimeout(installOrderDrag,0);
    };
  }
  setTimeout(installOrderDrag,100);

  const dragStyle=document.createElement("style");
  dragStyle.textContent=`
    .fix-drop-column{transition:.15s;border:2px solid transparent}
    .fix-drop-column.fix-drag-over{border-color:#f4bd17;background:#fff7cf}
    .fix-draggable{cursor:grab}
    .fix-draggable.fix-dragging{opacity:.45;transform:scale(.99)}
  `;
  document.head.appendChild(dragStyle);
})();