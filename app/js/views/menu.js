"use strict";

function renderMenu() {
  var s = STANDS[nav.stand];
  var st = state[nav.stand];
  var html = header(s.label, session.identificador + " · " + session.voluntario, chipCorte(st), true);
  html += '<div class="menu-list">';
  html += h("button", { class: "menu-btn primary", id: "goVender" },
    '<div class="mark">🛒</div><div><h3>Vender</h3><p>' +
    (st.setupDone ? "Historial de ventas y nueva venta" : "Configurar stock y caja para empezar") +
    "</p></div><span class=\"chev\">›</span>");
  html += h("button", { class: "menu-btn", id: "goCaja" },
    '<div class="mark">📊</div><div><h3>Caja</h3><p>Totales, cierre de corte/puesto y Sheets</p></div><span class="chev">›</span>');
  html += h("button", { class: "menu-btn", id: "goSeteoStock" },
    '<div class="mark">📦</div><div><h3>Stock</h3><p>Precios y reposición</p></div><span class="chev">›</span>');
  html += "</div>";
  html += '<div style="padding:2px 18px 14px;text-align:center;">' +
    '<button class="link-btn" id="cambiarPuesto" style="margin:0 auto;">Cambiar de puesto ›</button>' +
    "</div>";
  root.innerHTML = html;
  document.getElementById("cambiarPuesto").addEventListener("click", function () {
    if (!st.setupDone) { switchPuesto(); return; }
    nav.closingPuesto = true;
    nav.screen = "caja";
    render();
    showToast("Para cambiar de puesto, primero cerrá la caja de este puesto.");
  });
  document.getElementById("goVender").addEventListener("click", function () {
    nav.cart = []; nav.payMethod = null;
    nav.screen = st.setupDone ? "vender" : "setup";
    render();
  });
  document.getElementById("goCaja").addEventListener("click", function () { nav.screen = "caja"; render(); });
  document.getElementById("goSeteoStock").addEventListener("click", function () { nav.screen = "seteoStock"; render(); });
}
