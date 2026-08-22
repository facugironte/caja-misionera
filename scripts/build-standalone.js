#!/usr/bin/env node
// Genera standalone/index.html juntando app/css/styles.css + app/js/*.js
// (en el mismo orden que carga app/index.html) en un único archivo HTML,
// para poder repartir/abrir la app sin depender de la estructura de carpetas.
// Correr después de cualquier cambio en app/ para mantenerlo actualizado:
//   node scripts/build-standalone.js
"use strict";
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var appDir = path.join(root, "app");
var cssPath = path.join(appDir, "css", "styles.css");

var jsOrder = [
  "format.js", "data.js", "state.js", "session.js", "sync.js", "ui-helpers.js",
  "views/login.js", "views/menu.js", "views/setup.js", "views/vender.js",
  "views/carrito.js", "views/resumen.js", "views/seteo.js",
  "nav.js", "main.js"
];

var css = fs.readFileSync(cssPath, "utf8").trim();
var js = jsOrder.map(function (f) {
  return fs.readFileSync(path.join(appDir, "js", f), "utf8").trim();
}).join("\n\n");

var html = [
  "<!DOCTYPE html>",
  '<html lang="es">',
  "<head>",
  '<meta charset="utf-8">',
  "<title>Caja Misionera</title>",
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  '<meta name="color-scheme" content="light only">',
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">',
  "<style>",
  css,
  "</style>",
  "</head>",
  "<body>",
  '<div class="app" id="app"></div>',
  '<div class="toast" id="toast"></div>',
  '<div class="sync-badge" id="syncBadge"></div>',
  "",
  "<script>",
  js,
  "</script>",
  "</body>",
  "</html>",
  ""
].join("\n");

var outDir = path.join(root, "standalone");
fs.mkdirSync(outDir, { recursive: true });
var outPath = path.join(outDir, "index.html");
fs.writeFileSync(outPath, html);
console.log("Generado " + outPath + " (" + (Buffer.byteLength(html) / 1024).toFixed(0) + " KB)");
