/* Miguel Lanches — central de pedidos mobile */
(()=>{
  const css=`
  .orders-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:start}
  .orders-column{background:#f3f4f6;border:1px solid #e2e4e8;border-radius:18px;padding:12px;min-height:220px}
  .orders-column-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .orders-column-head h2{font-size:18px;margin:0}.orders-column-head b{background:#111;color:#fff;border-radius:999px;padding:4px 9px;font-size:13px}
  .orders-column.new-col{border-top:4px solid #f0bf00}.orders-column.prep-col{border-top:4px solid #b71924}.orders-column.delivery-col{border-top:4px solid #2563eb}.orders-column.done-col{border-top:4px solid #16a34a}
  .board-empty{padding:28px 8px;text-align:center;color:#8a8f98;font-size:14px}
  .board-card{background:#fff;border:1px solid #e2e4e8;border-radius:15px;padding:14px;margin-bottom:10px;box-shadow:0 3px 12px rgba(0,0,0,.06)}
  .board-card:last-child{margin-bottom:0}.board-card.new-card{box-shadow:0 4px 16px rgba(183,25,36,.13);border-color:#f0d67a}
  .board-top{display:flex;justify-content:space-between;gap:8px}.board-top h3{margin:0;font-size:17px}.board-time{font-size:12px;color:#777;white-space:nowrap}
  .board-client{font-weight:800;margin:9px 0 5px}.board-items{font-size:14px;line-height:1.5}.board-items>div{padding:3px 0;border-bottom:1px solid #f0f0f0}.board-items>div:last-child{border-bottom:0}
  .board-address{font-size:13px;color:#666;margin-top:8px}.board-total{display:flex;justify-content:space-between;align-items:center;margin-top:11px;padding-top:10px;border-top:1px dashed #ddd;font-size:18px}
  .board-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.board-actions button{min-height:42px;border:0;border-radius:10px;font-weight:800;font-size:14px;cursor:pointer}.btn-print{background:#111;color:#fff}.btn-primary{background:#f5c21b;color:#111}.btn-danger{background:#f3f4f6;color:#b42318}.btn-blue{background:#2563eb;color:#fff}.btn-green{background:#16a34a;color:#fff}
  @media(max-width:900px){.orders-board{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:620px){.orders-board{grid-template-columns:1fr;gap:10px}.orders-column{min-height:0}.board-card{padding:13px}.page-head h1{font-size:26px}.page-head p{font-size:14px}.head-actions{display:none}}
  `;
  const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);

  function renderBoard(){
    const host=document.getElementById('orders');
    if(!host||typeof state==='undefined')return;

    const groups=[
      ['novo','Pedido novo','new-col'],
      ['preparo','Preparando','prep-col'],
      ['entrega','Saiu para entrega','delivery-col'],
      ['entregue','Entregue','done-col']
    ];

    const card=o=>{
      const st=statusOf(o.observacoes);
      const its=itemsOf(o.observacoes);
      const obs=String(o.observacoes||'').replace(/\[ML_[A-Z_]+\][\s\S]*?\[\/ML_[A-Z_]+\]/g,'').trim();

      return `<article class="board-card ${st==='novo'?'new-card':''}">
        <div class="board-top">
          <h3>Pedido #${String(o.id).slice(-5)}</h3>
          <span class="board-time">${new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
        </div>
        <div class="board-client">${esc(o.Cliente||'Cliente')}</div>
        <div class="board-items">
          ${its.map(i=>`<div>
            <b>${Number(i.quantidade||1)}x</b> ${esc(i.nome)}
            <span class="muted">${money(Number(i.preco||0)*Number(i.quantidade||1))}</span>
            ${i.adicionais?.length?`<br><small>+ ${i.adicionais.map(a=>esc(a.nome)).join(', ')}</small>`:''}
            ${i.obs?`<br><small>Obs: ${esc(i.obs)}</small>`:''}
          </div>`).join('')||'<div>Itens não detalhados</div>'}
        </div>
        <div class="board-address">
          ${esc(o.endereco||'Retirada')}${o.referencia?` · ${esc(o.referencia)}`:''}
        </div>
        ${obs?`<div class="board-address"><b>Obs:</b> ${esc(obs)}</div>`:''}
        <div class="board-total"><span>Total</span><b>${money(o.total)}</b></div>
        <div class="board-actions">
          <button class="btn-print" data-board-print="${o.id}">Imprimir</button>
          ${st==='novo'?`
            <button class="btn-primary" data-board-status="${o.id}" data-next="preparo">Preparar</button>
            <button class="btn-danger" data-board-status="${o.id}" data-next="cancelado">Cancelar</button>`:''}
          ${st==='preparo'?`<button class="btn-blue" data-board-status="${o.id}" data-next="entrega">Sair para entrega</button>`:''}
          ${st==='entrega'?`<button class="btn-green" data-board-status="${o.id}" data-next="entregue">Entregue</button>`:''}
        </div>
      </article>`;
    };

    host.className='orders-board';
    host.innerHTML=groups.map(([st,title,cl])=>{
      const arr=state.orders.filter(o=>statusOf(o.observacoes)===st);
      return `<section class="orders-column ${cl}">
        <div class="orders-column-head"><h2>${title}</h2><b>${arr.length}</b></div>
        ${arr.map(card).join('')||'<div class="board-empty">Nenhum pedido</div>'}
      </section>`;
    }).join('');

    document.querySelectorAll('[data-board-print]').forEach(b=>{
      b.onclick=()=>printOrder(state.orders.find(o=>String(o.id)===String(b.dataset.boardPrint)));
    });

    document.querySelectorAll('[data-board-status]').forEach(b=>{
      b.onclick=async()=>{
        const o=state.orders.find(x=>String(x.id)===String(b.dataset.boardStatus));
        if(!o)return;
        if(b.dataset.next==='cancelado'&&!confirm('Cancelar este pedido?'))return;
        await changeStatus(o.id,b.dataset.next);
      };
    });
  }

  window.renderOrders=renderBoard;

  window.addEventListener('load',()=>{
    setTimeout(()=>{
      if(typeof nav==='function')nav('pedidos');
      renderBoard();
    },80);
  });
})();