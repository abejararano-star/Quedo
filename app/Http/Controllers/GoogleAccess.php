<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class GoogleAccess {
    public static function enabled(): bool {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }
    private function callbackUrl(): string {
        return rtrim(config('app.url'), '/').'/acceso/google/retorno';
    }
    public function start(Request $request) {
        abort_unless(self::enabled(), 404);
        $intent = $request->validate(['intent'=>'required|in:login,register,link'])['intent'];
        if ($intent === 'register') $request->validate(['consent'=>'accepted']);
        $account = $request->user();
        abort_unless($intent === 'link' ? ($account && !$account->isTest && $account->role === 'GUEST') : !$account, 403);
        $state = Str::random(64);
        $verifier = Str::random(64);
        $request->session()->put('google_oauth', [
            'state'=>$state,'verifier'=>$verifier,'expires'=>time()+600,
            'intent'=>$intent,'account'=>$account?->id,
        ]);
        return redirect()->away('https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
            'client_id'=>config('services.google.client_id'), 'redirect_uri'=>$this->callbackUrl(),
            'response_type'=>'code', 'scope'=>'openid email profile', 'state'=>$state,
            'code_challenge'=>rtrim(strtr(base64_encode(hash('sha256',$verifier,true)), '+/', '-_'), '='),
            'code_challenge_method'=>'S256',
        ], '', '&', PHP_QUERY_RFC3986));
    }
    public function callback(Request $request) {
        abort_unless(self::enabled(), 404);
        $flow = $request->session()->pull('google_oauth');
        $state = $request->query('state');
        $code = $request->query('code');
        $current = $request->user();
        if (!$flow || !is_string($state) || !hash_equals($flow['state'],$state) || $flow['expires'] < time()
            || !is_string($code) || $code === '' || strlen($code) > 4096 || $current?->id !== $flow['account']) {
            return $this->fail('Vuelve a iniciar el acceso con Google.');
        }
        try {
            $token = Http::asForm()->withoutRedirecting()->timeout(8)->post('https://oauth2.googleapis.com/token', [
                'grant_type'=>'authorization_code','code'=>$code,'redirect_uri'=>$this->callbackUrl(),
                'client_id'=>config('services.google.client_id'),'client_secret'=>config('services.google.client_secret'),
                'code_verifier'=>$flow['verifier'],
            ]);
            $access = $token->successful() ? $token->json('access_token') : null;
            if (!is_string($access) || $access === '') return $this->fail('Google no pudo completar el acceso.');
            $profile = Http::withToken($access)->acceptJson()->withoutRedirecting()->timeout(8)->get('https://openidconnect.googleapis.com/v1/userinfo');
            $identity = $profile->successful() ? $profile->json() : [];
        } catch (ConnectionException) {
            return $this->fail('Google no está disponible. Inténtalo de nuevo.');
        }
        $subject = $identity['sub'] ?? null;
        $mail = $identity['email'] ?? null;
        if (!is_string($subject) || !preg_match('/^[A-Za-z0-9_-]{1,255}$/D',$subject)
            || !is_string($mail) || strlen($mail) > 190 || !filter_var($mail,FILTER_VALIDATE_EMAIL)
            || ($identity['email_verified'] ?? false) !== true) {
            return $this->fail('Quedo requiere un correo verificado por Google.');
        }
        $mail = strtolower($mail);
        try {
            if ($flow['intent'] === 'link') {
                if ($current->role !== 'GUEST' || $current->isTest || $current->email !== $mail || $current->googleSubject !== null) {
                    return $this->fail('Usa el correo de tu cuenta Quedo para vincular Google.');
                }
                $updated = User::whereKey($current->id)->whereNull('googleSubject')->update(['googleSubject'=>$subject]);
                return $updated ? redirect('/huesped')->with('notice','Cuenta de Google vinculada.') : $this->fail('Tu cuenta ya está vinculada.');
            }
            $user = User::where('googleSubject',$subject)->first();
            if (!$user && $flow['intent'] === 'register' && !User::where('email',$mail)->exists()) {
                $user = new User;
                $user->id = (string) Str::ulid();
                $user->role = 'GUEST';
                $user->email = $mail;
                $user->name = mb_substr(is_string($identity['name'] ?? null) ? $identity['name'] : 'Huésped',0,100);
                $user->googleSubject = $subject;
                $user->passwordHash = password_hash(bin2hex(random_bytes(32)),PASSWORD_ARGON2ID);
                $user->save();
            }
        } catch (UniqueConstraintViolationException) {
            return $this->fail('La cuenta de Google ya está en uso.');
        }
        if (!$user || $user->isTest || $user->role !== 'GUEST') {
            return $this->fail('Si ya tienes cuenta de huésped, entra con tu contraseña y vincula Google desde tu perfil. Si eres nuevo, regístrate con Google.');
        }
        Auth::login($user);
        $request->session()->regenerate();
        return redirect($user->panel());
    }
    private function fail(string $message) {
        return redirect(auth()->check() ? auth()->user()->panel() : '/acceso')->withErrors(['google'=>$message]);
    }
}
