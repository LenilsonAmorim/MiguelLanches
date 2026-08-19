/* Miguel Lanches — Açaí configurável
   Corrige a ligação entre acai_config e o produto Açaí no cliente.
*/
(() => {
  const ACENTOS = /[\u0300-\u036f]/g;
  const norm = s => String(s || "").normalize("NFD").replace(ACENTOS, "").toLowerCase().trim();
  const money = v => Number(v || 0).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
  const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

  const isAcai = p => {
    const text = norm(p?.nome);
    const cat = norm(p?.categorias?.nome || p?.categoria_nome || "");
    return text.includes("acai") || cat === "acai" || cat.includes("acai");
  };

  async function getAcaiConfig() {
    const r = await db.from("configuracoes").select("valor").eq("chave","acai_config").maybeSingle();
    if (r.error) throw r.error;
    let cfg = {};
    try { cfg = JSON.parse(r.data?.valor || "{}") || {}; } catch {}
    return {
      tamanhos: Array.isArray(cfg.tamanhos) ? cfg.tamanhos.filter(x => String(x.nome||"").trim()) : [],
      coberturas: Array.isArray(cfg.coberturas) ? cfg.coberturas.filter(x => String(x.nome||"").trim()) : []
    };
  }

  function showModal(html) {
    const modal = document.getElementById("modal");
    const content = document.getElementById("modalContent");
    if (!modal || !content) return false;
    content.innerHTML = html;
    modal.classList.remove("hidden");
    return true;
  }

  window.closeAcaiModal = () => {
    const modal = document.getElementById("modal");
    if (modal) modal.classList.add("hidden");
  };

  window.addAcaiConfigured = (productId) => {
    const p = (typeof products !== "undefined" ? products : []).find(x => String(x.id) === String(productId));
    if (!p) return;

    const size = document.querySelector("#acaiSize input:checked");
    if (!size) return alert("Escolha o tamanho do Açaí.");

    const selected = [...document.querySelectorAll("#acaiToppings input:checked")];
    if (selected.length > 3) return alert("Você pode escolher no máximo 3 coberturas.");

    const toppings = selected.map(x => ({
      id: x.value,
      nome: x.dataset.name,
      preco: Number(x.dataset.price || 0)
    }));

    const sizePrice = Number(size.dataset.price || 0);
    const basePrice = Number(p.preco || 0);
    const unit = sizePrice > 0 ? sizePrice : basePrice;
    const toppingsPrice = toppings.reduce((s,x) => s + x.preco, 0);
    const qty = Math.max(1, Number(document.getElementById("acaiQty")?.value || 1));
    const obs = (document.getElementById("acaiObs")?.value || "").trim();

    cart.push({
      key: uid(),
      id: p.id,
      nome: `${p.nome} — ${size.dataset.name}`,
      preco: unit + toppingsPrice,
      quantidade: qty,
      base: unit,
      adicionais: toppings,
      obs
    });

    window.closeAcaiModal();
    if (typeof renderCart === "function") renderCart();
  };

  async function openAcai(productId) {
    const p = (typeof products !== "undefined" ? products : []).find(x => String(x.id) === String(productId));
    if (!p) return;

    let cfg;
    try {
      cfg = await getAcaiConfig();
    } catch (e) {
      alert("Não foi possível carregar as opções do Açaí.");
      return;
    }

    if (!cfg.tamanhos.length) {
      alert("Nenhum tamanho de Açaí foi cadastrado no Admin.");
      return;
    }

    const sizes = cfg.tamanhos.map((s,i) => `
      <label class="check" style="display:flex;align-items:center;gap:8px;margin:8px 0">
        <input type="radio" name="acaiSize" value="${i}" data-name="${esc(s.nome)}" data-price="${Number(s.preco||0)}" ${i===0?"checked":""}>
        <span>${esc(s.nome)} — <b>${money(s.preco)}</b></span>
      </label>`).join("");

    const tops = cfg.coberturas.length
      ? cfg.coberturas.map((s,i) => `
        <label class="check" style="display:flex;align-items:center;gap:8px;margin:8px 0">
          <input type="checkbox" value="${i}" data-name="${esc(s.nome)}" data-price="${Number(s.preco||0)}">
          <span>${esc(s.nome)}${Number(s.preco||0) ? ` + ${money(s.preco)}` : ""}</span>
        </label>`).join("")
      : "<small>Nenhuma cobertura cadastrada no Admin.</small>";

    const ok = showModal(`
      <h2>🍧 ${esc(p.nome)}</h2>
      <p class="muted">Escolha o tamanho e até 3 coberturas.</p>

      <div class="form">
        <label>Tamanho</label>
        <div id="acaiSize">${sizes}</div>

        <label style="margin-top:14px">Coberturas <small>(máximo 3)</small></label>
        <div id="acaiToppings">${tops}</div>

        <label style="margin-top:14px">
          Quantidade
          <input id="acaiQty" type="number" min="1" value="1">
        </label>

        <label>
          Observação
          <textarea id="acaiObs" placeholder="Ex.: pouco leite condensado..."></textarea>
        </label>

        <div class="form-actions">
          <button class="mini" onclick="closeAcaiModal()">Voltar</button>
          <button class="primary" onclick="addAcaiConfigured('${p.id}')">Adicionar ao pedido</button>
        </div>
      </div>
    `);
    if (!ok) return;

    document.querySelectorAll("#acaiToppings input").forEach(chk => {
      chk.addEventListener("change", () => {
        const selected = document.querySelectorAll("#acaiToppings input:checked");
        if (selected.length > 3) {
          chk.checked = false;
          alert("Você pode escolher no máximo 3 coberturas.");
        }
      });
    });
  }

  // Substitui a abertura normal somente para Açaí.
  const original = window.openProduct;
  window.openProduct = async function(id) {
    const p = (typeof products !== "undefined" ? products : []).find(x => String(x.id) === String(id));
    if (p && isAcai(p)) return openAcai(id);
    if (typeof original === "function") return original(id);
  };
})();
