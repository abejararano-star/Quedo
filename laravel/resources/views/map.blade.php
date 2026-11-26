@extends('layout')
@section('title', 'Mapa de Quibdó')
@push('head')
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="anonymous">
<link rel="stylesheet" href="{{ asset('quedo-map.css') }}">
<script defer src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous"></script>
<script defer src="{{ asset('quedo-map.js') }}"></script>
@endpush

@section('content')
<section class="container page-space" aria-labelledby="map-title">
    <div class="section-heading">
        <div>
            <h1 id="map-title">Mapa de Quibdó</h1>
            <p>Explora los barrios y encuentra estadías cerca de donde quieres estar.</p>
        </div>
        <a class="text-link" href="{{ route('stays') }}">Ver todas las estadías →</a>
    </div>
    <div class="quedo-map-layout" data-quedo-map>
        <div class="quedo-map-stage" data-map-stage hidden>
            <div class="quedo-map-canvas" data-map-canvas data-tiles="{{ $tiles }}" aria-label="Mapa interactivo de los barrios de Quibdó"></div>
            <div class="quedo-map-controls">
                <button type="button" class="install-action" data-map-locate>Mi ubicación</button>
                <span role="status" data-map-location></span>
            </div>
        </div>
        <aside class="quedo-map-zones" aria-labelledby="zones-title">
            <h2 id="zones-title">Barrios</h2>
            <p>Los marcadores indican referencias del barrio. La ubicación exacta se confirma con el anfitrión.</p>
            <ul>
                @foreach($zones as $zone)
                    <li>
                        <a href="{{ route('stays', ['barrio' => $zone['district']]) }}" class="quedo-map-zone"
                           data-map-zone data-latitude="{{ $zone['latitude'] }}" data-longitude="{{ $zone['longitude'] }}">
                            <span><strong>{{ $zone['district'] }}</strong><small>{{ $zone['count'] }} {{ $zone['count'] === 1 ? 'estadía' : 'estadías' }}</small></span>
                            <span aria-hidden="true">→</span>
                        </a>
                    </li>
                @endforeach
            </ul>
            <p data-map-message role="status">Elige un barrio para ver sus estadías.</p>
        </aside>
    </div>
</section>
@endsection
