/* Miguel Lanches — editor de produtos
   Correção do seletor de imagem no celular.
   Substitua o admin-produto-config.js atual por este arquivo.
*/
(function(){
  const CFG="produto_config";

  const esc=v=>String(v??"")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

  async function cfgAll(){
    const r=await db.from("configuracoes")
      .select("valor").eq("chave",CFG).maybeSingle();
    if(r.error)return{};
    try{return JSON.parse(r.data?.valor||"{}")||{}}
    catch{return{}}
  }

  async function saveCfg(v){
    const r=await db.from("configuracoes").upsert({
      chave:CFG,
      valor:JSON.stringify(v),
      updated_at:new Date().toISOString()
    },{onConflict:"chave"});
    if(r.error)throw r.error;
  }

  function compressFile(file){
    return new Promise((resolve,reject)=>{
      const fr=new FileReader();
      fr.onerror=()=>reject(new Error("Não foi possível ler a foto."));
      fr.onload=()=>{
        const im=new Image();
        im.onerror=()=>reject(new Error("Formato de imagem não suportado."));
        im.onload=()=>{
          const max=900;
          const scale=Math.min(1,max/Math.max(im.width,im.height));
          const c=document.createElement("canvas");
          c.width=Math.max(1,Math.round(im.width*scale));
          c.height=Math.max(1,Math.round(im.height*scale));
          const ctx=c.getContext("2d");
          ctx.drawImage(im,0,0,c.width,c.height);
          resolve(c.toDataURL("image/jpeg",.80));
        };
        im.src=fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function form(row={}){
    cfgAll().then(cfg=>{
      const x=cfg[row.id]||{descricao:"",mostrarDescricao:true};

      $("modalContent").innerHTML=`
        <h2>${row.id?"Editar":"Adicionar"} produto</h2>
        <div class="form">

          <label>Nome
            <input id="pfNome" value="${esc(row.nome||"")}">
          </label>

          <label>Categoria
            <select id="pfCat">
              ${state.cats.map(c=>`
                <option value="${esc(c.id)}"
                  ${String(c.id)===String(row.categoria_id)?"selected":""}>
                  ${esc(c.nome)}
                </option>`).join("")}
            </select>
          </label>

          <label>Preço
            <input id="pfPreco" type="number" step="0.01" value="${row.preco||0}">
          </label>

          <label>Imagem do produto</label>

          <div style="border:1px solid #e2e7ee;border-radius:12px;padding:12px;background:#fafbfc">
            <input id="pfFile" type="file" accept="image/*"
              style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none">

            <label for="pfFile"
              style="display:flex;align-items:center;justify-content:center;
              min-height:52px;background:#c71926;color:white;border-radius:10px;
              font-weight:850;font-size:16px;cursor:pointer;text-align:center;
              padding:10px">
              📷 ESCOLHER FOTO DA GALERIA
            </label>

            <div id="pfFileName"
              style="margin-top:8px;font-size:12px;color:#6d7788;text-align:center">
              Nenhuma foto selecionada
            </div>

            <div id="pfPreview" style="margin-top:10px"></div>
          </div>

          <label>URL da imagem (opcional)
            <input id="pfUrl" placeholder="https://..."
              value="${esc(row.imagem_url&&String(row.imagem_url).startsWith("data:")?"":row.imagem_url||"")}">
          </label>

          <label>Emoji reserva
            <input id="pfEmoji" value="${esc(row.emoji||"🍔")}">
          </label>

          <label>Ordem
            <input id="pfOrdem" type="number" value="${row.ordem||99}">
          </label>

          <label>Descrição do produto
            <textarea id="pfDesc"
              placeholder="Ex.: Hambúrguer artesanal, queijo cheddar e molho especial...">${esc(x.descricao||"")}</textarea>
          </label>

          <label class="check">
            <input id="pfShowDesc" type="checkbox"
              ${x.mostrarDescricao!==false?"checked":""}>
            Mostrar descrição quando o cliente abrir o produto
          </label>

          <div class="form-actions">
            <button class="mini" onclick="closeModal()">Cancelar</button>
            <button class="primary" id="pfSave">Salvar</button>
          </div>
        </div>`;

      let chosen="";

      const preview=src=>{
        const p=$("pfPreview");
        p.innerHTML=src
          ? `<img src="${esc(src)}" alt="Prévia"
               style="width:100%;max-height:230px;object-fit:cover;
               border-radius:12px;display:block">`
          :"";
      };

      if(row.imagem_url)preview(row.imagem_url);

      $("pfFile").addEventListener("change",async e=>{
        const f=e.target.files?.[0];
        if(!f)return;

        $("pfFileName").textContent=f.name;

        if(!f.type.startsWith("image/")){
          alert("Escolha uma imagem.");
          e.target.value="";
          $("pfFileName").textContent="Nenhuma foto selecionada";
          return;
        }

        try{
          chosen=await compressFile(f);
          preview(chosen);
        }catch(err){
          alert(err.message||"Não foi possível carregar a imagem.");
        }
      });

      $("pfUrl").addEventListener("input",()=>{
        if(!$("pfFile").files?.length)
          preview($("pfUrl").value.trim());
      });

      $("pfSave").onclick=async()=>{
        const data={
          nome:$("pfNome").value.trim(),
          categoria_id:$("pfCat").value,
          preco:Number($("pfPreco").value||0),
          imagem_url:chosen||$("pfUrl").value.trim()||null,
          emoji:$("pfEmoji").value.trim()||"🍔",
          ordem:Number($("pfOrdem").value||99),
          ativo:true
        };

        if(!data.nome)return alert("Informe o nome do produto.");

        const r=row.id
          ?await db.from("produtos").update(data).eq("id",row.id)
          :await db.from("produtos").insert(data).select().single();

        if(r.error)return alert(r.error.message);

        const id=row.id||r.data?.id;
        const all=await cfgAll();
        all[id]={
          descricao:$("pfDesc").value.trim(),
          mostrarDescricao:$("pfShowDesc").checked
        };

        try{
          await saveCfg(all);
        }catch(e){
          return alert("Produto salvo, mas a descrição não foi salva: "+e.message);
        }

        closeModal();
        await loadAll();
      };

      $("modal").classList.remove("hidden");
    });
  }

  const oldNew=window.adminNew;
  const oldEdit=window.adminEdit;

  window.adminNew=function(t){
    if(t==="produtos")return form({});
    return oldNew(t);
  };

  window.adminEdit=function(t,id){
    if(t==="produtos")
      return form(state.products.find(p=>String(p.id)===String(id))||{});
    return oldEdit(t,id);
  };
})();