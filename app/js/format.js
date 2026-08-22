"use strict";

var fmt = new Intl.NumberFormat("es-AR");
function money(n) { return "$" + fmt.format(Math.round(n)); }

function pad2(n) { return (n < 10 ? "0" : "") + n; }

function nowLabel() {
  var d = new Date();
  return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

function slugify(s) {
  return String(s || "").trim().toLowerCase()
    .normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
}
