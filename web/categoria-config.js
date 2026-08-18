/* Miguel Lanches — configuração por categoria
   Complemento: não substitui web/app.js.
   Coloque este arquivo depois de app.js.
*/
(function(){
  const KEY="categoria_config";
  const dbx=window.db || (window.supabase ? window.supabase.createClient(
    "https://lifsxhyeqwppfvajvhpn.supabase.co",
    "sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ"
  ):null);
  if(!dbx)return;

  async function getCfg(){
    const r=await dbx.from("configuracoes").select("valor").eq("chave",KEY).maybeSingle();
    try{return JSON.parse(r.data?.valor||"{}")}catch{return{}}
  }
  async function saveCfg(cfg){
    const r=await dbx.from("configuracoes").upsert(
      {chave:KEY,valor:JSON.stringify(cfg)},
      {onConflict:"chave"}
    );
    if(r.error)throw r.error;
  }

  window.MiguelCategoriaConfig={getCfg,saveCfg};

  /* Encontra a configuração da categoria de um produto. */
  window.MiguelGetCategoriaConfig=async function(categoriaId){
    const cfg=await getCfg();
    return cfg[String(categoriaId)]||{ingredientes:false,observacao:false};
  };

  /* Painel para a aba Categorias. */
  window.renderConfiguracaoCategorias=async function(container){
    if(!container)return;
    const cats=(window.state?.cats||[]);
    const cfg=await getCfg();

    container.innerHTML=`<div class="panel">
      <h2>⚙️ Opções por categoria</h2>
      <p class="muted">Escolha o que aparece quando o cliente abre um produto.</p>
      <div id="mlCatCfgList">
      ${cats.map(c=>{
        const x=cfg[String(c.id)]||{};
        return `<div class="ml-cat-config">
          <div class="ml-cat-name">${c.emoji||"📦"} ${esc(c.nome)}</div>
          <label><input type="checkbox" data-cat="${c.id}" data-opt="ingredientes" ${x.ingredientes!==false?"checked":""}> Ingredientes adicionais</label>
          <label><input type="checkbox" data-cat="${c.id}" data-opt="observacao" ${x.observacao!==false?"checked":""}> Observação</label>
        </div>`
      }).join("")}</div>
      <button class="primary" id="mlSaveCatCfg">Salvar configurações</button>
    </div>`;

    container.querySelector("#mlSaveCatCfg").onclick=async()=>{
      container.querySelectorAll("[data-cat]").forEach(el=>{
        const id=String(el.dataset.cat);
        cfg[id]=cfg[id]||{ingredientes:true,observacao:true};
        cfg[id][el.dataset.opt]=el.checked;
      });
      try{await saveCfg(cfg);alert("Configurações salvas.");}
      catch(e){alert("Erro ao salvar: "+e.message)}
    };
  };

  /* Reabre a configuração quando a aba Categorias for selecionada. */
  function hook(){
    const tab=document.querySelector('.admin-tab[data-admin="categorias"]');
    if(!tab)return setTimeout(hook,300);
    tab.addEventListener("click",()=>setTimeout(()=>{
      const c=document.getElementById("adminContent");
      if(c)window.renderConfiguracaoCategorias(c);
    },80));
  }
  hook();
})();
