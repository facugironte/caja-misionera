# Desplegar el Apps Script (Fase 2)

Esta parte requiere autenticarte con una cuenta de Google real y no se puede automatizar desde un entorno en la nube — hay que hacerla desde una terminal local (ver [spec-fase2-sheets.md](spec-fase2-sheets.md), sección 5). Los pasos abajo asumen Windows con PowerShell.

El código del script vive en [`appsscript/`](../appsscript/): `Code.gs` (lógica) y `appsscript.json` (manifiesto).

## 1. Instalar Node.js (si no lo tenés)

```powershell
winget install OpenJS.NodeJS.LTS
```

Cerrá y volvé a abrir la terminal después de instalar, para que `node`/`npm` queden en el PATH.

## 2. Instalar clasp (CLI de Google para Apps Script)

```powershell
npm install -g @google/clasp
```

## 3. Iniciar sesión con la cuenta de Google que va a ser dueña de la planilla

```powershell
clasp login
```

Esto abre el navegador para el login de Google. Usá la cuenta bajo la cual querés que viva la planilla de cortes (por ejemplo, la cuenta del grupo misionero, no una personal, si varias personas van a necesitar administrarla después).

## 4. Crear el proyecto (y la planilla nueva)

```powershell
cd appsscript
clasp create --type sheets --title "Caja Misionera - Cortes" --rootDir .
```

Esto crea **una Google Sheet nueva** y un proyecto de Apps Script ligado a ella, y genera un archivo `.clasp.json` local con el `scriptId` (no se versiona en git — queda solo en tu máquina).

## 5. Subir el código

```powershell
clasp push
```

## 6. Crear las tres pestañas con encabezados

```powershell
clasp open
```

Esto abre el editor de Apps Script en el navegador. Ahí:
1. Elegí la función `setupSheets` en el desplegable de funciones (arriba).
2. Tocá **Ejecutar**.
3. La primera vez va a pedir autorizar permisos (acceso a Google Sheets) — aceptá.
4. Verificá en la planilla (`clasp open --webapp` no aplica acá; abrila desde Drive) que aparecieron las pestañas **Movimientos**, **Resumen por venta** y **Resumen por cierre** con sus encabezados.

## 7. Desplegar como Web App

```powershell
clasp deploy --description "v1"
```

O desde el editor: **Implementar → Nueva implementación → Aplicación web**, con:
- Ejecutar como: **Yo** (tu cuenta)
- Quién tiene acceso: **Cualquier usuario**

Copiá la URL que termina en `/exec` — esa es la que va en la app.

## 8. Conectar la app

En la app (`app/index.html`), pantalla **Menú → Seteo de stock y caja → Sincronización con Sheets**, pegá esa URL en el campo "URL del Web App" y tocá **Guardar URL**. Se guarda en el navegador de ese dispositivo (`localStorage`), no en el código — cada dispositivo/puesto la configura una vez.

## Actualizar el script más adelante

Cada vez que cambie `Code.gs`, hay que volver a subir y **crear una nueva versión del despliegue** (la URL `/exec` no se actualiza sola con `clasp push`):

```powershell
clasp push
clasp deploy --description "v2"
```

O desde el editor: **Implementar → Administrar implementaciones → ✏️ → Nueva versión → Implementar**.

## Notas

- El "token" que valida cada corte es simplemente `tipo:identificador-del-puesto` (por ejemplo `buffet:buffet-1`) — no es un secreto fuerte, es la protección "simple" acordada para un evento de bajo riesgo. Si en algún momento se necesita algo más robusto, se puede sumar una clave fija en `appsscript.json`/`Code.gs` sin tocar el resto del diseño.
- Si el `fetch` desde la app falla por CORS o por falta de conexión, el corte **no se pierde**: queda encolado en `localStorage` y la app reintenta sola (cada 20s y al recuperar conexión), o se puede forzar con "Reintentar ahora" en Seteo.
