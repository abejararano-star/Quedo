# Auditoría inicial — 22 de noviembre de 2026

## Estado comprobado

- Carpeta autorizada: `C:\Users\User\OneDrive\Documents\Quedo`.
- Repositorio clonado: `https://github.com/abejararano-star/Quedo.git`.
- Referencia inicial: `ae2ef324201800f0c12dad770a403ecb3d56042b` en `main`.
- Contenido inicial: solo `README.md`; no había una aplicación que conservar o migrar.
- Motor local comprobado: MariaDB 10.4.32, XAMPP.
- Base existente: `quedo`, sin tablas en la inspección inicial.
- Node disponible: 24.21.0; npm 11.19.0.
- Los primeros fallos de conexión procedían del entorno restringido: GitHub y MariaDB respondieron al ejecutar las comprobaciones con acceso permitido.

## Decisiones confirmadas por el usuario

1. Catálogo y contacto por WhatsApp para la primera versión.
2. XAMPP para desarrollo local; producción por definir.
3. Prioridad a la vitrina comercial, con el logotipo aportado y las referencias Airbnb, Daylight, Polestar, Leica y Superhuman.
4. Inicio del desarrollo autorizado mediante «empezamos».

## Decisiones técnicas

- Aplicación Next.js con TypeScript y Tailwind. Servidor Node independiente de Apache.
- Prisma 6.19 para una integración compatible con MariaDB y migraciones SQL versionadas.
- Sesiones aleatorias almacenadas por hash y cookies HttpOnly. Contraseñas scrypt con sal.
- Usuarios públicos siempre HOST. El alta ADMIN solo se realiza mediante herramienta local que no modifica cuentas existentes.
- Anuncios privados por defecto; alta y cambios quedan PENDING. Las decisiones administrativas generan auditoría.
- Archivos raster comprobados y recodificados en WebP. Fotografías privadas mientras el anuncio no está publicado.
- Datos de ejemplo explícitamente identificados y sin teléfonos, RNT ni contacto comercial.
- Sin despliegue, cobros ni modificación del repositorio remoto en esta etapa.

## Límites antes de producción

Definir responsable y contacto de privacidad, política de conservación, revisión jurídica del modelo, requisitos de publicación, alojamiento, respaldo externo, correo y recuperación de cuenta, verificación de correo, vigilancia de errores y presupuesto operativo. MariaDB local es un entorno de desarrollo; seleccionar una versión mantenida para producción.

No se ha ejecutado ni traducido literalmente el SQL histórico del documento. Sus funciones de Supabase/Auth/RLS requieren otro diseño para MariaDB.
