/* Miguel Lanches — pesquisa rápida de produtos no Admin */
(() => {
  const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const norm = v => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

  const css = document.createElement("style");
  css.textContent = `
    #mlProductSearchPanel{margin:0 0 18px;padding:16px;background:#fff;border:1px solid #e5e7eb;border-radius:14px}
    #mlProductSearchPanel .ml-search-row{display:flex;gap:10px;align-items:center}
    #mlProductSearchPanel input{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #d0d5dd;border-radius:10px;font-size:15px}
    #mlProductSearchCount{margin-top:8px;font-size:13px;color:#667085}
    #mlProductSearchResults{display:grid;gap:8px;margin-top:12px}
    .ml-product-result{display:flex;align-items:center;gap:12px;padding:10px;border:1px solid #eaecf0;border-radius:11px}
    .ml-product-result img,.ml-product-placeholder{width:48px;height:48px;object-fit:cover;border-radius:9px;flex:none}
    .ml-product-placeholder{display:grid;place-items:center;background:#f2f4f7}
    .ml-product-main{flex:1;min-width:0}.ml-product-main strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ml-product-main small{color:#667085}.ml-product-edit{border:0;border-radius:8px;padding:9px 12px;background:#b71924;color:#fff;font-weight:700}
  `;
  document.head.appendChild(css);

  let timer;
  async function search(term){
    const results=document.getElementById("mlProductSearchResults");
    const count=document.getElementById("mlProductSearchCount");
    if(!results||!count)return;
    const q=norm(term).trim();
    if(!q){results.innerHTML="";count.textContent="Digite o nome do produto ou categoria.";return;}

    const [pr,cr]=await Promise.all([
      db.from("produtos").select("id,nome,preco,imagem_url,emoji,categoria_id").eq("ativo",true).order("nome"),
      db.from("categorias").select("id,nome").order("ordem")
    ]);
    if(pr.error){count.textContent="Erro ao pesquisar: "+pr.error.message;return;}
    const cats=cr.data||[];
    const found=(pr.data||[]).filter(p=>{
      const c=cats.find(x=>String(x.id)===String(p.categoria_id));
      return norm(p.nome).includes(q)||norm(c?.nome).includes(q);
    });
    count.textContent=`${found.length} produto(s) encontrado(s)`;
    results.innerHTML=found.slice(0,100).map(p=>{
      const c=cats.find(x=>String(x.id)===String(p.categoria_id));
      const img=p.imagem_url;
      return `<div class="ml-product-result">
        ${img?`<img src="${esc(img)}" alt="" onerror="this.style.display='none'">`:`<div class="ml-product-placeholder">${esc(p.emoji||"🍔")}</div>`}
        <div class="ml-product-main"><strong>${esc(p.nome)}</strong><small>${esc(c?.nome||"Sem categoria")} · ${Number(p.preco||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</small></div>
        <button class="ml-product-edit" data-edit="${esc(p.id)}">Editar</button>
      </div>`;
    }).join("") || `<div style="padding:10px;color:#667085">Nenhum produto encontrado.</div>`;

    results.querySelectorAll("[data-edit]").forEach(b=>{
      b.onclick=()=>{
        if(typeof window.adminEdit==="function"){
          window.adminEdit("produtos",b.dataset.edit);
        }else{
          alert("O editor de produtos ainda não terminou de carregar.");
        }
      };
    });
  }

  function install(){
    const content=document.getElementById("adminContent");
    if(!content||document.getElementById("mlProductSearchPanel"))return;
    const panel=document.createElement("div");
    panel.id="mlProductSearchPanel";
    panel.innerHTML=`<div class="ml-search-row"><span style="font-size:20px">🔎</span><input id="mlProductSearch" type="search" placeholder="Pesquisar produto ou categoria..."></div><div id="mlProductSearchCount">Digite o nome do produto ou categoria.</div><div id="mlProductSearchResults"></div>`;
    content.parentNode.insertBefore(panel,content);
    panel.querySelector("input").addEventListener("input",e=>{
      clearTimeout(timer);timer=setTimeout(()=>search(e.target.value),180);
    });
  }

  new MutationObserver(install).observe(document.body,{childList:true,subtree:true});
  setTimeout(install,300);
})();
