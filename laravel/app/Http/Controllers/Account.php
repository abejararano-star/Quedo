<?php
namespace App\Http\Controllers;
use App\Models\User;
use App\Http\Middleware\AccountScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class Account {
    public function login(Request $r) {
        $data = $r->validate(['email'=>'required|email|max:190','password'=>'required|string|max:128']);
        $key = 'login-email:'.hash_hmac('sha256',strtolower($data['email']),config('app.key'));
        if (RateLimiter::tooManyAttempts($key,10)) throw ValidationException::withMessages(['email'=>'Espera unos minutos antes de volver a intentar.']);
        $user = User::where('email', strtolower($data['email']))->first();
        $hash = $user?->passwordHash ?? 'scrypt:'.str_repeat('0',32).':'.str_repeat('0',128);
        if (preg_match('/^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/D', $hash, $legacy)) {
            $derived = sodium_crypto_pwhash_scryptsalsa208sha256(64, $data['password'], $legacy[1], 524288, 16777216);
            $valid = hash_equals(hex2bin($legacy[2]), $derived);
        } else {
            $valid = password_verify($data['password'], $hash);
        }
        if (!$user || !$valid || ($user->isTest && !AccountScope::allowsTests())) {
            RateLimiter::hit($key,900);
            throw ValidationException::withMessages(['email'=>'Revisa el correo y la contraseña.']);
        }
        Auth::login($user);
        RateLimiter::clear($key);
        $r->session()->regenerate();
        return redirect($user->panel());
    }
    public function register(Request $r) {
        $data = $r->validate(['name'=>'required|string|min:2|max:100','email'=>'required|email|max:190|unique:User,email',
            'password'=>'required|string|min:12|max:128','perfil'=>'required|in:huesped,anfitrion','consent'=>'accepted']);
        $user = new User;
        $user->id = (string) Str::ulid();
        $user->name = $data['name'];
        $user->email = strtolower($data['email']);
        $user->passwordHash = password_hash($data['password'], PASSWORD_ARGON2ID);
        $user->role = $data['perfil'] === 'anfitrion' ? 'HOST' : 'GUEST';
        $user->save();
        Auth::login($user);
        $r->session()->regenerate();
        return redirect($user->panel());
    }
    public function logout(Request $r) {
        Auth::logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();
        return redirect('/');
    }
}
