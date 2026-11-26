@extends('layout')

@section('content')
<section class="container page-space">
    @include('nav')
    <h1>{{ $admin ? 'Moderación de anuncios' : 'Mis anuncios' }}</h1>
    @if($admin)
        @php($dataset = request('datos', auth()->user()->isTest ? 'prueba' : 'reales'))
        <div class="button-row" aria-label="Filtros de moderación">
            <a class="button button-secondary" href="{{ route('admin.listings', ['datos'=>'reales', 'estado'=>'pendientes']) }}">Anuncios reales pendientes</a>
            <a class="text-link" href="{{ route('admin.listings', ['datos'=>$dataset]) }}">Todos los anuncios del grupo</a>
        </div>
    @else
        <a class="button button-primary" href="{{ url('anfitrion/nuevo') }}">Nuevo anuncio</a>
    @endif

    @forelse($items as $item)
        <article class="dashboard-item">
            <div>
                <h2>{{ $item->title }}</h2>
                <p>{{ match($item->status) {
                    'PENDING' => 'Pendiente de revisión',
                    'PUBLISHED' => 'Publicado',
                    'REJECTED' => 'Cambios solicitados',
                    'PAUSED' => 'Pausado',
                    default => $item->status,
                } }} @if($admin) · {{ $item->isDemo ? 'Prueba' : 'Real' }} @endif</p>
                @if($item->reviewNote)<p>{{ $item->reviewNote }}</p>@endif
                <a class="text-link" href="{{ route('listing', $item->slug) }}">{{ $item->status === 'PUBLISHED' ? 'Ver en el catálogo' : 'Ver ficha para revisión' }}</a>
                · <a href="{{ url('anfitrion/'.$item->id.'/editar') }}">Editar</a>
            </div>
            @if($admin)
                <form method="post" action="{{ url('admin/anuncios/'.$item->id) }}">
                    @csrf
                    <label>Motivo de la decisión<input required minlength="10" maxlength="500" name="note"></label>
                    <label><input required type="checkbox" name="reviewed"> Revisé el anuncio</label>
                    <div class="button-row">
                        @if($item->status !== 'PUBLISHED')
                            <button type="submit" class="button button-primary" name="status" value="PUBLISHED">Aprobar y publicar</button>
                        @endif
                        <button type="submit" class="button button-secondary" name="status" value="REJECTED">Solicitar cambios</button>
                        @if($item->status !== 'PAUSED')
                            <button type="submit" class="button button-secondary" name="status" value="PAUSED">Pausar</button>
                        @endif
                    </div>
                </form>
            @else
                <form method="post" action="{{ url('anfitrion/'.$item->id.'/pausar') }}">@csrf<button>Pausar</button></form>
                @if($item->isDemo && $item->status === 'PUBLISHED')
                    <form method="post" action="{{ url('anfitrion/'.$item->id.'/simular') }}">@csrf<button>Simular contacto</button></form>
                @endif
            @endif
        </article>
    @empty
        <p>{{ $pending ? 'No hay anuncios pendientes en este grupo.' : 'Aún no hay anuncios.' }}</p>
    @endforelse
    @include('pagination')

    @if($admin)
        <h2>Reportes recientes</h2>
        @foreach($reports as $report)
            <p>{{ $report->reason }}</p>
            @if(!$report->resolved)
                <form method="post" action="{{ url('admin/reportes/'.$report->id) }}">@csrf<button>Resolver reporte</button></form>
            @endif
        @endforeach
        <h2>Historial de anuncios</h2>
        @foreach($audit as $entry)
            <p>{{ $entry->createdAt }} · {{ $entry->action }} · {{ $entry->note }}</p>
        @endforeach
    @endif
</section>
@endsection
