"use strict";

function renderSeteo() {
  var s = STANDS[nav.stand];
  var st = state[nav.stand];
  var html = header("Seteo de stock y caja", s.label);
  html += '<div class="eyebrow">Productos</div>';
  st.products.forEach(function (p) {
    html += '<div class="set-row" data-id="' + p.id + '">';
    html += '<div class="head"><span class="icon">' + p.icon + '</span><span class="name">' + p.name + '</span>' +
      '<span class="price-field">$<input type="number" min="0" step="100" value="' + p.price + '" data-price="' + p.id + '"></span></div>';
    html += '<div class="mini-toggle"><span class="lbl">Controlar stock de este producto</span>' +
      '<button class="switch" data-prod-switch="' + p.id + '" data-on="' + p.controlled + '"></button></div>';
    if (p.controlled) {
      html += '<div class="stock-controls">' + stockLine(p) +
        '<button class="qty-btn" data-repo="' + p.id + '" data-delta="-1">–</button>' +
        '<button class="qty-btn" data-repo="' + p.id + '" data-delta="1">+</button>' +
        '<button class="qty-btn" data-repo="' + p.id + '" data-delta="10">+10</button>' +
        "</div>";
    } else {
      html += '<div class="no-control-note">Se puede vender sin límite: no bloquea ni descuenta stock.</div>';
    }
    html += "</div>";
  });

  var expected = st.cajaInicial + st.cumulative.efectivo;
  var counted = st.counted;
  html += '<div class="eyebrow">Caja</div>';
  html += '<div class="cash-panel">' +
    '<div class="cash-row"><span class="k">Caja inicial del puesto</span><span class="v">' + money(st.cajaInicial) + "</span></div>" +
    '<div class="cash-row"><span class="k">Ventas en efectivo</span><span class="v">' + money(st.cumulative.efectivo) + "</span></div>" +
    '<div class="cash-row"><span class="k"><strong>Efectivo esperado</strong></span><span class="v">' + money(expected) + "</span></div>" +
    '<div class="cash-row"><span class="k">Transferencias</span><span class="v">' + money(st.cumulative.transferencia) + "</span></div>" +
    '<div class="cash-row"><span class="k">Tarjetas</span><span class="v">' + money(st.cumulative.tarjeta) + "</span></div>" +
    '<div class="cash-input-row"><span class="k">Efectivo contado</span><input type="number" id="contadoInput" placeholder="0" value="' + (counted === null ? "" : counted) + '"></div>';
  if (counted !== null) {
    var diff = counted - expected;
    var cls = diff === 0 ? "stock-mucho" : (diff > 0 ? "stock-medio" : "stock-critico");
    var label = diff === 0 ? "🟢 Caja exacta" : (diff > 0 ? "🟡 Sobrante " + money(diff) : "🔴 Faltante " + money(Math.abs(diff)));
    html += '<div class="cash-result ' + cls + '">' + label + "</div>";
  }
  html += "</div>";

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

  root.innerHTML = html;
  bindBack(function () { nav.screen = "menu"; render(); });
  var saveUrlBtn = document.getElementById("btnSaveWebAppUrl");
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
  var retryBtn = document.getElementById("btnRetrySync");
  retryBtn.addEventListener("click", function () {
    if (!pendingCount()) { showToast("No hay cortes pendientes."); return; }
    showToast("Reintentando sincronización...");
    flushQueue().then(function () {
      showToast(pendingCount() === 0 ? "Sincronización al día." : "Todavía no se pudo sincronizar. Revisá la URL o la conexión.");
    });
  });
  root.querySelectorAll("[data-prod-switch]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var p = st.products.filter(function (x) { return x.id === btn.getAttribute("data-prod-switch"); })[0];
      p.controlled = !p.controlled;
      render();
      showToast("Control de stock " + (p.controlled ? "activado" : "desactivado") + " para " + p.name + ".");
    });
  });
  root.querySelectorAll("[data-price]").forEach(function (inp) {
    inp.addEventListener("change", function () {
      var p = st.products.filter(function (x) { return x.id === inp.getAttribute("data-price"); })[0];
      var val = parseFloat(inp.value);
      if (!isNaN(val) && val >= 0) { p.price = val; saveState(); showToast("Precio de " + p.name + " actualizado a " + money(val) + "."); }
      else { inp.value = p.price; }
    });
  });
  root.querySelectorAll("[data-repo]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-repo");
      var delta = parseInt(btn.getAttribute("data-delta"), 10);
      var p = st.products.filter(function (x) { return x.id === id; })[0];
      if (delta < 0 && p.stock <= 0) return;
      p.stock = Math.max(0, p.stock + delta);
      p.level = levelFor(p.stock, p.thresholds);
      st.log.push({ time: nowLabel(), type: "reposicion", name: p.name, delta: delta });
      render();
      showToast((delta > 0 ? "+" : "") + delta + " " + p.name + ". Nuevo stock: " + p.stock + ".");
    });
  });
  var contadoInput = document.getElementById("contadoInput");
  contadoInput.addEventListener("change", function () {
    var v = parseFloat(contadoInput.value);
    st.counted = isNaN(v) ? null : v;
    render();
  });
}
