/* Opções de produtos - adicionar ao Admin
   A interface chama:
   openProductOptions(produto)
*/
window.openProductOptions = async function(produto) {
  const produtoId = produto.id;
  const { data: cfg } = await db.from("configuracao_opcoes")
    .select("*").eq("produto_id", produtoId).maybeSingle();
  const { data: opts, error } = await db.from("opcoes_produto")
    .select("*").eq("produto_id", produtoId).order("ordem");
  if (error) return toast("Crie as tabelas de opções no Supabase primeiro.");

  const tipo = cfg?.tipo || "sabor";
  const limite = cfg?.limite || 1;

  const html = `
    <div class="options-editor">
      <h2>Opções — ${esc(produto.nome)}</h2>
      <label>Tipo
        <select id="optType">
          <option value="sabor" ${tipo==="sabor"?"selected":""}>Sabores</option>
          <option value="complemento" ${tipo==="complemento"?"selected":""}>Complementos</option>
        </select>
      </label>
      <label>Limite máximo de escolhas
        <input id="optLimit" type="number" min="1" value="${limite}">
      </label>
      <div id="optionRows">
        ${(opts||[]).map((o,i)=>`
          <div class="option-row" data-id="${o.id}">
            <input class="oname" value="${esc(o.nome)}" placeholder="Nome">
            <input class="oprice" type="number" step="0.01" value="${Number(o.preco_adicional||0)}" placeholder="Adicional">
            <label><input class="oactive" type="checkbox" ${o.ativo?"checked":""}> Ativo</label>
            <button class="btn danger" onclick="deleteProductOption('${o.id}')">Excluir</button>
          </div>`).join("")}
      </div>
      <button class="btn" onclick="addOptionRow()">+ Adicionar opção</button>
      <button class="btn primary" onclick="saveProductOptions('${produtoId}')">Salvar opções</button>
    </div>`;
  openModal(html);
};

window.addOptionRow = function(){
  const box=document.getElementById("optionRows");
  const div=document.createElement("div");
  div.className="option-row new-option";
  div.innerHTML=`<input class="oname" placeholder="Nome"><input class="oprice" type="number" step="0.01" value="0" placeholder="Adicional"><label><input class="oactive" type="checkbox" checked> Ativo</label><button class="btn danger" onclick="this.parentElement.remove()">Excluir</button>`;
  box.appendChild(div);
};

window.saveProductOptions = async function(produtoId){
  const tipo=document.getElementById("optType").value;
  const limite=Math.max(1,Number(document.getElementById("optLimit").value||1));
  const rows=[...document.querySelectorAll("#optionRows .option-row")];
  const { error: ce } = await db.from("configuracao_opcoes").upsert({produto_id:produtoId,tipo,limite,updated_at:new Date().toISOString()});
  if(ce) return toast(ce.message);
  for(let i=0;i<rows.length;i++){
    const r=rows[i], name=r.querySelector(".oname").value.trim();
    if(!name) continue;
    const id=r.dataset.id;
    const payload={produto_id:produtoId,nome:name,preco_adicional:Number(r.querySelector(".oprice").value||0),ativo:r.querySelector(".oactive").checked,ordem:i};
    const result=id
      ? await db.from("opcoes_produto").update(payload).eq("id",id)
      : await db.from("opcoes_produto").insert(payload);
    if(result.error)return toast(result.error.message);
  }
  toast("Opções salvas.");
  closeModal();
};

window.deleteProductOption = async function(id){
  if(!confirm("Excluir esta opção?")) return;
  const {error}=await db.from("opcoes_produto").delete().eq("id",id);
  if(error)return toast(error.message);
  document.querySelector(`[data-id="${id}"]`)?.remove();
  toast("Opção excluída.");
};
