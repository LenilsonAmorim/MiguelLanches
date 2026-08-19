/* Miguel Lanches — Açaí em 4 produtos independentes.
   Substitui o seletor de tamanho apenas para:
   Açaí 200 ml, Açaí 300 ml, Açaí 500 ml e Açaí 1 litro.
   Ao abrir um deles, o tamanho já está definido e aparecem somente
   as coberturas/configuração do Açaí + quantidade + observação.
*/
(() => {
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  function acaiSize(name){
    const n=norm(name);
    if(n.includes("200 ml"))return "200 ml";
    if(n.includes("300 ml"))return "300 ml";
    if(n.includes("500 ml"))return "500 ml";
    if(n.includes("1 litro"))return "1 litro";
    return null;
  }

  async function config(key,fallback){
    const r=await db.from("configuracoes").select("valor").eq("chave",key).maybeSingle();
    if(r.error)return fallback;
    try{return JSON.parse(r.data?.valor||"null")??fallback}catch{return fallback}
  }

  window.openProduct=function(id){
    const p=products.find(x=>String(x.id)===String(id));
    if(!p)return;

    const size=acaiSize(p.nome);
    if(!size){
      /* produto normal: usa a função original preservada abaixo */
      return window._mlOpenProductOriginal(id);
    }
    openAcaiFixed(p,size);
  };

  async function openAcaiFixed(p,size){
    const topsCfg=await config("acai_coberturas",[]);
    let tops=Array.isArray(topsCfg)?topsCfg.filter(x=>x.ativo!==false):[];

    /* Também aceita a estrutura nova acai_config, se ela existir. */
    if(!tops.length){
      const cfg=await config("acai_config",{});
      if(Array.isArray(cfg.coberturas))tops=cfg.coberturas.filter(x=>x.ativo!==false);
    }

    $("modalContent").innerHTML=`
      <h2>🍧 ${esc(p.nome)}</h2>
      <p class="muted">Escolha as coberturas e a quantidade.</p>
      <div class="form">
        <div style="padding:12px 14px;border-radius:12px;background:#f4f5f7;font-weight:800">
          Tamanho: ${esc(size)} · ${money(p.preco)}
        </div>

        ${tops.length?`
          <label>Coberturas <small>(escolha até 3)</small></label>
          <div class="checks">
            ${tops.map((t,i)=>`
              <label class="check">
                <input class="mlAcaiTop" type="checkbox"
                  value="${i}"
                  data-name="${esc(t.nome)}"
                  data-price="${Number(t.preco||0)}">
                ${esc(t.nome)}${Number(t.preco||0)>0?" + "+money(t.preco):""}
              </label>`).join("")}
          </div>`:
          `<p class="muted">Nenhuma cobertura cadastrada.</p>`}

        <label>Quantidade
          <div style="display:flex;align-items:center;justify-content:center;gap:22px">
            <button type="button" id="mlAcaiMinus" style="width:48px;height:48px;font-size:28px;font-weight:900">−</button>
            <b id="mlAcaiQtyValue" style="font-size:22px">1</b>
            <button type="button" id="mlAcaiPlus" style="width:48px;height:48px;font-size:28px;font-weight:900">+</button>
          </div>
        </label>

        <input id="mlAcaiQty" type="hidden" value="1">

        <label>Observação
          <textarea id="itemObs" placeholder="Ex.: sem granola..."></textarea>
        </label>

        <div class="actions">
          <button onclick="closeModal()">Voltar</button>
          <button class="primary" id="mlAcaiAdd">Adicionar ao pedido</button>
        </div>
      </div>`;

    $("modal").classList.remove("hidden");

    const sync=()=>{
      const v=Math.max(1,Number($("mlAcaiQty").value||1));
      $("mlAcaiQty").value=v;
      $("mlAcaiQtyValue").textContent=v;
    };
    $("mlAcaiMinus").onclick=()=>{
      $("mlAcaiQty").value=Math.max(1,Number($("mlAcaiQty").value||1)-1);sync();
    };
    $("mlAcaiPlus").onclick=()=>{
      $("mlAcaiQty").value=Number($("mlAcaiQty").value||1)+1;sync();
    };

    document.querySelectorAll(".mlAcaiTop").forEach(cb=>{
      cb.addEventListener("change",()=>{
        const checked=[...document.querySelectorAll(".mlAcaiTop:checked")];
        document.querySelectorAll(".mlAcaiTop:not(:checked)").forEach(x=>{
          x.disabled=checked.length>=3;
        });
      });
    });

    $("mlAcaiAdd").onclick=()=>{
      const qty=Math.max(1,Number($("mlAcaiQty").value||1));
      const adds=[...document.querySelectorAll(".mlAcaiTop:checked")].map(x=>({
        nome:x.dataset.name,preco:Number(x.dataset.price||0)
      }));
      const obs=$("itemObs").value.trim();
      const unit=Number(p.preco||0)+adds.reduce((s,x)=>s+x.preco,0);

      cart.push({
        key:uid(),id:p.id,nome:p.nome,preco:unit,quantidade:qty,
        adicionais:adds,obs
      });
      closeModal();
      renderCart();
    };
  }

  /* Captura a função original antes de qualquer outro patch sobrescrever. */
  const boot=()=>{
    if(typeof window.openProduct==="function" && !window._mlOpenProductOriginal){
      window._mlOpenProductOriginal=window.openProduct;
      /* reatribui para nossa função */
      window.openProduct=function(id){
        const p=products.find(x=>String(x.id)===String(id));
        const size=p&&acaiSize(p.nome);
        return size?openAcaiFixed(p,size):window._mlOpenProductOriginal(id);
      };
    }
  };
  setTimeout(boot,0);
  setTimeout(boot,100);
  setTimeout(boot,500);
})();