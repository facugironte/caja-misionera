"use strict";

function levelFor(stock, t) {
  if (stock <= 0) return "agotado";
  if (stock >= t.mucho) return "mucho";
  if (stock >= t.medio) return "medio";
  if (stock >= t.poco) return "poco";
  return "critico";
}
var LEVEL_LABEL = { mucho: "MUCHO", medio: "MEDIO", poco: "POCO", critico: "CRÍTICO", agotado: "AGOTADO" };
var LEVEL_ORDER = { mucho: 4, medio: 3, poco: 2, critico: 1, agotado: 0 };
var PAY_ICON = { efectivo: "💵", qr: "📲", tarjeta: "💳", otro: "🙏" };

// Stock compartido (ingrediente / recurso, ej. "Hamburguesa", "Bebida") del que
// descuentan uno o varios productos vendibles. `controlled` (por defecto true) se
// puede apagar desde la pantalla Stock: los combos que lo usan dejan de descontar
// de él y de limitarse por él.
function pool(id, icon, name, opts) {
  opts = opts || {};
  return {
    id: id, icon: icon, name: name,
    controlled: true, approxLabel: null,
    stock: opts.stock || 0,
    thresholds: opts.thresholds || { mucho: 100, medio: 40, poco: 10 }
  };
}

// Producto vendible (botón). `recipe` mapea id de pool -> unidades que descuenta por venta;
// si tiene recipe, el stock sale de los pools. `controlled` es el modo de stock propio
// (productos sin receta, ej. Café/Té/Torta). El control de stock de un combo se maneja
// en cada pool que usa (pool.controlled), no en el combo.
// `pairGroup` (opcional): id de un grupo en PAIR_GROUPS. Un producto con pairGroup no
// tiene precio propio (price: null) — su precio depende de cuántas unidades de ESE
// grupo (entre todos sus productos) haya en el carrito: se cobran de a pares al precio
// de PAIR_GROUPS[x].pairPrice (con la bebida de PAIR_GROUPS[x].bebidaPool incluida) y,
// si sobra una unidad suelta, esa se cobra a PAIR_GROUPS[x].singlePrice. Ver vender.js
// (buildPairGroups) para el armado de los pares/individual.
function product(id, icon, name, price, opts) {
  opts = opts || {};
  return {
    id: id, icon: icon, name: name, price: opts.pairGroup ? null : price,
    recipe: opts.recipe || null,
    pairGroup: opts.pairGroup || null,
    controlled: !!opts.controlled,
    stock: opts.stock || 0,
    thresholds: opts.thresholds || { mucho: 100, medio: 40, poco: 10 },
    approxLabel: opts.approxLabel || null,
    sold: 0
  };
}

// Reglas de precio "por pares" — ver comentario de `product()`.
var PAIR_GROUPS = {
  principales: {
    pairPrice: 18000, singlePrice: 10000, bebidaPool: "bebida",
    hint: "$10.000 · $18.000 el par"
  }
};

var STANDS = {
  buffet: {
    label: "Buffet", sub: "Comidas y bebidas", icon: "🍔", food: true,
    pools: [
      pool("chori", "🌭", "Choripán", { stock: 150, thresholds: { mucho: 100, medio: 50, poco: 20 } }),
      pool("hamb", "🍔", "Hamburguesa", { stock: 150, thresholds: { mucho: 100, medio: 50, poco: 20 } }),
      pool("hambveg", "🥬", "Hamburguesa veggie", { stock: 60, thresholds: { mucho: 40, medio: 20, poco: 8 } }),
      pool("bebida", "🥤", "Bebida", { stock: 200, thresholds: { mucho: 140, medio: 70, poco: 25 } }),
      pool("pizzeta", "🍕", "Pizzeta", { stock: 60, thresholds: { mucho: 40, medio: 20, poco: 8 } })
    ],
    products: [
      product("chori_main", "🌭", "Choripán", null, { recipe: { chori: 1 }, pairGroup: "principales" }),
      product("hamb_main", "🍔", "Hamburguesa", null, { recipe: { hamb: 1 }, pairGroup: "principales" }),
      product("hambveg_main", "🥬", "Hamburguesa veggie", null, { recipe: { hambveg: 1 }, pairGroup: "principales" }),
      product("bebida", "🥤", "Bebida", 1000, { recipe: { bebida: 1 } }),
      product("pizzeta_beb", "🍕", "Pizzeta + bebida (menores de 7)", 6000, { recipe: { pizzeta: 1, bebida: 1 } }),
      product("cafe", "☕", "Café", 1000, { controlled: true, stock: 100, thresholds: { mucho: 60, medio: 30, poco: 10 } }),
      product("te", "🍵", "Té", 1000, { controlled: true, stock: 60, thresholds: { mucho: 40, medio: 20, poco: 8 } }),
      product("torta", "🍰", "Torta", 3000, { controlled: true, stock: 40, thresholds: { mucho: 30, medio: 15, poco: 5 } }),
      product("cookie", "🍪", "Cookie / scon", 1000, { controlled: true, stock: 60, thresholds: { mucho: 40, medio: 20, poco: 8 } })
    ]
  },
  tickets: {
    label: "Tickets", sub: "Fichas para juegos", icon: "🎟️",
    products: [
      product("juego1", "🎯", "1 juego suelto", 1000),
      product("tira5", "🎟️", "1 tira (5)", 3000),
      product("tira10", "🎫", "2 tiras (10)", 5000)
    ]
  },
  entradas: {
    label: "Entradas", sub: "Acceso al evento", icon: "🎪",
    products: [
      product("entpuerta", "🎫", "Entrada en puerta", 2000)
    ]
  },
  rifas: {
    label: "Rifas", sub: "Números para el sorteo", icon: "🍀",
    pools: [
      pool("rifa", "🎟️", "Rifa", { stock: 1000, thresholds: { mucho: 500, medio: 200, poco: 50 } })
    ],
    products: [
      product("rifa1", "🎟️", "1 rifa", 4000, { recipe: { rifa: 1 } }),
      product("rifa3", "🍀", "3 rifas", 10000, { recipe: { rifa: 3 } })
    ]
  }
};

// El id interno "otro" se mantiene fijo (columna del Sheet, totals/cumulative);
// solo cambia la etiqueta visible a "Consumo misionero".
//   - "qr" (ex "transferencia"): id y columna del Sheet renombrados a "qr"/"monto_qr".
//   - "tarjeta": foodOnly -> solo en puestos con food:true.
//   - "otro" ("Consumo misionero"): stands -> solo en los puestos listados.
var PAY_METHODS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "qr", label: "QR" },
  { id: "tarjeta", label: "Tarjeta", foodOnly: true },
  { id: "otro", label: "Consumo misionero", stands: ["buffet"] }
];

// Métodos de pago disponibles en un puesto dado.
function payMethodsFor(standKey) {
  var s = STANDS[standKey] || {};
  return PAY_METHODS.filter(function (m) {
    if (m.stands) return m.stands.indexOf(standKey) >= 0;
    if (m.foodOnly) return !!s.food;
    return true;
  });
}
