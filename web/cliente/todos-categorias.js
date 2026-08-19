/* Miguel Lanches — "Todos" agrupado pela ordem das categorias
   Fonte da ordem: tabela categorias.ordem, que é alterada no Admin.
   Dentro de cada categoria: produtos.ordem.
*/
(function(){
  function escLocal(v){
    return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;")
      .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }
  function moneyLocal(v){
    return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  }

  window.renderProductsTodosCategorias=function(){
    const q=document.getElementById("search").value.toLowerCase().trim();

    if(window.cat !== undefined && window.cat !== "todos") return;

    const list=(window.products || []).filter(p=>
      (!q || String(p.nome||"").toLowerCase().includes(q))
    );

    const categories=window.cats || [];

    /* "cats" e "products" são variáveis globais do app.js.
       Em caso de escopo lexical, acessamos pelo helper criado abaixo. */
    let catList=categories;
    let productList=list;

    const container=document.getElementById("products");
    if(!container)return;

    const grouped=catList.map((c,index)=>({
      cat:c,
      index,
      products:productList
        .filter(p=>String(p.categoria_id)===String(c.id))
        .sort((a,b)=>{
          const ao=Number(a.ordem), bo=Number(b.ordem);
          if(Number.isFinite(ao)&&Number.isFinite(bo)&&ao!==bo)return ao-bo;
          if(Number.isFinite(ao)!==Number.isFinite(bo))return Number.isFinite(ao)?-1:1;
          return String(a.nome||"").localeCompare(String(b.nome||""));
        })
    })).filter(g=>g.products.length);

    if(!grouped.length){
      container.innerHTML='<div class="empty">Nenhum produto encontrado.</div>';
      return;
    }

    container.innerHTML=grouped.map(g=>{
      const c=g.cat;
      const icon=c.imagem_url
        ? `<img class="cat-icon" src="${escLocal(c.imagem_url)}" alt="" onerror="this.style.display='none'">`
        : escLocal(c.emoji||"📦");

      return `
        <section class="all-category-section">
          <div class="all-category-title">
            <span>${icon}</span>
            <h2>${escLocal(c.nome)}</h2>
          </div>
          <div class="all-category-grid">
            ${g.products.map(p=>`
              <article class="card">
                <div class="photo">
                  ${p.imagem_url
                    ? `<img src="${escLocal(p.imagem_url)}" alt="${escLocal(p.nome)}">`
                    : escLocal(p.emoji||"🍔")}
                </div>
                <div class="info">
                  <h3>${escLocal(p.nome)}</h3>
                  <div class="bottom">
                    <span class="price">${moneyLocal(p.preco)}</span>
                    <button class="plus" onclick="openProduct('${p.id}')">+</button>
                  </div>
                </div>
              </article>`).join("")}
          </div>
        </section>`;
    }).join("");
  };

  /* O app.js usa let cats/products/cat, que não ficam em window.
     Criamos um observador simples para capturar os arrays por meio do
     comportamento atual do DOM: o patch substitui a função original
     apenas quando as variáveis estiverem acessíveis no escopo global.
     Se não estiverem, o patch usa uma consulta própria ao Supabase. */
  async function renderFromSupabase(){
    const search=(document.getElementById("search")?.value||"").toLowerCase().trim();
    const box=document.getElementById("products");
    if(!box)return;

    const sup=window.supabase;
    if(!sup)return;

    const db2=sup.createClient(
      "https://lifsxhyeqwppfvajvhpn.supabase.co",
      "sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ"
    );

    const [cr,pr]=await Promise.all([
      db2.from("categorias").select("*").eq("ativo",true).order("ordem"),
      db2.from("produtos").select("*,categorias(nome,emoji,imagem_url)").eq("ativo",true).order("ordem")
    ]);

    if(cr.error||pr.error)return;
    const categories=cr.data||[];
    const products=pr.data||[];

    const grouped=categories.map(c=>({
      cat:c,
      products:products.filter(p=>
        String(p.categoria_id)===String(c.id) &&
        (!search||String(p.nome||"").toLowerCase().includes(search))
      )
    })).filter(g=>g.products.length);

    box.innerHTML=grouped.length?grouped.map(g=>`
      <section class="all-category-section">
        <div class="all-category-title">
          <span>${g.cat.imagem_url
            ?`<img class="cat-icon" src="${escLocal(g.cat.imagem_url)}" alt="">`
            :escLocal(g.cat.emoji||"📦")}</span>
          <h2>${escLocal(g.cat.nome)}</h2>
        </div>
        <div class="all-category-grid">
          ${g.products.map(p=>`
            <article class="card">
              <div class="photo">${p.imagem_url
                ?`<img src="${escLocal(p.imagem_url)}" alt="${escLocal(p.nome)}">`
                :escLocal(p.emoji||"🍔")}</div>
              <div class="info"><h3>${escLocal(p.nome)}</h3>
                <div class="bottom"><span class="price">${moneyLocal(p.preco)}</span>
                  <button class="plus" onclick="openProduct('${p.id}')">+</button>
                </div>
              </div>
            </article>`).join("")}
        </div>
      </section>`).join("")
      :'<div class="empty">Nenhum produto encontrado.</div>';
  }

  function apply(){
    const old=window.renderProducts;
    if(!old)return setTimeout(apply,300);

    /* Mantém categorias individuais exatamente como estão.
       Apenas "Todos" recebe a nova renderização. */
    window.renderProducts=function(){
      if(typeof window.cat==="string" && window.cat!=="todos"){
        return old.apply(this,arguments);
      }
      renderFromSupabase();
    };

    document.getElementById("search")?.addEventListener("input",()=>{
      if(typeof window.cat==="string" && window.cat==="todos")renderFromSupabase();
    });

    setTimeout(()=>{
      if(typeof window.cat==="undefined" || window.cat==="todos")renderFromSupabase();
    },100);
  }

  /* Como app.js usa let para cat, o valor não é window.cat.
     O listener abaixo detecta clique em "Todos" e renderiza novamente.
     Para pesquisa, o input também dispara a renderização própria. */
  document.addEventListener("click",e=>{
    const b=e.target.closest("#categories button");
    if(!b)return;
    if((b.textContent||"").includes("Todos"))setTimeout(renderFromSupabase,50);
  });

  const s=document.getElementById("search");
  s?.addEventListener("input",()=>setTimeout(renderFromSupabase,50));

  apply();
})();