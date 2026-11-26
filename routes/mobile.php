<?php

use App\Http\Controllers\MobileCatalog;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('throttle:90,1,mobile-catalog')->group(function () {
    Route::get('/mapa/zonas', [MobileCatalog::class, 'zones']);
    Route::get('/estadias', [MobileCatalog::class, 'index']);
    Route::get('/estadias/{slug}', [MobileCatalog::class, 'show'])->where('slug', '[a-z0-9-]{1,190}');
});
