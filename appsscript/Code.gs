/**
 * Caja Misionera — recibe el paquete de cada corte cerrado y lo escribe en la
 * planilla ligada a este script, en tres pestañas:
 *
 *   - "DetalleVentas"     una fila por producto vendido, con un id de venta que
 *                         agrupa las líneas de la misma venta.
 *   - "Cierres"           una fila por cada cierre de corte y una por el cierre
 *                         final del puesto (columna tipo_cierre), con el detalle
 *                         de montos $ por método de pago.
 *   - "MovimientosStock"  una fila por cada cambio de stock: por venta, por
 *                         anulación de venta, y por ajuste manual (suma/resta).
 *
 * Desplegar como Web App (Implementar > Nueva implementación > Aplicación web),
 * acceso "Cualquier usuario". Ver docs/deploy-apps-script.md para el paso a paso.
 */

var SHEET_DETALLE_VENTAS = "DetalleVentas";
var SHEET_CIERRES = "Cierres";
var SHEET_MOV_STOCK = "MovimientosStock";

var HEADERS = {};
HEADERS[SHEET_DETALLE_VENTAS] = ["timestamp", "venta_id", "puesto_tipo", "puesto_id", "voluntario", "corte_id", "producto", "cantidad", "precio_unitario", "subtotal", "metodo_pago", "estado", "total_venta"];
HEADERS[SHEET_CIERRES] = ["timestamp", "tipo_cierre", "puesto_tipo", "puesto_id", "voluntario", "corte_id", "apertura", "cierre", "cant_cortes", "cant_ventas", "monto_efectivo", "monto_transferencia", "monto_tarjeta", "monto_otro", "monto_total_vendido", "caja_inicial", "efectivo_esperado", "efectivo_contado", "diferencia", "efectivo_retirado", "efectivo_final"];
HEADERS[SHEET_MOV_STOCK] = ["timestamp", "puesto_tipo", "puesto_id", "voluntario", "corte_id", "tipo", "item", "delta", "stock_resultante", "venta_id", "motivo"];

/**
 * Ejecutar una vez a mano desde el editor de Apps Script (menú Ejecutar > setupSheets)
 * para crear las pestañas con sus encabezados. Es seguro volver a ejecutarla:
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
    appendRows_(ss, SHEET_DETALLE_VENTAS, data.detalleVentas || []);
    appendRows_(ss, SHEET_MOV_STOCK, data.movimientosStock || []);
    var cierres = [];
    if (data.cierre) cierres.push(data.cierre);
    if (data.cierrePuesto) cierres.push(data.cierrePuesto);
    appendRows_(ss, SHEET_CIERRES, cierres);
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
