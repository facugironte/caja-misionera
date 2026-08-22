"use strict";

function renderVender() {
  var s = STANDS[nav.stand];
  var st = state[nav.stand];
  var html = header(s.label, null, chipCorte(st));
  html += '<div class="menu-list" style="padding-top:6px;">' +
    h("button", { class: "menu-btn primary", id: "goCarrito" },
      '<div class="mark">🛒</div><div><h3>Nueva venta</h3><p>Elegir productos y cobrar</p></div><span class="chev">›</span>') +
    "</div>";
  html += '<div class="recent-wrap"><div class="recent-head"><span class="eyebrow" style="margin:0;padding:0;">Ventas de este corte</span>' +
    '<button class="link-btn" id="goHistorialLink">Ver resumen ›</button></div>' +
    '<div id="recentSales"></div></div>';
  root.innerHTML = html;
  bindBack(function () { nav.screen = "menu"; render(); });
  document.getElementById("goCarrito").addEventListener("click", function () {
    nav.cart = []; nav.checkout = false; nav.screen = "carrito"; render();
  });
  document.getElementById("goHistorialLink").addEventListener("click", function () { nav.screen = "resumen"; render(); });
  renderRecentSales();
}

function renderRecentSales() {
  var st = state[nav.stand];
  var wrap = document.getElementById("recentSales");
  if (!wrap) return;
  var recent = st.log.slice(-6).reverse();
  if (!recent.length) {
    wrap.innerHTML = '<div class="op-empty">Todavía no hay ventas en este corte.</div>';
    return;
  }
  var html = '<div class="op-list">';
  recent.forEach(function (op) { html += opRowHtml(op, null, false); });
  html += "</div>";
  wrap.innerHTML = html;
}
