/* Miguel Lanches - bairros e taxas de entrega */
const ML_SUPABASE_URL="https://lifsxhyeqwppfvajvhpn.supabase.co";
const ML_SUPABASE_KEY="sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
const ML_DB=window.supabase.createClient(ML_SUPABASE_URL,ML_SUPABASE_KEY);
const ML_money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const ML_esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

async function ML_loadBairros(){
  const r=await ML_DB.from("bairros").select("*").order("nome");
  if(r.error){console.error(r.error);return[];}
  return r.data||[];
}

async function ML_renderBairros(){
  const c=document.getElementById("adminContent");
  if(!c)return;
  const list=await ML_loadBairros();
  c.innerHTML=`<div class="panel">
    <div class="admin-top"><h2>📍 Bairros e valores de entrega</h2></div>
    <div class="form">
      <label>Nome do bairro<input id="mlBairroNome" placeholder="Ex.: Centro"></label>
      <label>Valor da entrega (R$)<input id="mlBairroTaxa" type="number" min="0" step="0.01" placeholder="Ex.: 5,00"></label>
      <button class="primary" id="mlBairroAdd">+ Adicionar bairro</button>
    </div>
    <div style="margin-top:18px">
      ${list.length?list.map(b=>`<div class="admin-row">
        <div class="grow"><h3>📍 ${ML_esc(b.nome)}</h3><small>Entrega: ${ML_money(b.taxa_entrega)} · ${b.ativo?"Ativo":"Inativo"}</small></div>
        <div class="row-actions">
          <button class="mini" data-edit="${b.id}">Editar</button>
          <button class="mini ${b.ativo?"danger":""}" data-toggle="${b.id}" data-active="${b.ativo}">${b.ativo?"Desativar":"Ativar"}</button>
        </div>
      </div>`).join(""):`<div class="empty">Nenhum bairro cadastrado.</div>`}
    </div>
  </div>`;

  document.getElementById("mlBairroAdd").onclick=async()=>{
    const nome=document.getElementById("mlBairroNome").value.trim();
    const taxa=Number(document.getElementById("mlBairroTaxa").value||0);
    if(!nome)return alert("Informe o bairro.");
    if(taxa<0)return alert("O valor não pode ser negativo.");
    const r=await ML_DB.from("bairros").insert({nome,taxa_entrega:taxa,ativo:true});
    if(r.error)return alert("Erro ao adicionar bairro: "+r.error.message);
    await ML_renderBairros();
  };

  c.querySelectorAll("[data-edit]").forEach(btn=>btn.onclick=async()=>{
    const b=list.find(x=>String(x.id)===String(btn.dataset.edit));
    if(!b)return;
    const nome=prompt("Nome do bairro:",b.nome);
    if(nome===null)return;
    if(!nome.trim())return alert("Informe o bairro.");
    const taxa=prompt("Valor da entrega (R$):",String(b.taxa_entrega??0).replace(".",","));
    if(taxa===null)return;
    const valor=Number(String(taxa).replace(",","."));
    if(Number.isNaN(valor)||valor<0)return alert("Informe um valor válido.");
    const r=await ML_DB.from("bairros").update({nome:nome.trim(),taxa_entrega:valor}).eq("id",b.id);
    if(r.error)return alert("Erro ao editar bairro: "+r.error.message);
    await ML_renderBairros();
  });

  c.querySelectorAll("[data-toggle]").forEach(btn=>btn.onclick=async()=>{
    const id=btn.dataset.toggle;
    const ativo=btn.dataset.active!=="true";
    const r=await ML_DB.from("bairros").update({ativo}).eq("id",id);
    if(r.error)return alert("Erro ao alterar bairro: "+r.error.message);
    await ML_renderBairros();
  });
}

function ML_injetarAbaBairros(){
  const tabs=document.querySelector(".admin-tabs");
  if(!tabs)return false;
  let tab=tabs.querySelector('.admin-tab[data-admin="bairros"]');
  if(!tab){
    tab=document.createElement("button");
    tab.className="admin-tab";
    tab.dataset.admin="bairros";
    tab.type="button";
    tab.textContent="📍 Bairros";
    const pagamento=tabs.querySelector('.admin-tab[data-admin="pagamento"]');
    if(pagamento)tabs.insertBefore(tab,pagamento);
    else tabs.appendChild(tab);
  }
  if(!tab.dataset.mlBound){
    tab.dataset.mlBound="1";
    tab.addEventListener("click",()=>setTimeout(ML_renderBairros,50));
  }
  return true;
}

function ML_hookBairros(){
  if(!ML_injetarAbaBairros())setTimeout(ML_hookBairros,300);
}
ML_hookBairros();
