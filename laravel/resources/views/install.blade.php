@extends('layout')
@section('title','Instalar Quedo')
@section('content')
<section class="container page-space content-page">
    <img src="{{ asset('icons/quedo-192.png') }}" alt="" width="72" height="72">
    <h1>Instala Quedo en tu celular</h1>
    <p>Abre el catálogo y tus guardados desde un icono en la pantalla de inicio.</p>
    <p><button type="button" data-install-quedo class="install-action" hidden>Instalar Quedo</button></p>
    <h2>Android</h2>
    <p>En Chrome, abre el menú del navegador y selecciona <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</p>
    <h2>iPhone</h2>
    <p>En Safari, abre <strong>Compartir</strong>, elige <strong>Añadir a pantalla de inicio</strong> y confirma.</p>
    <a href="{{ url('/estadias') }}">Explorar estadías</a>
</section>
@endsection
