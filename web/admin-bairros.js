/* Miguel Lanches - bairros e taxas de entrega
   Este arquivo substitui a tela "Entrega" do painel administrativo.
*/
const ML_SUPABASE_URL="https://lifsxhyeqwppfvajvhpn.supabase.co";
const ML_SUPABASE_KEY="sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";
const ML_DB=window.supabase.createClient(ML_SUPABASE_URL,ML_SUPABASE_KEY);
const ML_money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const ML_esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

async function ML_loadBairros(){
  const r=await ML_DB.from("bairros").select("*").order("nome");
  return r.data||[];
}
async function ML_renderBairros(){
  const c=document.getElementById("adminContent");if(!c)return;
  const list=await ML_loadBairros();
  c.innerHTML=`<div class="panel"><div class="admin-top"><h2>📍 Bairros e taxas de entrega</h2></div>
  <div class="form"><label>Nome do bairro<input id="mlBairroNome" placeholder="Ex.: Centro"></label>
  <label>Taxa de entrega<input id="mlBairroTaxa" type="number" min="0" step="0.01" placeholder="Ex.: 5.00"></label>
  <button class="primary" id="mlBairroAdd">+ Adicionar bairro</button></div>
  <div style="margin-top:18px">${list.length?list.map(b=>`<div class="admin-row"><div class="grow"><h3>📍 ${ML_esc(b.nome)}</h3><small>${ML_money(b.taxa_entrega)} · ${b.ativo?"Ativo":"Inativo"}</small></div><div class="row-actions"><button class="mini" data-edit="${b.id}">Editar</button><button class="mini ${b.ativo?"danger":""}" data-toggle="${b.id}" data-active="${b.ativo}">${b.ativo?"Desativar":"Ativar"}</button></div></div>`).join(""):`<div class="empty">Nenhum bairro cadastrado.</div>`}</div></div>`;
  document.getElementById("mlBairroAdd").onclick=async()=>{
    const nome=document.getElementById("mlBairroNome").value.trim(),taxa=Number(document.getElementById("mlBairroTaxa").value||0);
    if(!nome)return alert("Informe o bairro.");if(taxa<0)return alert("A taxa não pode ser negativa.");
    const r=await ML_DB.from("bairros").insert({nome,taxa_entrega:taxa,ativo:true});
    if(r.error)return alert(r.error.message);ML_renderBairros();
  };
  c.querySelectorAll("[data-edit]").forEach(btn=>btn.onclick=async()=>{
    const b=list.find(x=>String(x.id)===String(btn.dataset.edit));if(!b)return;
    const nome=prompt("Nome do bairro:",b.nome);if(nome===null)return;
    const taxa=prompt("Taxa de entrega:",b.taxa_entrega);if(taxa===null)return;
    const r=await ML_DB.from("bairros").update({nome:nome.trim(),taxa_entrega:Number(taxa||0)}).eq("id",b.id);
    if(r.error)return alert(r.error.message);ML_renderBairros();
  });
  c.querySelectorAll("[data-toggle]").forEach(btn=>btn.onclick=async()=>{
    const id=btn.dataset.toggle,ativo=btn.dataset.active!=="true";
    const r=await ML_DB.from("bairros").update({ativo}).eq("id",id);
    if(r.error)return alert(r.error.message);ML_renderBairros();
  });
}
function ML_hookEntrega(){
  const tab=document.querySelector('.admin-tab[data-admin="entrega"]');
  if(!tab)return setTimeout(ML_hookEntrega,300);
  tab.addEventListener("click",()=>setTimeout(ML_renderBairros,50));
}
ML_hookEntrega();