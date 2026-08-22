"use strict";

function cartQty(productId) {
  var line = nav.cart.filter(function (l) { return l.productId === productId; })[0];
  return line ? line.qty : 0;
}
function cartLines() {
  var st = state[nav.stand];
  return nav.cart.map(function (l) {
    var p = st.products.filter(function (x) { return x.id === l.productId; })[0];
    return { product: p, qty: l.qty, subtotal: p.price * l.qty };
  });
}
function cartTotal() { return cartLines().reduce(function (sum, l) { return sum + l.subtotal; }, 0); }
function cartCount() { return nav.cart.reduce(function (sum, l) { return sum + l.qty; }, 0); }

function renderCarrito() {
  var s = STANDS[nav.stand];
  var html = header("Nueva venta", s.label);
  if (!nav.checkout) {
    html += '<div class="product-grid" id="grid"></div>';
    html += '<div id="cartSection"></div>';
  } else {
    html += '<div class="checkout-summary"><div class="lbl">Total a cobrar</div><div class="amt">' + money(cartTotal()) + "</div></div>";
    html += '<div class="cart-list" id="cartReadonly"></div>';
    html += '<div class="eyebrow">Elegí el método de pago</div>';
    html += '<div class="pay-choice-list" id="payChoices"></div>';
  }
  root.innerHTML = html;
  bindBack(function () {
    if (nav.checkout) { nav.checkout = false; render(); }
    else { nav.cart = []; nav.screen = "vender"; render(); }
  });
  if (!nav.checkout) {
    renderCarritoGrid();
    renderCartSection();
  } else {
    renderCartReadonly();
    renderPayChoices();
  }
}

function renderCarritoGrid() {
  var st = state[nav.stand];
  var wrap = document.getElementById("grid");
  if (!wrap) return;
  wrap.innerHTML = "";
  st.products.forEach(function (p) {
    var qty = cartQty(p.id);
    var remaining = p.controlled ? (p.stock - qty) : null;
    var disabled = p.controlled && remaining <= 0;
    var btn = document.createElement("button");
    btn.className = "tile";
    btn.type = "button";
    btn.dataset.id = p.id;
    if (disabled) btn.setAttribute("disabled", "disabled");
    btn.innerHTML = '<div class="icon">' + p.icon + '</div><div class="name">' + p.name +
      '</div><div class="price">' + money(p.price) + "</div>" + stockLine(p) +
      (qty > 0 ? '<span class="cart-badge">' + qty + "</span>" : "");
    btn.addEventListener("click", function () { addToCart(p.id); });
    wrap.appendChild(btn);
  });
}

function addToCart(productId) {
  var st = state[nav.stand];
  var p = st.products.filter(function (x) { return x.id === productId; })[0];
  if (!p) return;
  var inCart = cartQty(productId);
  if (p.controlled && (p.stock - inCart) <= 0) { showToast(p.name + " no tiene más stock disponible."); return; }
  var line = nav.cart.filter(function (l) { return l.productId === productId; })[0];
  if (line) line.qty += 1; else nav.cart.push({ productId: productId, qty: 1 });
  updateTileBadge(p);
  renderCartSection();
}

function decLine(productId) {
  var line = nav.cart.filter(function (l) { return l.productId === productId; })[0];
  if (!line) return;
  line.qty -= 1;
  if (line.qty <= 0) nav.cart = nav.cart.filter(function (l) { return l.productId !== productId; });
  var st = state[nav.stand];
  var p = st.products.filter(function (x) { return x.id === productId; })[0];
  if (p) updateTileBadge(p);
  renderCartSection();
}

function updateTileBadge(p) {
  var tileBtn = document.querySelector('.tile[data-id="' + p.id + '"]');
  if (!tileBtn) return;
  var qty = cartQty(p.id);
  var remaining = p.controlled ? (p.stock - qty) : null;
  var disabled = p.controlled && remaining <= 0;
  tileBtn.toggleAttribute("disabled", disabled);
  var badge = tileBtn.querySelector(".cart-badge");
  if (qty > 0) {
    if (!badge) { badge = document.createElement("span"); badge.className = "cart-badge"; tileBtn.appendChild(badge); }
    badge.textContent = qty;
  } else if (badge) {
    badge.remove();
  }
}

function renderCartSection() {
  var wrap = document.getElementById("cartSection");
  if (!wrap) return;
  var lines = cartLines();
  var html = "";
  if (lines.length) {
    html += '<div class="eyebrow">Carrito</div><div class="cart-list">';
    lines.forEach(function (l) {
      html += '<div class="cart-line"><span class="icon">' + l.product.icon + '</span><span class="name">' + l.product.name + '</span>' +
        '<span class="sub">' + money(l.subtotal) + '</span>' +
        '<span class="stepper"><button class="qty-btn" data-dec="' + l.product.id + '">–</button>' +
        '<span class="stock-num">' + l.qty + '</span>' +
        '<button class="qty-btn" data-inc="' + l.product.id + '">+</button></span></div>';
    });
    html += "</div>";
  }
  html += '<div class="checkout-bar"><div class="info"><span class="n">' +
    (lines.length ? cartCount() + " producto" + (cartCount() === 1 ? "" : "s") : "Tocá productos para agregarlos") + "</span>" +
    (lines.length ? '<span class="t">' + money(cartTotal()) + "</span>" : "") + "</div>" +
    '<button class="go" id="btnVender"' + (lines.length ? "" : " disabled") + ">Vender</button></div>";
  wrap.innerHTML = html;

  wrap.querySelectorAll("[data-inc]").forEach(function (b) {
    b.addEventListener("click", function () { addToCart(b.getAttribute("data-inc")); });
  });
  wrap.querySelectorAll("[data-dec]").forEach(function (b) {
    b.addEventListener("click", function () { decLine(b.getAttribute("data-dec")); });
  });
  var goBtn = document.getElementById("btnVender");
  if (goBtn) goBtn.addEventListener("click", function () {
    if (!cartLines().length) return;
    nav.checkout = true;
    render();
  });
}

function renderCartReadonly() {
  var wrap = document.getElementById("cartReadonly");
  if (!wrap) return;
  var html = "";
  cartLines().forEach(function (l) {
    html += '<div class="cart-line"><span class="icon">' + l.product.icon + '</span><span class="name">' +
      l.product.name + (l.qty > 1 ? " × " + l.qty : "") + '</span><span class="sub">' + money(l.subtotal) + "</span></div>";
  });
  wrap.innerHTML = html;
}

function renderPayChoices() {
  var wrap = document.getElementById("payChoices");
  if (!wrap) return;
  wrap.innerHTML = "";
  PAY_METHODS.forEach(function (m) {
    var btn = document.createElement("button");
    btn.className = "pay-choice";
    btn.type = "button";
    btn.innerHTML = '<span class="ic">' + (PAY_ICON[m.id] || "") + "</span><span>" + m.label + "</span>";
    btn.addEventListener("click", function () { finalizeSale(m.id); });
    wrap.appendChild(btn);
  });
}

function finalizeSale(payMethodId) {
  var st = state[nav.stand];
  var lines = cartLines();
  if (!lines.length) { nav.checkout = false; render(); return; }
  var items = lines.map(function (l) {
    return { productId: l.product.id, name: l.product.name, qty: l.qty, price: l.product.price };
  });
  var total = cartTotal();
  items.forEach(function (it) {
    var p = st.products.filter(function (x) { return x.id === it.productId; })[0];
    if (p) {
      p.sold += it.qty;
      if (p.controlled) { p.stock = Math.max(0, p.stock - it.qty); p.level = levelFor(p.stock, p.thresholds); }
    }
  });
  st.totals.ventas += 1; st.totals[payMethodId] += total;
  st.cumulative.ventas += 1; st.cumulative[payMethodId] += total;
  st.log.push({ time: nowLabel(), type: "venta", items: items, total: total, payMethod: payMethodId, voided: false });

  var lowStock = items
    .map(function (it) { return st.products.filter(function (x) { return x.id === it.productId; })[0]; })
    .filter(function (p) { return p && p.controlled && (p.level === "critico" || p.level === "agotado"); });

  nav.cart = [];
  nav.checkout = false;
  nav.screen = "vender";
  render();
  showToast("Venta registrada · " + money(total) + " · " + payLabel(payMethodId));
  if (lowStock.length) {
    setTimeout(function () {
      showToast("⚠ Stock bajo: " + lowStock.map(function (p) { return p.name; }).join(", "));
    }, 2300);
  }
}

function voidSale(entry) {
  var st = state[nav.stand];
  entry.voided = true;
  st.totals.ventas -= 1; st.totals[entry.payMethod] -= entry.total;
  st.cumulative.ventas -= 1; st.cumulative[entry.payMethod] -= entry.total;
  entry.items.forEach(function (it) {
    var p = st.products.filter(function (x) { return x.id === it.productId; })[0];
    if (p) {
      p.sold -= it.qty;
      if (p.controlled) { p.stock += it.qty; p.level = levelFor(p.stock, p.thresholds); }
    }
  });
  st.log.push({ time: nowLabel(), type: "anulacion", items: entry.items, total: entry.total });
}
