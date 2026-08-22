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
  html += h("button", { class: "menu-btn", id: "goResumen" },
    '<div class="mark">📊</div><div><h3>Resumen de caja</h3><p>Totales del corte y cierre</p></div><span class="chev">›</span>');
  html += h("button", { class: "menu-btn", id: "goSeteo" },
    '<div class="mark">🧰</div><div><h3>Seteo de stock y caja</h3><p>Reposición y arqueo</p></div><span class="chev">›</span>');
  html += "</div>";
  html += '<div style="padding:2px 18px 14px;text-align:center;">' +
    '<button class="link-btn" id="cambiarPuesto" style="margin:0 auto;">Cambiar de puesto ›</button>' +
    "</div>";
  root.innerHTML = html;
  document.getElementById("cambiarPuesto").addEventListener("click", function () {
    if (pendingCount() > 0) {
      showToast("Hay " + pendingCount() + " corte(s) sin sincronizar. Sincronizalos antes de cambiar de puesto (Seteo → Sincronización con Sheets).");
      return;
    }
    localStorage.removeItem(SESSION_KEY);
    session = null;
    nav.stand = null;
    nav.screen = "login";
    nav.loginTipo = null;
    render();
  });
  document.getElementById("goVender").addEventListener("click", function () {
    nav.screen = st.setupDone ? "vender" : "setup";
    render();
  });
  document.getElementById("goResumen").addEventListener("click", function () { nav.screen = "resumen"; render(); });
  document.getElementById("goSeteo").addEventListener("click", function () { nav.screen = "seteo"; render(); });
}
