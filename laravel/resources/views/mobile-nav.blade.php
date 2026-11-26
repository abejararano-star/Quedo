@php($panel = auth()->user()?->panel() ?? '/acceso')
<nav class="mobile-navigation" aria-label="Navegación móvil">
    <a href="{{ url('/estadias') }}" @if(request()->is('/','estadias','estadias/*')) aria-current="page" @endif>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>Explorar
    </a>
    <a href="{{ route('map') }}" @if(request()->routeIs('map')) aria-current="page" @endif>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>Mapa
    </a>
    <a href="{{ url('/guardados') }}" @if(request()->is('guardados')) aria-current="page" @endif>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20 4.8 13C-.5 7.8 6.8 2 12 7c5.2-5 12.5.8 7.2 6L12 20Z"/></svg>Guardados
    </a>
    <a href="{{ url($panel) }}" @if(request()->is('huesped','acceso','registro','admin','admin/*','anfitrion','anfitrion/*')) aria-current="page" @endif>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2"/></svg>Mi cuenta
    </a>
</nav>
