<?php

use Illuminate\Http\Request;

if (!is_file(__DIR__.'/../vendor/autoload.php')) {
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="es"><meta charset="utf-8"><title>Quedo · Instalación pendiente</title>'
        .'<body style="font-family:system-ui,sans-serif;max-width:640px;margin:3rem auto;padding:0 1rem;line-height:1.5">'
        .'<h1>Faltan dependencias de Composer</h1>'
        .'<p>La carpeta <code>vendor/</code> no está instalada en el servidor.</p>'
        .'<p>Ejecuta en la raíz del sitio por SSH: <code>composer2 install --no-dev --optimize-autoloader</code></p>'
        .'</body></html>';
    exit;
}

if (!is_file(__DIR__.'/../bootstrap/cache/config.php') && !is_file(__DIR__.'/../.env')) {
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="es"><meta charset="utf-8"><title>Quedo · Configuración pendiente</title>'
        .'<body style="font-family:system-ui,sans-serif;max-width:640px;margin:3rem auto;padding:0 1rem;line-height:1.5">'
        .'<h1>Falta el archivo <code>.env</code></h1>'
        .'<p>Copia <code>.env.example</code> a <code>.env</code>, configura la base de datos y ejecuta <code>php artisan key:generate --force</code>.</p>'
        .'</body></html>';
    exit;
}

require __DIR__.'/../vendor/autoload.php';
(require __DIR__.'/../bootstrap/app.php')->handleRequest(Request::capture());
