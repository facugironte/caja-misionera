"use strict";

function renderSetup() {
  var s = STANDS[nav.stand];
  var st = state[nav.stand];
  var html = header("Iniciar puesto", s.label);
  html += '<p class="note">Antes de vender, confirmá el stock con el que arranca este puesto y cuánto efectivo hay en la caja. Ese monto va a ser el valor inicial del puesto para el arqueo.</p>';

  var pools = (st.pools || []).filter(function (p) { return p.controlled; });
  var controlled = st.products.filter(function (p) { return p.controlled; });
  html += '<div class="eyebrow">Stock inicial</div>';
  if (!pools.length && !controlled.length) {
    html += '<p class="note">Ningún producto de este puesto controla stock todavía. Podés activarlo más tarde desde Stock.</p>';
  } else {
    pools.forEach(function (p) {
      html += '<div class="set-row" data-id="' + p.id + '">' +
        '<div class="head"><span class="icon">' + p.icon + '</span><span class="name">' + p.name + '</span>' +
        '<span class="price-field">Stock <input type="number" min="0" step="1" value="' + p.stock + '" data-setup-pool="' + p.id + '"></span></div>' +
        "</div>";
    });
    controlled.forEach(function (p) {
      html += '<div class="set-row" data-id="' + p.id + '">' +
        '<div class="head"><span class="icon">' + p.icon + '</span><span class="name">' + p.name + '</span>' +
        '<span class="price-field">Stock <input type="number" min="0" step="1" value="' + p.stock + '" data-setup-stock="' + p.id + '"></span></div>' +
        "</div>";
    });
  }

  html += '<div class="eyebrow">Caja</div>';
  html += '<div class="cash-panel">' +
    '<div class="cash-input-row"><span class="k">Monto inicial de caja (efectivo)</span>' +
    '<input type="number" min="0" step="500" id="setupCajaInput" placeholder="0"></div>' +
    "</div>";

  html += '<div class="close-corte-wrap"><button class="btn-block" id="btnIniciarCorte">Iniciar Corte 1</button></div>';
  root.innerHTML = html;
  bindBack(function () { nav.screen = "menu"; render(); });

  function bindSetupStock(attr, list) {
    root.querySelectorAll("[" + attr + "]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var p = list.filter(function (x) { return x.id === inp.getAttribute(attr); })[0];
        var val = parseInt(inp.value, 10);
        if (!isNaN(val) && val >= 0) { p.stock = val; p.level = levelFor(p.stock, p.thresholds); saveState(); }
        else { inp.value = p.stock; }
      });
    });
  }
  bindSetupStock("data-setup-pool", st.pools || []);
  bindSetupStock("data-setup-stock", st.products);

  document.getElementById("btnIniciarCorte").addEventListener("click", function () {
    var cajaInput = document.getElementById("setupCajaInput");
    var caja = parseFloat(cajaInput.value);
    if (isNaN(caja) || caja < 0) caja = 0;
    st.cajaInicial = caja;
    st.corteCajaInicial = caja;
    st.corteApertura = new Date().toISOString();
    st.setupDone = true;
    nav.screen = "menu";
    render();
    showToast("Corte 1 iniciado con " + money(caja) + " en caja.");
  });
}
