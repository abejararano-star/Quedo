<?php

use Illuminate\Http\Request;

$root = dirname(__DIR__);

$abortSetup = static function (string $title, string $message): never {
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="es"><meta charset="utf-8"><title>Quedo · '.htmlspecialchars($title, ENT_QUOTES, 'UTF-8').'</title>'
        .'<body style="font-family:system-ui,sans-serif;max-width:640px;margin:3rem auto;padding:0 1rem;line-height:1.5">'
        .'<h1>'.htmlspecialchars($title, ENT_QUOTES, 'UTF-8').'</h1>'
        .'<p>'.$message.'</p>'
        .'</body></html>';
    exit;
};

if (!is_file($root.'/vendor/autoload.php')) {
    $abortSetup('Faltan dependencias de Composer', 'La carpeta <code>vendor/</code> no está instalada en el servidor. Ejecuta por SSH en la raíz del sitio: <code>composer2 install --no-dev --optimize-autoloader</code>');
}

if (!is_file($root.'/bootstrap/cache/config.php')) {
    $envPath = $root.'/.env';
    if (!is_file($envPath)) {
        $abortSetup('Falta el archivo .env', 'Copia <code>.env.example</code> a <code>.env</code>, configura la base de datos y ejecuta <code>php artisan key:generate --force</code>.');
    }
    $envContent = (string) file_get_contents($envPath);
    if (!preg_match('/^APP_KEY=\S+/m', $envContent)) {
        $abortSetup('Falta APP_KEY en .env', 'La variable <code>APP_KEY</code> está vacía. Ejecuta por SSH: <code>php artisan key:generate --force</code>');
    }
}

foreach (['bootstrap/cache', 'storage/framework/sessions', 'storage/framework/views', 'storage/logs'] as $dir) {
    $path = $root.'/'.$dir;
    if (is_dir($path) && !is_writable($path)) {
        $abortSetup('Permisos insuficientes', 'El servidor no tiene permiso de escritura en <code>'.htmlspecialchars($dir, ENT_QUOTES, 'UTF-8').'</code>. Ejecuta por SSH: <code>chmod -R 775 storage bootstrap/cache</code>');
    }
}

require $root.'/vendor/autoload.php';
(require $root.'/bootstrap/app.php')->handleRequest(Request::capture());
