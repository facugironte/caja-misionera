"use strict";

function cartQty(productId) {
  var line = nav.cart.filter(function (l) { return l.productId === productId; })[0];
  return line ? line.qty : 0;
}
function cartLines() {
  var st = state[nav.stand];
  return nav.cart.map(function (l) {
    var p = st.products.filter(function (x) { return x.id === l.productId; })[0];
    return { product: p, qty: l.qty, subtotal: p.price != null ? p.price * l.qty : null };
  });
}
function cartCount() { return nav.cart.reduce(function (sum, l) { return sum + l.qty; }, 0); }

function poolById(st, id) {
  return (st.pools || []).filter(function (x) { return x.id === id; })[0];
}

// --- Precio "por pares" (PAIR_GROUPS, ver data.js) ---------------------------------
// Productos como Choripán/Hamburguesa/Hamburguesa veggie no tienen precio propio:
// se arman de a pares (con las unidades que haya en el carrito, mezclando tipos
// libremente) al precio del par; si queda una unidad suelta, esa se cobra aparte.
// Cada par o individual "incluye" una bebida (se descuenta del pool de esa bebida
// al cerrar la venta, sin cobrarla aparte).

function pairGroupProducts(groupKey) {
  var st = state[nav.stand];
  return st.products.filter(function (p) { return p.pairGroup === groupKey; });
}

// Arma los pares + individual sobrante de un grupo a partir de las cantidades del
// carrito. Devuelve un array de { key, members:[productId,...], price, qty } —
// "qty" es cuántas veces se repite exactamente esa combinación (ej. 2 pares
// "Choripán + Choripán" -> un solo item con qty:2).
function buildPairGroups(groupKey) {
  var cfg = PAIR_GROUPS[groupKey];
  var flat = [];
  pairGroupProducts(groupKey).forEach(function (p) {
    var qty = cartQty(p.id);
    for (var i = 0; i < qty; i++) flat.push(p.id);
  });
  var sigMap = {};
  var order = [];
  for (var i = 0; i < flat.length; i += 2) {
    var members = (i + 1 < flat.length) ? [flat[i], flat[i + 1]] : [flat[i]];
    var isPair = members.length === 2;
    var sig = members.slice().sort().join("+");
    if (!sigMap[sig]) {
      sigMap[sig] = { key: groupKey, members: members, price: isPair ? cfg.pairPrice : cfg.singlePrice, qty: 0 };
      order.push(sig);
    }
    sigMap[sig].qty += 1;
  }
  return order.map(function (sig) { return sigMap[sig]; });
}

// Todos los grupos de todos los pairGroups configurados, ya armados desde el carrito.
function allPairGroups() {
  var out = [];
  Object.keys(PAIR_GROUPS).forEach(function (key) { out = out.concat(buildPairGroups(key)); });
  return out;
}

function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

// Cada unidad de "principal" trae su propia bebida (1 sola -> 1 bebida, un par -> 2 bebidas).
function pairGroupName(st, g) {
  var names = g.members.map(function (id) {
    var p = st.products.filter(function (x) { return x.id === id; })[0];
    return p ? p.name : id;
  });
  var bebidas = g.members.length > 1 ? g.members.length + " bebidas" : "bebida";
  if (names.length === 1) return names[0] + " + " + bebidas;
  if (names[0] === names[1]) return "2 " + lowerFirst(names[0]) + " + " + bebidas;
  return names[0] + " + " + lowerFirst(names[1]) + " + " + bebidas;
}

function pairGroupIcon(st, g) {
  var icons = g.members.map(function (id) {
    var p = st.products.filter(function (x) { return x.id === id; })[0];
    return p ? p.icon : "";
  });
  return icons[0] === icons[1] ? icons[0] : icons.join("");
}

function cartTotal() {
  var base = cartLines().reduce(function (sum, l) { return sum + (l.subtotal || 0); }, 0);
  var groups = allPairGroups().reduce(function (sum, g) { return sum + g.qty * g.price; }, 0);
  return base + groups;
}

// Unidades de un pool ya comprometidas por lo que hay en el carrito.
function poolReserved(poolId) {
  var st = state[nav.stand];
  var total = 0;
  nav.cart.forEach(function (l) {
    var p = st.products.filter(function (x) { return x.id === l.productId; })[0];
    if (p && p.recipe && p.recipe[poolId]) total += p.recipe[poolId] * l.qty;
  });
  return total;
}

// Cuántas unidades más de este producto se pueden agregar al carrito.
// null = sin límite de stock.
function productRemaining(st, p) {
  if (p.recipe) {
    var lim = Infinity;
    Object.keys(p.recipe).forEach(function (poolId) {
      var pool = poolById(st, poolId);
      if (pool && pool.controlled) lim = Math.min(lim, Math.floor((pool.stock - poolReserved(poolId)) / p.recipe[poolId]));
    });
    return lim === Infinity ? null : lim;
  }
  if (p.controlled) return p.stock - cartQty(p.id);
  return null;
}

// Chip de stock para la tarjeta de producto en la grilla: solo el número
// disponible y el color del estado. Sin control de stock -> sin chip.
function productStockLine(st, p) {
  var rem = productRemaining(st, p);
  if (rem === null) return "";
  var lvl;
  if (p.recipe) {
    lvl = "mucho";
    Object.keys(p.recipe).forEach(function (poolId) {
      var pool = poolById(st, poolId);
      if (pool && pool.controlled && LEVEL_ORDER[pool.level] < LEVEL_ORDER[lvl]) lvl = pool.level;
    });
  } else {
    lvl = p.level;
  }
  if (rem <= 0) lvl = "agotado";
  return '<span class="stock-chip stock-' + lvl + '">' + Math.max(0, rem) + "</span>";
}

function renderVender() {
  var s = STANDS[nav.stand];
  var st = state[nav.stand];
  var html = header(s.label, null, chipCorte(st));
  html += '<div class="product-grid" id="grid"></div>';
  html += '<div id="cartSection"></div>';
  html += '<div class="recent-wrap"><div class="recent-head"><span class="eyebrow" style="margin:0;padding:0;">Ventas de este corte</span>' +
    '<button class="link-btn" id="goHistorialLink">Ver resumen ›</button></div>' +
    '<div id="recentSales"></div></div>';
  root.innerHTML = html;
  bindBack(function () { nav.cart = []; nav.payMethod = null; nav.screen = "menu"; render(); });
  document.getElementById("goHistorialLink").addEventListener("click", function () { nav.screen = "caja"; render(); });
  renderVenderGrid();
  renderVenderCart();
  renderRecentSales();
}

function renderVenderGrid() {
  var st = state[nav.stand];
  var wrap = document.getElementById("grid");
  if (!wrap) return;
  wrap.innerHTML = "";
  st.products.forEach(function (p) {
    var rem = productRemaining(st, p);
    var disabled = rem !== null && rem <= 0;
    var qty = cartQty(p.id);
    var btn = document.createElement("button");
    btn.className = "tile";
    btn.type = "button";
    btn.dataset.id = p.id;
    if (disabled) btn.setAttribute("disabled", "disabled");
    var priceHtml = p.price != null ? money(p.price) : PAIR_GROUPS[p.pairGroup].hint;
    btn.innerHTML =
      '<div class="tile-head"><span class="icon">' + p.icon + '</span>' +
      '<span class="name">' + p.name + "</span>" +
      (qty > 0 ? '<span class="cart-badge">' + qty + "</span>" : "") +
      "</div>" +
      '<div class="tile-foot"><span class="price' + (p.price == null ? " price-hint" : "") + '">' + priceHtml + "</span>" +
      productStockLine(st, p) + "</div>";
    btn.addEventListener("click", function () { addToCart(p.id); });
    wrap.appendChild(btn);
  });
}

function addToCart(productId) {
  var st = state[nav.stand];
  var p = st.products.filter(function (x) { return x.id === productId; })[0];
  if (!p) return;
  var rem = productRemaining(st, p);
  if (rem !== null && rem <= 0) { showToast("No hay stock para " + p.name + "."); return; }
  var line = nav.cart.filter(function (l) { return l.productId === productId; })[0];
  if (line) line.qty += 1; else nav.cart.push({ productId: productId, qty: 1 });
  renderVenderGrid();
  renderVenderCart();
}

function decLine(productId) {
  var line = nav.cart.filter(function (l) { return l.productId === productId; })[0];
  if (!line) return;
  line.qty -= 1;
  if (line.qty <= 0) nav.cart = nav.cart.filter(function (l) { return l.productId !== productId; });
  renderVenderGrid();
  renderVenderCart();
}

function renderVenderCart() {
  var wrap = document.getElementById("cartSection");
  if (!wrap) return;
  var st = state[nav.stand];
  var lines = cartLines();
  var groups = allPairGroups();
  if (!lines.length) { wrap.innerHTML = ""; return; }

  var html = '<div class="eyebrow">Carrito</div><div class="cart-list">';
  lines.forEach(function (l) {
    html += '<div class="cart-line"><span class="icon">' + l.product.icon + '</span><span class="name">' + l.product.name + '</span>' +
      '<span class="sub">' + (l.subtotal != null ? money(l.subtotal) : "") + '</span>' +
      '<span class="stepper"><button class="qty-btn" data-dec="' + l.product.id + '">–</button>' +
      '<span class="stock-num">' + l.qty + '</span>' +
      '<button class="qty-btn" data-inc="' + l.product.id + '">+</button></span></div>';
  });
  html += "</div>";

  if (groups.length) {
    html += '<div class="eyebrow">Combo principales (bebida incluida)</div><div class="cart-list">';
    groups.forEach(function (g) {
      html += '<div class="cart-line cart-line-readonly"><span class="icon">' + pairGroupIcon(st, g) + '</span>' +
        '<span class="name">' + pairGroupName(st, g) + (g.qty > 1 ? " ×" + g.qty : "") + '</span>' +
        '<span class="sub">' + money(g.qty * g.price) + "</span></div>";
    });
    html += "</div>";
  }

  html += '<div class="eyebrow">Método de pago</div><div class="pay-row" id="payRow">';
  payMethodsFor(nav.stand).forEach(function (m) {
    html += '<button type="button" class="pay-opt' + (nav.payMethod === m.id ? " sel" : "") + '" data-pay="' + m.id + '">' +
      '<span class="ic">' + (PAY_ICON[m.id] || "") + "</span>" + m.label + "</button>";
  });
  html += "</div>";

  html += '<div class="checkout-bar"><div class="info"><span class="n">' +
    cartCount() + " producto" + (cartCount() === 1 ? "" : "s") + "</span>" +
    '<span class="t">' + money(cartTotal()) + "</span></div>" +
    '<button class="go" id="btnVender"' + (nav.payMethod ? "" : " disabled") + ">Vender</button></div>";
  wrap.innerHTML = html;

  wrap.querySelectorAll("[data-inc]").forEach(function (b) {
    b.addEventListener("click", function () { addToCart(b.getAttribute("data-inc")); });
  });
  wrap.querySelectorAll("[data-dec]").forEach(function (b) {
    b.addEventListener("click", function () { decLine(b.getAttribute("data-dec")); });
  });
  wrap.querySelectorAll("[data-pay]").forEach(function (b) {
    b.addEventListener("click", function () {
      nav.payMethod = b.getAttribute("data-pay");
      renderVenderCart();
    });
  });
  var goBtn = document.getElementById("btnVender");
  if (goBtn) goBtn.addEventListener("click", function () {
    if (!cartLines().length || !nav.payMethod) return;
    var resumen = lines.filter(function (l) { return !l.product.pairGroup; }).map(function (l) {
      return l.product.name + (l.qty > 1 ? " ×" + l.qty : "");
    }).concat(groups.map(function (g) {
      return pairGroupName(st, g) + (g.qty > 1 ? " ×" + g.qty : "");
    })).join(", ");
    var msg = "¿Confirmás la venta?\n\n" + resumen +
      "\nTotal: " + money(cartTotal()) +
      "\nPago: " + payLabel(nav.payMethod);
    if (!confirm(msg)) return;
    finalizeSale(nav.payMethod);
  });
}

// Descuenta (sign=1) o devuelve (sign=-1) el stock de un item de venta normal
// (con productId propio) o de un combo por pares (it.group).
function applySaleStock(st, it, sign) {
  if (it.group) { applyGroupStock(st, it, sign); return; }
  var p = st.products.filter(function (x) { return x.id === it.productId; })[0];
  if (!p) return;
  p.sold += sign * it.qty;
  if (p.recipe) {
    Object.keys(p.recipe).forEach(function (poolId) {
      var pool = poolById(st, poolId);
      if (!pool || !pool.controlled) return;
      pool.stock = Math.max(0, pool.stock - sign * p.recipe[poolId] * it.qty);
      pool.level = levelFor(pool.stock, pool.thresholds);
    });
  } else if (p.controlled) {
    p.stock = Math.max(0, p.stock - sign * it.qty);
    p.level = levelFor(p.stock, p.thresholds);
  }
}

function applyGroupStock(st, it, sign) {
  var cfg = PAIR_GROUPS[it.group.key];
  it.group.members.forEach(function (productId) {
    var p = st.products.filter(function (x) { return x.id === productId; })[0];
    if (!p || !p.recipe) return;
    Object.keys(p.recipe).forEach(function (poolId) {
      var pool = poolById(st, poolId);
      if (!pool || !pool.controlled) return;
      pool.stock = Math.max(0, pool.stock - sign * p.recipe[poolId] * it.qty);
      pool.level = levelFor(pool.stock, pool.thresholds);
    });
  });
  var bpool = poolById(st, cfg.bebidaPool);
  if (bpool && bpool.controlled) {
    bpool.stock = Math.max(0, bpool.stock - sign * it.qty * it.group.members.length);
    bpool.level = levelFor(bpool.stock, bpool.thresholds);
  }
}

function finalizeSale(payMethodId) {
  var st = state[nav.stand];
  var normalItems = cartLines().filter(function (l) { return !l.product.pairGroup; }).map(function (l) {
    return { productId: l.product.id, name: l.product.name, qty: l.qty, price: l.product.price };
  });
  var groupItems = allPairGroups().map(function (g) {
    return { productId: null, name: pairGroupName(st, g), qty: g.qty, price: g.price, group: { key: g.key, members: g.members } };
  });
  var items = normalItems.concat(groupItems);
  if (!items.length) return;
  var total = cartTotal();
  items.forEach(function (it) { applySaleStock(st, it, 1); });
  st.totals.ventas += 1; st.totals[payMethodId] += total;
  st.cumulative.ventas += 1; st.cumulative[payMethodId] += total;
  st.log.push({ id: makeId("v"), time: nowLabel(), type: "venta", items: items, total: total, payMethod: payMethodId, voided: false });

  var low = [];
  function noteIfLow(pool) {
    if (pool && pool.controlled && (pool.level === "critico" || pool.level === "agotado") && low.indexOf(pool.name) < 0) low.push(pool.name);
  }
  items.forEach(function (it) {
    if (it.group) {
      var cfg = PAIR_GROUPS[it.group.key];
      it.group.members.forEach(function (productId) {
        var p = st.products.filter(function (x) { return x.id === productId; })[0];
        if (p && p.recipe) Object.keys(p.recipe).forEach(function (poolId) { noteIfLow(poolById(st, poolId)); });
      });
      noteIfLow(poolById(st, cfg.bebidaPool));
      return;
    }
    var p = st.products.filter(function (x) { return x.id === it.productId; })[0];
    if (!p) return;
    if (p.recipe) Object.keys(p.recipe).forEach(function (poolId) { noteIfLow(poolById(st, poolId)); });
    else if (p.controlled && (p.level === "critico" || p.level === "agotado") && low.indexOf(p.name) < 0) low.push(p.name);
  });

  nav.cart = [];
  nav.payMethod = null;
  nav.screen = "vender";
  render();
  showToast("Venta registrada · " + money(total) + " · " + payLabel(payMethodId));
  if (low.length) {
    setTimeout(function () { showToast("⚠ Stock bajo: " + low.join(", ")); }, 2300);
  }
}

function voidSale(entry) {
  var st = state[nav.stand];
  entry.voided = true;
  st.totals.ventas -= 1; st.totals[entry.payMethod] -= entry.total;
  st.cumulative.ventas -= 1; st.cumulative[entry.payMethod] -= entry.total;
  entry.items.forEach(function (it) { applySaleStock(st, it, -1); });
  st.log.push({ time: nowLabel(), type: "anulacion", ventaId: entry.id || "", items: entry.items, total: entry.total });
}

function renderRecentSales() {
  var st = state[nav.stand];
  var wrap = document.getElementById("recentSales");
  if (!wrap) return;
  var recent = st.log
    .map(function (op, idx) { return { op: op, idx: idx }; })
    .filter(function (item) { return item.op.type === "venta" || item.op.type === "anulacion"; })
    .reverse();
  if (!recent.length) {
    wrap.innerHTML = '<div class="op-empty">Todavía no hay ventas en este corte.</div>';
    return;
  }
  var html = '<div class="op-list">';
  recent.forEach(function (item) { html += opRowHtml(item.op, item.idx, true); });
  html += "</div>";
  wrap.innerHTML = html;
  wrap.querySelectorAll(".void-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var idx = parseInt(b.getAttribute("data-void"), 10);
      var entry = st.log[idx];
      var msg = "¿Anular esta venta?\n\n" + itemsSummary(entry.items) +
        "\nTotal: " + money(entry.total) +
        "\nPago: " + payLabel(entry.payMethod) +
        "\n\nSe devuelve el stock y se descuenta del corte.";
      if (!confirm(msg)) return;
      voidSale(entry);
      saveState();
      render();
      showToast("Venta anulada.");
    });
  });
}
