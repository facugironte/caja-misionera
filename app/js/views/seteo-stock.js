"use strict";

function renderSeteoStock() {
  var s = STANDS[nav.stand];
  var st = state[nav.stand];
  nav.stockExpanded = nav.stockExpanded || {};
  var html = header("Stock", s.label);

  var pools = st.pools || [];
  if (pools.length) {
    html += '<div class="eyebrow">Stock del puesto</div>';
    pools.forEach(function (p) {
      html += '<div class="set-row" data-id="' + p.id + '">';
      html += '<div class="head">' +
        '<span class="icon">' + p.icon + '</span>' +
        '<div class="name-stock"><span class="name">' + p.name + '</span>' + stockLine(p) + "</div>" +
        "</div>";
      html += '<div class="stock-controls" style="margin-top:10px;justify-content:flex-start;">' +
        '<span class="qty-group">' +
        '<button class="qty-btn" data-repo-pool="' + p.id + '" data-delta="-1">–</button>' +
        '<input type="number" min="0" step="1" class="qty-num-input" value="' + p.stock + '" data-stock-input-pool="' + p.id + '">' +
        '<button class="qty-btn" data-repo-pool="' + p.id + '" data-delta="1">+</button>' +
        '<button class="qty-btn" data-repo-pool="' + p.id + '" data-delta="10">+10</button>' +
        "</span></div>";
      html += "</div>";
    });
  }

  html += '<div class="eyebrow">Productos</div>';
  st.products.forEach(function (p) {
    var expanded = !!nav.stockExpanded[p.id];
    html += '<div class="set-row" data-id="' + p.id + '">';
    html += '<div class="head" data-toggle-expand="' + p.id + '">' +
      '<span class="icon">' + p.icon + '</span>' +
      '<div class="name-stock"><span class="name">' + p.name + '</span>' +
      (!tracksStock(p) ? '<span class="stock-line stock-sin"><span class="dot"></span>Sin control</span>'
        : (p.recipe ? recipeLine(st, p) : stockLine(p))) + "</div>" +
      '<span class="price-display">' + money(p.price) + '</span>' +
      '<span class="expand-chev">' + (expanded ? "▲" : "▾") + '</span>' +
      "</div>";
    if (expanded) {
      html += '<div class="stock-edit">';
      html += '<div class="mini-toggle"><span class="lbl">Precio</span>' +
        '<span class="price-field">$<input type="number" min="0" step="100" value="' + p.price + '" data-price="' + p.id + '"></span></div>';
      html += '<div class="mini-toggle" style="margin-top:10px;"><span class="lbl">Controlar stock de este producto</span>' +
        '<button class="switch" data-prod-switch="' + p.id + '" data-on="' + tracksStock(p) + '"></button></div>';
      if (p.recipe) {
        if (tracksStock(p)) {
          html += '<div style="margin-top:8px;font-size:12px;color:var(--text-muted);line-height:1.4;">Descuenta de: ' +
            Object.keys(p.recipe).map(function (poolId) {
              var pool = (st.pools || []).filter(function (x) { return x.id === poolId; })[0];
              return p.recipe[poolId] + "× " + (pool ? pool.name : poolId);
            }).join(" + ") + ". El stock se ajusta en cada uno arriba.</div>";
        }
      } else if (p.controlled) {
        html += '<div class="stock-controls" style="margin-top:10px;justify-content:flex-start;">' +
          '<span class="qty-group">' +
          '<button class="qty-btn" data-repo="' + p.id + '" data-delta="-1">–</button>' +
          '<input type="number" min="0" step="1" class="qty-num-input" value="' + p.stock + '" data-stock-input="' + p.id + '">' +
          '<button class="qty-btn" data-repo="' + p.id + '" data-delta="1">+</button>' +
          '<button class="qty-btn" data-repo="' + p.id + '" data-delta="10">+10</button>' +
          "</span></div>";
      }
      html += "</div>";
    }
    html += "</div>";
  });

  html += '<div class="eyebrow">Movimientos de stock — Corte ' + st.corte + "</div>";
  html += '<div class="op-list">';
  var stockLog = st.log.filter(function (op) { return op.type === "reposicion"; });
  if (!stockLog.length) {
    html += '<div class="op-empty">Todavía no hay movimientos de stock en este corte.</div>';
  } else {
    stockLog.slice().reverse().forEach(function (op) { html += opRowHtml(op, null, false); });
  }
  html += "</div>";

  root.innerHTML = html;
  bindBack(function () { nav.screen = "menu"; render(); });

  root.querySelectorAll("[data-toggle-expand]").forEach(function (h) {
    h.addEventListener("click", function () {
      var id = h.getAttribute("data-toggle-expand");
      nav.stockExpanded[id] = !nav.stockExpanded[id];
      render();
    });
  });
  root.querySelectorAll("[data-prod-switch]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var p = st.products.filter(function (x) { return x.id === btn.getAttribute("data-prod-switch"); })[0];
      if (p.recipe) p.stockOff = !p.stockOff;
      else p.controlled = !p.controlled;
      render();
      showToast("Control de stock " + (tracksStock(p) ? "activado" : "desactivado") + " para " + p.name + ".");
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

  function applyStockChange(p, newStock) {
    var delta = newStock - p.stock;
    if (delta === 0) return;
    p.stock = newStock;
    p.level = levelFor(p.stock, p.thresholds);
    st.log.push({ time: nowLabel(), type: "reposicion", name: p.name, delta: delta, stockResultante: p.stock });
    render();
    showToast((delta > 0 ? "+" : "") + delta + " " + p.name + " (" + p.stock + ").");
  }

  function bindRepo(btnAttr, inputAttr, list) {
    root.querySelectorAll("[" + btnAttr + "]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = list.filter(function (x) { return x.id === btn.getAttribute(btnAttr); })[0];
        var delta = parseInt(btn.getAttribute("data-delta"), 10);
        if (delta < 0 && p.stock <= 0) return;
        applyStockChange(p, Math.max(0, p.stock + delta));
      });
    });
    root.querySelectorAll("[" + inputAttr + "]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var p = list.filter(function (x) { return x.id === inp.getAttribute(inputAttr); })[0];
        var val = parseInt(inp.value, 10);
        if (isNaN(val) || val < 0) { inp.value = p.stock; return; }
        applyStockChange(p, val);
      });
    });
  }
  bindRepo("data-repo-pool", "data-stock-input-pool", st.pools || []);
  bindRepo("data-repo", "data-stock-input", st.products);
}

// Resumen legible de la receta de un combo (de qué pools descuenta).
function recipeLine(st, p) {
  var parts = Object.keys(p.recipe).map(function (poolId) {
    var pool = (st.pools || []).filter(function (x) { return x.id === poolId; })[0];
    return p.recipe[poolId] + "× " + (pool ? pool.name : poolId);
  });
  return '<span class="stock-line stock-sin"><span class="dot"></span>Usa ' + parts.join(" + ") + "</span>";
}
