# Quedo en Laravel

Plataforma de estadías temporales para Quibdó construida con **Laravel 12** y **Blade** (compatible con **PHP 8.2, 8.3, 8.4 y 8.5** y **Composer 2**).

## Despliegue en Hostinger desde Git (`public_html`)

1. En **hPanel → Avanzado → Configuración PHP**, selecciona **PHP 8.5** (o 8.2/8.3/8.4) y asegúrate de tener activas las extensiones `pdo_mysql`, `gd` (con WebP), `mbstring`, `openssl` y `sodium`.
2. En **hPanel → Avanzado → Git**, conecta este repositorio (`main`) hacia `public_html` (o usa un dominio con raíz en `public/`). El archivo `.htaccess` en la raíz redirige automáticamente las peticiones hacia `public/` y bloquea el acceso público a `.env`, `storage/`, `app/`, `vendor/`, `database/` y archivos internos.
3. Si Hostinger no instala dependencias automáticamente al desplegar, entra por **SSH** a la carpeta del sitio y ejecuta:
   ```bash
   composer2 install --no-dev --optimize-autoloader
   ```
   *(Si tu SSH usa un PHP antiguo por defecto, ejecuta `/opt/alt/php85/usr/bin/php /usr/local/bin/composer2 install --no-dev --optimize-autoloader`).*
4. Crea una base de datos MySQL/MariaDB y su usuario en **hPanel → Bases de datos**. En **phpMyAdmin**, importa `database/schema/quedo.sql` sobre la base vacía.
5. Copia `.env.example` a `.env` y configura:
   - `APP_ENV=production`
   - `APP_DEBUG=false`
   - `APP_URL=https://tu-dominio.com`
   - `SESSION_SECURE_COOKIE=true`
   - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` con los datos de hPanel.
6. Desde SSH en la raíz del proyecto (usando `php`, o `/opt/alt/php85/usr/bin/php`), ejecuta:
   ```bash
   php artisan key:generate --force
   php artisan migrate --force
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   php artisan quedo:crear-admin tu-correo@ejemplo.com
   ```
7. Asegúrate de que el proceso PHP tenga permisos de escritura en `storage/` y `bootstrap/cache/`.

## Despliegue alternativo en carpetas separadas (`quedo/` + `public_html/`)

Si prefieres mantener Laravel fuera de `public_html/`:
1. Sube el proyecto a una carpeta hermana de `public_html`, por ejemplo `quedo/`.
2. Copia el contenido de `public/` dentro de `public_html/` y reemplaza `public_html/index.php` por `deploy/hostinger/index.php`.

## Google OAuth y reCAPTCHA v3

1. En Google Cloud, registra como URI de redireccionamiento autorizado: `https://tu-dominio.com/acceso/google/retorno`.
2. Configura `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`.
3. Para reCAPTCHA v3, configura `RECAPTCHA_ENABLED=true`, `RECAPTCHA_SITE_KEY` y `RECAPTCHA_SECRET_KEY`.
4. Ejecuta `php artisan config:cache` tras modificar `.env`.

## Instalación local en Windows

- Código móvil Flutter en [mobile/](mobile/README.md) y documentación en [docs/](docs/PLAN_DESARROLLO.md).
- Para sincronizar con la copia local en XAMPP (`C:\xampp\quedo-laravel-local`), usa `sincronizar-local.ps1` e `iniciar-local.ps1`.
