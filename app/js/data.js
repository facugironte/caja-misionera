"use strict";

function levelFor(stock, t) {
  if (stock <= 0) return "agotado";
  if (stock >= t.mucho) return "mucho";
  if (stock >= t.medio) return "medio";
  if (stock >= t.poco) return "poco";
  return "critico";
}
var LEVEL_LABEL = { mucho: "MUCHO", medio: "MEDIO", poco: "POCO", critico: "CRÍTICO", agotado: "AGOTADO" };
var PAY_ICON = { efectivo: "💵", transferencia: "📲", tarjeta: "💳", otro: "🧾" };

function product(id, icon, name, price, opts) {
  opts = opts || {};
  return {
    id: id, icon: icon, name: name, price: price,
    controlled: !!opts.controlled,
    stock: opts.stock || 0,
    thresholds: opts.thresholds || { mucho: 100, medio: 40, poco: 10 },
    approxLabel: opts.approxLabel || null,
    sold: 0
  };
}

var STANDS = {
  buffet: {
    label: "Buffet", sub: "Comidas y bebidas", icon: "🍔",
    products: [
      product("hamb", "🍔", "Hamburguesa", 5000, { controlled: true, stock: 347, thresholds: { mucho: 200, medio: 100, poco: 21 } }),
      product("chori", "🌭", "Choripán", 4000, { controlled: true, stock: 82, thresholds: { mucho: 150, medio: 60, poco: 21 } }),
      product("coca", "🥤", "Coca-Cola", 2000, { controlled: true, stock: 95, thresholds: { mucho: 250, medio: 120, poco: 31 }, approxLabel: function (s) { return "≈ " + s + " vasos"; } }),
      product("cafe", "☕", "Café", 1500, { controlled: true, stock: 126, thresholds: { mucho: 100, medio: 50, poco: 11 } }),
      product("papas", "🍟", "Papas fritas", 3000, { controlled: true, stock: 15, thresholds: { mucho: 150, medio: 60, poco: 20 } }),
      product("agua", "💧", "Agua mineral", 1500, { controlled: true, stock: 0, thresholds: { mucho: 100, medio: 40, poco: 11 } })
    ]
  },
  tickets: {
    label: "Tickets", sub: "Fichas y planillas", icon: "🎟️",
    products: [
      product("ficha1", "🎫", "Ficha x1", 500, { stock: 5000, thresholds: { mucho: 2000, medio: 800, poco: 200 } }),
      product("ficha10", "🎟️", "Planilla x10", 4500, { stock: 500, thresholds: { mucho: 200, medio: 80, poco: 20 } }),
      product("ficha20", "🎟️", "Planilla x20", 8500, { stock: 250, thresholds: { mucho: 100, medio: 40, poco: 10 } }),
      product("fichajuego", "🎯", "Ficha juego", 500, { stock: 3000, thresholds: { mucho: 1500, medio: 600, poco: 150 } })
    ]
  },
  entradas: {
    label: "Entradas", sub: "Acceso al evento", icon: "🎪",
    products: [
      product("entgen", "🎫", "Entrada general", 3000, { stock: 600, thresholds: { mucho: 300, medio: 150, poco: 40 } }),
      product("entnino", "🧒", "Entrada niño", 1500, { stock: 300, thresholds: { mucho: 150, medio: 70, poco: 20 } }),
      product("entfam", "👨‍👩‍👧‍👦", "Entrada familiar", 9000, { controlled: true, stock: 40, thresholds: { mucho: 150, medio: 80, poco: 21 } }),
      product("bono", "🙏", "Bono contribución", 2000, { stock: 1000, thresholds: { mucho: 400, medio: 150, poco: 40 } })
    ]
  }
};

var PAY_METHODS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "transferencia", label: "Transferencia" },
  { id: "tarjeta", label: "Tarjeta" },
  { id: "otro", label: "Otro" }
];
