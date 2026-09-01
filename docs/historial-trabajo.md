# Historial de trabajo

Registro cronológico de las tareas y decisiones tomadas en el proyecto, a modo de bitácora. Para el detalle de diseño de cada fase ver [spec-fase2-sheets.md](spec-fase2-sheets.md); para desplegar el backend ver [deploy-apps-script.md](deploy-apps-script.md).

## Fase 1 — Prototipo inicial

**Commit:** `874951d` — *Primer commit: prototipo Caja Misionera + documento de entendimiento*

- Se armó `app/index.html`, la app de una sola página (HTML/CSS/JS sin build) que cubre los tres tipos de puesto del evento: **Buffet**, **Tickets** y **Entradas**, cada uno con su flujo de venta, stock y arqueo de caja.
- Se incorporó `docs/documento-entendimiento.docx` con el alcance funcional completo relevado con el grupo misionero.
- En esta etapa todo el estado vivía en memoria del navegador: un F5 o cierre accidental hacía perder el trabajo. No había persistencia ni sincronización entre puestos.

## Fase 2 — Identificación de puesto + sincronización a Google Sheets

**Commit:** `0befbdb` — *Fase 2: identificación de puesto, sincronización a Sheets y mejoras mobile*

- **Login por puesto:** antes de operar, la app pide tipo de puesto, identificador (para diferenciar puestos duplicados, ej. "Buffet 1"/"Buffet 2") y nombre del voluntario a cargo. No es autenticación real — es trazabilidad, acorde al riesgo bajo del evento (ver decisión en [spec-fase2-sheets.md](spec-fase2-sheets.md#1-identificación-del-puesto-login-básico)).
- **Persistencia local:** sesión de puesto, stock, ventas y caja del corte en curso se guardan en `localStorage` — sobrevive a recargas y cierres accidentales del navegador.
- **Cierre de corte con sincronización centralizada:** cada corte cerrado se empaqueta (movimientos + resumen de venta + resumen de cierre) y se envía por `fetch` POST a un Google Apps Script publicado como Web App, que lo escribe en tres pestañas de una Google Sheet (`Movimientos`, `Resumen por venta`, `Resumen por cierre`). Si el envío falla, el corte no se pierde: queda en una cola local con reintento automático.
- **Protección simple:** token por puesto (`tipo:identificador`, ej. `buffet:buffet-1`), validado en el propio Apps Script.
- **Mejoras mobile:** viewport meta, inputs de 16px (evita zoom automático de iOS), touch targets más grandes, badge de sincronización reposicionado.
- Se agregó el backend (`appsscript/Code.gs`, `appsscript/appsscript.json`) y la guía de despliegue con `clasp` ([deploy-apps-script.md](deploy-apps-script.md)).

## Ajuste — URL del Web App por defecto

**Commit:** `916e7b1` — *Configurar URL del Web App por defecto para sincronizar sin setup manual*

- Se hardcodeó la URL del Web App ya desplegado (`DEFAULT_WEB_APP_URL` en `app/index.html`) para que cada dispositivo/puesto no tenga que pegarla a mano la primera vez. Sigue siendo editable desde Menú → Seteo → Sincronización con Sheets por si en algún momento hace falta apuntar a otra planilla.

## Hosting en GitHub Pages (2026-08-22)

- Se confirmó que el repo (`facugironte/caja-misionera`) tiene GitHub Pages activo, sirviendo desde la rama `master`.
- La raíz (`https://facugironte.github.io/caja-misionera/`) mostraba por defecto el `README.md` renderizado por Jekyll, no la app.
- Se agregó un `index.html` en la raíz del repo que redirige automáticamente a `app/index.html`, así la URL raíz lleva directo a la app funcional en vez de a la documentación.

## Notas de entorno

- Se resolvió un problema de la extensión de Claude Code para VS Code ("Error during execution" al chatear): el CLI de `claude` solo existía embebido en la app de escritorio (carpeta versionada, fuera del PATH). Se instaló el paquete oficial `@anthropic-ai/claude-code` vía `npm install -g`, quedando disponible en el PATH y utilizable tanto desde terminal como desde la extensión.

## Reestructuración del front-end en archivos separados (2026-08-22)

- `app/index.html` era un único archivo de 1326 líneas con todo el CSS y JS embebido. Se separó en `app/css/styles.css` + `app/js/*.js` (uno por responsabilidad: datos de productos, sesión de puesto, persistencia de estado, sincronización con Sheets, helpers de UI y una vista por pantalla en `app/js/views/`), enlazados desde `app/index.html` con `<script>` clásicos (no ES modules), a propósito: los ES modules no cargan por CORS al abrir un archivo directo con `file://`, y se quería mantener esa forma de uso.
- Se verificó el resultado con un test headless (Playwright): login, setup de stock/caja, una venta de prueba y cierre, sin errores de consola — tanto sirviendo `app/` con un servidor estático como abriendo el archivo directo por `file://`.
- Se agregó `standalone/index.html`, una versión de un solo archivo autocontenido (HTML+CSS+JS) generada a partir de `app/` con `node scripts/build-standalone.js`, para poder repartir la app como un único archivo (pendrive, WhatsApp, mail) sin necesidad de la estructura de carpetas. Hay que regenerarla manualmente después de cambios en `app/` — no se regenera sola.

## Bug fix: estado de puesto pisado al cambiar de identificador + cierre de puesto obligatorio (2026-08-22)

- **Bug corregido:** al cerrar un puesto con "Cambiar de puesto" y volver a identificarse con un identificador *distinto* del mismo tipo (ej. "Buffet 1" → "Buffet 2") dentro de la misma sesión de página, la app mostraba el stock/ventas/cortes del puesto anterior en vez de arrancar de cero. Causa: el estado en memoria no se recargaba al loguearse, solo al bootear la página. Se corrigió para que cada login busque el estado persistido exacto de `tipo:identificador` o arranque fresco si no existe.
- **"Cambiar de puesto" ahora fuerza un cierre final** si el puesto ya arrancó a operar: lleva a Resumen en modo "cierre de puesto", pide el efectivo contado (obligatorio en este caso) y recién después libera la sesión. Si el puesto nunca terminó el seteo inicial, el cambio sigue siendo instantáneo.
- **Se sacó el campo de efectivo contado de los cierres de corte intermedios** — cierran directo con el efectivo esperado, sin pedir contar nada. Sigue siendo obligatorio en el cierre final de puesto. El contador informativo de la pantalla Seteo no se tocó — sigue siendo la herramienta para chequear la caja durante los cortes intermedios.
- El cierre final manda, además del corte normal, un resumen agregado de toda la sesión del puesto (todos los cortes) a una pestaña nueva del Sheets: **"Cierre de puesto"**. Ver decisión completa en [spec-fase2-sheets.md](spec-fase2-sheets.md#4bis-cierre-obligatorio-al-cambiar-de-puesto--pestaña-cierre-de-puesto-2026-08-22).
- Si ya tenías la planilla desplegada de antes, hay que volver a correr `setupSheets` desde el editor de Apps Script para que se cree la pestaña nueva (ver [deploy-apps-script.md](deploy-apps-script.md)) y re-desplegar el Web App (`clasp push` + nueva versión) para que tome el `Code.gs` actualizado.
- Verificado con un test headless (Playwright, mockeando el endpoint de Sheets para no escribir datos de prueba en la planilla real): venta → cierre intermedio sin contado → cambio de puesto forzando cierre final con contado → nuevo puesto con identificador distinto sin arrastrar datos del anterior. Todo sin errores de consola.
- Se agregó un botón **"Cerrar puesto"** al final de la sección Caja en Seteo, como acceso directo al mismo flujo de cierre (alternativa a pasar por "Cambiar de puesto" en el menú).
- El cierre final pide confirmación con un popup nativo (`confirm()`) antes de ejecutarse, aclarando que es una decisión importante y no se puede deshacer. Cancelar deja todo como estaba.

## Split de "Seteo de stock y caja" en "Stock" y "Otros", y luego fusión en "Caja" (2026-08-22)

- Primer paso: la pantalla única de Seteo (Productos + Caja + Sincronización con Sheets) se separó en dos: "Stock" (solo Productos) y "Otros" (Caja + Sincronización con Sheets).
- Segundo paso (a pedido, tras aclarar que se refería a unir pantallas y no paneles dentro de una misma pantalla): esa pantalla "Otros" se fusionó con "Resumen de caja" en una sola pantalla, **"Caja"** — queda: totales y movimientos del corte en curso, cierre de corte/puesto, resumen acumulado del puesto (caja inicial, efectivo esperado, contador informativo) y Sincronización con Sheets, todo junto. El botón "Cerrar puesto" (antes navegaba a otra pantalla) ahora activa el modo de cierre final **en la misma pantalla** — el bloque de arriba pide el contado y confirma, y el botón informativo desaparece para no duplicar la acción.
- El menú principal quedó en 3 opciones: **Vender**, **Caja**, **Stock**.
- Verificado con Playwright de punta a punta (venta, ver todo en Caja, activar cierre de puesto desde el botón informativo, confirmar y volver a login), sin errores de consola.

## Filtrado de movimientos por sección + formato de timestamp (2026-08-22)

- **Vender** ("Ventas de este corte") ahora solo muestra ventas y anulaciones — antes también aparecían ahí las reposiciones de stock, mezcladas.
- **Stock** ahora tiene su propia lista de movimientos ("Movimientos de stock — Corte N"), mostrando solo las reposiciones/ajustes de stock del corte en curso.
- **Caja** sigue mostrando todos los movimientos sin filtrar (ventas, anulaciones y stock juntos), sin cambios.
- El timestamp de cada movimiento (`nowLabel()`) pasó de hora de 12hs con segundos y AM/PM (ej. "02:05:30 p. m.") a día/mes + hora de 24hs sin segundos (ej. "22/08 14:05"), calculado a mano (sin `Intl`) porque se detectó que el padding de mes de dos dígitos de `Intl.DateTimeFormat` para `es-AR` es inconsistente entre entornos.
- Verificado con Playwright: cada sección muestra solo lo que le corresponde, con capturas de pantalla confirmando que el nuevo formato de fecha/hora no rompe el layout.

## Ajustes de UI en Ventas, Stock y Caja (2026-08-22)

- **Ventas de este corte** (pantalla Vender) ahora filtra: solo ventas y anulaciones (antes se mezclaban ahí las reposiciones de stock), y ya no se limita a las últimas 6 — muestra todas.
- **Stock** tiene su propia lista de movimientos de stock (solo reposiciones/ajustes), separada de las ventas.
- **Caja** sigue mostrando todos los movimientos sin filtrar, pero ahora paginados: solo los últimos 5 por defecto, con un link **"Mostrar más / Mostrar menos"** para expandir o volver a colapsar.
- El timestamp de cada movimiento (`nowLabel()`) se cambió a día/mes + hora 24hs sin segundos (ej. "22/08 14:05"), calculado a mano para evitar una inconsistencia de `Intl.DateTimeFormat` con `es-AR` (el padding del mes a dos dígitos no era confiable entre entornos).
- **Tarjetas de producto en Stock**: se rediseñaron como acordeón. Colapsadas muestran ícono, nombre, badge de estado de stock (o "Sin control") y precio, con una flechita para expandir. Al expandir aparecen los controles de edición: precio editable, switch de "controlar stock" y los botones −/+/+10 (alineados a la derecha, sin duplicar el badge que ya se ve arriba). Esto redujo bastante el scroll de la pantalla con varios productos.
- Al actualizar el stock (±1, +10), el toast y el registro de "Movimientos de stock" ahora muestran el stock resultante entre paréntesis (ej. "+10 Hamburguesa (357)"), no solo el delta.
- Verificado todo con Playwright (capturas de pantalla incluidas) y sin errores de consola.

## Badge de stock al costado del nombre + alineación (2026-08-22)

- El badge de estado de stock (o "Sin control") se movió a estar al lado del nombre del producto (en vez de solo dentro del panel expandido), tanto colapsada como expandida la tarjeta. Usa `flex-wrap` para quedar en la misma línea cuando hay espacio (PC/tablet) y apilarse debajo del nombre cuando no entra (mobile angosto) — sin media queries, resuelto solo con flexbox.
- Se corrigió un problema de alineación: cuando el badge se apilaba debajo del nombre, el ícono del producto quedaba centrado verticalmente "flotando" entre las dos líneas. Ahora el encabezado alinea todo arriba (`align-items: flex-start`), así el ícono siempre queda a la altura del nombre.
- En el panel expandido, el grupo de botones −/+/+10 quedaba pegado a la derecha con un espacio vacío grande a la izquierda (después de sacar el badge duplicado de esa fila). Se alinearon a la izquierda para que se vea más prolijo.
- Verificado con capturas en varios anchos (1000px, 900px, 480px, 340px) para confirmar que el layout se acomoda bien en todos los casos.

## Cierre de puesto simplificado + edición de stock por input (2026-08-22)

- **Pantalla "Caja" en modo cierre de puesto** (al tocar "Cerrar puesto"): se sacó la sección de Sincronización con Sheets (no aporta nada en ese momento) y se unificaron los dos paneles de efectivo que se pisaban (el de cierre del corte y el "Resumen del puesto" con su contador informal) en uno solo: caja inicial, ventas totales del puesto, transferencias/tarjetas totales, efectivo esperado, efectivo contado (obligatorio) y retiro — todo en un único panel antes de confirmar. En el modo normal (fuera del cierre de puesto) no cambió nada: sigue con el cierre de corte simple, el resumen informal del puesto y la sincronización con Sheets.
- **Tarjetas de producto en Stock**: el campo "Precio" pasó del patrón de label arriba + input a lo ancho, a label a la izquierda + input compacto a la derecha (mismo patrón que "Controlar stock"), evitando un input excesivamente ancho.
- Los botones de stock pasaron de −/+/+10 sueltos a −, un **input numérico editable con el stock actual en el medio**, +, +10 — se puede escribir directamente la cantidad nueva (igual que el precio) además de usar los botones. Cualquiera de los dos caminos registra el movimiento en "Movimientos de stock" con el delta y el stock resultante entre paréntesis.
- Verificado con Playwright: modo normal sin cambios, modo cierre de puesto sin Sheets ni duplicados, edición de stock por input funcionando y quedando registrada igual que los botones.

## Cierre de puesto minimalista + anular ventas movido a Vender (2026-08-22)

- El panel de cierre de puesto se rehízo por completo: sin stat-grid del corte, sin lista de "Movimientos". Queda: cantidad de ventas totales del puesto, un desglose (efectivo inicial, ventas por método de pago, ventas totales), efectivo esperado, efectivo contado (con badge de sobrante/faltante **en vivo**, igual que el contador informal) y efectivo que retirás — todo antes del botón de confirmación con popup.
- **Anular venta** se sacó de la pantalla Caja y se movió a **Vender** ("Ventas de este corte"), que es donde tiene más sentido operativamente (ahí mismo donde se hace la venta). Caja ya no tiene botones de anular en su lista de Movimientos (que sigue existiendo solo en modo normal, no en el cierre de puesto).
- Verificado con Playwright: anular desde Vender funciona y se refleja en los totales, Caja normal ya no tiene botón de anular, el cierre de puesto no muestra movimientos ni stat-grid, y el badge de sobrante/faltante se actualiza en vivo al tipear el contado (probado con sobrante y con faltante).

## Ajuste fino del cierre de puesto + alineación de Stock (2026-08-22)

- Se restauró el bloque de **"cierre de corte"** en el cierre de puesto (se había sacado por error en el rediseño anterior): "Efectivo esperado (este corte)" + input de retiro + botón, con el mismo formato que el cierre de un corte intermedio.
- **Se eliminó el campo "Efectivo contado"** del cierre de puesto: al ser el cierre final, no tiene sentido contar y después retirar por separado — el volante cuenta todo el efectivo y lo pone directo en "Efectivo que retirás del puesto" (ese valor hace de contado y de retiro a la vez; lo que "queda" después del cierre final siempre es $0). El badge de sobrante/faltante en vivo ahora reacciona a ese mismo input.
- Se agregó **"Efectivo retirado"** al resumen del puesto (dentro del cierre de puesto): total acumulado de lo retirado en *todos* los cortes del puesto, no solo el último. Requirió agregar un contador nuevo (`cumulative.retirado`) que se incrementa en cada cierre de corte, intermedio o final.
- Se corrigió la alineación de "Precio" y "Controlar stock de este producto" dentro de la tarjeta expandida de Stock: estaban con el control (input/switch) pegado al borde derecho de la tarjeta (patrón label-izquierda/control-derecha típico de un toggle); se cambió a que la etiqueta y el control queden agrupados a la izquierda, con las etiquetas en una columna de ancho fijo para que ambos controles quedaran alineados verticalmente entre sí.
- Verificado con Playwright de punta a punta (corte intermedio con retiro parcial, corte siguiente, cierre final con validación de badge en vivo y bloqueo si se deja vacío) confirmando que todos los montos y el payload enviado a Sheets cierran matemáticamente.

## Subtítulo "Corte de caja" (2026-08-22)

- En la pantalla Caja (modo normal, cierre de corte intermedio), se agregó el subtítulo "Corte de caja" entre la lista de Movimientos y el panel de cierre (efectivo esperado + retiro + botón), para separar visualmente esa sección.

## Reordenamiento del cierre de puesto (2026-08-22)

- Se agregaron los KPI del corte (Ventas/Efectivo/Transferencia/Tarjeta/Otro/Total del corte) arriba de todo en el cierre de puesto — los mismos que ya se ven en la Caja en modo normal.
- Se reordenó esa pantalla: ahora es KPIs del corte → Resumen del puesto (cantidad de ventas, desglose, efectivo retirado) → panel de cierre (efectivo esperado + retiro + botón). Antes el panel de cierre iba primero.

## Pantalla de venta en un solo paso + confirmación al vender y al anular (2026-08-31)

- **Se unificó el flujo de venta en una sola pantalla.** Antes: pantalla Vender (con una tarjeta "Nueva venta") → pantalla Carrito (grilla + carrito) → paso de checkout (total + elegir método de pago, que cobraba al instante). Ahora la pantalla **Vender** muestra de una: grilla de productos, carrito con los `−/＋`, selector de método de pago (fila compacta de 4 opciones: Efectivo / Transferencia / Tarjeta / Otro) y la barra inferior fija con total + botón **Vender**. El botón queda deshabilitado hasta que haya productos *y* un método de pago elegido.
- **El botón "Vender" ahora pide confirmación** con un popup nativo (`confirm()`) que resume la venta (productos, total, método de pago) antes de registrarla. Cancelar deja el carrito intacto.
- **Anular una venta también pide confirmación** ahora, con un popup que muestra qué venta se anula (ítems, total, método) y aclara que se devuelve el stock y se descuenta del corte. Al confirmar, se re-renderiza toda la pantalla, así el chip del corte y los badges de stock de las tarjetas reflejan la devolución al instante (antes el chip quedaba con el total viejo hasta navegar).
- Se eliminó la vista `app/js/views/carrito.js` (su lógica de carrito/venta se movió a `vender.js`); se sacó del `index.html`, del router en `nav.js` (ya no existe la screen `"carrito"`, ni el flag `nav.checkout`; se agregó `nav.payMethod`) y del `scripts/build-standalone.js`. En CSS se reemplazaron `.checkout-summary` / `.pay-choice*` por `.pay-row` / `.pay-opt`.
- Verificado con el navegador headless: alta de venta con confirmación (y cancelación sin efecto), anulación con confirmación (y cancelación sin efecto), totales/stock/chip cuadrando después de cada operación, sin errores de consola. `standalone/index.html` regenerado.

## Nuevo catálogo de productos + stock compartido en Buffet + "Consumo misionero" (2026-08-31)

- **Catálogo actualizado según el relevamiento definitivo:**
  - **Buffet:** Choripán + bebida ($10.000), 2 choripán + bebida ($18.000), Hamburguesa + bebida ($10.000), 2 hamburguesa + bebida ($18.000), Bebida ($1.000), Café ($1.000), Té ($1.000), Torta ($3.000). Todo controla stock por defecto: los combos y la bebida descuentan de los pools; Café/Té/Torta tienen stock propio (control activado por defecto, editable como cualquier producto).
  - **Tickets:** 1 juego ($1.000), 1 tira (5) ($3.000), 2 tiras (10) ($5.000). Sin control de stock. (Se mantiene el nombre visible "Tickets" y la clave interna `tickets`.)
  - **Entradas:** única opción "Entrada en puerta" ($2.000), con control de stock **apagado por defecto** (activable desde la pantalla Stock).
- **Stock compartido (pools) en Buffet.** Se introdujo el concepto de *pool de stock*: un recurso del que descuentan uno o varios productos. Buffet tiene 3 pools — **Choripán, Hamburguesa, Bebida**. Cada producto vendible define una `recipe` (ej. "2 choripán + bebida" descuenta 2 de Choripán y 1 de Bebida). Vender una bebida sola o cualquier combo que la incluya descuenta del mismo stock de Bebida. Café/Té/Torta no controlan stock.
  - En la grilla de Vender, cada combo muestra "Alcanza para N" (el mínimo entre `stock_pool / unidades_receta` de todos sus pools) y se deshabilita cuando algún pool no alcanza — considerando también lo que ya hay en el carrito (si el carrito reserva toda la Bebida, se deshabilitan todos los combos con bebida, no solo el que tocaste).
  - Al cerrar la venta se descuenta de los pools; al anular se devuelve. El aviso de "stock bajo" mira el nivel de los pools tocados.
- **Pantalla Stock:** nueva sección **"Stock del puesto"** arriba, con los pools (Choripán / Hamburguesa / Bebida) y sus controles `−/input/+/+10`. La sección "Productos" ahora, para los combos, muestra la receta ("Usa 2× Choripán + 1× Bebida") en vez del toggle de stock propio; el toggle "Controlar stock de este producto" queda solo para productos sin receta (Café, Té, Torta, Entrada en puerta).
- **Seteo inicial del puesto:** "Stock inicial" lista los pools del puesto (además de cualquier producto con stock propio activado).
- **Nuevo medio de pago "Consumo misionero"** en lugar de "Otro". Para no tocar el backend ni las columnas ya sincronizadas del Sheet, el **id interno se mantiene `otro`** — solo cambia la etiqueta visible (botón de pago, KPIs de Caja, resumen del puesto). Si más adelante se quiere una columna propia en el Sheet, hay que renombrar el id y ajustar `Code.gs` + re-`setupSheets` + re-deploy.
- **Versionado del estado persistido:** se agregó `STATE_SCHEMA`. Al bootear/loguearse, un estado guardado en `localStorage` con otro esquema (o sin esquema, como los viejos) se descarta y el puesto arranca de cero — necesario porque el catálogo y la forma del estado cambiaron de raíz. Se subió a `3` al activar el control de stock de Café/Té/Torta por defecto, para que los puestos nuevos tomen el default.
- Verificado con el navegador headless de punta a punta: seteo con los 3 pools, ventas de combos descontando la cantidad correcta de cada pool, deshabilitado cruzado por reservas del carrito, anulación devolviendo el stock, reposición de pools desde la pantalla Stock, y los otros dos puestos con su catálogo nuevo. Sin errores de consola. `standalone/index.html` regenerado.

## Reorganización de la planilla de Sheets: 3 pestañas (2026-08-31)

Se reemplazó la estructura de 4 pestañas (`Movimientos`, `Resumen por venta`, `Resumen por cierre`, `Cierre de puesto`) por 3:

- **DetalleVentas** — una fila por producto vendido, con `venta_id` que agrupa las líneas de la misma venta. Columnas: timestamp, venta_id, puesto (tipo/id/voluntario), corte_id, producto, cantidad, precio_unitario, subtotal, metodo_pago, estado (activa/anulada), total_venta. Las líneas de una venta anulada quedan con `estado = anulada` (no se borran).
- **Cierres** — una fila por cierre de corte (`tipo_cierre = corte`) y una por cierre final de puesto (`tipo_cierre = puesto`). Incluye el desglose de montos $ por método de pago (`monto_efectivo/transferencia/tarjeta/otro`), además de caja inicial, esperado, contado, diferencia, retirado y final. El cierre final de un puesto genera dos filas (la del último corte + el rollup de la sesión).
- **MovimientosStock** — una fila por cada delta de stock: `venta`, `anulacion_venta`, `ajuste_suma`, `ajuste_resta`. En Buffet cada combo descuenta de sus ingredientes, así que "2 choripán + bebida" genera 2 filas (−2 Choripán, −1 Bebida). `stock_resultante` se completa solo en los ajustes manuales; `venta_id` linkea las filas de venta/anulación con DetalleVentas. Productos sin control de stock no generan filas.

Cambios de implementación:
- `appsscript/Code.gs`: nuevas `HEADERS` y `SHEET_*`, `doPost` escribe `data.detalleVentas` → DetalleVentas, `data.movimientosStock` → MovimientosStock, `data.cierre` + `data.cierrePuesto` → Cierres. `validarToken_` sin cambios (sigue usando `data.cierre.puesto_tipo/puesto_id`).
- `app/js/sync.js`: `buildCortePayload` reconstruye `detalleVentas` (por item de cada venta) y `movimientosStock` (reconstruyendo los deltas de pool/producto desde `op.items` + recetas para ventas/anulaciones, y desde los `reposicion` del log para ajustes). `buildCierrePuestoPayload` y el `cierre` del corte ahora comparten exactamente el mismo set de columnas (helper `cierreRow_`), así apilan en la misma pestaña.
- `app/js/format.js`: helper `makeId(prefix)` para ids cortos.
- `app/js/views/vender.js`: cada venta se registra con `id` (`makeId("v")`); la anulación guarda `ventaId` con el id de la venta original, para poder linkear en el Sheet.
- **Requiere** correr `setupSheets` de nuevo y re-desplegar el Web App. Las pestañas viejas quedan sin uso (se pueden borrar a mano).
- Docs actualizados: `spec-fase2-sheets.md` (sección 3 reescrita), `deploy-apps-script.md` (paso 6).
- Verificado con el navegador headless: se construyó el payload de un corte con venta de combo (2 filas de stock por ingrediente), café (sin fila de stock), venta anulada (línea `anulada` en DetalleVentas + par venta/anulacion_venta en MovimientosStock que netea a 0), ajustes manuales ±, y el rollup de puesto. Todas las filas cuadran 1:1 con los encabezados de su pestaña (sin claves de más ni de menos). Puesto Tickets: DetalleVentas OK, MovimientosStock vacío.

## Hamburguesa veggie + métodos de pago por puesto (2026-09-01)

- **Hamburguesa veggie en Buffet:** se agregó un pool de stock aparte (`hambveg`, "Hamburguesa veggie", stock inicial 60) y dos productos que reflejan los de la hamburguesa común: "Hamburguesa veggie + bebida" ($10.000) y "2 hamburguesa veggie + bebida" ($18.000), con receta contra `hambveg` + `bebida`. Descuenta de su propio stock, no del de la hamburguesa de carne.
- **Métodos de pago según el puesto** (`payMethodsFor(standKey)` en `data.js`):
  - **Consumo misionero** (id interno `otro`): solo en Buffet (`stands: ["buffet"]`).
  - **QR**: es el ex "Transferencia" — solo cambió la etiqueta visible (id interno `transferencia` sin tocar, para no romper columnas del Sheet ni `totals`). Disponible en todos los puestos.
  - **Tarjeta**: solo en puestos de comida (`foodOnly` + `food: true` en el stand). Hoy eso es solo Buffet.
  - **Efectivo**: siempre.
  - Resultado: Buffet ofrece los 4; Tickets y Entradas ofrecen Efectivo + QR.
- La grilla de KPIs de Caja renombró "Transferencia" → "QR" y "Ventas transferencias" → "Ventas QR". Las columnas del Sheet (`monto_transferencia`, `monto_otro`) no cambian.
- `STATE_SCHEMA` a `4` (cambió el catálogo del Buffet: pool y productos nuevos).
- Verificado en el navegador: grilla del Buffet con los 10 productos sin romper layout; venta de combo veggie descontando de `hambveg` (y no de `hamb`) y de `bebida`, con las filas correctas en MovimientosStock; selector de pago mostrando 4 opciones en Buffet y 2 en Tickets/Entradas. `standalone/index.html` regenerado.

## Tarjetas de producto más compactas en Vender (2026-09-01)

- **Layout de la tarjeta:** de una columna vertical (ícono arriba, nombre, precio, chip de stock) a dos filas: encabezado (**ícono a la izquierda del nombre**, con el badge de cantidad del carrito al final de la fila) y pie (precio + chip de stock). El alto de cada tarjeta bajó de ~122px a ~60-70px.
- **Chip de stock minimalista:** ahora muestra **solo el número disponible** con el color del estado (verde/amarillo/naranja/rojo). Se sacó el texto ("Alcanza para" / "Stock:") y la etiqueta ("MUCHO", etc.). Productos sin control de stock (Tickets, Entradas) no muestran chip. La pantalla Stock (`seteo-stock`) sigue con el formato verboso ("Stock: N · MUCHO"), no se tocó.
- **Media query de celular** (`max-width: 480px`, la primera del proyecto para el grid de productos): fuerza 2 columnas, achica padding/fuentes/gap y el badge de carrito. En pantallas más anchas se mantiene el grid `auto-fill minmax(150px, 1fr)`.
- Implementación: `productStockLine` en `vender.js` devuelve `<span class="stock-chip stock-NIVEL">N</span>` o `""`; la grilla arma `.tile-head` / `.tile-foot`. CSS: nuevas reglas `.tile-head/.tile-foot/.stock-chip`, `.cart-badge` deja de ser `position:absolute` (ahora es el último ítem flex del encabezado).
- Verificado en el navegador a 375px y en ancho normal: ícono a la izquierda, chip solo-número con color, 2 columnas sin overflow, tarjeta deshabilitada mostrando "0" en rojo, Tickets sin chip.

## Pendientes / posibles próximos pasos

- Evaluar si conviene mover `app/index.html` a la raíz del repo (en vez de un redirect) para simplificar aún más la estructura.
- Token más robusto que `tipo:identificador` para validar los envíos a Sheets (por ahora se mantiene el simple, a propósito, es tarea futura).
- Dashboard en vivo de todos los puestos (Fase 3): panel que muestre el estado agregado de Buffet/Tickets/Entradas en tiempo real durante el evento.
- Panel de lectura de la planilla de Sheets aparte de la app (para consultar lo ya sincronizado sin abrir Google Sheets directamente).
