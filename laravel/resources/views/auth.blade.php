@extends('layout')
@section('content')
<div class="auth-layout"><div class="auth-intro"><p class="eyebrow">QUEDO ESTADÍAS</p><h1>{{ $register?'Encuentra tu lugar en Quibdó.':'Qué bueno verte de nuevo.' }}</h1></div><div class="auth-form-wrap"><form class="auth-form" method="post">@csrf<h2>{{ $register?'Crear cuenta':'Iniciar sesión' }}</h2>
@if($register)<label>Nombre<input name="name" required maxlength="100" value="{{ old('name') }}"></label><label>Tipo de cuenta<select name="perfil"><option value="huesped">Huésped</option><option value="anfitrion" @selected(request('perfil')==='anfitrion')>Anfitrión</option></select></label>@endif
<label>Correo electrónico<input name="email" type="email" required autocomplete="username" value="{{ old('email') }}"></label><label>Contraseña<input name="password" type="password" required autocomplete="{{ $register?'new-password':'current-password' }}"></label>
@if($register)<label class="check-label"><input type="checkbox" name="consent" required>Acepto las condiciones y el aviso de privacidad.</label>@endif
<button class="button button-primary">{{ $register?'Crear mi cuenta':'Ingresar' }}</button><a href="{{ url($register?'acceso':'registro') }}">{{ $register?'Ya tengo una cuenta':'Crear una cuenta' }}</a></form></div></div>@endsection
