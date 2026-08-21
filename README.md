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
├── docs/
│   ├── documento-entendimiento.docx   # Documento de entendimiento de requerimientos
│   ├── spec-fase2-sheets.md           # Decisiones de diseño de la Fase 2
│   └── deploy-apps-script.md          # Cómo desplegar el backend de Sheets
├── appsscript/
│   ├── Code.gs                        # Backend: recibe los cortes y escribe en Sheets
│   └── appsscript.json                # Manifiesto del proyecto Apps Script
└── app/
    └── index.html                     # App — una sola página (HTML/CSS/JS)
```

## Cómo abrir la app

`app/index.html` es un único archivo autocontenido, sin dependencias de build. Alcanza con abrirlo en el navegador (doble clic, o "Abrir con" → navegador). Para que la sincronización con Sheets funcione hace falta desplegar el Apps Script una vez (ver [docs/deploy-apps-script.md](docs/deploy-apps-script.md)) y pegar la URL del Web App en Seteo de stock y caja → Sincronización con Sheets.

## Contexto del proyecto

La app cubre tres tipos de puesto durante el evento: **Buffet**, **Tickets** y **Entradas**, cada uno con su propio flujo de venta, control de stock y arqueo de caja independiente. El documento de entendimiento en `docs/` detalla el alcance funcional completo.
