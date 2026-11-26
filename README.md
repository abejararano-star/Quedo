# Quedo

Plataforma de estadías temporales para Quibdó. Primera versión local: vitrina comercial, catálogo, fichas, favoritos, contacto por WhatsApp, anfitriones y moderación administrativa.

## Aplicación principal en Laravel y Blade

La versión local abre en <http://127.0.0.1:8089/> con Apache de XAMPP y la base independiente `quedo_laravel`. El código está en [laravel/](laravel/README.md). Para encender la instalación preparada después de reiniciar Windows, ejecuta `.\laravel\iniciar-local.ps1`. Para aplicar cambios a la copia de XAMPP, ejecuta `.\laravel\sincronizar-local.ps1`.

## App móvil en Flutter

La app Android e iOS está en [mobile/](mobile/README.md). Consulta el catálogo de Laravel y conserva los guardados en el dispositivo. La guía móvil incluye la configuración del enlace a la API y la compilación.

## Implementación anterior en Next.js

Las instrucciones siguientes corresponden a la aplicación anterior y permiten consultarla durante la transición.

### Entorno anterior

- Node.js 24 y npm.
- MariaDB/MySQL local. Entorno comprobado: XAMPP, MariaDB 10.4.32, base `quedo`.
- Next.js 16.4.6, React 19, TypeScript, Tailwind 4, Prisma 6.19.

## Preparación

1. Instalar con `npm ci` (la primera preparación utiliza `npm install`).
2. Copiar `.env.example` a `.env`. Ajustar `DATABASE_URL` y generar un `RATE_LIMIT_SECRET` aleatorio. No versionar `.env`.
3. Iniciar MySQL/MariaDB en XAMPP.
4. Ejecutar `npm run db:generate` y `npm run db:migrate`.
5. Ejecutar `npm run db:seed` para añadir seis anuncios ficticios, sin sobrescribir registros existentes.
6. Ejecutar `npm run dev`. Abrir `http://127.0.0.1:3000`.

La aplicación se ejecuta en Node; no se sirve mediante Apache ni requiere mover el proyecto a `htdocs`.

## Administrador

`npm run admin:create` recibe por entrada estándar un objeto JSON con `name`, `email` y `password` (mínimo doce caracteres). No pasar secretos como argumentos de consola ni guardarlos en el repositorio. El comando crea una cuenta nueva ADMIN y rechaza correos existentes. No hay credenciales administrativas predeterminadas.

Las cuentas registradas desde la interfaz tienen rol HOST. La recuperación de cuenta y la verificación de correo están pendientes antes del piloto público.

## Paneles y escenario de prueba

`npx tsx scripts/setup-playground.ts` prepara un administrador y dos anfitriones de prueba, anuncios editables e historial simulado. Solo funciona en local, imprime una contraseña aleatoria únicamente al crear cada cuenta y conserva los registros existentes. Las credenciales no están en el repositorio.

Administración: `/admin`, `/admin/anuncios`, `/admin/contactos` y `/admin/anfitriones`. Anfitrión: `/anfitrion`, `/anfitrion/contactos` y `/anfitrion/metricas`. Los paneles incluyen períodos, datos reales/prueba separados y exportaciones CSV con permisos por rol y propietario.

El seguimiento de contactos y planes es manual; no verifica pagos ni cobra suscripciones. Consulta las [definiciones y el recorrido de prueba](docs/PANELES_Y_METRICAS.md).

## Verificación

```text
npm test
npm run typecheck
npm run build
```

Con el servidor local iniciado, `npx tsx scripts/smoke-test.ts` comprueba el flujo HTTP de registro, permisos, fotografías, moderación, contacto y medición. Crea sus propias cuentas y anuncios temporales y los elimina al finalizar; no sigue enlaces a WhatsApp ni envía mensajes.

En Windows, si la descarga automática del motor de Prisma se interrumpe, `scripts/setup-prisma-windows.ps1` reanuda únicamente las descargas oficiales de la versión instalada, verifica SHA-256 y configura las rutas locales en `.env`. No se desactiva la validación TLS.

`npm run start` sirve la compilación local. `npx tsx scripts/cleanup.ts` elimina únicamente sesiones y límites de solicitudes vencidos. Programar su ejecución en el entorno productivo cuando se defina.

## Datos y fotografías

- Las migraciones están en `prisma/migrations`.
- Las fotografías subidas se almacenan en `storage/media`, ignorado por Git. Debe respaldarse junto con la base.
- Los archivos se recodifican a WebP, con límites de tamaño y píxeles y sin metadatos EXIF.
- `/media/[key]` comprueba publicación o permiso de propietario/administrador en cada lectura.
- El navegador solo conoce teléfonos reales al abrir el contacto público autorizado; no hay teléfonos ficticios.
- Los ejemplos no habilitan WhatsApp ni cuentan como oferta real.
- Los robots están bloqueados durante desarrollo. El manifiesto web es una base; todavía no hay soporte offline.

## Producción

Las cuentas de prueba solo admiten acceso con el servidor de desarrollo y una URL de aplicación local. Los límites anónimos comparten un contador por operación y ventana de tiempo por defecto. Configura `TRUST_PROXY=true` únicamente detrás de un proxy que sobrescriba `X-Real-IP` y que sea el único punto de entrada al servidor. Genera `RATE_LIMIT_SECRET` con 32 bytes aleatorios o más.

Para un despliegue, usa HTTPS en `APP_URL` para activar las cookies Secure, una cuenta de base de datos de privilegios mínimos, almacenamiento persistente y respaldos privados. Mantén XAMPP local. Define la retención de eventos y auditoría antes de abrir el servicio al público.

No se procesan pagos ni reservas internas. Se registra el historial manual de planes para calcular métricas; las tarifas comerciales del plan maestro no se cobran desde la plataforma.

Documentación: [auditoría](docs/AUDITORIA.md), [plan](docs/PLAN_DESARROLLO.md), [activos](docs/ASSETS.md).
