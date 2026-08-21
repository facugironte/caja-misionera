/**
 * Caja Misionera — recibe el paquete de cada corte cerrado y lo escribe
 * en las pestañas "Movimientos", "Resumen por venta" y "Resumen por cierre"
 * de la planilla a la que este script está ligado.
 *
 * Desplegar como Web App (Implementar > Nueva implementación > Aplicación web),
 * acceso "Cualquier usuario". Ver docs/deploy-apps-script.md para el paso a paso.
 */

var SHEET_MOVIMIENTOS = "Movimientos";
var SHEET_VENTAS = "Resumen por venta";
var SHEET_CIERRES = "Resumen por cierre";

var HEADERS = {};
HEADERS[SHEET_MOVIMIENTOS] = ["timestamp", "puesto_tipo", "puesto_id", "voluntario", "corte_id", "tipo_movimiento", "producto", "cantidad", "motivo", "monto", "metodo_pago"];
HEADERS[SHEET_VENTAS] = ["timestamp", "puesto_tipo", "puesto_id", "voluntario", "corte_id", "cant_items", "monto_total", "metodo_pago", "estado"];
HEADERS[SHEET_CIERRES] = ["puesto_tipo", "puesto_id", "voluntario", "corte_id", "apertura", "cierre", "caja_inicial", "efectivo_esperado", "efectivo_contado", "diferencia", "cant_ventas", "monto_total_vendido", "efectivo_retirado", "efectivo_final_puesto"];

/**
 * Ejecutar una vez a mano desde el editor de Apps Script (menú Ejecutar > setupSheets)
 * para crear las tres pestañas con sus encabezados. Es seguro volver a ejecutarla:
 * no borra filas existentes, solo asegura que existan la pestaña y el encabezado.
 */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function (name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
      sheet.setFrozenRows(1);
    }
  });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (!validarToken_(data)) {
      return jsonOutput_({ ok: false, error: "token inválido" });
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    appendRows_(ss, SHEET_MOVIMIENTOS, data.movimientos || []);
    appendRows_(ss, SHEET_VENTAS, data.ventas || []);
    if (data.cierre) appendRows_(ss, SHEET_CIERRES, [data.cierre]);
    return jsonOutput_({ ok: true, corte_id: data.corte_id });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

function validarToken_(data) {
  if (!data || !data.token || !data.cierre) return false;
  var esperado = String(data.cierre.puesto_tipo || "") + ":" + slugify_(data.cierre.puesto_id || "");
  return data.token === esperado;
}

function slugify_(s) {
  return String(s || "").trim().toLowerCase()
    .replace(/[áàäâ]/g, "a").replace(/[éèëê]/g, "e").replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o").replace(/[úùüû]/g, "u").replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
}

function appendRows_(ss, sheetName, rows) {
  if (!rows.length) return;
  var headers = HEADERS[sheetName];
  var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var values = rows.map(function (row) {
    return headers.map(function (key) { return row[key] === undefined ? "" : row[key]; });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
