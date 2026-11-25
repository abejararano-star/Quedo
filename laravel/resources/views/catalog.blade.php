@extends('layout')
@section('content')
@php($favorites=App\Http\Controllers\Catalog::favorites(request()))
@if(request()->is('/'))
<section class="hero container"><div class="hero-copy"><p class="eyebrow">DESDE EL CHOCÓ, PARA TI</p><h1>Más que llegar.<br><span>Sentirte en casa.</span></h1><p class="hero-description">Encuentra tu espacio en Quibdó.<br>Por unos días, unas semanas o un nuevo comienzo.</p></div><div class="hero-visual"><img class="hero-photo" src="{{ asset('images/apartment-1.jpg') }}" alt="Interior luminoso de referencia"><div class="hero-location">Quibdó, Chocó</div><span class="photo-reference">Fotografía de referencia</span></div></section>
@endif
<section class="container page-space">
@if(!request()->is('guardados'))
<form class="search-bar" action="{{ url('estadias') }}">
@foreach(['q'=>'Barrio o alojamiento','llegada'=>'Entrada','salida'=>'Salida','personas'=>'Huéspedes'] as $key=>$label)
<label class="search-field"><span><span class="search-label">{{ $label }}</span><input type="{{ $key==='q'?'search':($key==='personas'?'number':'date') }}" min="{{ $key==='personas'?1:now('America/Bogota')->toDateString() }}" name="{{ $key }}" value="{{ request()->string($key) }}" placeholder="{{ $key==='q'?'Explora Quibdó':'' }}"></span></label>
@endforeach
<button class="button button-primary">Buscar estadías</button>
@if(request()->is('estadias'))<details style="grid-column:1/-1"><summary>Filtros de alojamiento</summary><div class="filters-fields"><label>Tipo<select name="tipo"><option value="">Todos</option>@foreach(['Apartaestudio','Apartamento','Habitación','Casa'] as $t)<option @selected(request('tipo')===$t)>{{ $t }}</option>@endforeach</select></label><label>Máximo por noche<input type="number" min="0" name="precio" value="{{ request()->string('precio') }}"></label><label>Orden<select name="orden"><option value="">Recomendados</option><option value="precio-asc" @selected(request('orden')==='precio-asc')>Menor precio</option><option value="precio-desc" @selected(request('orden')==='precio-desc')>Mayor precio</option></select></label></div>@foreach(['WiFi','Cocina','Aire acondicionado','Zona de trabajo','Lavadora','Agua de reserva','Respaldo de energía','Admite mascotas'] as $s)<label><input type="checkbox" name="servicio[]" value="{{ $s }}" @checked(in_array($s,(array)request('servicio',[])))> {{ $s }} </label>@endforeach</details>@endif
</form>@endif
<div class="section-heading"><div><p class="eyebrow">QUEDO ESTADÍAS</p><h1>{{ request()->is('guardados')?'Tus espacios guardados':(request()->is('/')?'Una estadía que va contigo.':'Quédate en Quibdó.') }}</h1></div>@if(request()->is('/'))<a class="text-link" href="{{ url('estadias') }}">Explorar todos los espacios →</a>@endif</div>
<div class="listing-grid">@forelse($items as $item)
@php($link=route('listing',array_merge(['listing'=>$item->slug],request()->only('llegada','salida','personas'))))
<article class="listing-card"><div class="card-image-wrap"><a href="{{ $link }}"><img class="card-image" src="{{ $item->photos[0] ?? asset('images/apartment-1.jpg') }}" alt="{{ $item->title }}" loading="lazy"></a><span class="card-label">{{ $item->isDemo?'Espacio de ejemplo':$item->type }}</span>@include('favorite')</div>
<div class="card-copy"><p class="card-location">{{ $item->district }}, {{ $item->city }}</p><h3><a href="{{ $link }}">{{ $item->title }}</a></h3><p class="card-meta">{{ $item->capacity }} huéspedes · {{ $item->beds }} camas</p><p class="card-price"><strong>$ {{ number_format($item->priceNight,0,',','.') }}</strong> COP / noche</p></div></article>
@empty<p>{{ request()->is('guardados')?'Guarda un alojamiento con el corazón para encontrarlo aquí.':'No encontramos espacios con esos filtros.' }}</p>@endforelse</div>
@if(!request()->is('/'))<nav class="pagination">@if($items->previousPageUrl())<a href="{{ $items->previousPageUrl() }}">Anterior</a>@endif @if($items->nextPageUrl())<a href="{{ $items->nextPageUrl() }}">Siguiente</a>@endif</nav>@endif</section>
@if(request()->is('/')) @include('home-sections') @endif
@endsection
