<form method="post" action="{{ route('favorite',$item->slug) }}">@csrf
@php($active = in_array($item->id,$favorites,true))
<input type="hidden" name="guardar" value="{{ $active ? 0 : 1 }}"><button type="submit" class="favorite {{ $active ? 'is-saved' : '' }}" aria-pressed="{{ $active ? 'true' : 'false' }}" aria-label="{{ $active ? 'Quitar de guardados' : 'Guardar estadía' }}">{{ $active ? '♥' : '♡' }}</button></form>
