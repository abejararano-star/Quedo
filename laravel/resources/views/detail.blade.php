@extends('layout')
@section('title',$listing->title)
@push('head')
<link rel="stylesheet" href="{{ asset('quedo-gallery.css') }}">
<script defer src="{{ asset('quedo-gallery.js') }}"></script>
@endpush
@section('content')
<section class="container page-space"><p class="breadcrumb"><a class="text-link" href="{{ route('stays') }}" data-stay-back>← Volver a estadías</a></p><div class="section-heading"><div><h1 class="detail-title">{{ $listing->title }}</h1><p>{{ $listing->district }}, {{ $listing->city }} · {{ $listing->type }}</p></div><button type="button" class="button button-secondary" data-share-listing="{{ route('listing',$listing->slug) }}">Compartir ficha</button><script defer src="{{ asset('compartir.js') }}"></script><div style="position:relative;width:44px;height:48px">@include('favorite',['item'=>$listing,'favorites'=>App\Http\Controllers\Catalog::favorites(request())])</div></div>
@if($listing->isDemo)<div class="notice">Alojamiento de ejemplo. Sus fotografías y tarifas son ilustrativas.</div>@endif
<div class="detail-gallery {{ count($listing->photos ?? [])===1?'single-photo':'' }}">
    @foreach(array_slice($listing->photos ?? [],0,3) as $photo)
        <a href="{{ $photo }}" data-stay-photo><img src="{{ $photo }}" alt="{{ $listing->title }} · Fotografía {{ $loop->iteration }}"></a>
    @endforeach
</div>
@if(count($listing->photos ?? []) > 3)
    <div class="stay-photo-thumbs">
        @foreach(array_slice($listing->photos,3) as $photo)
            <a href="{{ $photo }}" data-stay-photo><img width="120" height="80" src="{{ $photo }}" alt="{{ $listing->title }} · Fotografía {{ $loop->iteration + 3 }}" loading="lazy"></a>
        @endforeach
    </div>
@endif
@if($listing->photos)
    <dialog class="stay-photo-viewer" aria-labelledby="stay-photo-title" data-stay-photo-viewer>
        <form method="dialog">
            <button type="submit" class="button button-secondary" autofocus>Volver a la ficha</button>
        </form>
        <figure>
            <img alt="" data-viewer-image>
            <figcaption>
                <button type="button" class="button button-secondary" data-photo-prev @if(count($listing->photos) < 2) hidden @endif>Anterior</button>
                <span id="stay-photo-title" aria-live="polite">Fotografía del alojamiento</span>
                <button type="button" class="button button-secondary" data-photo-next @if(count($listing->photos) < 2) hidden @endif>Siguiente</button>
            </figcaption>
        </figure>
    </dialog>
@endif
<div class="detail-layout"><div class="detail-content"><section><h2>{{ $listing->summary }}</h2><p class="property-facts">{{ $listing->capacity }} huéspedes · {{ $listing->bedrooms }} habitaciones · {{ $listing->beds }} camas · {{ $listing->bathrooms }} baños</p><p class="preserve-lines">{{ $listing->description }}</p></section>
<section><h2>Lo que ofrece este espacio</h2><p>{{ implode(' · ',$listing->amenities) }}</p></section><section><h2>Antes de quedarte</h2><p>{{ $listing->houseRules }}</p><h3>Cargos adicionales</h3><p>{{ $listing->extraCosts }}</p><p>Actualización del anuncio: {{ $listing->updated_at?->format('d/m/Y') ?? substr($listing->updatedAt,0,10) }}</p></section>
<details><summary>Reportar anuncio</summary><form method="post" action="{{ route('report',$listing->slug) }}">@csrf<label>Motivo<textarea required minlength="15" maxlength="500" name="reason"></textarea></label><button>Enviar reporte</button></form></details></div>
<aside class="contact-aside"><div class="contact-card"><p class="contact-price"><strong>$ {{ number_format($listing->priceNight,0,',','.') }}</strong> COP / noche</p>@if($listing->priceWeek)<p>Por semana: $ {{ number_format($listing->priceWeek,0,',','.') }} COP</p>@endif
<form class="stay-form" method="post" action="{{ route('quote',$listing->slug) }}">@csrf<h3>Consulta tu estadía</h3><p>Disponibilidad sin confirmar. El anfitrión debe comprobar las fechas.</p><div class="stay-dates">@foreach(['llegada'=>'Entrada','salida'=>'Salida'] as $key=>$label)<label>{{ $label }}<input type="date" name="{{ $key }}" min="{{ now('America/Bogota')->toDateString() }}" value="{{ request()->string($key) }}"></label>@endforeach</div><label>Huéspedes<input required type="number" min="1" max="{{ $listing->capacity }}" name="personas" value="{{ request()->string('personas','1') }}"></label><button class="button button-secondary">Calcular subtotal</button>
@if($warning)<p role="alert">{{ $warning }}</p>@elseif($nights)<div class="stay-estimate"><span>{{ $nights }} noches × $ {{ number_format($listing->priceNight,0,',','.') }}</span><strong>Subtotal estimado del alojamiento: {{ $subtotal===null?'Por confirmar':'$ '.number_format($subtotal,0,',','.').' COP' }}</strong><p>Confirma los cargos adicionales y el precio final con el anfitrión.</p></div>@endif
@if(!$listing->isDemo && $listing->status==='PUBLISHED')<button class="button button-primary" formaction="{{ route('contact',$listing->slug) }}" type="submit">Consultar por WhatsApp</button>@else<p>Contacto deshabilitado en esta ficha.</p>@endif</form>
</div></aside></div></section>
@endsection
