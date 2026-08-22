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

## Pendientes / posibles próximos pasos

- Evaluar si conviene mover `app/index.html` a la raíz del repo (en vez de un redirect) para simplificar aún más la estructura.
- Revisar si se necesita un token más robusto que `tipo:identificador` si el evento crece en visibilidad o riesgo.
- Definir si se quiere una fase 3 (reportes agregados, dashboard de todos los puestos en vivo, etc.).
