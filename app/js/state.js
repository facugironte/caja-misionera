"use strict";

// Subir cuando cambia la forma del estado persistido de forma incompatible
// (ej. catálogo de productos / pools de stock). Estados guardados con otro
// número se descartan y se arranca de cero.
var STATE_SCHEMA = 8;

function freshStandState(key) {
  return {
    schema: STATE_SCHEMA,
    corte: 1,
    setupDone: false,
    cajaInicial: 0,
    corteApertura: null,
    corteCajaInicial: 0,
    totals: { ventas: 0, efectivo: 0, qr: 0, tarjeta: 0, otro: 0 },
    cumulative: { ventas: 0, efectivo: 0, qr: 0, tarjeta: 0, otro: 0, retirado: 0 },
    log: [],
    counted: null,
    pools: (STANDS[key].pools || []).map(function (p) {
      return Object.assign({}, p, { level: levelFor(p.stock, p.thresholds) });
    }),
    products: STANDS[key].products.map(function (p) {
      return Object.assign({}, p, { level: levelFor(p.stock, p.thresholds) });
    })
  };
}

function validPersistedState(o) { return !!o && o.schema === STATE_SCHEMA; }

var state = {};
Object.keys(STANDS).forEach(function (key) {
  state[key] = freshStandState(key);
});

function stateKey(tipo, identificador) {
  return "cajaMisioneraState:" + tipo + ":" + slugify(identificador);
}
function saveState() {
  if (!session || !nav.stand) return;
  try { localStorage.setItem(stateKey(session.tipo, session.identificador), JSON.stringify(state[nav.stand])); } catch (e) {}
}
function loadState(tipo, identificador) {
  try {
    var raw = localStorage.getItem(stateKey(tipo, identificador));
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function clearState(tipo, identificador) {
  try { localStorage.removeItem(stateKey(tipo, identificador)); } catch (e) {}
}
