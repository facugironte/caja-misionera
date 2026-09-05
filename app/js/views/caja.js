"use strict";

function renderCaja() {
  var s = STANDS[nav.stand];
  var st = state[nav.stand];
  var html = header("Caja", s.label, chipCorte(st));
  if (nav.closingPuesto) {
    html += '<p class="note">Vas a cambiar de puesto: este va a ser el <strong>último corte</strong> de ' + session.identificador + '. Contá bien el efectivo antes de cerrar.</p>';
  }
  html += '<div id="cajaBody"></div>';
  root.innerHTML = html;
  bindBack(function () { nav.closingPuesto = false; nav.cajaMovimientosExpanded = false; nav.screen = "menu"; render(); });
  renderCajaBody();
}

var CAJA_MOVIMIENTOS_PAGE = 5;

function renderCajaBody() {
  var st = state[nav.stand];
  var t = st.totals;
  var total = t.efectivo + t.qr + t.tarjeta + t.otro;
  var body = document.getElementById("cajaBody");
  var esperadoCierre = st.corteCajaInicial + t.efectivo;
  var html = "";

  if (nav.closingPuesto) {
    var ventasTotalMonto = st.cumulative.efectivo + st.cumulative.qr + st.cumulative.tarjeta + st.cumulative.otro;
    html += '<div class="stat-grid">' +
      stat("Ventas", fmt.format(t.ventas)) +
      stat("Efectivo", money(t.efectivo)) +
      stat("QR", money(t.qr)) +
      stat("Tarjeta", money(t.tarjeta)) +
      stat("Consumo mis.", money(t.otro)) +
      '<div class="stat total"><div class="label">Total del corte</div><div class="value">' + money(total) + "</div></div>" +
      "</div>";

    html += '<div class="eyebrow">Resumen del puesto</div>';
    html += '<div class="cash-panel">' +
      '<div class="cash-row"><span class="k">Cantidad de ventas totales</span><span class="v">' + fmt.format(st.cumulative.ventas) + "</span></div>" +
      '<div class="cash-row"><span class="k">Efectivo inicial</span><span class="v">' + money(st.cajaInicial) + "</span></div>" +
      '<div class="cash-row"><span class="k">Ventas efectivo</span><span class="v">' + money(st.cumulative.efectivo) + "</span></div>" +
      '<div class="cash-row"><span class="k">Ventas QR</span><span class="v">' + money(st.cumulative.qr) + "</span></div>" +
      '<div class="cash-row"><span class="k">Ventas tarjetas</span><span class="v">' + money(st.cumulative.tarjeta) + "</span></div>" +
      '<div class="cash-row"><span class="k">Ventas consumo misionero</span><span class="v">' + money(st.cumulative.otro) + "</span></div>" +
      '<div class="cash-row"><span class="k"><strong>Ventas totales</strong></span><span class="v">' + money(ventasTotalMonto) + "</span></div>" +
      '<div class="cash-row"><span class="k">Efectivo retirado</span><span class="v">' + money(st.cumulative.retirado || 0) + "</span></div>" +
      "</div>";

    html += '<div class="close-corte-wrap">';
    html += '<div class="cash-panel" style="margin:0 0 10px;">' +
      '<div class="cash-row"><span class="k">Efectivo esperado (este corte)</span><span class="v">' + money(esperadoCierre) + "</span></div>" +
      '<div class="cash-input-row"><span class="k">Efectivo que retirás del puesto</span><input type="number" min="0" step="500" id="corteRetiroInput" placeholder="0"></div>' +
      '<div id="cierreDiffBadge"></div>' +
      '<div style="font-size:12px;color:var(--text-muted);padding:6px 2px 0;line-height:1.4;">Es el cierre final del puesto: contá todo el efectivo y ponelo acá — se retira entero, no queda nada para un corte siguiente.</div>' +
      "</div>";
    html += '<button class="btn-block" id="btnCerrarCorte">Cerrar puesto y salir</button></div>';
  } else {
    html += '<div class="stat-grid">' +
      stat("Ventas", fmt.format(t.ventas)) +
      stat("Efectivo", money(t.efectivo)) +
      stat("QR", money(t.qr)) +
      stat("Tarjeta", money(t.tarjeta)) +
      stat("Consumo mis.", money(t.otro)) +
      '<div class="stat total"><div class="label">Total del corte</div><div class="value">' + money(total) + "</div></div>" +
      "</div>";
    html += '<div class="eyebrow">Movimientos — Corte ' + st.corte + "</div>";
    var movimientos = st.log.map(function (op, idx) { return { op: op, idx: idx }; }).reverse();
    var showAllMov = !!nav.cajaMovimientosExpanded;
    var visibleMov = showAllMov ? movimientos : movimientos.slice(0, CAJA_MOVIMIENTOS_PAGE);
    html += '<div class="op-list">';
    if (!movimientos.length) {
      html += '<div class="op-empty">Todavía no hay movimientos en este corte.</div>';
    } else {
      visibleMov.forEach(function (item) { html += opRowHtml(item.op, item.idx, false); });
    }
    html += "</div>";
    if (movimientos.length > CAJA_MOVIMIENTOS_PAGE) {
      html += '<div style="text-align:center;padding:6px 0 2px;">' +
        '<button class="link-btn" id="btnToggleMovimientos" style="margin:0 auto;">' +
        (showAllMov ? "Mostrar menos ‹" : "Mostrar más (" + (movimientos.length - CAJA_MOVIMIENTOS_PAGE) + ") ›") +
        "</button></div>";
    }

    html += '<div class="eyebrow">Corte de caja</div>';
    html += '<div class="close-corte-wrap">';
    html += '<div class="cash-panel" style="margin:0 0 10px;">' +
      '<div class="cash-row"><span class="k">Efectivo esperado (este corte)</span><span class="v">' + money(esperadoCierre) + "</span></div>" +
      '<div class="cash-input-row"><span class="k">Efectivo que retirás del puesto</span><input type="number" min="0" step="500" id="corteRetiroInput" placeholder="0"></div>' +
      '<div style="font-size:12px;color:var(--text-muted);padding:6px 2px 0;line-height:1.4;">Lo que no retirés queda como caja inicial del próximo corte.</div>' +
      "</div>";
    html += '<button class="btn-block" id="btnCerrarCorte">Cerrar corte y empezar Corte ' + (st.corte + 1) + "</button></div>";

    var expected = st.cajaInicial + st.cumulative.efectivo;
    var counted = st.counted;
    html += '<div class="eyebrow">Resumen del puesto</div>';
    html += '<div class="cash-panel">' +
      '<div class="cash-row"><span class="k">Caja inicial del puesto</span><span class="v">' + money(st.cajaInicial) + "</span></div>" +
      '<div class="cash-row"><span class="k">Ventas en efectivo</span><span class="v">' + money(st.cumulative.efectivo) + "</span></div>" +
      '<div class="cash-row"><span class="k"><strong>Efectivo esperado</strong></span><span class="v">' + money(expected) + "</span></div>" +
      '<div class="cash-row"><span class="k">QR</span><span class="v">' + money(st.cumulative.qr) + "</span></div>" +
      '<div class="cash-row"><span class="k">Tarjetas</span><span class="v">' + money(st.cumulative.tarjeta) + "</span></div>" +
      '<div class="cash-input-row"><span class="k">Efectivo contado</span><input type="number" id="contadoInput" placeholder="0" value="' + (counted === null ? "" : counted) + '"></div>';
    if (counted !== null) {
      var diff = counted - expected;
      var cls = diff === 0 ? "stock-mucho" : (diff > 0 ? "stock-medio" : "stock-critico");
      var label = diff === 0 ? "🟢 Caja exacta" : (diff > 0 ? "🟡 Sobrante " + money(diff) : "🔴 Faltante " + money(Math.abs(diff)));
      html += '<div class="cash-result ' + cls + '">' + label + "</div>";
    }
    html += "</div>";

    html += '<div class="close-corte-wrap">' +
      '<button class="btn-block" id="btnCerrarPuesto" style="background:var(--stock-critico);">Cerrar puesto</button>' +
      "</div>";

    html += '<div class="eyebrow">Sincronización con Sheets</div>';
    html += '<div class="cash-panel">' +
      '<div class="cash-row"><span class="k">Token de este puesto</span><span class="v" style="font-variant-numeric:normal;">' + puestoToken() + "</span></div>" +
      '<label class="field-label">URL del Web App (Apps Script) — ya viene configurada por defecto; solo tocá si necesitás apuntar a otra planilla' +
      '<input type="text" id="webAppUrlInput" placeholder="https://script.google.com/macros/s/AKfycb.../exec" value="' + (getWebAppUrl() || "") + '"></label>' +
      '<div class="cash-row"><span class="k">Pendientes de enviar</span><span class="v" id="pendingCountLbl">' + pendingCount() + "</span></div>" +
      '<div style="display:flex;gap:8px;margin-top:10px;">' +
      '<button class="btn-block" id="btnSaveWebAppUrl" style="flex:1;">Guardar URL</button>' +
      '<button class="btn-block" id="btnRetrySync" style="flex:1;background:var(--surface-sunken);color:var(--text);border:1px solid var(--border);">Reintentar ahora</button>' +
      "</div></div>";
  }

  body.innerHTML = html;

  var toggleMovBtn = document.getElementById("btnToggleMovimientos");
  if (toggleMovBtn) {
    toggleMovBtn.addEventListener("click", function () {
      nav.cajaMovimientosExpanded = !nav.cajaMovimientosExpanded;
      renderCajaBody();
    });
  }

  var closingRetiroInput = document.getElementById("corteRetiroInput");
  if (closingRetiroInput && nav.closingPuesto) {
    closingRetiroInput.addEventListener("input", function () {
      var badge = document.getElementById("cierreDiffBadge");
      var raw = closingRetiroInput.value.trim();
      var v = parseFloat(raw);
      if (raw === "" || isNaN(v)) { badge.innerHTML = ""; return; }
      var diff = v - esperadoCierre;
      var cls = diff === 0 ? "stock-mucho" : (diff > 0 ? "stock-medio" : "stock-critico");
      var label = diff === 0 ? "🟢 Caja exacta" : (diff > 0 ? "🟡 Sobrante " + money(diff) : "🔴 Faltante " + money(Math.abs(diff)));
      badge.innerHTML = '<div class="cash-result ' + cls + '">' + label + "</div>";
    });
  }

  document.getElementById("btnCerrarCorte").addEventListener("click", function () {
    var esperado = st.corteCajaInicial + st.totals.efectivo;
    var retiroInput = document.getElementById("corteRetiroInput");
    var retiro;
    if (nav.closingPuesto) {
      var retiroRaw = retiroInput.value.trim();
      retiro = parseFloat(retiroRaw);
      if (retiroRaw === "" || isNaN(retiro) || retiro < 0) {
        showToast("Ingresá el efectivo que retirás antes de cerrar el puesto.");
        return;
      }
    } else {
      retiro = parseFloat(retiroInput.value);
      if (isNaN(retiro) || retiro < 0) retiro = 0;
    }
    var contado = nav.closingPuesto ? retiro : esperado;
    if (retiro > contado) { showToast("El retiro no puede ser mayor al efectivo contado."); return; }
    var queda = contado - retiro;
    var cierreTime = new Date().toISOString();
    var diferencia = esperado - contado;
    st.cumulative.retirado = (st.cumulative.retirado || 0) + retiro;
    var payload = buildCortePayload(st, contado, esperado, diferencia, cierreTime, retiro, queda);

    if (nav.closingPuesto) {
      var confirmMsg = "¿Estás seguro que querés cerrar el puesto \"" + session.identificador +
        "\"?\n\nEs una decisión importante: no se puede deshacer, y para seguir vendiendo vas a tener que volver a identificarte.";
      if (!confirm(confirmMsg)) return;
      payload.cierrePuesto = buildCierrePuestoPayload(st, contado, retiro, cierreTime);
      enqueuePayload(payload);
      flushQueue();
      clearState(session.tipo, session.identificador);
      showToast("Puesto cerrado" + (retiro > 0 ? " · retiraste " + money(retiro) : "") + ".");
      switchPuesto();
      return;
    }

    enqueuePayload(payload);
    flushQueue();
    st.corte += 1;
    st.corteCajaInicial = queda;
    st.corteApertura = cierreTime;
    st.totals = { ventas: 0, efectivo: 0, qr: 0, tarjeta: 0, otro: 0 };
    st.log = [];
    showToast("Corte cerrado" + (retiro > 0 ? " · retiraste " + money(retiro) : "") + ". Empezó el Corte " + st.corte + ".");
    render();
  });

  var cerrarPuestoBtn = document.getElementById("btnCerrarPuesto");
  if (cerrarPuestoBtn) {
    cerrarPuestoBtn.addEventListener("click", function () {
      if (!st.setupDone) { switchPuesto(); return; }
      nav.closingPuesto = true;
      render();
      showToast("Contá el efectivo arriba y confirmá para cerrar el puesto.");
    });
  }

  var saveUrlBtn = document.getElementById("btnSaveWebAppUrl");
  if (saveUrlBtn) {
    saveUrlBtn.addEventListener("click", function () {
      var v = document.getElementById("webAppUrlInput").value.trim();
      setWebAppUrl(v);
      showToast(v ? "URL guardada." : "URL borrada.");
      var pendingBefore = pendingCount();
      flushQueue().then(function () {
        if (pendingBefore > 0) {
          showToast(pendingCount() === 0 ? "Sincronización al día." : "Todavía no se pudo sincronizar. Revisá la URL o la conexión.");
        }
      });
    });
  }
  var retryBtn = document.getElementById("btnRetrySync");
  if (retryBtn) {
    retryBtn.addEventListener("click", function () {
      if (!pendingCount()) { showToast("No hay cortes pendientes."); return; }
      showToast("Reintentando sincronización...");
      flushQueue().then(function () {
        showToast(pendingCount() === 0 ? "Sincronización al día." : "Todavía no se pudo sincronizar. Revisá la URL o la conexión.");
      });
    });
  }
  var contadoInput = document.getElementById("contadoInput");
  if (contadoInput) {
    contadoInput.addEventListener("change", function () {
      var v = parseFloat(contadoInput.value);
      st.counted = isNaN(v) ? null : v;
      saveState();
      renderCajaBody();
    });
  }
}
