const SUPABASE_URL =
  "https://lifsxhyeqwppfvajvhpn.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";

let supabaseClient = null;

let carrinho = [];

let pedidos = [];

let pedidoSelecionado = null;

let categoriaAtual = "todos";


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

const produtos = [

  {
    id: 1,
    nome: "X-Burger",
    categoria: "lanches",
    preco: 18,
    emoji: "🍔"
  },

  {
    id: 2,
    nome: "X-Egg Bacon",
    categoria: "lanches",
    preco: 20,
    emoji: "🍔"
  },

  {
    id: 3,
    nome: "X-Salada",
    categoria: "lanches",
    preco: 19,
    emoji: "🍔"
  },

  {
    id: 4,
    nome: "X-Frango",
    categoria: "lanches",
    preco: 17,
    emoji: "🍔"
  },

  {
    id: 5,
    nome: "Cachorro Quente",
    categoria: "lanches",
    preco: 13,
    emoji: "🌭"
  },

  {
    id: 6,
    nome: "X-Calabresa",
    categoria: "lanches",
    preco: 19,
    emoji: "🍔"
  },

  {
    id: 7,
    nome: "X-Tudo",
    categoria: "lanches",
    preco: 24,
    emoji: "🍔"
  },

  {
    id: 8,
    nome: "Duplo Burger",
    categoria: "lanches",
    preco: 22,
    emoji: "🍔"
  },

  {
    id: 9,
    nome: "Batata Frita",
    categoria: "porcoes",
    preco: 15,
    emoji: "🍟"
  },

  {
    id: 10,
    nome: "Calabresa",
    categoria: "porcoes",
    preco: 20,
    emoji: "🍟"
  },

  {
    id: 11,
    nome: "Frango",
    categoria: "porcoes",
    preco: 22,
    emoji: "🍗"
  },

  {
    id: 12,
    nome: "Coca-Cola Lata",
    categoria: "bebidas",
    preco: 5,
    emoji: "🥤"
  },

  {
    id: 13,
    nome: "Guaraná",
    categoria: "bebidas",
    preco: 5,
    emoji: "🥤"
  },

  {
    id: 14,
    nome: "Suco",
    categoria: "bebidas",
    preco: 7,
    emoji: "🧃"
  },

  {
    id: 15,
    nome: "Açaí",
    categoria: "sobremesas",
    preco: 12,
    emoji: "🍧"
  },

  {
    id: 16,
    nome: "Pudim",
    categoria: "sobremesas",
    preco: 8,
    emoji: "🍮"
  }

];


/* =========================
   PRODUTOS NA TELA
========================= */

function mostrarProdutos() {

  const grid = $("productsGrid");

  if (!grid) {
    return;
  }

  const campo = $("productSearch");

  const busca =
    campo
      ? campo.value.trim().toLowerCase()
      : "";

  const filtrados =
    produtos.filter(function(produto) {

      const categoria =
        String(produto.categoria)
          .toLowerCase();

      const nome =
        String(produto.nome)
          .toLowerCase();

      const categoriaOK =
        categoriaAtual === "todos" ||
        categoria === categoriaAtual;

      const buscaOK =
        !busca ||
        nome.includes(busca);

      return categoriaOK && buscaOK;

    });


  if (filtrados.length === 0) {

    grid.innerHTML = `
      <div class="empty-state">
        Nenhum produto encontrado.
      </div>
    `;

    return;
  }


  grid.innerHTML =
    filtrados.map(function(produto) {

      return `

        <article class="product-card">

          <div class="product-image">
            ${produto.emoji}
          </div>

          <div class="product-info">

            <div class="product-name">
              ${produto.nome}
            </div>

            <div class="product-bottom">

              <span class="product-price">
                ${dinheiro(produto.preco)}
              </span>

              <button
                class="add-product"
                type="button"
                onclick="adicionarProduto(${produto.id})">
                +
              </button>

            </div>

          </div>

        </article>

      `;

    }).join("");

}


/* =========================
   CATEGORIAS
========================= */

function selecionarCategoria(categoria) {

  categoriaAtual = categoria;

  document
    .querySelectorAll(".category")
    .forEach(function(botao) {

      botao.classList.remove("active");

      if (
        botao.dataset.category === categoria
      ) {

        botao.classList.add("active");

      }

    });

  mostrarProdutos();

}


/* =========================
   CARRINHO
========================= */

function adicionarProduto(id) {

  const produto =
    produtos.find(function(item) {

      return item.id === id;

    });


  if (!produto) {
    return;
  }


  const existente =
    carrinho.find(function(item) {

      return item.id === id;

    });


  if (existente) {

    existente.quantidade++;

  } else {

    carrinho.push({

      id: produto.id,

      nome: produto.nome,

      preco: produto.preco,

      quantidade: 1

    });

  }


  renderCarrinho();

}


function alterarQuantidade(id, valor) {

  const item =
    carrinho.find(function(produto) {

      return produto.id === id;

    });


  if (!item) {
    return;
  }


  item.quantidade += valor;


  if (item.quantidade <= 0) {

    carrinho =
      carrinho.filter(function(produto) {

        return produto.id !== id;

      });

  }


  renderCarrinho();

}


function removerProduto(id) {

  carrinho =
    carrinho.filter(function(item) {

      return item.id !== id;

    });

  renderCarrinho();

}


function limparCarrinho() {

  carrinho = [];

  renderCarrinho();

}


function renderCarrinho() {

  const area = $("cartItems");

  if (!area) {
    return;
  }


  if (carrinho.length === 0) {

    area.innerHTML = `

      <div class="cart-empty">

        🛒

        <strong>
          Sua comanda está vazia
        </strong>

        <span>
          Toque no + de um produto
          para adicionar.
        </span>

      </div>

    `;

    atualizarTotais();

    return;
  }


  area.innerHTML =
    carrinho.map(function(item) {

      const subtotal =
        item.preco * item.quantidade;

      return `

        <div class="cart-item">

          <div>

            <div class="cart-item-name">
              ${item.nome}
            </div>

            <div class="cart-item-controls">

              <button
                class="quantity-btn"
                type="button"
                onclick="alterarQuantidade(${item.id}, -1)">
                −
              </button>

              <span class="quantity-value">
                ${item.quantidade}
              </span>

              <button
                class="quantity-btn"
                type="button"
                onclick="alterarQuantidade(${item.id}, 1)">
                +
              </button>

              <button
                class="remove-item"
                type="button"
                onclick="removerProduto(${item.id})">
                🗑
              </button>

            </div>

          </div>

          <div class="cart-item-price">
            ${dinheiro(subtotal)}
          </div>

        </div>

      `;

    }).join("");


  atualizarTotais();

}


/* =========================
   TOTAIS
========================= */

function calcularSubtotal() {

  return carrinho.reduce(
    function(total, item) {

      return total +
        item.preco *
        item.quantidade;

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
   PÁGINAS
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


  if (nome === "comandas") {

    mostrarComandas();

  }


  if (nome === "historico") {

    mostrarHistorico();

  }


  if (nome === "impressao") {

    mostrarPreVisualizacao();

  }


  if ($("sidebar")) {

    $("sidebar").classList.remove(
      "open"
    );

  }

}


/* =========================
   SUPABASE
========================= */

function conectarSupabase() {

  return new Promise(function(resolve) {

    if (window.supabase) {

      supabaseClient =
        window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_KEY
        );

      resolve();

      return;
    }


    const script =
      document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";


    script.onload =
      function() {

        supabaseClient =
          window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
          );

        resolve();

      };


    script.onerror =
      function() {

        resolve();

      };


    document.head.appendChild(
      script
    );

  });

}


/* =========================
   SALVAR PEDIDO
========================= */

async function enviarPedido() {

  if (carrinho.length === 0) {

    alert(
      "Adicione pelo menos um produto."
    );

    return;
  }


  const cliente =
    $("cliente")
      ? $("cliente").value.trim()
      : "";


  if (!cliente) {

    alert(
      "Informe o nome do cliente."
    );

    return;
  }


  if (!supabaseClient) {

    alert(
      "Banco ainda não conectado."
    );

    return;
  }


  const dados = {

    Cliente: cliente,

    telefone:
      $("telefone")
        ? $("telefone").value.trim()
        : "",

    endereco:
      $("endereco")
        ? $("endereco").value.trim()
        : "",

    referencia:
      $("referencia")
        ? $("referencia").value.trim()
        : "",

    observacoes:
      $("observacoes")
        ? $("observacoes").value.trim()
        : "",

    total:
      calcularSubtotal()

  };


  try {

    const resposta =
      await supabaseClient
        .from("pedidos")
        .insert(dados)
        .select()
        .single();


    if (resposta.error) {

      throw resposta.error;

    }


    const pedido =
      resposta.data;


    const itens =
      carrinho.map(function(item) {

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

      });


    const respostaItens =
      await supabaseClient
        .from("itens_pedido")
        .insert(itens);


    if (respostaItens.error) {

      throw respostaItens.error;

    }


    pedidoSelecionado =
      pedido;


    alert(
      "Pedido #" +
      String(pedido.id)
        .padStart(3, "0") +
      " salvo com sucesso!"
    );


    carrinho = [];

    renderCarrinho();

    limparFormulario();

    carregarPedidos();

  }
  catch (erro) {

    console.error(erro);

    alert(
      "Não foi possível salvar o pedido."
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
   PEDIDOS
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
            ascending: false
          }
        );


    if (resposta.error) {
      return;
    }


    pedidos =
      resposta.data || [];


    mostrarComandas();

    mostrarHistorico();

  }
  catch (erro) {

    console.error(erro);

  }

}


function mostrarComandas() {

  const area =
    $("openOrders");

  if (!area) {
    return;
  }


  if (pedidos.length === 0) {

    area.innerHTML =
      `<div class="empty-state">
        Nenhuma comanda encontrada.
      </div>`;

    return;
  }


  area.innerHTML =
    pedidos.map(function(pedido) {

      return `

        <div class="order-card">

          <strong>
            Comanda #${String(pedido.id)
              .padStart(3, "0")}
          </strong>

          <p>
            Cliente:
            ${pedido.Cliente || "-"}
          </p>

          <strong>
            ${dinheiro(pedido.total)}
          </strong>

          <br><br>

          <button
            class="secondary-btn"
            type="button"
            onclick="selecionarPedido(${pedido.id})">
            Ver / Imprimir
          </button>

        </div>

      `;

    }).join("");

}


function mostrarHistorico() {

  const tabela =
    $("historyTable");

  if (!tabela) {
    return;
  }


  if (pedidos.length === 0) {

    tabela.innerHTML = `
      <tr>
        <td colspan="5"
          class="empty-cell">
          Nenhum pedido encontrado.
        </td>
      </tr>
    `;

    return;
  }


  tabela.innerHTML =
    pedidos.map(function(pedido) {

      const data =
        pedido.created_at
          ? new Date(
              pedido.created_at
            ).toLocaleString("pt-BR")
          : "-";


      return `

        <tr>

          <td>
            #${String(pedido.id)
              .padStart(3, "0")}
          </td>

          <td>
            ${pedido.Cliente || "-"}
          </td>

          <td>
            ${data}
          </td>

          <td>
            ${dinheiro(pedido.total)}
          </td>

          <td>

            <button
              class="secondary-btn"
              type="button"
              onclick="selecionarPedido(${pedido.id})">
              Ver
            </button>

          </td>

        </tr>

      `;

    }).join("");

}


function selecionarPedido(id) {

  pedidoSelecionado =
    pedidos.find(function(pedido) {

      return Number(pedido.id) ===
        Number(id);

    });


  if (!pedidoSelecionado) {
    return;
  }


  abrirPagina("impressao");

  mostrarPreVisualizacao();

}


/* =========================
   IMPRESSÃO
========================= */

function mostrarPreVisualizacao() {

  const area =
    $("printPreview");

  if (!area) {
    return;
  }


  if (!pedidoSelecionado) {

    area.innerHTML = `
      <div class="receipt-empty">
        Selecione um pedido para visualizar.
      </div>
    `;

    return;
  }


  area.innerHTML = `

    <div style="
      text-align:center;
      font-size:20px;
      font-weight:bold;
    ">

      MIGUEL LANCHES

    </div>

    <hr>

    PEDIDO:
    #${String(pedidoSelecionado.id)
      .padStart(3, "0")}

    <br><br>

    CLIENTE:
    ${pedidoSelecionado.Cliente || ""}

    <br>

    TELEFONE:
    ${pedidoSelecionado.telefone || ""}

    <br>

    ENDEREÇO:
    ${pedidoSelecionado.endereco || ""}

    <br>

    REF:
    ${pedidoSelecionado.referencia || ""}

    <hr>

    TOTAL:
    ${dinheiro(pedidoSelecionado.total)}

    <hr>

    <strong>
      Obrigado pela preferência!
    </strong>

  `;

}


/* =========================
   INICIALIZAÇÃO
========================= */

document.addEventListener(
  "DOMContentLoaded",
  async function() {

    mostrarProdutos();

    renderCarrinho();


    document
      .querySelectorAll(".category")
      .forEach(function(botao) {

        botao.addEventListener(
          "click",
          function() {

            selecionarCategoria(
              botao.dataset.category
            );

          }
        );

      });


    if ($("productSearch")) {

      $("productSearch")
        .addEventListener(
          "input",
          mostrarProdutos
        );

    }


    document
      .querySelectorAll(".menu-item")
      .forEach(function(botao) {

        botao.addEventListener(
          "click",
          function() {

            abrirPagina(
              botao.dataset.page
            );

          }
        );

      });


    if ($("menuToggle")) {

      $("menuToggle")
        .addEventListener(
          "click",
          function() {

            $("sidebar")
              .classList.toggle("open");

          }
        );

    }


    if ($("clearCart")) {

      $("clearCart")
        .addEventListener(
          "click",
          limparCarrinho
        );

    }


    if ($("finishBtn")) {

      $("finishBtn")
        .addEventListener(
          "click",
          enviarPedido
        );

    }


    if ($("printBtn")) {

      $("printBtn")
        .addEventListener(
          "click",
          function() {

            if (carrinho.length === 0) {

              alert(
                "Adicione produtos à comanda."
              );

              return;

            }

            pedidoSelecionado = {

              id: "NOVO",

              Cliente:
                $("cliente")
                  ? $("cliente").value
                  : "",

              telefone:
                $("telefone")
                  ? $("telefone").value
                  : "",

              endereco:
                $("endereco")
                  ? $("endereco").value
                  : "",

              referencia:
                $("referencia")
                  ? $("referencia").value
                  : "",

              total:
                calcularSubtotal()

            };

            abrirPagina(
              "impressao"
            );

            mostrarPreVisualizacao();

          }
        );

    }


    if ($("doPrintBtn")) {

      $("doPrintBtn")
        .addEventListener(
          "click",
          function() {

            window.print();

          }
        );

    }


    await conectarSupabase();

    await carregarPedidos();

  }
);
