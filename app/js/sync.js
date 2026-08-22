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

function buildCortePayload(st, contado, esperado, diferencia, cierreTime, retiro, queda) {
  var corteId = slugify(session.identificador) + "-corte" + st.corte + "-" + Date.now();
  var movimientos = [];
  st.log.forEach(function (op) {
    if (op.type === "venta") {
      op.items.forEach(function (it) {
        movimientos.push({
          timestamp: op.time, puesto_tipo: session.tipo, puesto_id: session.identificador,
          voluntario: session.voluntario, corte_id: corteId, tipo_movimiento: "venta",
          producto: it.name, cantidad: it.qty, motivo: "", monto: it.price * it.qty, metodo_pago: op.payMethod
        });
      });
    } else if (op.type === "anulacion") {
      op.items.forEach(function (it) {
        movimientos.push({
          timestamp: op.time, puesto_tipo: session.tipo, puesto_id: session.identificador,
          voluntario: session.voluntario, corte_id: corteId, tipo_movimiento: "anulacion",
          producto: it.name, cantidad: it.qty, motivo: "Anulación de venta", monto: it.price * it.qty, metodo_pago: ""
        });
      });
    } else if (op.type === "reposicion") {
      movimientos.push({
        timestamp: op.time, puesto_tipo: session.tipo, puesto_id: session.identificador,
        voluntario: session.voluntario, corte_id: corteId,
        tipo_movimiento: op.delta < 0 ? "ajuste_manual" : "reposicion",
        producto: op.name, cantidad: op.delta,
        motivo: op.delta < 0 ? "Ajuste manual de stock" : "Reposición de stock",
        monto: "", metodo_pago: ""
      });
    }
  });

  var ventas = st.log.filter(function (op) { return op.type === "venta"; }).map(function (op) {
    return {
      timestamp: op.time, puesto_tipo: session.tipo, puesto_id: session.identificador,
      voluntario: session.voluntario, corte_id: corteId,
      cant_items: op.items.length, monto_total: op.total, metodo_pago: op.payMethod,
      estado: op.voided ? "anulada" : "activa"
    };
  });

  var cierre = {
    puesto_tipo: session.tipo, puesto_id: session.identificador, voluntario: session.voluntario,
    corte_id: corteId, apertura: st.corteApertura, cierre: cierreTime,
    caja_inicial: st.corteCajaInicial, efectivo_esperado: esperado, efectivo_contado: contado,
    diferencia: diferencia, cant_ventas: st.totals.ventas,
    monto_total_vendido: st.totals.efectivo + st.totals.transferencia + st.totals.tarjeta + st.totals.otro,
    efectivo_retirado: retiro, efectivo_final_puesto: queda
  };

  return { token: puestoToken(), corte_id: corteId, movimientos: movimientos, ventas: ventas, cierre: cierre };
}
