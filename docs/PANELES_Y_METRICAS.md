# Paneles y analítica de Quedo

## Cuentas locales

Se crearon `admin@quedo.test`, `anfitrion@quedo.test` y `anfitrion2@quedo.test`, todas con `isTest=true`. Las contraseñas se generaron aleatoriamente y se entregan al propietario del proyecto; no se guardan en código ni en documentación. La base solo contiene sus hashes. El usuario `demo@quedo.invalid` mantiene los ejemplos originales y no tiene una contraseña de prueba entregada.

El preparador local `npx tsx scripts/setup-playground.ts` crea únicamente registros faltantes. Rechaza bases y aplicaciones fuera de loopback, no reinicia contraseñas ni sobrescribe cambios existentes. Genera cuatro anuncios editables, 120 sesiones, 40 contactos y un historial de planes. Esos eventos son ficticios y están marcados como prueba.

## Recorrido de prueba

1. Iniciar sesión como anfitrión en `/acceso` y abrir `/anfitrion`.
2. Editar un anuncio publicado: cambiar textos, tarifas, servicios, retirar fotos o elegir la principal. Guardar lo devuelve a PENDING y lo retira del catálogo hasta una nueva revisión.
3. Cerrar sesión e iniciar como administrador, o usar otra ventana privada para conservar ambas sesiones.
4. Abrir `/admin/anuncios?datos=prueba`, inspeccionar la ficha, elegir decisión, escribir una nota y confirmar la revisión.
5. Volver al anfitrión: comprobar el estado y, en un ejemplo publicado, pulsar “Simular consulta”. No abre WhatsApp ni envía mensajes.
6. En Contactos registrar respuesta, estadía reportada o pérdida con motivo. El historial conserva los cambios.
7. Revisar `/admin` y `/anfitrion/metricas`, cambiar período y descargar CSV.
8. En `/admin/anfitriones`, registrar cambios de plan con fecha de efecto, precio mensual y soporte. No se realizan cobros ni se modifica automáticamente la publicación.

## Definiciones

- **Período:** días inclusivos en America/Bogota; consulta técnica desde las 00:00 del primer día hasta antes de las 00:00 posteriores al último. Hasta 366 días; no se permiten fechas futuras.
- **Sesión analítica:** identificador opaco en cookie HttpOnly con duración máxima de treinta minutos. No representa una persona única ni permite deduplicar dispositivos. La base guarda el hash del token, no el token del navegador.
- **Vista:** una ficha por sesión. La restricción única evita contar recargas de esa ficha dentro de la misma sesión.
- **Contactos iniciados:** aperturas del enlace de contacto. No demuestran envío de mensaje, conversación ni reserva.
- **Embudo:** sesiones con ficha vista en el período; de esa base, sesiones con contactos creados en el mismo período; luego sesiones que alcanzaron una respuesta; finalmente sesiones con al menos una confirmación manual vigente al corte. No se divide un conteo de clics repetidos entre personas.
- **Estado al corte:** último evento de seguimiento anterior al corte. Una corrección a no concretado deja de contar esa confirmación desde el momento de la corrección, sin cambiar los cortes previos.
- **Churn bruto de anfitriones:** anfitriones con último estado ACTIVE inmediatamente antes del inicio que registran una cancelación durante el período / base ACTIVE al inicio. Una baja por anfitrión, incluso si se reactiva después. Excluye nuevas altas del período y bajas de pruebas sin activar.
- **MRR registrado:** suma de tarifas mensuales del último estado ACTIVE según la fecha de efecto al corte. No es recaudo, facturación, utilidad ni una proyección aprobada.
- **Prueba a activo:** primeras pruebas iniciadas en el período que tuvieron su primera activación antes del corte / primeras pruebas del período. Es una observación hasta el corte, no una tasa final de conversión madura.
- **Cohortes:** últimas seis cohortes por mes de primera activación; porcentaje con estado ACTIVE al cierre de cada mes. El mes en curso se corta en la fecha elegida; meses futuros se muestran como N/D. Se conserva historial anterior al inicio del filtro.
- **Origen:** UTM de la primera ficha de la sesión. Sin UTM, “directo” no prueba el canal original.
- **Inventario:** estados actuales de los anuncios, incluso cuando se consultan métricas de un período anterior. Se identifica en los encabezados.
- **N/D:** denominador cero o mes no observado. No se sustituye por un éxito de 100 % ni por un churn de 0 %.

## Separación de datos

La vista real excluye anuncios de demostración, anfitriones `isTest` y eventos simulados. Las cuentas de prueba siempre crean anuncios `isDemo`; su contacto comercial permanece deshabilitado. Los CSV incluyen la marca de ámbito en cada fila. La prueba HTTP verifica que los identificadores `playground-*` no aparecen en los conjuntos reales.

## CSV

Diez conjuntos para administración: resumen, embudo, anuncios, contactos, eventos, vistas, diario, anfitriones, planes y cohortes. Los anfitriones exportan resumen, anuncios, contactos, eventos y diario de sus propios espacios; no pueden ampliar el alcance con parámetros de URL.

UTF-8 con BOM, separador `;`, comillas dobles escapadas, CRLF y coma decimal en porcentajes. Las fechas de eventos son ISO en UTC; los días agregados corresponden a Bogotá. Los textos que podrían ejecutar fórmulas se neutralizan con apóstrofo. No se exportan contraseñas, hashes, cookies, tokens ni documentos privados.

Cada conjunto incluye todas sus filas seleccionadas, sin el límite de paginación de las pantallas. Contactos/eventos corresponden a contactos iniciados en el período. El historial de planes incluye estados anteriores al inicio, necesarios para reconstruir la base inicial y las cohortes. El estado de contactos exportado es el del corte, mientras la pantalla de seguimiento permite gestionar el estado actual.

## Validación

Quince pruebas unitarias y dieciséis comprobaciones del flujo original. Doce comprobaciones adicionales probaron las tres cuentas, las páginas, el aislamiento entre propietarios, edición de fotografías, revisión/publicación de ejemplos, simulación sin mensajes, seguimiento, diez CSV, protección de fórmulas, rechazo de fechas y cambios de plan. Las verificaciones usan sus propios registros temporales y retiran únicamente esos registros.

Estas métricas requieren datos suficientes y revisión de calidad. No demuestran por sí solas causalidad ni validación comercial. La operación productiva debe definir consentimiento, retención, verificación de resultados, recuperación de cuenta y requisitos de publicación.
