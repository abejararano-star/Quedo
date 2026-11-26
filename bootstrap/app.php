<?php
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Configuration\Exceptions;

foreach (['bootstrap/cache','storage/framework/cache/data','storage/framework/sessions','storage/framework/views','storage/logs'] as $directory) {
    $path = dirname(__DIR__).'/'.$directory;
    if (!is_dir($path) && !mkdir($path, 0770, true) && !is_dir($path)) throw new RuntimeException('Directorio no disponible.');
}
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/mobile.php',
        commands: __DIR__.'/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->redirectGuestsTo('/acceso');
        $middleware->web(append: [App\Http\Middleware\AccountScope::class]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->dontFlash(['captcha_token']);
    })
    ->create();
