# Quedo en Laravel

La aplicación principal está en esta carpeta. PHP y Blade sirven la vitrina, los paneles, el inicio de sesión y las exportaciones CSV. El navegador solicita los recursos preparados en `public/`.

## Instalación local en este equipo

La copia ejecutable está en `C:\xampp\quedo-laravel-local`. Apache de XAMPP escucha en `http://127.0.0.1:8089` y utiliza solamente el directorio `public` como raíz web. Quedo usa PHP 8.5.13 si el paquete está instalado en `C:\xampp\quedo-php-8.5.13`. La copia MariaDB `quedo_laravel` escucha en el puerto 3311. El usuario de aplicación tiene permisos de lectura y escritura sobre esa base. La configuración privada de la instancia y los respaldos están fuera de la raíz web y de Git.

Para volver a iniciar el sitio después de apagar el equipo, ejecuta `iniciar-local.ps1` desde esta carpeta. Para aplicar cambios de este repositorio a la copia ejecutable, usa `sincronizar-local.ps1`. Los datos, las fotos subidas y las credenciales residen en la instalación privada. El servidor de desarrollo anterior usaba otra base y el puerto 3000.

El [mapa local de Quibdó](http://127.0.0.1:8089/mapa) muestra referencias por barrio y enlaza al catálogo filtrado. Usa OpenStreetMap para las calles y solicita permiso de ubicación al pulsar **Mi ubicación**.

Para usar Google en esta instancia, agrega `http://127.0.0.1:8089/acceso/google/retorno` en **URI de redireccionamiento autorizados** del cliente OAuth web en Google Cloud. Guarda `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en el `.env` de la instalación privada y ejecuta `sincronizar-local.ps1` para actualizar la caché. Abre Quedo en `http://127.0.0.1:8089` para hacer la prueba.

## Preparar otra instalación

1. Usa `laravel/` como carpeta de la aplicación. Las dependencias fijadas en `composer.lock` requieren PHP 8.4.1 o superior. En la máquina destino ejecuta `composer install --no-dev --optimize-autoloader` y `composer check-platform-reqs`. Comprueba PDO MySQL, GD con WebP, Sodium y soporte de Argon2id.
2. Copia `.env.example` a `.env`, configura la URL, la conexión y ejecuta `php artisan key:generate`. En producción establece `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` con HTTPS y `SESSION_SECURE_COOKIE=true`.
3. En una base vacía, importa `database/schema/quedo.sql` con un usuario con permisos de creación. Para migrar una instalación anterior conserva las filas, las relaciones y los identificadores. En servidores que distinguen mayúsculas usa los nombres de tabla del esquema, por ejemplo `Listing` y `ContactEvent`. Conserva aparte `storage/media` al trasladar las fotografías privadas.
4. Configura la raíz web en `public/` y concede al proceso PHP escritura en `storage/` y `bootstrap/cache/`. La configuración, los registros y las fotos privadas deben quedar fuera de esa raíz. Ejecuta `php artisan config:cache` después de cambiar las variables.
5. Para una base nueva, ejecuta `php artisan quedo:crear-admin tu-correo@ejemplo.com` desde la carpeta privada de la aplicación. El comando pide la contraseña sin mostrarla y crea la cuenta para entrar por `/acceso`.

## ZIP para Hostinger

1. En hPanel selecciona **PHP 8.5** y habilita las extensiones PDO MySQL, GD con WebP y Sodium. Laravel necesita también que PHP admita Argon2id.
2. Extrae el ZIP en la carpeta del dominio que contiene `public_html`, por ejemplo `/home/usuario/domains/tu-dominio`. El ZIP crea o rellena `public_html/` con los archivos públicos y `quedo/` con Laravel y sus dependencias, como carpetas hermanas. Si el dominio ya aloja un sitio, conserva un respaldo antes de sustituir archivos.
3. Crea una base MySQL/MariaDB y un usuario en hPanel. Para una instalación nueva, importa `quedo/database/schema/quedo.sql` desde phpMyAdmin. Si el dominio ya usa una base de Quedo, conserva sus datos y aplica las migraciones.
4. En la carpeta privada `quedo/`, copia `.env.example` a `.env`. Configura `APP_URL` con el dominio HTTPS real y completa `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` y `DB_PASSWORD` con los datos de hPanel. El ejemplo del ZIP incluye los ajustes de producción.
5. Desde esa carpeta y con PHP 8.5 en SSH, ejecuta `php artisan key:generate --force` solo para una instalación nueva, `php artisan migrate --force` y `php artisan config:cache`. Si la base es nueva, crea el administrador con el comando del apartado anterior. El proceso PHP necesita escritura en `storage/` y `bootstrap/cache/`.
6. Abre la portada, `/mapa` y `/acceso` en el dominio. Para Google y reCAPTCHA, usa las credenciales y el dominio que correspondan a la instalación.

Para trasladar una instalación, importa su respaldo privado por separado y copia `storage/media/` dentro de `quedo/storage/`. Los respaldos, las credenciales y las fotos subidas se gestionan fuera de `public_html/`.

## Google y reCAPTCHA

1. Ejecuta `php artisan migrate --force` con una cuenta de la base que tenga permiso para migrar el esquema. Aplica la migración también si la base se creó al importar `database/schema/quedo.sql`.
2. Configura `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` de un cliente OAuth de tipo aplicación web. Registra en Google Cloud la URL exacta formada por `APP_URL` y `/acceso/google/retorno`. Las cuentas nuevas creadas con Google tienen rol de huésped. Los huéspedes existentes vinculan Google desde su perfil después de iniciar sesión.
3. Para reCAPTCHA **v3**, registra el dominio, configura `RECAPTCHA_SITE_KEY` y `RECAPTCHA_SECRET_KEY` y activa `RECAPTCHA_ENABLED=true`. El servidor verifica el dominio, la acción y la puntuación. `RECAPTCHA_MIN_SCORE` empieza en 0,5. Usa claves de desarrollo con `localhost` para probar reCAPTCHA en el equipo.
4. Ejecuta `php artisan config:cache` después de guardar las variables privadas.

## Aplicación móvil instalable

Publica Quedo con HTTPS y abre `/instalar` en el teléfono. La PWA usa el catálogo y la cuenta de la web. El modo sin conexión muestra una página estática. Las fichas, los formularios y las sesiones se consultan por internet.

## Validación

`tests/recorridos.php` prueba por HTTP la portada, la ficha, el subtotal, guardados, cuentas y permisos, publicación con WebP, seguimiento y las exportaciones. Está limitado a la copia local. Ejecutar en la instalación privada con `C:\xampp\php\php.exe -d extension=sodium tests/recorridos.php`. Las aperturas de fichas de ejemplo cuentan como visitas de prueba.

Las contraseñas scrypt heredadas se verifican con Sodium. Las cuentas nuevas usan Argon2id. Las sesiones de Laravel usan su propia cookie y los usuarios deben entrar de nuevo tras el cambio.
