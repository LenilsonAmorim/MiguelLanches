/* MIGUEL LANCHES — AÇAÍ SEM SELETOR DE TAMANHO
   Os quatro produtos são independentes:
   Açaí 200 ml / 300 ml / 500 ml / 1 litro.
   Ao abrir qualquer um, o tamanho NÃO aparece para escolher.
   Aparecem somente coberturas (máx. 3), quantidade e observação.
*/
(() => {
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  function isAcai(p){
    return p && /^açaí\s*(200\s*ml|300\s*ml|500\s*ml|1\s*litro)/i.test(String(p.nome||""))
      || p && norm(p.nome).match(/^acai\s*(200\s*ml|300\s*ml|500\s*ml|1\s*litro)/);
  }

  async function getToppings(){
    /* A configuração pode estar salva em acai_config ou acai_coberturas. */
    for(const key of ["acai_config","acai_coberturas"]){
      const r=await db.from("configuracoes").select("valor").eq("chave",key).maybeSingle();
      if(r.error || !r.data?.valor) continue;
      try{
        const v=JSON.parse(r.data.valor);
        if(key==="acai_config" && Array.isArray(v.coberturas)){
          return v.coberturas.filter(x=>x && x.ativo!==false && String(x.nome||"").trim());
        }
        if(Array.isArray(v)){
          return v.filter(x=>x && x.ativo!==false && String(x.nome||"").trim());
        }
      }catch(e){}
    }
    return [];
  }

  async function openAcai(p){
    const toppings=await getToppings();

    $("modalContent").innerHTML=`
      <h2>🍧 ${esc(p.nome)}</h2>
      <p class="muted">Escolha até 3 coberturas e a quantidade.</p>

      <div class="form">
        <label>Coberturas <small>— máximo 3</small></label>

        <div class="checks" id="mlAcaiToppings">
          ${toppings.length ? toppings.map((t,i)=>`
            <label class="check">
              <input
                class="mlAcaiTop"
                type="checkbox"
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
        <textarea id="mlAcaiObs" placeholder="Ex.: sem leite em pó..."></textarea>

        <label>Quantidade</label>
        <div class="ml-acai-quantity">
          <button type="button" id="mlAcaiMinus">−</button>
          <b id="mlAcaiQty">1</b>
          <button type="button" id="mlAcaiPlus">+</button>
        </div>

        <div class="actions">
          <button type="button" onclick="closeModal()">Voltar</button>
          <button type="button" class="primary" id="mlAcaiAdd">Adicionar ao pedido</button>
        </div>
      </div>
    `;

    $("modal").classList.remove("hidden");

    let qty=1;
    const qtyEl=$("mlAcaiQty");
    $("mlAcaiMinus").onclick=()=>{
      qty=Math.max(1,qty-1);
      qtyEl.textContent=qty;
    };
    $("mlAcaiPlus").onclick=()=>{
      qty++;
      qtyEl.textContent=qty;
    };

    document.querySelectorAll(".mlAcaiTop").forEach(cb=>{
      cb.addEventListener("change",()=>{
        const checked=[...document.querySelectorAll(".mlAcaiTop:checked")];

        if(checked.length>3){
          cb.checked=false;
          alert("Você pode escolher no máximo 3 coberturas.");
          return;
        }

        document.querySelectorAll(".mlAcaiTop").forEach(x=>{
          x.disabled=checked.length>=3 && !x.checked;
        });
      });
    });

    $("mlAcaiAdd").onclick=()=>{
      const adds=[...document.querySelectorAll(".mlAcaiTop:checked")].map(x=>({
        nome:x.dataset.name,
        preco:Number(x.dataset.price||0)
      }));

      const obs=$("mlAcaiObs").value.trim();
      const unit=Number(p.preco||0)+adds.reduce((s,x)=>s+x.preco,0);

      cart.push({
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
    if(typeof window.openProduct!=="function") return;

    /* Guarda a função original uma única vez. */
    if(!originalOpen) originalOpen=window.openProduct;

    /* Nossa função fica por último e intercepta somente os 4 Açaís. */
    window.openProduct=function(id){
      const p=(typeof products!=="undefined" ? products : []).find(
        x=>String(x.id)===String(id)
      );

      if(isAcai(p)){
        openAcai(p);
        return;
      }

      return originalOpen(id);
    };
  }

  /* Executa depois dos scripts existentes para garantir que esta versão
     seja a última a controlar o clique do produto. */
  let tries=0;
  const timer=setInterval(()=>{
    install();
    tries++;
    if(originalOpen || tries>50) clearInterval(timer);
  },200);

  window.addEventListener("load",install);
})();