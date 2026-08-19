/* ADMIN — Açaí: coberturas globais, máximo 3
   Funciona nos quatro produtos: 200 ml, 300 ml, 500 ml e 1 litro.
*/
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

  async function readConfig(){
    for(const key of ["acai_config","acai_coberturas"]){
      const r=await db.from("configuracoes").select("valor").eq("chave",key).maybeSingle();
      if(r.error||!r.data?.valor)continue;
      try{
        const v=JSON.parse(r.data.valor);
        if(key==="acai_config" && Array.isArray(v.coberturas))return v.coberturas;
        if(Array.isArray(v))return v;
      }catch(e){}
    }
    return [];
  }

  async function openAcai(p,size){
    const toppings=(await readConfig()).filter(t=>t && t.ativo!==false && String(t.nome||"").trim());
    const content=document.getElementById("modalContent"), modal=document.getElementById("modal");
    if(!content||!modal)return;

    content.innerHTML=`
      <h2>🍧 ${esc(p.nome)}</h2>
      <p class="muted">Escolha até 3 coberturas e a quantidade.</p>
      <div class="form">
        <div style="padding:12px 14px;border-radius:12px;background:#f4f5f7;font-weight:800">
          Tamanho: ${esc(size)} · ${money(p.preco)}
        </div>
        <label>Coberturas <small>— máximo 3</small></label>
        <div class="checks">
          ${toppings.length?toppings.map((t,i)=>`
            <label class="check">
              <input class="mlAdminAcaiTop" type="checkbox"
                data-name="${esc(t.nome)}" data-price="${Number(t.preco||0)}">
              ${esc(t.nome)}${Number(t.preco||0)>0?" + "+money(t.preco):""}
            </label>`).join(""):`<p class="muted">Nenhuma cobertura cadastrada.</p>`}
        </div>

        <label>Quantidade</label>
        <div style="display:flex;align-items:center;justify-content:center;gap:20px">
          <button type="button" id="mlAdminAcaiMinus">−</button>
          <b id="mlAdminAcaiQtyValue">1</b>
          <button type="button" id="mlAdminAcaiPlus">+</button>
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
    document.getElementById("mlAdminAcaiMinus").onclick=()=>{qty=Math.max(1,qty-1);document.getElementById("mlAdminAcaiQtyValue").textContent=qty};
    document.getElementById("mlAdminAcaiPlus").onclick=()=>{qty++;document.getElementById("mlAdminAcaiQtyValue").textContent=qty};

    document.querySelectorAll(".mlAdminAcaiTop").forEach(cb=>cb.addEventListener("change",()=>{
      const checked=[...document.querySelectorAll(".mlAdminAcaiTop:checked")];
      if(checked.length>3){
        cb.checked=false;
        alert("Você pode escolher no máximo 3 coberturas.");
        return;
      }
      document.querySelectorAll(".mlAdminAcaiTop").forEach(x=>{
        x.disabled=checked.length>=3 && !x.checked;
      });
    }));

    document.getElementById("mlAdminAcaiAdd").onclick=()=>{
      const adds=[...document.querySelectorAll(".mlAdminAcaiTop:checked")].map(x=>({nome:x.dataset.name,preco:Number(x.dataset.price||0)}));
      const obs=document.getElementById("mlAdminAcaiObs").value.trim();
      const unit=Number(p.preco||0)+adds.reduce((s,x)=>s+x.preco,0);
      state.cart.push({key:uid(),id:p.id,nome:p.nome,preco:unit,quantidade:qty,adicionais:adds,obs});
      closeModal();renderCart();
    };
  }

  function install(){
    if(typeof window.openProduct!=="function" || window.__mlAdminAcaiOriginal)return;
    window.__mlAdminAcaiOriginal=window.openProduct;
    window.openProduct=function(id){
      const p=(state.products||[]).find(x=>String(x.id)===String(id));
      const size=p&&acaiSize(p.nome);
      return size?openAcai(p,size):window.__mlAdminAcaiOriginal(id);
    };
  }

  const timer=setInterval(()=>{
    if(typeof window.openProduct==="function"){
      install();
      if(window.__mlAdminAcaiOriginal)clearInterval(timer);
    }
  },200);
})();