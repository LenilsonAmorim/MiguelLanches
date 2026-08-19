/* Miguel Lanches — configurador de Açaí sem alterar o visual do cliente */
(() => {
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

  const isAcai=p=>{
    const n=norm(p?.nome), c=norm(p?.categorias?.nome||p?.categoria_nome||"");
    return n.includes("acai") || c==="acai" || c.includes("acai");
  };

  async function cfg(){
    const r=await db.from("configuracoes").select("valor").eq("chave","acai_config").maybeSingle();
    if(r.error) throw r.error;
    let x={}; try{x=JSON.parse(r.data?.valor||"{}")||{}}catch{}
    return {
      tamanhos:Array.isArray(x.tamanhos)?x.tamanhos.filter(x=>String(x.nome||"").trim()):[],
      coberturas:Array.isArray(x.coberturas)?x.coberturas.filter(x=>String(x.nome||"").trim()):[]
    };
  }

  function close(){
    const m=document.getElementById("modal");
    if(m)m.classList.add("hidden");
  }
  window.closeAcaiConfigurator=close;

  async function open(id){
    const list=window.products||window.state?.products||[];
    const p=list.find(x=>String(x.id)===String(id));
    if(!p)return;
    let c; try{c=await cfg()}catch(e){return alert("Não foi possível carregar as opções do Açaí.");}
    if(!c.tamanhos.length)return alert("Nenhum tamanho de Açaí foi cadastrado no Admin.");

    const m=document.getElementById("modal"), content=document.getElementById("modalContent");
    if(!m||!content)return;

    content.innerHTML=`
      <h2>🍧 ${esc(p.nome)}</h2>
      <p>Escolha o tamanho e até 3 coberturas.</p>
      <div style="margin-top:14px"><b>Tamanho</b>${c.tamanhos.map((x,i)=>`
        <label style="display:block;margin:10px 0">
          <input type="radio" name="mlAcaiSize" data-name="${esc(x.nome)}" data-price="${Number(x.preco||0)}" ${i===0?"checked":""}>
          ${esc(x.nome)} — ${money(x.preco)}
        </label>`).join("")}</div>
      <div style="margin-top:14px"><b>Coberturas (máximo 3)</b>${c.coberturas.map(x=>`
        <label style="display:block;margin:10px 0">
          <input type="checkbox" class="mlAcaiTop" data-name="${esc(x.nome)}" data-price="${Number(x.preco||0)}">
          ${esc(x.nome)}${Number(x.preco||0)?` + ${money(x.preco)}`:""}
        </label>`).join("")}</div>
      <label style="display:block;margin-top:14px">Quantidade
        <input id="mlAcaiQty" type="number" min="1" value="1">
      </label>
      <label style="display:block;margin-top:10px">Observação
        <textarea id="mlAcaiObs" placeholder="Alguma observação?"></textarea>
      </label>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button type="button" onclick="closeAcaiConfigurator()">Voltar</button>
        <button type="button" id="mlAcaiAdd">Adicionar ao pedido</button>
      </div>`;

    m.classList.remove("hidden");

    document.querySelectorAll(".mlAcaiTop").forEach(ch=>{
      ch.addEventListener("change",()=>{
        const checked=document.querySelectorAll(".mlAcaiTop:checked");
        if(checked.length>3){ch.checked=false;alert("Você pode escolher no máximo 3 coberturas.");}
      });
    });

    document.getElementById("mlAcaiAdd").onclick=()=>{
      const size=document.querySelector('input[name="mlAcaiSize"]:checked');
      if(!size)return alert("Escolha o tamanho.");
      const tops=[...document.querySelectorAll(".mlAcaiTop:checked")].map(x=>({nome:x.dataset.name,preco:Number(x.dataset.price||0)}));
      if(tops.length>3)return alert("Você pode escolher no máximo 3 coberturas.");
      const unit=Number(size.dataset.price||0)||Number(p.preco||0);
      const price=unit+tops.reduce((s,x)=>s+x.preco,0);
      const q=Math.max(1,Number(document.getElementById("mlAcaiQty")?.value||1));
      const obs=(document.getElementById("mlAcaiObs")?.value||"").trim();

      if(Array.isArray(window.cart)){
        window.cart.push({
          key:(window.uid?window.uid():Date.now().toString()),
          id:p.id,nome:`${p.nome} — ${size.dataset.name}`,
          preco:price,quantidade:q,adicionais:tops,obs
        });
        if(typeof window.renderCart==="function")window.renderCart();
      }
      close();
    };
  }

  const original=window.openProduct;
  window.openProduct=async id=>{
    const list=window.products||window.state?.products||[];
    const p=list.find(x=>String(x.id)===String(id));
    if(p&&isAcai(p))return open(id);
    if(typeof original==="function")return original(id);
  };
})();
