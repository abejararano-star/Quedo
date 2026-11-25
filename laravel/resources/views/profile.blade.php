@extends('layout')
@section('content')<section class="container page-space"><h1>Hola, {{ auth()->user()->name }}.</h1><p>{{ auth()->user()->email }}</p><a class="button button-primary" href="{{ url('guardados') }}">Ver mis guardados</a>@include('logout')</section>@endsection
