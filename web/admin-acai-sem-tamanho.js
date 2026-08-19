/* MIGUEL LANCHES — ADMIN / AÇAÍ SEM SELETOR DE TAMANHO
   Os quatro produtos são independentes:
   Açaí 200 ml / 300 ml / 500 ml / 1 litro.
   Ao clicar em qualquer um, o tamanho NÃO aparece para escolher.
   Aparecem somente coberturas (máx. 3), observação e quantidade.
*/
(() => {
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  function isAcai(p){
    const n=norm(p?.nome);
    return /^(acai)\s*(200\s*ml|300\s*ml|500\s*ml|1\s*litro)/.test(n);
  }

  async function getToppings(){
    for(const key of ["acai_config","acai_coberturas"]){
      const r=await db.from("configuracoes").select("valor").eq("chave",key).maybeSingle();
      if(r.error || !r.data?.valor) continue;
      try{
        const v=JSON.parse(r.data.valor);
        if(key==="acai_config" && Array.isArray(v.coberturas))
          return v.coberturas.filter(x=>x && x.ativo!==false && String(x.nome||"").trim());
        if(Array.isArray(v))
          return v.filter(x=>x && x.ativo!==false && String(x.nome||"").trim());
      }catch(e){}
    }
    return [];
  }

  async function openAcai(p){
    const toppings=await getToppings();
    const content=document.getElementById("modalContent");
    const modal=document.getElementById("modal");
    if(!content||!modal)return;

    content.innerHTML=`
      <h2>🍧 ${esc(p.nome)}</h2>
      <p class="muted">Escolha até 3 coberturas e a quantidade.</p>

      <div class="form">
        <label>Coberturas <small>— máximo 3</small></label>

        <div class="checks">
          ${toppings.length ? toppings.map((t,i)=>`
            <label class="check">
              <input class="mlAdminAcaiTop" type="checkbox"
                data-name="${esc(t.nome)}"
                data-price="${Number(t.preco||0)}">
              ${esc(t.nome)}
              ${Number(t.preco||0)>0 ? " + "+money(t.preco) : ""}
            </label>
          `).join("") : `
            <p class="muted">Nenhuma cobertura cadastrada.</p>
          `}
        </div>

        <label>Observação</label>
        <textarea id="mlAdminAcaiObs" placeholder="Ex.: sem leite em pó..."></textarea>

        <label>Quantidade</label>
        <div class="ml-admin-acai-quantity">
          <button type="button" id="mlAdminAcaiMinus">−</button>
          <b id="mlAdminAcaiQty">1</b>
          <button type="button" id="mlAdminAcaiPlus">+</button>
        </div>

        <div class="form-actions">
          <button type="button" class="mini" onclick="closeModal()">Voltar</button>
          <button type="button" class="primary" id="mlAdminAcaiAdd">Adicionar ao pedido</button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");

    let qty=1;
    document.getElementById("mlAdminAcaiMinus").onclick=()=>{
      qty=Math.max(1,qty-1);
      document.getElementById("mlAdminAcaiQty").textContent=qty;
    };
    document.getElementById("mlAdminAcaiPlus").onclick=()=>{
      qty++;
      document.getElementById("mlAdminAcaiQty").textContent=qty;
    };

    document.querySelectorAll(".mlAdminAcaiTop").forEach(cb=>{
      cb.addEventListener("change",()=>{
        const checked=[...document.querySelectorAll(".mlAdminAcaiTop:checked")];

        if(checked.length>3){
          cb.checked=false;
          alert("Você pode escolher no máximo 3 coberturas.");
          return;
        }

        document.querySelectorAll(".mlAdminAcaiTop").forEach(x=>{
          x.disabled=checked.length>=3 && !x.checked;
        });
      });
    });

    document.getElementById("mlAdminAcaiAdd").onclick=()=>{
      const adds=[...document.querySelectorAll(".mlAdminAcaiTop:checked")].map(x=>({
        nome:x.dataset.name,
        preco:Number(x.dataset.price||0)
      }));
      const obs=document.getElementById("mlAdminAcaiObs").value.trim();
      const unit=Number(p.preco||0)+adds.reduce((s,x)=>s+x.preco,0);

      state.cart.push({
        key:uid(),
        id:p.id,
        nome:p.nome,
        preco:unit,
        quantidade:qty,
        adicionais:adds,
        obs
      });

      closeModal();
      renderCart();
    };
  }

  let originalOpen=null;

  function install(){
    if(typeof window.openProduct!=="function")return;
    if(!originalOpen)originalOpen=window.openProduct;

    window.openProduct=function(id){
      const p=(typeof state!=="undefined" ? (state.products||[]) : [])
        .find(x=>String(x.id)===String(id));

      if(isAcai(p)){
        openAcai(p);
        return;
      }

      return originalOpen(id);
    };
  }

  let tries=0;
  const timer=setInterval(()=>{
    install();
    tries++;
    if(originalOpen || tries>60)clearInterval(timer);
  },200);

  window.addEventListener("load",install);
})();