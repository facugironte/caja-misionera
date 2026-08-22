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

## Pendientes / posibles próximos pasos

- Evaluar si conviene mover `app/index.html` a la raíz del repo (en vez de un redirect) para simplificar aún más la estructura.
- Token más robusto que `tipo:identificador` para validar los envíos a Sheets (por ahora se mantiene el simple, a propósito, es tarea futura).
- Dashboard en vivo de todos los puestos (Fase 3): panel que muestre el estado agregado de Buffet/Tickets/Entradas en tiempo real durante el evento.
- Panel de lectura de la planilla de Sheets aparte de la app (para consultar lo ya sincronizado sin abrir Google Sheets directamente).
