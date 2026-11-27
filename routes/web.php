<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{Catalog,Account,Portal};
use App\Http\Controllers\GoogleAccess;
use App\Http\Middleware\VerifyRecaptcha;

Route::get('/',[Catalog::class,'index']);
Route::get('/estadias',[Catalog::class,'index'])->name('stays');
Route::get('/mapa',[Catalog::class,'map'])->name('map');
Route::get('/estadias/{listing:slug}',[Catalog::class,'show'])->name('listing');
Route::post('/estadias/{listing:slug}/consulta',[Catalog::class,'show'])->middleware('throttle:120,60,quote')->name('quote');
Route::get('/guardados',[Catalog::class,'saved']);
Route::get('/media/{key}',[Catalog::class,'media']);
Route::post('/estadias/{listing:slug}/guardar',[Catalog::class,'favorite'])->middleware('throttle:120,60,favorite')->name('favorite');
Route::post('/estadias/{listing:slug}/contactar',[Catalog::class,'contact'])->middleware('throttle:20,60,contact')->name('contact');
Route::post('/estadias/{listing:slug}/reportar',[Catalog::class,'report'])->middleware('throttle:5,60,report')->name('report');
Route::get('/acceso',fn()=>auth()->check()?redirect(auth()->user()->panel()):view('auth',['register'=>false]))->name('login');
Route::get('/registro',fn()=>auth()->check()?redirect(auth()->user()->panel()):view('auth',['register'=>true]));
Route::post('/acceso',[Account::class,'login'])->middleware(['throttle:10,15,login',VerifyRecaptcha::class.':login']);
Route::post('/registro',[Account::class,'register'])->middleware(['throttle:5,60,register',VerifyRecaptcha::class.':register']);
Route::post('/acceso/google',[GoogleAccess::class,'start'])->middleware('throttle:10,15,google-start');
Route::get('/acceso/google/retorno',[GoogleAccess::class,'callback'])->middleware('throttle:20,15,google-callback');
Route::post('/salir',[Account::class,'logout'])->middleware('auth');
Route::view('/como-funciona','info');
Route::view('/instalar','install');
Route::view('/privacidad','info');
Route::middleware('auth')->group(function() {
    Route::view('/huesped','profile');
    require __DIR__.'/panels.php';
});
