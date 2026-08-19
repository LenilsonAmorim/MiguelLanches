/* Miguel Lanches — correção do abrir produto */
(function () {
  const escD = v => String(v ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

  window.openProduct = async function (id) {
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;

    const category = catCfg[p.categoria_id] || {
      ingredientes: true, observacao: true
    };

    const isAcai = norm(p.nome).includes("acai");
    if (isAcai) {
      openAcai(p, category);
      return;
    }

    const [rel, ing] = await Promise.all([
      db.from("produto_ingredientes")
        .select("ingrediente_id").eq("produto_id", id),
      db.from("ingredientes")
        .select("*").eq("ativo", true).order("nome")
    ]);

    const allowed = new Set((rel.data || []).map(x => String(x.ingrediente_id)));
    let list = (ing.data || []).filter(x => allowed.has(String(x.id)));

    if (category.ingredientes !== false && !list.length) list = ing.data || [];
    if (category.ingredientes === false) list = [];

    const image = p.imagem_url
      ? `<img src="${escD(p.imagem_url)}" alt="${escD(p.nome)}"
          style="width:100%;height:230px;object-fit:cover;border-radius:16px;margin-bottom:16px;display:block"
          onerror="this.style.display='none'">`
      : "";

    const additional = list.length ? `
      <label>Ingredientes adicionais</label>
      <div class="checks">
        ${list.map(i => `
          <label class="check">
            <input type="checkbox" value="${escD(i.id)}"
              data-name="${escD(i.nome)}" data-price="${Number(i.preco || 0)}">
            ${escD(i.nome)} + ${money(i.preco)}
          </label>`).join("")}
      </div>` : "";

    const observation = category.observacao !== false ? `
      <label>Observação
        <textarea id="itemObs" placeholder="Ex.: sem cebola..."></textarea>
      </label>` : "";

    $("modalContent").innerHTML = `
      ${image}
      <h2>${escD(p.nome)}</h2>
      <p class="muted">Escolha os adicionais e a quantidade.</p>
      <div class="form">
        <label>Quantidade
          <input id="qty" type="number" min="1" value="1">
        </label>
        ${additional}
        ${observation}
        <div class="actions">
          <button type="button" onclick="closeModal()">Voltar</button>
          <button type="button" class="primary"
            onclick="addProduct('${escD(p.id)}')">Adicionar ao pedido</button>
        </div>
      </div>`;
    $("modal").classList.remove("hidden");
  };
})();