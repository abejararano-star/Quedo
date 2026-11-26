@extends('layout')
@section('content')
@php($captchaKey = config('services.recaptcha.enabled') ? config('services.recaptcha.site_key') : null)
<div class="auth-layout"><div class="auth-intro"><p class="eyebrow">QUEDO ESTADÍAS</p><h1>{{ $register?'Encuentra tu lugar en Quibdó.':'Qué bueno verte de nuevo.' }}</h1></div><div class="auth-form-wrap"><form class="auth-form" method="post" action="{{ url($register?'registro':'acceso') }}" @if($captchaKey) data-captcha-action="{{ $register?'register':'login' }}" data-captcha-key="{{ $captchaKey }}" @endif>@csrf<h2>{{ $register?'Crear cuenta':'Iniciar sesión' }}</h2>
@if($register)<label>Nombre<input name="name" required maxlength="100" value="{{ old('name') }}"></label><label>Tipo de cuenta<select name="perfil"><option value="huesped">Huésped</option><option value="anfitrion" @selected(request('perfil')==='anfitrion')>Anfitrión</option></select></label>@endif
<label>Correo electrónico<input name="email" type="email" required autocomplete="username" value="{{ old('email') }}"></label><label>Contraseña<input name="password" type="password" required autocomplete="{{ $register?'new-password':'current-password' }}"></label>
@if($register)<label class="check-label"><input type="checkbox" name="consent" required>Acepto las condiciones y el aviso de privacidad.</label>@endif
@if($captchaKey)
    <input type="hidden" name="captcha_token">
    <p class="captcha-message" data-captcha-message role="status"></p>
    <script defer src="https://www.google.com/recaptcha/api.js?render={{ rawurlencode($captchaKey) }}"></script>
    <script defer src="{{ asset('recaptcha.js') }}"></script>
@endif
<button class="button button-primary">{{ $register?'Crear mi cuenta':'Ingresar' }}</button><a href="{{ url($register?'acceso':'registro') }}">{{ $register?'Ya tengo una cuenta':'Crear una cuenta' }}</a></form>
@include('google-form',['intent'=>$register?'register':'login'])
</div></div>
@endsection
