"use strict";

var fmt = new Intl.NumberFormat("es-AR");
function money(n) { return "$" + fmt.format(Math.round(n)); }

function nowLabel() {
  return new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function slugify(s) {
  return String(s || "").trim().toLowerCase()
    .normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
}
