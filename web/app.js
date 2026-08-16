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

function conectarSupabase
