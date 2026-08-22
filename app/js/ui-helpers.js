"use strict";

function h(tag, attrs, html) {
  var s = "<" + tag;
  for (var k in attrs) s += " " + k + '="' + attrs[k] + '"';
  s += ">" + (html || "") + "</" + tag + ">";
  return s;
}

function stockLine(p) {
  if (!p.controlled) return '<span class="stock-line stock-sin"><span class="dot"></span>Sin control</span>';
  var lbl = LEVEL_LABEL[p.level];
  var text = p.approxLabel ? p.approxLabel(p.stock) : (p.level === "agotado" ? "Agotado" : ("Stock: " + p.stock));
  return '<span class="stock-line stock-' + p.level + '"><span class="dot"></span>' + text + " · " + lbl + "</span>";
}

function payLabel(id) {
  var m = PAY_METHODS.filter(function (x) { return x.id === id; })[0];
  return m ? m.label : id;
}

function itemsSummary(items) {
  return items.map(function (it) { return it.name + (it.qty > 1 ? " ×" + it.qty : ""); }).join(", ");
}

function opRowHtml(op, idx, allowVoid) {
  if (op.type === "venta") {
    return '<div class="op-row' + (op.voided ? " voided" : "") + '">' +
      '<span class="time">' + op.time + "</span>" +
      '<span class="desc">' + itemsSummary(op.items) + " · " + money(op.total) + "<small>" + payLabel(op.payMethod) + "</small></span>" +
      (allowVoid && !op.voided ? '<button class="void-btn" data-void="' + idx + '">Anular</button>' : "") +
      "</div>";
  }
  if (op.type === "anulacion") {
    return '<div class="op-row"><span class="time">' + op.time + '</span><span class="desc">↩ Venta anulada · ' +
      itemsSummary(op.items) + " · -" + money(op.total) + "</span></div>";
  }
  if (op.type === "reposicion") {
    return '<div class="op-row"><span class="time">' + op.time + '</span><span class="desc">↑ Reposición · ' +
      op.name + " " + (op.delta > 0 ? "+" : "") + op.delta + "</span></div>";
  }
  return "";
}

function header(title, sub, chipHtml, noBack) {
  var standDef = nav.stand ? STANDS[nav.stand] : null;
  return (
    '<div class="topbar">' +
      (noBack ? "" : '<button class="backbtn" id="backBtn" aria-label="Volver">←</button>') +
      '<div class="topbar-title">' +
        (standDef ? '<div class="topbar-mark">' + standDef.icon + "</div>" : "") +
        "<div><h1>" + title + "</h1>" + (sub ? "<p>" + sub + "</p>" : "") + "</div>" +
      "</div>" +
      (chipHtml || "") +
    "</div>"
  );
}

function chipCorte(st) {
  var total = st.totals.efectivo + st.totals.transferencia + st.totals.tarjeta + st.totals.otro;
  return '<div class="topbar-chip">Corte <strong>' + st.corte + "</strong> · " + money(total) + "</div>";
}

function stat(label, value) {
  return '<div class="stat"><div class="label">' + label + '</div><div class="value">' + value + "</div></div>";
}
