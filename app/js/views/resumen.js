"use strict";

function renderResumen() {
  var s = STANDS[nav.stand];
  var st = state[nav.stand];
  var html = header("Resumen de caja", s.label, chipCorte(st));
  html += '<div id="resumenBody"></div>';
  root.innerHTML = html;
  bindBack(function () { nav.screen = "menu"; render(); });
  renderHistorial();
}

function renderHistorial() {
  var st = state[nav.stand];
  var t = st.totals;
  var total = t.efectivo + t.transferencia + t.tarjeta + t.otro;
  var body = document.getElementById("resumenBody");
  var html = '<div class="stat-grid">' +
    stat("Ventas", fmt.format(t.ventas)) +
    stat("Efectivo", money(t.efectivo)) +
    stat("Transferencia", money(t.transferencia)) +
    stat("Tarjeta", money(t.tarjeta)) +
    stat("Otro", money(t.otro)) +
    '<div class="stat total"><div class="label">Total del corte</div><div class="value">' + money(total) + "</div></div>" +
    "</div>";
  html += '<div class="eyebrow">Movimientos — Corte ' + st.corte + "</div>";
  html += '<div class="op-list">';
  if (!st.log.length) {
    html += '<div class="op-empty">Todavía no hay movimientos en este corte.</div>';
  } else {
    st.log.slice().reverse().forEach(function (op, idx) {
      var realIdx = st.log.length - 1 - idx;
      html += opRowHtml(op, realIdx, true);
    });
  }
  html += "</div>";
  var esperadoCierre = st.corteCajaInicial + t.efectivo;
  html += '<div class="close-corte-wrap">';
  html += '<div class="cash-panel" style="margin:0 0 10px;">' +
    '<div class="cash-row"><span class="k">Efectivo esperado (este corte)</span><span class="v">' + money(esperadoCierre) + "</span></div>" +
    '<div class="cash-input-row"><span class="k">Efectivo contado para cerrar</span><input type="number" min="0" step="500" id="corteContadoInput" placeholder="0"></div>' +
    '<div class="cash-input-row"><span class="k">Efectivo que retirás del puesto</span><input type="number" min="0" step="500" id="corteRetiroInput" placeholder="0"></div>' +
    '<div style="font-size:12px;color:var(--text-muted);padding:6px 2px 0;line-height:1.4;">Lo que no retirés queda como caja inicial del próximo corte.</div>' +
    "</div>";
  html += '<button class="btn-block" id="btnCerrarCorte">Cerrar corte y empezar Corte ' + (st.corte + 1) + "</button></div>";
  body.innerHTML = html;

  body.querySelectorAll(".void-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var idx = parseInt(b.getAttribute("data-void"), 10);
      voidSale(st.log[idx]);
      renderHistorial();
      saveState();
      showToast("Venta anulada.");
    });
  });
  document.getElementById("btnCerrarCorte").addEventListener("click", function () {
    var contadoInput = document.getElementById("corteContadoInput");
    var contado = parseFloat(contadoInput.value);
    if (isNaN(contado) || contado < 0) { showToast("Ingresá el efectivo contado antes de cerrar el corte."); return; }
    var retiroInput = document.getElementById("corteRetiroInput");
    var retiro = parseFloat(retiroInput.value);
    if (isNaN(retiro) || retiro < 0) retiro = 0;
    if (retiro > contado) { showToast("El retiro no puede ser mayor al efectivo contado."); return; }
    var queda = contado - retiro;
    var cierreTime = new Date().toISOString();
    var esperado = st.corteCajaInicial + st.totals.efectivo;
    var diferencia = esperado - contado;
    var payload = buildCortePayload(st, contado, esperado, diferencia, cierreTime, retiro, queda);
    enqueuePayload(payload);
    flushQueue();

    st.corte += 1;
    st.corteCajaInicial = queda;
    st.corteApertura = cierreTime;
    st.totals = { ventas: 0, efectivo: 0, transferencia: 0, tarjeta: 0, otro: 0 };
    st.log = [];
    showToast("Corte cerrado" + (retiro > 0 ? " · retiraste " + money(retiro) : "") + ". Empezó el Corte " + st.corte + ".");
    render();
  });
}
