# Caja Misionera

Aplicación de caja, stock y arqueo para la kermesse familiar organizada por el grupo misionero del colegio.

## Estado actual

**Fase 2**: la app pide identificar el puesto (tipo, identificador y voluntario a cargo) antes de operar, y cada cierre de corte se envía a una planilla de Google Sheets vía un Apps Script (con cola de reintento local si falla el envío). Tanto la sesión de puesto como el stock, las ventas y la caja del corte en curso se guardan en `localStorage` del dispositivo — un F5 o un cierre accidental del navegador no hace perder el trabajo.

Vista previa en vivo del prototipo:
https://claude.ai/code/artifact/f49690b4-cfb3-4bf4-8a85-09448e1d8588

> La vista previa deja recorrer todo el flujo (login, venta, cierre de corte), pero el envío real a Sheets no funciona ahí: el sandbox del Artifact bloquea `fetch` a dominios externos. Para probar la sincronización real hay que abrir `app/index.html` fuera del Artifact (local o alojado) con el Apps Script ya desplegado — ver [docs/deploy-apps-script.md](docs/deploy-apps-script.md).

## Estructura del repositorio

```
caja-misionera/
├── README.md
├── .gitignore
├── index.html                         # Redirige a app/index.html (para GitHub Pages)
├── docs/
│   ├── documento-entendimiento.docx   # Documento de entendimiento de requerimientos
│   ├── spec-fase2-sheets.md           # Decisiones de diseño de la Fase 2
│   ├── deploy-apps-script.md          # Cómo desplegar el backend de Sheets
│   └── historial-trabajo.md           # Bitácora de tareas y decisiones del proyecto
├── appsscript/
│   ├── Code.gs                        # Backend: recibe los cortes y escribe en Sheets
│   └── appsscript.json                # Manifiesto del proyecto Apps Script
├── app/                                # App de trabajo — multi-archivo, sin build
│   ├── index.html                     # Shell: enlaza css/ y js/ con <script> clásicos
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── format.js, data.js, state.js, session.js, sync.js, ui-helpers.js
│       ├── nav.js, main.js            # Router y arranque de la app
│       └── views/                     # Una vista por pantalla (login, menu, setup, vender, caja, seteo-stock)
├── standalone/
│   └── index.html                     # Versión de un solo archivo (generada), para repartir/abrir sin carpetas
└── scripts/
    └── build-standalone.js            # Regenera standalone/index.html a partir de app/
```

## Cómo abrir la app

Para desarrollar: `app/index.html` funciona abriéndolo directo en el navegador (doble clic) — el resto de `app/` (css/js) se carga junto, sin dependencias de build ni servidor.

Para repartir un único archivo (ej. mandarlo por WhatsApp/mail o dejarlo en un pendrive): usá `standalone/index.html`, que tiene todo (HTML+CSS+JS) autocontenido en un solo archivo. Si cambiás algo en `app/`, regenerá el standalone con:

```bash
node scripts/build-standalone.js
```

En ambos casos, para que la sincronización con Sheets funcione hace falta desplegar el Apps Script una vez (ver [docs/deploy-apps-script.md](docs/deploy-apps-script.md)) y pegar la URL del Web App en Menú → Caja → Sincronización con Sheets.

## Contexto del proyecto

La app cubre tres tipos de puesto durante el evento: **Buffet**, **Tickets** y **Entradas**, cada uno con su propio flujo de venta, control de stock y arqueo de caja independiente. El documento de entendimiento en `docs/` detalla el alcance funcional completo.

## Hosting

La app está publicada con GitHub Pages en https://facugironte.github.io/caja-misionera/ (la raíz redirige automáticamente a `app/index.html`). Para actualizar lo publicado alcanza con hacer push a `master`.

## Historial de trabajo

Ver [docs/historial-trabajo.md](docs/historial-trabajo.md) para la bitácora de tareas, decisiones y cambios realizados en el proyecto hasta la fecha.
