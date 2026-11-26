<?php

use App\Http\Controllers\GoogleAccess;
use App\Http\Middleware\VerifyRecaptcha;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
Http::preventStrayRequests();

function check(bool $condition, string $label): void {
    if (!$condition) throw new RuntimeException($label);
    echo "OK $label", PHP_EOL;
}

function testRequest(string $url, string $method, array $fields=[]): Request {
    $request = Request::create($url, $method, $fields);
    $request->setLaravelSession(app('session')->driver());
    return $request;
}

try {
    config([
        'app.url' => 'https://quedo.example',
        'services.google.client_id' => 'test-client',
        'services.google.client_secret' => 'test-secret',
        'services.recaptcha.enabled' => true,
        'services.recaptcha.site_key' => 'public-test-key',
        'services.recaptcha.secret_key' => 'private-test-key',
        'services.recaptcha.min_score' => 0.5,
    ]);
    Http::fake(['https://www.google.com/recaptcha/api/siteverify' => Http::sequence()
        ->push(['success'=>true, 'action'=>'login', 'hostname'=>'quedo.example', 'score'=>0.9])
        ->push(['success'=>true, 'action'=>'register', 'hostname'=>'quedo.example', 'score'=>0.9])
        ->push(['success'=>true, 'action'=>'login', 'hostname'=>'other.example', 'score'=>0.9])
        ->push(['success'=>true, 'action'=>'login', 'hostname'=>'quedo.example', 'score'=>0.2])
        ->push(['success'=>false, 'error-codes'=>['timeout-or-duplicate']])]);
    $captcha = new VerifyRecaptcha;
    $request = testRequest('https://quedo.example/acceso','POST',['captcha_token'=>'test-token']);
    check($captcha->handle($request, fn()=>true, 'login'), 'reCAPTCHA admite acción, dominio y puntuación válidos');
    foreach (['acción', 'dominio', 'puntuación', 'token repetido'] as $reason) {
        try {
            $captcha->handle($request, fn()=>true, 'login');
        } catch (ValidationException) {
            echo "OK reCAPTCHA rechaza $reason", PHP_EOL;
            continue;
        }
        throw new RuntimeException("Se aceptó $reason");
    }
    $google = new GoogleAccess;
    $start = testRequest('https://quedo.example/acceso/google','POST',['intent'=>'login']);
    $redirect = $google->start($start);
    parse_str(parse_url($redirect->getTargetUrl(),PHP_URL_QUERY), $params);
    $flow = $start->session()->get('google_oauth');
    check($params['state'] === $flow['state'] && $params['code_challenge_method'] === 'S256'
        && $params['redirect_uri'] === 'https://quedo.example/acceso/google/retorno'
        && !isset($params['client_secret']), 'OAuth emite state y PKCE sin exponer el secreto');
    $callback = testRequest('https://quedo.example/acceso/google/retorno','GET',['state'=>'invalid','code'=>'test-code']);
    $response = $google->callback($callback);
    check(str_ends_with($response->getTargetUrl(),'/acceso') && !$callback->session()->has('google_oauth'), 'OAuth rechaza state inválido y elimina el flujo');
    check(Http::recorded()->count() === 5, 'state inválido se rechaza antes de contactar a Google');

    Http::fake([
        'https://oauth2.googleapis.com/token' => Http::response(['access_token'=>'test-access']),
        'https://openidconnect.googleapis.com/v1/userinfo' => Http::response([
            'sub'=>'test-subject', 'email'=>'test@example.org', 'email_verified'=>false,
        ]),
    ]);
    $google->start($start);
    $flow = $start->session()->get('google_oauth');
    $callback = testRequest('https://quedo.example/acceso/google/retorno','GET',['state'=>$flow['state'],'code'=>'test-code']);
    $google->callback($callback);
    $exchange = Http::recorded()->last(fn($pair)=>$pair[0]->url() === 'https://oauth2.googleapis.com/token');
    check($exchange[0]['code_verifier'] === $flow['verifier']
        && $callback->session()->get('errors')->first('google') === 'Quedo requiere un correo verificado por Google.', 'OAuth usa el verificador PKCE y rechaza correos sin verificar');
} catch (Throwable $error) {
    fwrite(STDERR,$error->getMessage().PHP_EOL);
    exit(1);
}
