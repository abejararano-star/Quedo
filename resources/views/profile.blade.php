@extends('layout')
@section('content')<section class="container page-space"><h1>Hola, {{ auth()->user()->name }}.</h1><p>{{ auth()->user()->email }}</p><a class="button button-primary" href="{{ url('guardados') }}">Ver mis guardados</a>
@if(auth()->user()->role === 'GUEST' && !auth()->user()->isTest && App\Http\Controllers\GoogleAccess::enabled())
    @if(auth()->user()->googleSubject === null)
        @include('google-form',['intent'=>'link'])
    @else
        <p>Cuenta de Google vinculada.</p>
    @endif
@endif
@include('logout')</section>@endsection
