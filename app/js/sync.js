"use strict";

var SYNC_URL_KEY = "cajaMisioneraWebAppUrl";
var SYNC_QUEUE_KEY = "cajaMisioneraPendingSync";
var syncing = false;
var DEFAULT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx2OcRP71M0H5E5feartLBC0-LCddaCGUToNzVOhj74Gi5oUQFTWQysqs3ckShF8Sg/exec";

function getWebAppUrl() {
  var stored = localStorage.getItem(SYNC_URL_KEY);
  return stored === null ? DEFAULT_WEB_APP_URL : stored;
}
function setWebAppUrl(url) {
  if (url) localStorage.setItem(SYNC_URL_KEY, url);
  else localStorage.removeItem(SYNC_URL_KEY);
}

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || "[]"); } catch (e) { return []; }
}
function saveQueue(q) { localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(q)); updateSyncBadge(); }
function pendingCount() { return loadQueue().length; }

function enqueuePayload(payload) {
  var q = loadQueue();
  q.push(payload);
  saveQueue(q);
}

function sendOne(payload) {
  var url = getWebAppUrl();
  if (!url) return Promise.reject(new Error("sin-url"));
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  }).then(function (res) {
    if (!res.ok) throw new Error("http-" + res.status);
    return res.json().catch(function () { return {}; });
  }).then(function (data) {
    if (data && data.ok === false) throw new Error(data.error || "rechazado");
    return true;
  });
}

function flushQueue() {
  if (syncing) return Promise.resolve();
  var q = loadQueue();
  if (!q.length) return Promise.resolve();
  syncing = true;
  return sendOne(q[0]).then(function () {
    var q2 = loadQueue();
    q2.shift();
    saveQueue(q2);
    syncing = false;
    return q2.length ? flushQueue() : null;
  }).catch(function () {
    syncing = false;
  });
}

function updateSyncBadge() {
  var n = pendingCount();
  var el = document.getElementById("syncBadge");
  if (el) {
    if (n > 0) {
      el.style.display = "flex";
      el.textContent = "🔄 " + n + " corte" + (n === 1 ? "" : "s") + " sin sincronizar";
    } else {
      el.style.display = "none";
    }
  }
  var lbl = document.getElementById("pendingCountLbl");
  if (lbl) lbl.textContent = n;
}

window.addEventListener("online", flushQueue);
setInterval(flushQueue, 20000);

// Filas de movimiento de stock para los items de una venta/anulación.
// Combos (con receta) -> una fila por ingrediente; productos con stock propio -> una fila.
function stockRowsForSale_(st, corteId, op, sign, tipo, motivo) {
  var rows = [];
  var base = {
    timestamp: op.time, puesto_tipo: session.tipo, puesto_id: session.identificador,
    voluntario: session.voluntario, corte_id: corteId, tipo: tipo, motivo: motivo,
    venta_id: (op.id || op.ventaId || ""), stock_resultante: ""
  };
  op.items.forEach(function (it) {
    var p = (st.products || []).filter(function (x) { return x.id === it.productId; })[0];
    if (!p) return;
    if (p.recipe) {
      Object.keys(p.recipe).forEach(function (poolId) {
        var pool = (st.pools || []).filter(function (x) { return x.id === poolId; })[0];
        if (pool && !pool.controlled) return;
        rows.push(Object.assign({}, base, { item: pool ? pool.name : poolId, delta: sign * p.recipe[poolId] * it.qty }));
      });
    } else if (p.controlled) {
      rows.push(Object.assign({}, base, { item: p.name, delta: sign * it.qty }));
    }
  });
  return rows;
}

function buildCortePayload(st, contado, esperado, diferencia, cierreTime, retiro, queda) {
  var corteId = slugify(session.identificador) + "-corte" + st.corte + "-" + Date.now();

  var detalleVentas = [];
  var movimientosStock = [];

  st.log.forEach(function (op) {
    if (op.type === "venta") {
      var estado = op.voided ? "anulada" : "activa";
      op.items.forEach(function (it) {
        detalleVentas.push({
          timestamp: op.time, venta_id: op.id || "",
          puesto_tipo: session.tipo, puesto_id: session.identificador, voluntario: session.voluntario,
          corte_id: corteId, producto: it.name, cantidad: it.qty,
          precio_unitario: it.price, subtotal: it.price * it.qty,
          metodo_pago: op.payMethod, estado: estado, total_venta: op.total
        });
      });
      movimientosStock = movimientosStock.concat(stockRowsForSale_(st, corteId, op, -1, "venta", "Venta"));
    } else if (op.type === "anulacion") {
      movimientosStock = movimientosStock.concat(stockRowsForSale_(st, corteId, op, 1, "anulacion_venta", "Anulación de venta"));
    } else if (op.type === "reposicion") {
      movimientosStock.push({
        timestamp: op.time, puesto_tipo: session.tipo, puesto_id: session.identificador,
        voluntario: session.voluntario, corte_id: corteId,
        tipo: op.delta < 0 ? "ajuste_resta" : "ajuste_suma",
        item: op.name, delta: op.delta, stock_resultante: op.stockResultante,
        venta_id: "", motivo: op.delta < 0 ? "Ajuste manual (resta)" : "Ajuste manual (suma)"
      });
    }
  });

  var cierre = cierreRow_("corte", st, cierreTime, {
    corte_id: corteId, apertura: st.corteApertura,
    cant_cortes: "", cant_ventas: st.totals.ventas, totals: st.totals,
    caja_inicial: st.corteCajaInicial, efectivo_esperado: esperado,
    efectivo_contado: contado, diferencia: diferencia,
    efectivo_retirado: retiro, efectivo_final: queda
  });

  return { token: puestoToken(), corte_id: corteId, detalleVentas: detalleVentas, movimientosStock: movimientosStock, cierre: cierre };
}

function buildCierrePuestoPayload(st, contado, retiro, cierreTime) {
  return cierreRow_("puesto", st, cierreTime, {
    corte_id: "", apertura: session.inicio,
    cant_cortes: st.corte, cant_ventas: st.cumulative.ventas, totals: st.cumulative,
    caja_inicial: st.cajaInicial, efectivo_esperado: "",
    efectivo_contado: contado, diferencia: "",
    efectivo_retirado: retiro, efectivo_final: 0
  });
}

// Fila común de la pestaña "Cierres" (sirve para el cierre de un corte y para el cierre final del puesto).
function cierreRow_(tipoCierre, st, cierreTime, o) {
  var t = o.totals;
  return {
    timestamp: cierreTime, tipo_cierre: tipoCierre,
    puesto_tipo: session.tipo, puesto_id: session.identificador, voluntario: session.voluntario,
    corte_id: o.corte_id, apertura: o.apertura, cierre: cierreTime,
    cant_cortes: o.cant_cortes, cant_ventas: o.cant_ventas,
    monto_efectivo: t.efectivo, monto_transferencia: t.transferencia,
    monto_tarjeta: t.tarjeta, monto_otro: t.otro,
    monto_total_vendido: t.efectivo + t.transferencia + t.tarjeta + t.otro,
    caja_inicial: o.caja_inicial, efectivo_esperado: o.efectivo_esperado,
    efectivo_contado: o.efectivo_contado, diferencia: o.diferencia,
    efectivo_retirado: o.efectivo_retirado, efectivo_final: o.efectivo_final
  };
}
