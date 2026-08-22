# Fase 2 — Identificación de puesto + persistencia en Google Sheets

Este documento resume las decisiones tomadas para la siguiente etapa del prototipo: pasar de "todo en memoria, se pierde al recargar" a un modelo donde cada puesto se identifica al arrancar, y los cierres quedan guardados de forma centralizada en una planilla de Google Sheets.

## 1. Identificación del puesto (login básico)

Antes de acceder a cualquier funcionalidad, la app pide:

- **Tipo de puesto**: Buffet / Tickets / Entradas (como ya existe hoy).
- **Identificador del puesto**: texto libre o selección (ej. "Buffet 1", "Buffet 2") — permite diferenciar puestos duplicados del mismo tipo si hay más de una mesa del mismo rubro.
- **Nombre del voluntario a cargo**: texto libre, identifica a la persona operando el puesto en ese momento.

Estos tres datos forman la "sesión de puesto": `{ tipo, identificador, voluntario, inicio }`. No es autenticación real (sin contraseña) — es identificación para trazabilidad, acorde a que el evento es de bajo riesgo y los "usuarios" son voluntarios de confianza.

**Decidido:** lo que identifica al puesto de forma estable es el `identificador` (el alias, ej. "Buffet 1"), no el voluntario a cargo — el nombre del voluntario es un dato informativo para trazabilidad, sin restricciones de cambio. Se puede actualizar en cualquier momento (incluso a mitad de un corte, vía "Cambiar de puesto" en el menú) sin bloquear ni afectar el corte en curso.

Inmediatamente después de identificarse (si el puesto todavía no arrancó su Corte 1), la app pide el seteo inicial de stock y caja — no hace falta pasar primero por el menú.

## 2. Disparador de guardado: cada corte de caja

Cada vez que se cierra un corte (acción "Cerrar corte", ya existente en el prototipo), la app envía a la planilla todo lo acumulado desde el corte anterior (o desde el inicio del puesto, si es el primer corte del día). Puede haber varios cortes por puesto en un mismo día — cada uno dispara su propio envío incremental.

Al cerrar, además del efectivo contado, se pide cuánto retira quien cierra el corte (por ejemplo, para llevarlo a tesorería). Lo que no se retira queda como caja inicial del corte siguiente — así la caja del puesto no crece sin límite a lo largo del día.

## 3. Qué se guarda: tres niveles de granularidad

Dentro de la misma planilla, en tres pestañas separadas:

### Pestaña "Movimientos" (detalle línea por línea)
Todo movimiento individual: venta, anulación de venta, ajuste manual de stock, reposición/inyección de stock.

| Columna | Descripción |
|---|---|
| timestamp | Fecha y hora del movimiento |
| puesto_tipo | Buffet / Tickets / Entradas |
| puesto_id | Identificador del puesto (ej. "Buffet 1") |
| voluntario | Nombre de quien operaba |
| corte_id | Corte al que pertenece |
| tipo_movimiento | venta / anulacion / ajuste_manual / reposicion |
| producto | Nombre del producto (si aplica) |
| cantidad | Cantidad involucrada |
| motivo | Motivo del ajuste/anulación (si aplica) |
| monto | Monto en pesos (si aplica) |
| metodo_pago | Efectivo / otro (si aplica) |

### Pestaña "Resumen por venta"
Una fila por cada venta cerrada (no por cada producto dentro de ella).

| Columna | Descripción |
|---|---|
| timestamp | Momento de cierre de la venta |
| puesto_tipo / puesto_id / voluntario / corte_id | Igual que arriba |
| cant_items | Cantidad de productos distintos en la venta |
| monto_total | Total de la venta |
| metodo_pago | Método usado |
| estado | activa / anulada |

### Pestaña "Resumen por cierre"
Una fila por cada corte cerrado.

| Columna | Descripción |
|---|---|
| puesto_tipo / puesto_id / voluntario | — |
| corte_id | — |
| apertura / cierre | Fecha/hora de inicio y fin del corte |
| caja_inicial | Monto inicial declarado |
| efectivo_esperado | Caja inicial + ventas en efectivo |
| efectivo_contado | Lo que se contó físicamente |
| diferencia | esperado - contado |
| cant_ventas | Cantidad de ventas del corte |
| monto_total_vendido | Suma de todas las ventas del corte |
| efectivo_retirado | Cuánto efectivo se lleva quien cierra el corte (puede ser 0) |
| efectivo_final_puesto | efectivo_contado - efectivo_retirado; queda como caja_inicial del corte siguiente |

## 4. Cómo se conecta el front con Sheets

- Un **Google Apps Script** publicado como Web App (función `doPost`) recibe un JSON con el paquete del corte (movimientos + resumen de venta + resumen de cierre) y escribe las filas correspondientes en las tres pestañas.
- El script valida un **token simple por puesto** para evitar que cualquiera con la URL pueda escribir datos.
- El front hace un `fetch` POST a la URL del Web App al cerrar el corte.

**Decidido:**
- **Token:** `tipo:identificador-del-puesto` (ej. `buffet:buffet-1`), reconstruido y validado en el propio Apps Script a partir de los datos del payload. No es un secreto fuerte — es la protección "simple" acorde al riesgo bajo del evento.
- **Si falla el POST** (sin conexión, Apps Script caído, etc.): el corte se cierra igual — no bloquea al voluntario. El paquete queda en una cola en `localStorage` y la app reintenta sola (cada 20s y al recuperar conexión), o se puede forzar desde Seteo → Sincronización con Sheets → "Reintentar ahora". El indicador "🔄 N cortes sin sincronizar" queda visible hasta que se confirme el envío.

Implementación: ver [`appsscript/Code.gs`](../appsscript/Code.gs) y la guía de despliegue en [deploy-apps-script.md](deploy-apps-script.md).

## 4bis. Cierre obligatorio al cambiar de puesto + pestaña "Cierre de puesto" (2026-08-22)

Se detectó un bug: el estado operativo (`state[tipo]`) vivía en memoria del navegador y no se recargaba al identificarse con un **nuevo** identificador del mismo tipo de puesto dentro de la misma sesión de página (ej.: cerrar "Buffet 1" con "Cambiar de puesto" y volver a entrar como "Buffet 2") — el stock, las ventas y los cortes del puesto anterior quedaban pisando al nuevo. Se corrigió: al identificarse, la app siempre busca el estado persistido para ese `tipo:identificador` exacto (`loadState`) y, si no existe, arranca de cero (`freshStandState`) en vez de reusar lo que hubiera en memoria.

Aprovechando la corrección, se decidió además:

- **"Cambiar de puesto" ya no es instantáneo si el puesto arrancó a operar** (`setupDone`): fuerza pasar por la pantalla de Resumen en un modo especial ("cerrar puesto") antes de soltar la sesión. Si el puesto todavía no terminó el seteo inicial, cambiar sigue siendo instantáneo (no hay nada que cerrar).
- **Se sacó el campo de efectivo contado de los cierres de corte intermedios** (los que arrancan el siguiente corte del mismo puesto): esos cortes cierran directo usando el efectivo esperado, sin pedir contar. Sigue siendo **obligatorio en el cierre final de puesto** (el que dispara "Cambiar de puesto" o el botón "Cerrar puesto" de Seteo), porque ahí sí importa tener un número real para la entrega de caja. El contador de la pantalla Seteo (que solo muestra sobrante/faltante informativo, sin bloquear nada) no se tocó — es la única herramienta de conteo disponible durante los cortes intermedios.
- Al cerrar un puesto, además del payload de corte normal (igual que siempre, a Movimientos/Resumen por venta/Resumen por cierre), se arma un segundo objeto `cierrePuesto` con los **totales acumulados de toda la sesión** del puesto (todos los cortes, no solo el último) — cantidad de cortes, ventas y montos por método de pago, caja inicial del puesto, efectivo contado/retirado en el cierre final — y se manda en el mismo POST. El backend lo escribe en una pestaña nueva, **"Cierre de puesto"**, una fila por cada vez que un puesto se cierra para cambiar. Sirve para tener de un vistazo el resumen de todo lo que trabajó cada puesto/voluntario, sin tener que sumar los cortes individuales a mano.
- Al cerrar el puesto también se borra su estado persistido en `localStorage` (`clearState`) — si alguien vuelve a entrar más tarde con el mismo identificador, arranca el seteo de cero, no retoma el corte anterior.

## 5. Nota sobre dónde conviene construir esto

La parte de Apps Script requiere autenticarse con una cuenta de Google real y desplegar el script como Web App — un flujo que conviene hacer desde una terminal local (por ejemplo con Claude Code y la herramienta `clasp` de Google), ya que necesita abrir el navegador para el login de Google y no es algo que se pueda automatizar desde este entorno en la nube. El resto (cambios al front-end en `app/index.html`) puede construirse en cualquiera de los dos entornos.
