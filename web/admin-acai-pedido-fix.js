/* Admin — 4 Açaís independentes por tamanho.
   O produto já informa o tamanho; o modal mostra somente coberturas,
   quantidade e observação. */
(() => {
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  const acaiSize=name=>{
    const n=norm(name);
    if(n.includes("200 ml"))return "200 ml";
    if(n.includes("300 ml"))return "300 ml";
    if(n.includes("500 ml"))return "500 ml";
    if(n.includes("1 litro"))return "1 litro";
    return null;
  };

  async function cfg(key,fallback){
    const r=await db.from("configuracoes").select("valor").eq("chave",key).maybeSingle();
    if(r.error)return fallback;
    try{return JSON.parse(r.data?.valor||"null")??fallback}catch{return fallback}
  }

  async function openFixed(p,size){
    const c=await cfg("acai_coberturas",[]);
    const tops=Array.isArray(c)?c.filter(x=>x.ativo!==false):[];

    const content=document.getElementById("modalContent");
    const modal=document.getElementById("modal");
    if(!content||!modal)return;

    content.innerHTML=`
      <h2>🍧 ${esc(p.nome)}</h2>
      <p class="muted">Tamanho já definido: <b>${esc(size)}</b></p>
      <div class="form">
        ${tops.length?`
        <label>Coberturas <small>(escolha até 3)</small></label>
        <div class="checkboxes">
          ${tops.map((t,i)=>`
          <label class="check">
            <input class="mlAdminAcaiTop" type="checkbox" data-name="${esc(t.nome)}" data-price="${Number(t.preco||0)}">
            ${esc(t.nome)}${Number(t.preco||0)>0?" + "+money(t.preco):""}
          </label>`).join("")}
        </div>`:`<p class="muted">Nenhuma cobertura cadastrada.</p>`}

        <label>Quantidade</label>
        <div style="display:flex;align-items:center;justify-content:center;gap:20px;margin:8px 0 16px">
          <button type="button" id="mlAdminAcaiMinus" style="width:46px;height:46px;font-size:26px;font-weight:900">−</button>
          <b id="mlAdminAcaiQtyValue" style="font-size:22px">1</b>
          <button type="button" id="mlAdminAcaiPlus" style="width:46px;height:46px;font-size:26px;font-weight:900">+</button>
        </div>

        <label>Observação
          <textarea id="mlAdminAcaiObs" placeholder="Ex.: sem leite em pó..."></textarea>
        </label>

        <div class="form-actions">
          <button class="mini" onclick="closeModal()">Voltar</button>
          <button class="primary" id="mlAdminAcaiAdd">Adicionar ao pedido</button>
        </div>
      </div>`;

    modal.classList.remove("hidden");
    let qty=1;
    const sync=()=>document.getElementById("mlAdminAcaiQtyValue").textContent=qty;
    document.getElementById("mlAdminAcaiMinus").onclick=()=>{qty=Math.max(1,qty-1);sync()};
    document.getElementById("mlAdminAcaiPlus").onclick=()=>{qty++;sync()};

    document.querySelectorAll(".mlAdminAcaiTop").forEach(cb=>cb.onchange=()=>{
      const checked=document.querySelectorAll(".mlAdminAcaiTop:checked").length;
      document.querySelectorAll(".mlAdminAcaiTop:not(:checked)").forEach(x=>x.disabled=checked>=3);
    });

    document.getElementById("mlAdminAcaiAdd").onclick=()=>{
      const adds=[...document.querySelectorAll(".mlAdminAcaiTop:checked")].map(x=>({
        nome:x.dataset.name,preco:Number(x.dataset.price||0)
      }));
      const obs=document.getElementById("mlAdminAcaiObs").value.trim();
      const unit=Number(p.preco||0)+adds.reduce((s,x)=>s+x.preco,0);

      state.cart.push({
        key:uid(),id:p.id,nome:p.nome,preco:unit,quantidade:qty,
        adicionais:adds,obs
      });
      closeModal();
      renderCart();
    };
  }

  function install(){
    if(typeof window.openProduct!=="function")return;
    if(window.__mlAcaiOriginalOpenProduct)return;

    window.__mlAcaiOriginalOpenProduct=window.openProduct;
    window.openProduct=function(id){
      const p=(state.products||[]).find(x=>String(x.id)===String(id));
      const size=p&&acaiSize(p.nome);
      if(size)return openFixed(p,size);
      return window.__mlAcaiOriginalOpenProduct(id);
    };
  }

  setTimeout(install,0);
  setTimeout(install,200);
  setTimeout(install,800);
})();