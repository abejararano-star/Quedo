<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class VerifyRecaptcha {
    public function handle(Request $request, Closure $next, string $action) {
        if (!config('services.recaptcha.enabled')) return $next($request);
        abort_unless(config('services.recaptcha.secret_key') && config('services.recaptcha.site_key'), 503);
        $data = $request->validate(['captcha_token' => 'required|string|max:4096']);
        try {
            $response = Http::asForm()->withoutRedirecting()->timeout(6)->post('https://www.google.com/recaptcha/api/siteverify', [
                'secret' => config('services.recaptcha.secret_key'),
                'response' => $data['captcha_token'],
            ]);
            $result = $response->successful() ? $response->json() : [];
        } catch (ConnectionException) {
            $result = [];
        }
        $expectedHost = parse_url(config('app.url'), PHP_URL_HOST);
        if (($result['success'] ?? false) !== true || ($result['action'] ?? null) !== $action
            || ($result['hostname'] ?? null) !== $expectedHost || !is_numeric($result['score'] ?? null)
            || $result['score'] < config('services.recaptcha.min_score')) {
            throw ValidationException::withMessages(['captcha_token' => 'La verificación de seguridad falló. Inténtalo de nuevo.']);
        }
        return $next($request);
    }
}
