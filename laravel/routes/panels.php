<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{Portal,Metrics};
Route::get('/admin',[Metrics::class,'dashboard']);
Route::get('/anfitrion',[Portal::class,'index']);
Route::get('/admin/anuncios',[Portal::class,'index']);
Route::get('/anfitrion/nuevo',[Portal::class,'form']);
Route::post('/anfitrion/nuevo',[Portal::class,'save'])->middleware('throttle:30,60');
Route::get('/anfitrion/{listing}/editar',[Portal::class,'form']);
Route::post('/anfitrion/{listing}/editar',[Portal::class,'save'])->middleware('throttle:30,60');
Route::post('/anfitrion/{listing}/pausar',[Portal::class,'pause']);
Route::post('/anfitrion/{listing}/simular',[Portal::class,'simulate'])->middleware('throttle:30,60');
Route::post('/admin/anuncios/{listing}',[Portal::class,'moderate']);
Route::post('/admin/reportes/{id}',[Portal::class,'resolve']);
Route::get('/admin/anfitriones',[Portal::class,'hosts']);
Route::post('/admin/anfitriones/{id}',[Portal::class,'membership']);
Route::get('/anfitrion/metricas',[Metrics::class,'dashboard']);
foreach(['admin','anfitrion'] as $panel) {
    Route::get("/$panel/contactos",[Portal::class,'contacts']);
    Route::post("/$panel/contactos/{id}",[Portal::class,'follow']);
    Route::get("/$panel/exportar/{dataset}",[Metrics::class,'export']);
}
