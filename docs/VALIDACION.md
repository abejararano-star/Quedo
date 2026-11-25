# Validación local — 22 de noviembre de 2026

## Comprobaciones realizadas

- TypeScript sin errores.
- Compilación optimizada con Next.js y Webpack. Se seleccionó Webpack porque Turbopack intentaba crear junctions bloqueadas en el entorno restringido de Windows.
- Siete pruebas automatizadas: permisos por propietario, bloqueo de contacto en ejemplos, registro sin elevación de rol, contraseñas con sal, formatos de fotografía, validación de anuncios y fechas/huéspedes de consulta.
- Dieciséis comprobaciones HTTP de integración contra Next.js y MariaDB: portada, filtros JSON/precio, búsqueda vacía, ejemplos, sesión, registro, cookie HttpOnly, acceso administrativo, carga de fotografías, lectura privada, edición ajena, publicación, contacto, origen de medición, retiro tras editar y auditoría.
- Las pruebas usan credenciales aleatorias y datos temporales que se eliminan al terminar. Se comprueba la redirección de WhatsApp sin seguirla; no se envían mensajes.
- Favoritos verificados en el navegador: guardar, consultar la página de guardados y retirar.
- Búsqueda por Centro probada en el navegador móvil: devuelve dos espacios de ejemplo.
- Vista de escritorio y móvil a 390 px inspeccionadas; sin desbordamiento horizontal. Imágenes de portada cargadas correctamente.
- Base respaldada con mysqldump y restaurada en un esquema temporal. Se comprobaron los seis ejemplos restaurados; se retiró solamente el esquema de prueba.

## Correcciones derivadas de las pruebas

- La validación de origen del endpoint de visitas utiliza APP_URL, para evitar discrepancias con la dirección interna de Next.js.
- Los binarios de Prisma se descargaron del proveedor oficial y se verificaron mediante SHA-256 tras fallos de red del instalador.
- Las fechas y viajeros de la búsqueda se conservan en la ficha y se incorporan al mensaje de consulta; no se presentan como disponibilidad confirmada.
- Se evitó el encogimiento de las categorías en móvil para conservar sus etiquetas legibles.

## Límites

Estas pruebas no sustituyen entrevistas, sesiones con huéspedes/anfitriones reales, pruebas de carga ni una auditoría profesional de seguridad. No se han validado datos de propiedades reales, requisitos legales ni viabilidad comercial. La aplicación no está desplegada y no hay cuentas administrativas predeterminadas. Producción requiere completar los pendientes documentados en la auditoría.
