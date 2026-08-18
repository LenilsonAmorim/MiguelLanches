/*
Miguel Lanches - Administração de bairros/entrega.
Use estas funções na seção Administração existente.
A lista é armazenada em configuracoes.chave = bairros_entrega,
como JSON: [{"nome":"Centro","taxa":5},{"nome":"Lagoa Nova","taxa":7}]
*/
async function carregarBairrosAdmin(){
  const r=await db.from("configuracoes").select("valor").eq("chave","bairros_entrega").maybeSingle();
  let lista=[];try{lista=JSON.parse(r.data?.valor||"[]")}catch{}
  return Array.isArray(lista)?lista:[];
}
async function salvarBairrosAdmin(lista){
  const valor=JSON.stringify(lista);
  const r=await db.from("configuracoes").upsert({chave:"bairros_entrega",valor},{onConflict:"chave"});
  if(r.error)throw r.error;
}
async function renderBairrosAdmin(container){
  const lista=await carregarBairrosAdmin();
  container.innerHTML=`<div class="admin-section"><h2>📍 Bairros e taxas de entrega</h2><div class="form-row"><input id="bairroAdminNome" placeholder="Nome do bairro"><input id="bairroAdminTaxa" type="number" min="0" step="0.01" placeholder="Taxa (R$)"><button class="primary" id="bairroAdminAdd">Adicionar bairro</button></div><div id="bairroAdminList">${lista.map((b,i)=>`<div class="admin-item"><span>📍 ${esc(b.nome)} — ${money(b.taxa)}</span><div><button onclick="editarBairroAdmin(${i})">Editar</button><button onclick="excluirBairroAdmin(${i})">Excluir</button></div></div>`).join("")||"<p>Nenhum bairro cadastrado.</p>"}</div></div>`;
  document.getElementById("bairroAdminAdd").onclick=async()=>{
    const nome=document.getElementById("bairroAdminNome").value.trim(),taxa=Number(document.getElementById("bairroAdminTaxa").value||0);
    if(!nome)return alert("Informe o bairro.");if(taxa<0)return alert("A taxa não pode ser negativa.");
    lista.push({nome,taxa});await salvarBairrosAdmin(lista);await renderBairrosAdmin(container);
  };
  window.editarBairroAdmin=async i=>{const nome=prompt("Nome do bairro:",lista[i].nome);if(nome===null)return;const taxa=prompt("Taxa de entrega:",lista[i].taxa);if(taxa===null)return;lista[i]={nome:nome.trim(),taxa:Number(taxa||0)};await salvarBairrosAdmin(lista);await renderBairrosAdmin(container)};
  window.excluirBairroAdmin=async i=>{if(!confirm("Excluir este bairro?"))return;lista.splice(i,1);await salvarBairrosAdmin(lista);await renderBairrosAdmin(container)};
}