/* Miguel Lanches - impressão 58 mm */
function imprimirPedido(id){
  const p = state.orders.find(x => String(x.id) === String(id));
  if(!p) return alert("Pedido não encontrado.");

  const itens = itemsOf(p.observacoes);
  const mEntrega = String(p.observacoes || "").match(/\[ML_ENTREGA\]([\s\S]*?)\[\/ML_ENTREGA\]/);
  const entrega = mEntrega ? Number(mEntrega[1] || 0) : 0;
  const obsLimpa = String(p.observacoes || "")
    .replace(/\[ML_ITENS\][\s\S]*?\[\/ML_ITENS\]/g,"")
    .replace(/\[ML_ENTREGA\][\s\S]*?\[\/ML_ENTREGA\]/g,"")
    .replace(/\[ML_STATUS\][\s\S]*?\[\/ML_STATUS\]/g,"")
    .trim();

  const linhas = itens.length ? itens.map(x => {
    const adicionais = (x.adicionais || []).map(a => a.nome).join(", ");
    return `<div class="item">
      <div class="row"><span><b>${esc(x.quantidade)}x</b> ${esc(x.nome)}</span><b>${money(Number(x.preco||0)*Number(x.quantidade||1))}</b></div>
      ${adicionais ? `<div class="sub">+ ${esc(adicionais)}</div>` : ""}
      ${x.obs ? `<div class="sub">Obs: ${esc(x.obs)}</div>` : ""}
    </div>`;
  }).join("") : `<div class="item">Itens não encontrados.</div>`;

  const w = window.open("", "_blank", "width=420,height=700");
  if(!w) return alert("O navegador bloqueou a impressão. Permita pop-ups para este site.");

  const pedido = String(p.id).slice(-5);
  const data = p.created_at ? new Date(p.created_at).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR");

  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Miguel Lanches - Pedido #${esc(pedido)}</title>
<style>
@page{size:58mm auto;margin:0}
*{box-sizing:border-box}
body{width:58mm;margin:0;padding:3mm;font-family:Arial,sans-serif;font-size:12px;color:#000}
.center{text-align:center}.logo{font-size:18px;font-weight:900}
.line{border-top:1px dashed #000;margin:7px 0}
.row{display:flex;justify-content:space-between;gap:5px}
.item{padding:5px 0;border-bottom:1px dotted #777}
.sub{font-size:10px;margin-top:2px}
.total{font-size:16px;font-weight:900;margin-top:7px}
.small{font-size:10px}
</style></head><body>
<div class="center"><div class="logo">MIGUEL LANCHES</div><div class="line"></div>
<b>PEDIDO: #${esc(pedido)}</b><br><span class="small">${esc(data)}</span></div>
<div class="line"></div>
<div><b>CLIENTE:</b> ${esc(p.Cliente || "Não informado")}</div>
<div><b>TELEFONE:</b> ${esc(p.telefone || "—")}</div>
<div><b>ENDEREÇO:</b> ${esc(p.endereco || "—")}</div>
<div><b>REF:</b> ${esc(p.referencia || "—")}</div>
<div class="line"></div><div class="center"><b>ITENS DO PEDIDO</b></div>
${linhas}
${obsLimpa ? `<div class="line"></div><div><b>OBSERVAÇÕES:</b><br>${esc(obsLimpa)}</div>` : ""}
<div class="line"></div>
${entrega ? `<div class="row"><span>Entrega</span><b>${money(entrega)}</b></div>` : ""}
<div class="row total"><span>TOTAL</span><span>${money(p.total)}</span></div>
<div class="line"></div><div class="center"><b>OBRIGADO!</b></div>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
</body></html>`);
  w.document.close();
}

function orderCard(p){
  let s=statusOf(p.observacoes),
      it=itemsOf(p.observacoes),
      sum=it.map(x=>`${x.quantidade}x ${x.nome}`).join(", ");

  return `<div class="order-card">
    <h3>#${String(p.id).slice(-5)} — ${esc(p.Cliente||"Cliente")}</h3>
    <div class="meta">${esc(sum||"Pedido")} · ${money(p.total)} · ${new Date(p.created_at).toLocaleString("pt-BR")}</div>
    <span class="badge ${s==="entrega"?"green":""}">${s==="preparo"?"🍔 Em preparo":"🛵 Saiu para entrega"}</span>
    <div class="order-actions">
      <button class="action print" onclick="imprimirPedido('${p.id}')">🖨️ Imprimir</button>
      ${s==="preparo"
        ? `<button class="action green" onclick="changeStatus('${p.id}','entrega')">🛵 Saiu para entrega</button>`
        : `<button class="action green" onclick="changeStatus('${p.id}','entregue')">✓ Entregue</button>`}
      <button class="action red" onclick="cancelOrder('${p.id}')">Cancelar</button>
      ${p.telefone ? `<button class="action whats" onclick="wa('${p.id}')">WhatsApp</button>` : ""}
    </div>
  </div>`;
}
