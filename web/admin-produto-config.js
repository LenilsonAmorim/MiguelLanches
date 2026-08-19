/* Miguel Lanches — seletor de imagem V2
   Usa showOpenFilePicker quando disponível e fallback para input=file.
   Arquivo novo para evitar cache do Pages.
*/
(function(){
  const CFG="produto_config";
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function cfgAll(){
    const r=await db.from("configuracoes").select("valor").eq("chave",CFG).maybeSingle();
    if(r.error)return{};
    try{return JSON.parse(r.data?.valor||"{}")||{}}catch{return{}}
  }
  async function saveCfg(v){
    const r=await db.from("configuracoes").upsert({
      chave:CFG,valor:JSON.stringify(v),updated_at:new Date().toISOString()
    },{onConflict:"chave"});
    if(r.error)throw r.error;
  }

  function compress(file){
    return new Promise((resolve,reject)=>{
      const fr=new FileReader();
      fr.onerror=()=>reject(new Error("Não foi possível ler a foto."));
      fr.onload=()=>{
        const im=new Image();
        im.onerror=()=>reject(new Error("Não foi possível abrir esta imagem."));
        im.onload=()=>{
          const max=1000, s=Math.min(1,max/Math.max(im.width,im.height));
          const c=document.createElement("canvas");
          c.width=Math.max(1,Math.round(im.width*s));
          c.height=Math.max(1,Math.round(im.height*s));
          c.getContext("2d").drawImage(im,0,0,c.width,c.height);
          resolve(c.toDataURL("image/jpeg",.82));
        };
        im.src=fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  async function chooseImage(){
    if(window.showOpenFilePicker){
      try{
        const [handle]=await window.showOpenFilePicker({
          multiple:false,
          types:[{
            description:"Imagens",
            accept:{"image/*":[".jpg",".jpeg",".png",".webp",".gif"]}
          }]
        });
        return await handle.getFile();
      }catch(e){
        if(e && e.name==="AbortError") return null;
      }
    }
    return new Promise(resolve=>{
      const input=document.createElement("input");
      input.type="file";
      input.accept="image/*";
      input.style.position="fixed";
      input.style.left="-10000px";
      document.body.appendChild(input);
      input.onchange=()=>{
        const f=input.files?.[0]||null;
        input.remove();
        resolve(f);
      };
      input.click();
    });
  }

  async function form(row={}){
    const cfg=await cfgAll();
    const x=cfg[row.id]||{descricao:"",mostrarDescricao:true};

    $("modalContent").innerHTML=`
      <h2>${row.id?"Editar":"Adicionar"} produto</h2>
      <div class="form">
        <label>Nome<input id="pfNome" value="${esc(row.nome||"")}"></label>
        <label>Categoria<select id="pfCat">
          ${state.cats.map(c=>`<option value="${esc(c.id)}"
            ${String(c.id)===String(row.categoria_id)?"selected":""}>${esc(c.nome)}</option>`).join("")}
        </select></label>
        <label>Preço<input id="pfPreco" type="number" step="0.01" value="${row.preco||0}"></label>

        <label>Imagem do produto</label>
        <button type="button" id="pfChoose"
          style="width:100%;min-height:58px;border:0;border-radius:12px;
          background:#c71926;color:#fff;font-weight:900;font-size:16px">
          📷 ESCOLHER FOTO DO CELULAR
        </button>
        <div id="pfFileName" style="text-align:center;font-size:12px;color:#687385">
          Nenhuma foto selecionada
        </div>
        <div id="pfPreview" style="margin-top:10px"></div>

        <label>URL da imagem (opcional)
          <input id="pfUrl" placeholder="https://..." value="${esc(row.imagem_url||"")}">
        </label>
        <label>Emoji reserva<input id="pfEmoji" value="${esc(row.emoji||"🍔")}"></label>
        <label>Ordem<input id="pfOrdem" type="number" value="${row.ordem||99}"></label>
        <label>Descrição do produto
          <textarea id="pfDesc" placeholder="Ex.: Hambúrguer artesanal...">${esc(x.descricao||"")}</textarea>
        </label>
        <label class="check">
          <input id="pfShowDesc" type="checkbox" ${x.mostrarDescricao!==false?"checked":""}>
          Mostrar descrição quando o cliente abrir o produto
        </label>
        <div class="form-actions">
          <button class="mini" onclick="closeModal()">Cancelar</button>
          <button class="primary" id="pfSave">Salvar</button>
        </div>
      </div>`;

    let chosen="";
    const preview=src=>{
      $("pfPreview").innerHTML=src
        ? `<img src="${esc(src)}" alt="Prévia"
            style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;display:block">`
        :"";
    };
    if(row.imagem_url)preview(row.imagem_url);

    $("pfChoose").onclick=async()=>{
      const btn=$("pfChoose");
      btn.disabled=true;
      btn.textContent="Abrindo galeria...";
      try{
        const f=await chooseImage();
        if(!f){btn.textContent="📷 ESCOLHER FOTO DO CELULAR";return}
        $("pfFileName").textContent="Processando: "+f.name;
        chosen=await compress(f);
        preview(chosen);
        $("pfFileName").textContent="✓ Foto selecionada: "+f.name;
      }catch(e){
        alert(e.message||"Não foi possível selecionar a imagem.");
      }finally{
        btn.disabled=false;
        if(!chosen)btn.textContent="📷 ESCOLHER FOTO DO CELULAR";
      }
    };

    $("pfUrl").oninput=()=>{
      if(!chosen)preview($("pfUrl").value.trim());
    };

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

      const id=row.id||r.data?.id, all=await cfgAll();
      all[id]={descricao:$("pfDesc").value.trim(),
        mostrarDescricao:$("pfShowDesc").checked};
      try{await saveCfg(all)}
      catch(e){return alert("Produto salvo, mas a descrição não foi salva: "+e.message)}
      closeModal();
      await loadAll();
    };

    $("modal").classList.remove("hidden");
  }

  const oldNew=window.adminNew, oldEdit=window.adminEdit;
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