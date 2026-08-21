# Caja Misionera

Aplicación de caja, stock y arqueo para la kermesse familiar organizada por el grupo misionero del colegio.

## Estado actual

Esto es un **prototipo de frontend** (mock): la interfaz y el flujo de uso están definidos y son navegables, pero no hay backend ni persistencia real todavía — los datos viven en memoria y se reinician al recargar la página. La idea es ir sumando funcionalidad e ir simulando el backend en próximas iteraciones.

Vista previa en vivo del prototipo:
https://claude.ai/code/artifact/f49690b4-cfb3-4bf4-8a85-09448e1d8588

## Estructura del repositorio

```
caja-misionera/
├── README.md
├── .gitignore
├── docs/
│   └── documento-entendimiento.docx   # Documento de entendimiento de requerimientos
└── app/
    └── index.html                     # Prototipo — app de una sola página (HTML/CSS/JS)
```

## Cómo abrir el prototipo

`app/index.html` es un único archivo autocontenido, sin dependencias de build. Alcanza con abrirlo en el navegador (doble clic, o "Abrir con" → navegador).

## Contexto del proyecto

La app cubre tres tipos de puesto durante el evento: **Buffet**, **Tickets** y **Entradas**, cada uno con su propio flujo de venta, control de stock y arqueo de caja independiente. El documento de entendimiento en `docs/` detalla el alcance funcional completo.
