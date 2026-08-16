const SUPABASE_URL =
  "https://lifsxhyeqwppfvajvhpn.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";

let supabaseClient = null;

let produtos = [];

let carrinho = [];

let pedidos = [];

let categoriaAtual = "todos";

let pedidoSelecionado = null;


/* =========================
   AUXILIARES
========================= */

function $(id) {
  return document.getElementById(id);
}


function dinheiro(valor) {

  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );

}


/* =========================
   PRODUTOS
========================= */

produtos = [

  {
    id: 1,
    nome: "X-Burger",
    categoria: "lanches",
    preco: 15,
    emoji: "🍔"
  },

  {
    id: 2,
    nome: "X-Salada",
    categoria: "lanches",
    preco: 18,
    emoji: "🍔"
  },

  {
    id: 3,
    nome: "X-Tudo",
    categoria: "lanches",
    preco: 25,
    emoji: "🍔"
  },

  {
    id: 4,
    nome: "Miguel Burguer",
    categoria: "lanches",
    preco: 22,
    emoji: "🍔"
  },

  {
    id: 5,
    nome: "Batata Frita",
    categoria: "porcoes",
    preco: 12,
    emoji: "🍟"
  },

  {
    id: 6,
    nome: "Calabresa",
    categoria: "porcoes",
    preco: 20,
    emoji: "🍟"
  },

  {
    id: 7,
    nome: "Frango",
    categoria: "porcoes",
    preco: 22,
    emoji: "🍗"
  },

  {
    id: 8,
    nome: "Coca-Cola",
    categoria: "bebidas",
    preco: 6,
    emoji: "🥤"
  },

  {
    id: 9,
    nome: "Guaraná",
    categoria: "bebidas",
    preco: 6,
    emoji: "🥤"
  },

  {
    id: 10,
    nome: "Suco",
    categoria: "bebidas",
    preco: 7,
    emoji: "🧃"
  },

  {
    id: 11,
    nome: "Açaí",
    categoria: "sobremesas",
    preco: 12,
    emoji: "🍧"
  },

  {
    id: 12,
    nome: "Pudim",
    categoria: "sobremesas",
    preco: 8,
    emoji: "🍮"
  }

];


/* =========================
   SUPABASE
========================= */

function conectarSupabase() {

  return new Promise(function(resolve, reject) {

    if (window.supabase) {

      try {

        supabaseClient =
          window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
          );

        resolve();

      } catch (erro) {

        reject(erro);

      }

      return;
    }


    const script =
      document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";


    script.onload = function() {

      try {

        supabaseClient =
          window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
          );

        resolve();

      } catch (erro) {

        reject(erro);

      }

    };


    script.onerror = function() {

      reject(
        new Error(
          "Não foi possível carregar o Supabase."
        )
      );

    };


    document.head.appendChild(script);

  });

}


/* =========================
   MENU
========================= */

const nomesPaginas = {

  dashboard:
    "Fazer Pedido",

  comandas:
    "Comandas Abertas",

  historico:
    "Histórico de Pedidos",

  impressao:
    "Impressão"

};


function abrirPagina(nome) {

  document
    .querySelectorAll(".page")
    .forEach(function(pagina) {

      pagina.classList.remove(
        "active-page"
      );

    });


  const pagina =
    $("page-" + nome);


  if (pagina) {

    pagina.classList.add(
      "active-page"
    );

  }


  document
    .querySelectorAll(".menu-item")
    .forEach(function(botao) {

      botao.classList.remove(
        "active"
      );


      if (
        botao.dataset.page === nome
      ) {

        botao.classList.add(
          "active"
        );

      }

    });


  if ($("pageTitle")) {

    $("pageTitle").textContent =
      nomesPaginas[nome] ||
      "Miguel Lanches";

  }


  if ($("sidebar")) {

    $("sidebar").classList.remove(
      "open"
    );

  }


  if (nome === "comandas") {

    mostrarComandas();

  }


  if (nome === "historico") {

    mostrarHistorico();

  }

}


/* =========================
   MOSTRAR PRODUTOS
========================= */

function mostrarProdutos() {

  const grid =
    $("productsGrid");


  if (!grid) {
    return;
  }


  const busca =
    $("productSearch")
      ? $("productSearch")
          .value
          .trim()
          .toLowerCase()
      : "";


  const filtrados =
    produtos.filter(
      function(produto) {

        const categoriaOK =
          categoriaAtual === "todos" ||
          produto.categoria ===
            categoriaAtual;


        const buscaOK =
          !busca ||
          produto.nome
            .toLowerCase()
            .includes(busca);


        return categoriaOK &&
          buscaOK;

      }
    );


  if (filtrados.length === 0) {

    grid.innerHTML =
      `
      <div class="empty-state">
        Nenhum produto encontrado.
      </div>
      `;

    return;

  }


  grid.innerHTML =
    filtrados.map(
      function(produto) {

        return `

          <article
            class="product-card"
          >

            <div
              class="product-image"
            >
              ${produto.emoji}
            </div>


            <div
              class="product-info"
            >

              <div
                class="product-name"
              >
                ${produto.nome}
              </div>


              <div
                class="product-bottom"
              >

                <span
                  class="product-price"
                >
                  ${dinheiro(
                    produto.preco
                  )}
                </span>


                <button
                  class="add-product"
                  type="button"
                  onclick="adicionarProduto(${produto.id})"
                >
                  +
                </button>

              </div>

            </div>

          </article>

        `;

      }
    ).join("");

}


/* =========================
   ADICIONAR PRODUTO
========================= */

function adicionarProduto(id) {

  const produto =
    produtos.find(
      function(item) {

        return item.id === id;

      }
    );


  if (!produto) {
    return;
  }


  const existente =
    carrinho.find(
      function(item) {

        return item.id === id;

      }
    );


  if (existente) {

    existente.quantidade += 1;

  } else {

    carrinho.push({

      id:
        produto.id,

      nome:
        produto.nome,

      preco:
        produto.preco,

      quantidade:
        1

    });

  }


  renderCarrinho();

}


/* =========================
   CARRINHO
========================= */

function renderCarrinho() {

  const container =
    $("cartItems");


  if (!container) {
    return;
  }


  if (carrinho.length === 0) {

    container.innerHTML =
      `
      <div class="cart-empty">

        🛒

        <strong>
          Sua comanda está vazia
        </strong>

        <span>
          Toque no + de um produto para adicionar.
        </span>

      </div>
      `;

    atualizarTotais();

    return;

  }


  container.innerHTML =
    carrinho.map(
      function(item) {

        const subtotal =
          item.preco *
          item.quantidade;


        return `

          <div
            class="cart-item"
          >

            <div>

              <div
                class="cart-item-name"
              >
                ${item.nome}
              </div>


              <div
                class="cart-item-controls"
              >

                <button
                  class="quantity-btn"
                  type="button"
                  onclick="alterarQuantidade(${item.id}, -1)"
                >
                  −
                </button>


                <span
                  class="quantity-value"
                >
                  ${item.quantidade}
                </span>


                <button
                  class="quantity-btn"
                  type="button"
                  onclick="alterarQuantidade(${item.id}, 1)"
                >
                  +
                </button>


                <button
                  class="remove-item"
                  type="button"
                  onclick="removerProduto(${item.id})"
                >
                  🗑
                </button>

              </div>

            </div>


            <div
              class="cart-item-price"
            >
              ${dinheiro(subtotal)}
            </div>

          </div>

        `;

      }
    ).join("");


  atualizarTotais();

}


/* =========================
   ALTERAR QUANTIDADE
========================= */

function alterarQuantidade(
  id,
  quantidade
) {

  const item =
    carrinho.find(
      function(produto) {

        return produto.id === id;

      }
    );


  if (!item) {
    return;
  }


  item.quantidade +=
    quantidade;


  if (
    item.quantidade <= 0
  ) {

    carrinho =
      carrinho.filter(
        function(produto) {

          return produto.id !== id;

        }
      );

  }


  renderCarrinho();

}


/* =========================
   REMOVER
========================= */

function removerProduto(id) {

  carrinho =
    carrinho.filter(
      function(item) {

        return item.id !== id;

      }
    );


  renderCarrinho();

}


/* =========================
   LIMPAR COMANDA
========================= */

function limparCarrinho() {

  if (
    carrinho.length === 0
  ) {

    return;

  }


  const confirmar =
    confirm(
      "Deseja limpar toda a comanda?"
    );


  if (!confirmar) {
    return;
  }


  carrinho = [];

  renderCarrinho();

}


/* =========================
   TOTAIS
========================= */

function calcularSubtotal() {

  return carrinho.reduce(
    function(total, item) {

      return total +
        (
          item.preco *
          item.quantidade
        );

    },
    0
  );

}


function atualizarTotais() {

  const subtotal =
    calcularSubtotal();


  const taxa = 0;


  const total =
    subtotal + taxa;


  if ($("subtotal")) {

    $("subtotal").textContent =
      dinheiro(subtotal);

  }


  if ($("deliveryFee")) {

    $("deliveryFee").textContent =
      dinheiro(taxa);

  }


  if ($("cartTotal")) {

    $("cartTotal").textContent =
      dinheiro(total);

  }


  if ($("cartCount")) {

    const quantidade =
      carrinho.reduce(
        function(total, item) {

          return total +
            item.quantidade;

        },
        0
      );


    $("cartCount").textContent =
      quantidade +
      (
        quantidade === 1
          ? " item"
          : " itens"
      );

  }

}


/* =========================
   LIMPAR FORMULÁRIO
========================= */

function limparFormulario() {

  if ($("cliente"))
    $("cliente").value = "";

  if ($("telefone"))
    $("telefone").value = "";

  if ($("endereco"))
    $("endereco").value = "";

  if ($("referencia"))
    $("referencia").value = "";

  if ($("observacoes"))
    $("observacoes").value = "";

}


/* =========================
   ENVIAR PEDIDO
========================= */

async function enviarPedido() {

  if (
    carrinho.length === 0
  ) {

    alert(
      "Adicione pelo menos um produto à comanda."
    );

    return;

  }


  if (!supabaseClient) {

    alert(
      "O banco ainda está conectando. Aguarde alguns segundos."
    );

    return;

  }


  const cliente =
    $("cliente")
      ? $("cliente")
          .value
          .trim()
      : "";


  const telefone =
    $("telefone")
      ? $("telefone")
          .value
          .trim()
      : "";


  const endereco =
    $("endereco")
      ? $("endereco")
          .value
          .trim()
      : "";


  const referencia =
    $("referencia")
      ? $("referencia")
          .value
          .trim()
      : "";


  const observacoes =
    $("observacoes")
      ? $("observacoes")
          .value
          .trim()
      : "";


  if (!cliente) {

    alert(
      "Informe o nome do cliente."
    );

    return;

  }


  const total =
    calcularSubtotal();


  try {

    const resposta =
      await supabaseClient
        .from("pedidos")
        .insert({

          Cliente:
            cliente,

          telefone:
            telefone,

          endereco:
            endereco,

          referencia:
            referencia,

          observacoes:
            observacoes,

          total:
            total

        })
        .select()
        .single();


    if (resposta.error) {

      throw resposta.error;

    }


    const pedido =
      resposta.data;


    const itens =
      carrinho.map(
        function(item) {

          return {

            pedido_id:
              pedido.id,

            produto:
              item.nome,

            quantidade:
              item.quantidade,

            preco_unitario:
              item.preco,

            subtotal:
              item.preco *
              item.quantidade

          };

        }
      );


    const respostaItens =
      await supabaseClient
        .from("itens_pedido")
        .insert(itens);


    if (
      respostaItens.error
    ) {

      throw respostaItens.error;

    }


    alert(
      "Pedido #" +
      String(
        pedido.id
      ).padStart(
        3,
        "0"
      ) +
      " salvo com sucesso!"
    );


    pedidoSelecionado =
      pedido;


    carrinho = [];


    limparFormulario();

    renderCarrinho();

    carregarPedidos();


  } catch (erro) {

    console.error(
      "Erro ao salvar pedido:",
      erro
    );


    alert(
      "Não foi possível salvar o pedido."
    );

  }

}


/* =========================
   CARREGAR PEDIDOS
========================= */

async function carregarPedidos() {

  if (!supabaseClient) {
    return;
  }


  try {

    const resposta =
      await supabaseClient
        .from("pedidos")
        .select("*")
        .order(
          "id",
          {
            ascending:
              false
          }
        );


    if (
      resposta.error
    ) {

      console.error(
        resposta.error
      );

      return;

    }


    pedidos =
      resposta.data || [];


    mostrarComandas();

    mostrarHistorico();


  } catch (erro) {

    console.error(
      erro
    );

  }

}


/* =========================
   COMANDAS
========================= */

function mostrarComandas() {

  const container =
    $("openOrders");


  if (!container) {
    return;
  }


  if (
    pedidos.length === 0
  ) {

    container.innerHTML =
      `
      <div class="empty-state">
        Nenhuma comanda aberta.
      </div>
      `;

    return;

  }


  container.innerHTML =
    pedidos.map(
      function(pedido) {

        return `

          <div
            class="order-card"
          >

            <strong>
              Comanda #${
                String(
                  pedido.id
                ).padStart(
                  3,
                  "0"
                )
              }
            </strong>

            <p>
              Cliente:
              ${
                pedido.Cliente ||
                "-"
              }
            </p>

            <strong>
              ${
                dinheiro(
                  pedido.total
                )
              }
            </strong>

            <br><br>

            <button
              class="secondary-btn"
              type="button"
              onclick="selecionarPedido(${pedido.id})"
            >
              Ver / Imprimir
            </button>

          </div>

        `;

      }
    ).join("");

}


/* =========================
   HISTÓRICO
========================= */

function mostrarHistorico() {

  const tabela =
    $("historyTable");


  if (!tabela) {
    return;
  }


  if (
    pedidos.length === 0
  ) {

    tabela.innerHTML =
      `
      <tr>

        <td
          colspan="5"
          class="empty-cell">

          Nenhum pedido encontrado.

        </td>

      </tr>
      `;

    return;

  }


  tabela.innerHTML =
    pedidos.map(
      function(pedido) {

        const data =
          pedido.created_at
            ? new Date(
                pedido.created_at
              ).toLocaleString(
                "pt-BR"
              )
            : "-";


        return `

          <tr>

            <td>
              #${
                String(
                  pedido.id
                ).padStart(
                  3,
                  "0"
                )
              }
            </td>

            <td>
              ${
                pedido.Cliente ||
                "-"
              }
            </td>

            <td>
              ${data}
            </td>

            <td>
              ${
                dinheiro(
                  pedido.total
                )
              }
            </td>

            <td>

              <button
                class="secondary-btn"
                type="button"
                onclick="selecionarPedido(${pedido.id})"
              >
                Ver
              </button>

            </td>

          </tr>

        `;

      }
    ).join("");

}


/* =========================
   SELECIONAR PEDIDO
========================= */

function selecionarPedido(id) {

  pedidoSelecionado =
    pedidos.find(
      function(pedido) {

        return Number(
          pedido.id
        ) === Number(id);

      }
    );


  if (
    !pedidoSelecionado
  ) {

    return;

  }


  abrirPagina(
    "impressao"
  );


  mostrarPreVisualizacao();

}


/* =========================
   PRÉ-VISUALIZAÇÃO
========================= */

function mostrarPreVisualizacao() {

  const area =
    $("printPreview");


  if (!area) {
    return;
  }


  if (
    !pedidoSelecionado
  ) {

    area.innerHTML =
      `
      <div class="receipt-empty">
        Selecione um pedido para visualizar.
      </div>
      `;

    return;

  }


  area.innerHTML = `

    <div
      style="
        text-align:center;
        font-size:20px;
        font-weight:bold;
      "
    >
      MIGUEL LANCHES
    </div>

    <hr>

    PEDIDO:
    #${
      String(
        pedidoSelecionado.id
      ).padStart(
        3,
        "0"
      )
    }

    <br><br>

    CLIENTE:
    ${
      pedidoSelecionado.Cliente ||
      ""
    }

    <br>

    TELEFONE:
    ${
      pedidoSelecionado.telefone ||
      ""
    }

    <br>

    ENDEREÇO:
    ${
      pedidoSelecionado.endereco ||
      ""
    }

    <br>

    REF:
    ${
      pedidoSelecionado.referencia ||
      ""
    }

    <hr>

    TOTAL:
    ${
      dinheiro(
        pedidoSelecionado.total
      )
    }

    <hr>

    <div
      style="
        text-align:center;
      "
    >
      Obrigado pela preferência!
    </div>

  `;

}


/* =========================
   IMPRIMIR
========================= */

function imprimirComandaAtual() {

  if (
    pedidoSelecionado
  ) {

    abrirPagina(
      "impressao"
    );

    mostrarPreVisualizacao();

    setTimeout(
      function() {

        window.print();

      },
      300
    );

    return;

  }


  if (
    carrinho.length === 0
  ) {

    alert(
      "A comanda está vazia."
    );

    return;

  }


  alert(
    "Finalize o pedido primeiro para gerar a comanda."
  );

}


/* =========================
   CATEGORIAS
========================= */

function configurarCategorias() {

  document
    .querySelectorAll(
      ".category"
    )
    .forEach(
      function(botao) {

        botao.addEventListener(
          "click",
          function() {

            document
              .querySelectorAll(
                ".category"
              )
              .forEach(
                function(item) {

                  item.classList.remove(
                    "active"
                  );

                }
              );


            this.classList.add(
              "active"
            );


            categoriaAtual =
              this.da
