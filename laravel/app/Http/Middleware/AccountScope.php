<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AccountScope {
    public static function allowsTests(): bool {
        return app()->environment('local') && in_array(parse_url(config('app.url'), PHP_URL_HOST), ['localhost','127.0.0.1','[::1]'], true);
    }
    public function handle(Request $request, Closure $next) {
        if ($request->user()?->isTest && !self::allowsTests()) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }
        $response = $next($request);
        $response->headers->set('Cache-Control','private, no-store');
        $response->headers->set('X-Content-Type-Options','nosniff');
        $response->headers->set('X-Frame-Options','DENY');
        $response->headers->set('Referrer-Policy','strict-origin-when-cross-origin');
        $response->headers->set('Content-Security-Policy',"object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
        return $response;
    }
}
