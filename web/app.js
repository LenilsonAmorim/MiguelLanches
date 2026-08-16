const SUPABASE_URL = "https://lifsxhyeqwppfvajvhpn.supabase.co";
const SUPABASE_KEY = "sb_publishable_Pgwh6gfcWc9JXorI5VlcnA_6MvHzGcQ";

let supabaseClient = null;

let carrinho = [];
let pedidos = [];

let categoriaAtual = "todos";
let pedidoSelecionado = null;


/* ==============================
   PRODUTOS
============================== */

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


/* ==============================
   FUNÇÕES BÁSICAS
============================== */

function pegar(id) {
  return document.getElementById(id);
}


function moeda(valor) {
  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );
}


/* ==============================
   MOSTRAR PRODUTOS
============================== */

function mostrarProdutos() {

  const area = pegar("productsGrid");

  if (!area) {
    return;
  }

  const campo = pegar("productSearch");

  const busca = campo
    ? campo.value.toLowerCase().trim()
    : "";


  const lista = produtos.filter(function(produto) {

    const categoriaCorreta =
      categoriaAtual === "todos" ||
      produto.categoria === categoriaAtual;


    const buscaCorreta =
      busca === "" ||
      produto.nome.toLowerCase().includes(busca);


    return categoriaCorreta && buscaCorreta;

  });


  if (lista.length === 0) {

    area.innerHTML = `
      <div class="empty-state">
        Nenhum produto encontrado.
      </div>
    `;

    return;
  }


  area.innerHTML = lista.map(function(produto) {

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
              ${moeda(produto.preco)}
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


/* ==============================
   CATEGORIAS
============================== */

function selecionarCategoria(categoria) {

  categoriaAtual = categoria;


  const botoes =
    document.querySelectorAll(".category");


  botoes.forEach(function(botao) {

    botao.classList.remove("active");

    if (
      botao.dataset.category === categoria
    ) {

      botao.classList.add("active");

    }

  });


  mostrarProdutos();

}


/* ==============================
   CARRINHO
============================== */

function adicionarProduto(id) {

  const produto =
    produtos.find(function(item) {

      return item.id === Number(id);

    });


  if (!produto) {
    return;
  }


  const existente =
    carrinho.find(function(item) {

      return item.id === produto.id;

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


  mostrarCarrinho();

}


function aumentarQuantidade(id) {

  const item =
    carrinho.find(function(produto) {

      return produto.id === Number(id);

    });


  if (!item) {
    return;
  }


  item.quantidade++;

  mostrarCarrinho();

}


function diminuirQuantidade(id) {

  const item =
    carrinho.find(function(produto) {

      return produto.id === Number(id);

    });


  if (!item) {
    return;
  }


  item.quantidade--;


  if (item.quantidade <= 0) {

    carrinho =
      carrinho.filter(function(produto) {

        return produto.id !== Number(id);

      });

  }


  mostrarCarrinho();

}


function removerProduto(id) {

  carrinho =
    carrinho.filter(function(produto) {

      return produto.id !== Number(id);

    });


  mostrarCarrinho();

}


function limparCarrinho() {

  carrinho = [];

  mostrarCarrinho();

}


/* ==============================
   MOSTRAR CARRINHO
============================== */

function mostrarCarrinho() {

  const area = pegar("cartItems");

  if (!area) {
    return;
  }


  if (carrinho.length === 0) {

    area.innerHTML = `
      <div class="cart-empty">

        <strong>
          Sua comanda está vazia
        </strong>

        <span>
          Toque no + de um produto
          para adicionar.
        </span>

      </div>
    `;

    atualizarTotal();

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
                onclick="diminuirQuantidade(${item.id})">
                −
              </button>

              <span class="quantity-value">
                ${item.quantidade}
              </span>

              <button
                class="quantity-btn"
                type="button"
                onclick="aumentarQuantidade(${item.id})">
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
            ${moeda(subtotal)}
          </div>

        </div>
      `;

    }).join("");


  atualizarTotal();

}


/* ==============================
   TOTAL
============================== */

function calcularTotal() {

  return carrinho.reduce(
    function(total, item) {

      return total +
        item.preco *
        item.quantidade;

    },
    0
  );

}


function atualizarTotal() {

  const total =
    calcularTotal();


  if (pegar("subtotal")) {

    pegar("subtotal").textContent =
      moeda(total);

  }


  if (pegar("deliveryFee")) {

    pegar("deliveryFee").textContent =
      moeda(0);

  }


  if (pegar("cartTotal")) {

    pegar("cartTotal").textContent =
      moeda(total);

  }


  if (pegar("cartCount")) {

    const quantidade =
      carrinho.reduce(
        function(total, item) {

          return total +
            item.quantidade;

        },
        0
      );


    pegar("cartCount").textContent =
      quantidade +
      (
        quantidade === 1
          ? " item"
          : " itens"
      );

  }

}


/* ==============================
   PÁGINAS
============================== */

function abrirPagina(nome) {

  document
    .querySelectorAll(".page")
    .forEach(function(pagina) {

      pagina.classList.remove(
        "active-page"
      );

    });


  const pagina =
    pegar("page-" + nome);


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


  const titulo =
    pegar("pageTitle");


  if (titulo) {

    const nomes = {

      dashboard: "Fazer Pedido",

      comandas:
        "Comandas Abertas",

      historico:
        "Histórico de Pedidos",

      impressao:
        "Impressão"

    };


    titulo.textContent =
      nomes[nome] ||
      "Miguel Lanches";

  }

}


/* ==============================
   SUPABASE
============================== */

function conectarBanco() {

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

        console.log(
          "Supabase não carregou."
        );

        resolve();

      };


    document.head.appendChild(
      script
    );

  });

}


/* ==============================
   SALVAR PEDIDO
============================== */

async function finalizarPedido() {

  if (carrinho.length === 0) {

    alert(
      "Adicione pelo menos um produto."
    );

    return;
  }


  const cliente =
    pegar("cliente")
      ? pegar("cliente").value.trim()
      : "";


  if (!cliente) {

    alert(
      "Informe o nome do cliente."
    );

    return;
  }


  if (!supabaseClient) {

    alert(
      "Banco de dados ainda não conectado."
    );

    return;
  }


  const dados = {

    Cliente: cliente,

    telefone:
      pegar("telefone")
        ? pegar("telefone").value.trim()
        : "",

    endereco:
      pegar("endereco")
        ? pegar("endereco").value.trim()
        : "",

    referencia:
      pegar("referencia")
        ? pegar("referencia").value.trim()
        : "",

    observacoes:
      pegar("observacoes")
        ? pegar("observacoes").value.trim()
        : "",

    total:
      calcularTotal()

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


    alert(
      "Pedido salvo com sucesso!"
    );


    carrinho = [];

    mostrarCarrinho();


  } catch (erro) {

    console.error(erro);

    alert(
      "Erro ao salvar o pedido."
    );

  }

}


/* ==============================
   EVENTOS
============================== */

document.addEventListener(
  "DOMContentLoaded",
  async function() {


    /* PRODUTOS */

    mostrarProdutos();


    /* CARRINHO */

    mostrarCarrinho();


    /* CATEGORIAS */

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


    /* BUSCA */

    const busca =
      pegar("productSearch");


    if (busca) {

      busca.addEventListener(
        "input",
        function() {

          mostrarProdutos();

        }
      );

    }


    /* LIMPAR */

    const limpar =
      pegar("clearCart");


    if (limpar) {

      limpar.addEventListener(
        "click",
        limparCarrinho
      );

    }


    /* FINALIZAR */

    const finalizar =
      pegar("finishBtn");


    if (finalizar) {

      finalizar.addEventListener(
        "click",
        finalizarPedido
      );

    }


    /* MENU */

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


    /* MENU MOBILE */

    const menu =
      pegar("menuToggle");


    if (menu) {

      menu.addEventListener(
        "click",
        function() {

          const sidebar =
            pegar("sidebar");


          if (sidebar) {

            sidebar.classList.toggle(
              "open"
            );

          }

        }
      );

    }


    /* BANCO */

    await conectarBanco();

  }
);
