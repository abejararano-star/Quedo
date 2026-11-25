# Quedo en Laravel

La aplicación principal está en esta carpeta. PHP y Blade sirven la vitrina, los paneles, el inicio de sesión y las exportaciones CSV. El navegador solicita los recursos preparados en `public/`.

## Instalación local en este equipo

La copia ejecutable está en `C:\xampp\quedo-laravel-local`. Apache de XAMPP escucha en `http://127.0.0.1:8089` y utiliza solamente el directorio `public` como raíz web. La copia MariaDB `quedo_laravel` escucha en el puerto 3311. El usuario de aplicación tiene permisos de lectura y escritura sobre esa base. La configuración privada de la instancia y los respaldos están fuera de la raíz web y de Git.

Para volver a iniciar el sitio después de apagar el equipo, ejecuta `iniciar-local.ps1` desde esta carpeta. Para aplicar cambios de este repositorio a la copia ejecutable, usa `sincronizar-local.ps1`. Los datos, las fotos subidas y las credenciales residen en la instalación privada. El servidor de desarrollo anterior usaba otra base y el puerto 3000.

## Preparar otra instalación

1. Usa `laravel/` como carpeta de la aplicación. Las dependencias fijadas en `composer.lock` requieren PHP 8.4.1 o superior. En la máquina destino ejecuta `composer install --no-dev --optimize-autoloader` y `composer check-platform-reqs`. Comprueba PDO MySQL, GD con WebP, Sodium y soporte de Argon2id.
2. Copia `.env.example` a `.env`, configura la URL, la conexión y ejecuta `php artisan key:generate`. En producción establece `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` con HTTPS y `SESSION_SECURE_COOKIE=true`.
3. En una base vacía, importa `database/schema/quedo.sql` con un usuario con permisos de creación. Para migrar una instalación anterior conserva las filas, las relaciones y los identificadores. En servidores que distinguen mayúsculas usa los nombres de tabla del esquema, por ejemplo `Listing` y `ContactEvent`. Conserva aparte `storage/media` al trasladar las fotografías privadas.
4. Configura la raíz web en `public/` y concede al proceso PHP escritura en `storage/` y `bootstrap/cache/`. La configuración, los registros y las fotos privadas deben quedar fuera de esa raíz. Ejecuta `php artisan config:cache` después de cambiar las variables.
5. Para Hostinger queda pendiente verificar el plan, la versión efectiva de PHP, las extensiones y el almacenamiento persistente con el dominio real.

## Validación

`tests/recorridos.php` prueba por HTTP la portada, la ficha, el subtotal, guardados, cuentas y permisos, publicación con WebP, seguimiento y las exportaciones. Está limitado a la copia local. Ejecutar en la instalación privada con `C:\xampp\php\php.exe -d extension=sodium tests/recorridos.php`. Las aperturas de fichas de ejemplo cuentan como visitas de prueba.

Las contraseñas scrypt heredadas se verifican con Sodium. Las cuentas nuevas usan Argon2id. Las sesiones de Laravel usan su propia cookie y los usuarios deben entrar de nuevo tras el cambio.
