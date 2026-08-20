/* Cliente: carregamento das opções configuradas no Admin */
async function getProductOptions(produtoId){
  const [{data:opts},{data:cfg}] = await Promise.all([
    db.from("opcoes_produto").select("*").eq("produto_id",produtoId).eq("ativo",true).order("ordem"),
    db.from("configuracao_opcoes").select("*").eq("produto_id",produtoId).maybeSingle()
  ]);
  return {options:opts||[], limit:Math.max(1,Number(cfg?.limite||1)), type:cfg?.tipo||"sabor"};
}
