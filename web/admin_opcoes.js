/* Sistema padrão de opções do Miguel Lanches.
   Carregado depois de admin.js. Não depende de alterar o admin principal.
*/
(function(){
  const originalRenderProducts = window.renderProducts;
  const esc0 = window.esc || (v=>String(v??""));
  const money0 = window.money || (v=>`R$ ${Number(v||0).toFixed(2)}`);

  function defaultType(cat){
    const n=String(cat||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    if(n.includes("pizza")||n.includes("pastel")) return "sabor_preco";
    if(n.includes("lanche")||n.includes("dog")||n.includes("churrasco")||n.includes("porcao")||n.includes("petisco")) return "adicional_preco";
    if(n.includes("suco")||n.includes("milk")||n.includes("creme")||n.includes("acai")) return "sabor";
    return "adicional_preco";
  }

  window.openProductOptions = async function(produto){
    const pid=produto.id;
    const [cr,or]=await Promise.all([
      db.from("configuracao_opcoes").select("*").eq("produto_id",pid).maybeSingle(),
      db.from("opcoes_produto").select("*").eq("produto_id",pid).order("ordem")
    ]);
    if(or.error){ toast("A tabela de opções ainda não está disponível no Supabase."); return; }
    const cfg=cr.data||{};
    const type=cfg.tipo||defaultType(produto.categorias?.nome);
    const limit=Math.max(1,Number(cfg.limite|| (type==="sabor"?1:1)));

    const typeOptions=[
      ["nenhuma","Sem opções"],
      ["sabor_preco","Sabores + valor"],
      ["adicional_preco","Adicionais + valor"],
      ["sabor","Sabores (sem valor)"]
    ];
    const html=`<div class="options-editor">
      <h2>Opções — ${esc0(produto.nome)}</h2>
      <p class="muted">Configure como o cliente escolhe este produto.</p>
      <label>Tipo de opção
        <select id="optType">${typeOptions.map(([v,t])=>`<option value="${v}" ${type===v?"selected":""}>${t}</option>`).join("")}</select>
      </label>
      <label>Quantidade máxima de escolhas
        <input id="optLimit" type="number" min="1" max="20" value="${limit}">
      </label>
      <div id="optionRows">${(or.data||[]).map((o,i)=>row(o,i)).join("")}</div>
      <div class="modal-actions">
        <button class="btn" id="addOpt">+ Adicionar opção</button>
        <button class="btn primary" id="saveOpts">Salvar opções</button>
      </div>
      <p class="muted">Para “Sabores” o preço adicional fica oculto no cliente. Para “Sabores + valor” e “Adicionais + valor”, o adicional é somado ao produto.</p>
    </div>`;
    openModal(html);
    document.getElementById("addOpt").onclick=()=>document.getElementById("optionRows").insertAdjacentHTML("beforeend",row(null,document.querySelectorAll("#optionRows .option-row").length));
    document.getElementById("saveOpts").onclick=()=>save(pid);
  };

  function row(o,i){
    return `<div class="option-row" data-id="${esc0(o?.id||"")}">
      <input class="oname" placeholder="Nome da opção" value="${esc0(o?.nome||"")}">
      <input class="oprice" type="number" min="0" step="0.01" placeholder="Valor adicional" value="${Number(o?.preco_adicional||0)}">
      <label class="check"><input class="oactive" type="checkbox" ${o?.ativo!==false?"checked":""}> Ativo</label>
      <button type="button" class="btn danger delopt">Excluir</button>
    </div>`;
  }

  async function save(pid){
    const tipo=document.getElementById("optType").value;
    const limite=Math.max(1,Math.min(20,Number(document.getElementById("optLimit").value||1)));
    const rows=[...document.querySelectorAll("#optionRows .option-row")];
    const c=await db.from("configuracao_opcoes").upsert({produto_id:pid,tipo,limite,updated_at:new Date().toISOString()},{onConflict:"produto_id"});
    if(c.error){toast(c.error.message);return;}
    for(let i=0;i<rows.length;i++){
      const r=rows[i],nome=r.querySelector(".oname").value.trim();
      if(!nome) continue;
      const payload={produto_id:pid,nome,preco_adicional:Number(r.querySelector(".oprice").value||0),ativo:r.querySelector(".oactive").checked,ordem:i};
      const id=r.dataset.id;
      const x=id?await db.from("opcoes_produto").update(payload).eq("id",id):await db.from("opcoes_produto").insert(payload);
      if(x.error){toast(x.error.message);return;}
    }
    toast("Opções salvas.");
    closeModal();
  }

  // Re-renderiza a tabela de produtos adicionando o botão de opções.
  window.renderProducts=function(){
    const q=(document.getElementById("ps")?.value||"").toLowerCase();
    const list=products.filter(p=>String(p.nome||"").toLowerCase().includes(q));
    document.getElementById("products").innerHTML=list.map(p=>`<tr>
      <td><b>${esc0(p.nome)}</b></td><td>${esc0(p.categorias?.nome||"Sem categoria")}</td><td>${money0(p.preco)}</td>
      <td><button class="table-btn" data-active="${esc0(p.id)}">${p.ativo===false?"Ativar":"Ativo"}</button></td>
      <td><button class="table-btn" data-feature="${esc0(p.id)}">${p.destaque?"★ Destaque":"☆ Destacar"}</button></td>
      <td class="product-actions">
        <button class="table-btn" data-edit="${esc0(p.id)}">Editar</button>
        <button class="table-btn options-btn" data-options="${esc0(p.id)}">Opções</button>
      </td>
    </tr>`).join("")||`<tr><td colspan="6">Nenhum produto encontrado.</td></tr>`;

    document.querySelectorAll("[data-active]").forEach(b=>b.onclick=async()=>{const p=products.find(x=>String(x.id)===String(b.dataset.active));const r=await db.from("produtos").update({ativo:p.ativo===false}).eq("id",p.id);if(r.error)toast(r.error.message);else load()});
    document.querySelectorAll("[data-feature]").forEach(b=>b.onclick=async()=>{const p=products.find(x=>String(x.id)===String(b.dataset.feature));const r=await db.from("produtos").update({destaque:!p.destaque}).eq("id",p.id);if(r.error)toast(r.error.message);else load()});
    document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>productModal(products.find(x=>String(x.id)===String(b.dataset.edit))));
    document.querySelectorAll("[data-options]").forEach(b=>b.onclick=()=>openProductOptions(products.find(x=>String(x.id)===String(b.dataset.options))));
    document.querySelectorAll(".delopt").forEach(b=>b.onclick=async()=>{const id=b.closest(".option-row").dataset.id;if(!id){b.closest(".option-row").remove();return;}const r=await db.from("opcoes_produto").delete().eq("id",id);if(r.error)toast(r.error.message);else b.closest(".option-row").remove();});
  };
})();
