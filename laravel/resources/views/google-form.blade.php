@php
    $googleLabel = match($intent) {
        'link' => 'Vincular cuenta de Google',
        'register' => 'Registrarme con Google',
        default => 'Iniciar sesión con Google',
    };
    $googleOrigin = rtrim(config('app.url'), '/');
@endphp
@if(App\Http\Controllers\GoogleAccess::enabled())
@if(app()->environment('local') && rtrim(url('/'), '/') !== $googleOrigin)
    <div class="google-access-form">
        <a class="google-access-button" href="{{ $googleOrigin.request()->getPathInfo() }}">{{ $googleLabel }}</a>
        <p class="google-access-help">Google usa la dirección local configurada para Quedo.</p>
    </div>
@else
<form class="google-access-form" method="post" action="{{ url('/acceso/google') }}">
    @csrf
    <input type="hidden" name="intent" value="{{ $intent }}">
    @if($intent === 'register')
        <label class="check-label"><input type="checkbox" name="consent" required> Acepto las condiciones y el aviso de privacidad para crear mi cuenta de huésped.</label>
    @endif
    <button type="submit" class="google-access-button">{{ $googleLabel }}</button>
</form>
@endif
@elseif(app()->environment('local') && $intent !== 'link')
<div class="google-access-form">
    <button type="button" class="google-access-button" disabled>{{ $googleLabel }}</button>
    <p class="google-access-help">Falta configurar el cliente OAuth de Google para esta instalación local.</p>
</div>
@endif
