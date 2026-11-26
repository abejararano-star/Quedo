<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
require dirname(__DIR__).'/vendor/autoload.php';
$app=require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$base=config('app.url');
if ($base!=='http://127.0.0.1:8089' || config('database.connections.mysql.database')!=='quedo_laravel' || config('database.connections.mysql.host')!=='127.0.0.1' || !$app->environment('local')) throw new RuntimeException('Solo se admite la copia local.');
function check($ok,$label) { if(!$ok) throw new RuntimeException($label); echo "OK $label\n"; }
class BrowserSession {
    private $handle;
    private $token='';
    function __construct() {
        $this->handle=curl_init();
        curl_setopt_array($this->handle,[CURLOPT_COOKIEFILE=>'',CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>20]);
    }
    function request($path,$fields=null) {
        global $base;
        curl_setopt($this->handle,CURLOPT_URL,$base.$path);
        if($fields===null) curl_setopt($this->handle,CURLOPT_HTTPGET,true);
        else {curl_setopt($this->handle,CURLOPT_POST,true);curl_setopt($this->handle,CURLOPT_POSTFIELDS,$fields+['_token'=>$this->token]);}
        $body=curl_exec($this->handle);
        if($body===false) throw new RuntimeException(curl_error($this->handle));
        if(preg_match('/name="_token" value="([^"]+)"/',$body,$m)) $this->token=$m[1];
        return [curl_getinfo($this->handle,CURLINFO_RESPONSE_CODE),$body];
    }
}
$run=Str::lower(Str::random(10)); $pw=bin2hex(random_bytes(16)); $ids=[];$listing=$realListing=null;
try {
    $guest=new BrowserSession;
    check(str_contains($guest->request('/')[1],'Sentirte en casa'),'portada Blade en Apache');
    $sample=DB::table('Listing')->where(['isDemo'=>true,'status'=>'PUBLISHED'])->firstOrFail();
    $url='/estadias/'.$sample->slug;
    check(str_contains($guest->request($url)[1],'Contacto deshabilitado'),'ficha de ejemplo');
    $dates=['llegada'=>now()->addDays(4)->toDateString(),'salida'=>now()->addDays(7)->toDateString(),'personas'=>'1'];
    $html=$guest->request($url.'/consulta',$dates)[1];
    check(str_contains($html,number_format(3*$sample->priceNight,0,',','.')),'subtotal de tres noches');
    check(str_contains($guest->request($url.'/consulta',array_merge($dates,['salida'=>$dates['llegada']]))[1],'Revisa las fechas'),'intervalo inválido rechazado');
    $guest->request('/registro');
    $email="qa-guest-$run@example.invalid";
    $guest->request('/registro',['name'=>'Huésped QA','email'=>$email,'password'=>$pw,'perfil'=>'huesped','consent'=>'on']);
    $id=DB::table('User')->where('email',$email)->value('id');check($id,'registro de huésped');$ids[]=$id;
    $guest->request($url); $guest->request($url.'/guardar',['guardar'=>1]);
    $guest->request('/huesped');$guest->request('/salir',[]);
    $guest->request('/acceso');$guest->request('/acceso',['email'=>$email,'password'=>$pw]);
    check(str_contains($guest->request('/guardados')[1],$sample->title),'guardados entre sesiones');
    check($guest->request('/admin')[0]===403 && $guest->request('/anfitrion/nuevo')[0]===403,'permisos del huésped');
    foreach(['host','admin'] as $role) {
        $id=(string)Str::ulid();$ids[]=$id;$salt=bin2hex(random_bytes(16));
        $hash='scrypt:'.$salt.':'.bin2hex(sodium_crypto_pwhash_scryptsalsa208sha256(64,$pw,$salt,524288,16777216));
        DB::table('User')->insert(['id'=>$id,'role'=>strtoupper($role),'name'=>"QA $role",'email'=>"qa-$role-$run@example.invalid",'passwordHash'=>$hash,'isTest'=>true]);
        $$role=new BrowserSession; $$role->request('/acceso');
        check($$role->request('/acceso',['email'=>"qa-$role-$run@example.invalid",'password'=>$pw])[0]===302,"login scrypt $role");
    }
    check($host->request('/anfitrion/nuevo')[0]===200,'formulario anfitrión');
    $fields=['title'=>"Anuncio temporal $run",'summary'=>'Alojamiento temporal para validar la migración.','description'=>str_repeat('Ficha temporal de verificación. ',4),'district'=>'Centro','type'=>'Apartamento','capacity'=>2,'beds'=>1,'bedrooms'=>1,'bathrooms'=>1,'priceNight'=>95000,'extraCosts'=>'Sin cargos de prueba.','houseRules'=>'Condiciones de prueba local.','uploads[0]'=>new CURLFile(dirname(__DIR__).'/public/images/apartment-1.jpg','image/jpeg','foto.jpg')];
    $host->request('/anfitrion/nuevo',$fields);
    $listing=DB::table('Listing')->where('title',$fields['title'])->first();
    check($listing && $listing->status==='PENDING','alta con fotografía y revisión');
    $key=DB::table('Media')->where('listingId',$listing->id)->value('key');
    $detail='/estadias/'.$listing->slug;
    check($guest->request($detail)[0]===404 && $guest->request('/media/'.$key)[0]===404,'ficha y foto privadas');
    $admin->request('/admin/anuncios');
    $admin->request('/admin/anuncios/'.$listing->id,['status'=>'PUBLISHED','note'=>'Revisión de prueba local.','reviewed'=>'on']);
    check($guest->request($detail)[0]===200 && $guest->request('/media/'.$key)[0]===200,'publicación y fotografía WebP');
    $host->request('/anfitrion');$host->request('/anfitrion/'.$listing->id.'/simular',[]);
    $contact=DB::table('Contact')->where('listingId',$listing->id)->firstOrFail();
    $host->request('/anfitrion/contactos');$host->request('/anfitrion/contactos/'.$contact->id,['status'=>'RESPONDED','note'=>'Prueba temporal']);
    check(DB::table('Contact')->where('id',$contact->id)->value('status')==='RESPONDED','seguimiento de contacto');
    $admin->request('/admin/anfitriones');
    $admin->request('/admin/anfitriones/'.$listing->hostId,['status'=>'ACTIVE','plan'=>'QA','monthlyPrice'=>50000,'effectiveDay'=>now('America/Bogota')->toDateString(),'note'=>'Plan de verificación local.']);
    check(DB::table('MembershipEvent')->where('hostId',$listing->hostId)->value('monthlyPrice')===50000,'registro manual de plan');
    $guest->request($detail);
    $guest->request($detail.'/reportar',['reason'=>'Reporte temporal para verificar la moderación.']);
    $report=DB::table('Report')->where('listingId',$listing->id)->firstOrFail();
    $admin->request('/admin/reportes/'.$report->id,[]);
    check((bool)DB::table('Report')->where('id',$report->id)->value('resolved'),'resolución de reporte');
    foreach(['/admin','/admin/anfitriones','/admin/contactos','/admin/anuncios','/anfitrion/metricas'] as $path) check(($path==='/anfitrion/metricas'?$host:$admin)->request($path)[0]===200,$path);
    foreach(['resumen','embudo','anuncios','contactos','eventos','vistas','diario','anfitriones','planes','cohortes'] as $type) {
        [$status,$csv]=$admin->request('/admin/exportar/'.$type);
        check($status===200 && str_starts_with($csv,"\xEF\xBB\xBFdatos;") && str_contains($csv,"\r\n"),"CSV $type");
    }
    check($host->request('/admin/exportar/resumen')[0]===403,'descarga administrativa protegida');
    $host->request('/anfitrion/'.$listing->id.'/editar');unset($fields['uploads[0]']);$fields['keep[0]']='/media/'.$key;
    $host->request('/anfitrion/'.$listing->id.'/editar',$fields);
    check(DB::table('Listing')->where('id',$listing->id)->value('status')==='PENDING','edición regresa a revisión');
    $realHost=new BrowserSession;
    $realEmail="qa-real-$run@example.invalid";
    $realHost->request('/registro');
    $registration=$realHost->request('/registro',['name'=>'Anfitrión temporal','email'=>$realEmail,
        'password'=>$pw,'perfil'=>'anfitrion','consent'=>'on']);
    $realHostId=DB::table('User')->where('email',$realEmail)->value('id');
    if ($realHostId) $ids[]=$realHostId;
    check($registration[0]===302 && $realHostId,'registro de anfitrión real');
    $realFields=array_replace($fields,['title'=>"Estadía real temporal $run",'whatsapp'=>'573000000000','rnt'=>'123456',
        'uploads[0]'=>new CURLFile(dirname(__DIR__).'/public/images/apartment-1.jpg','image/jpeg','foto.jpg')]);
    unset($realFields['keep[0]']);
    $realHost->request('/anfitrion/nuevo');
    $realHost->request('/anfitrion/nuevo',$realFields);
    $realListing=DB::table('Listing')->where('title',$realFields['title'])->first();
    check($realListing && !$realListing->isDemo && $realListing->status==='PENDING','anuncio real enviado a revisión');
    $search='?q='.rawurlencode($realListing->title);
    $apiSearch='/api/v1/estadias'.$search;
    $webSearch='/estadias'.$search;
    $realDetail='/estadias/'.$realListing->slug;
    check(!str_contains($guest->request($webSearch)[1],'class="listing-card"')
        && json_decode($guest->request($apiSearch)[1],true)['data']===[]
        && $guest->request($realDetail)[0]===404,'anuncio pendiente fuera de web y API');
    $review='/admin/anuncios/'.$realListing->id;
    $queue=$admin->request('/admin/anuncios?datos=reales&estado=pendientes')[1];
    check(str_contains($queue,$realListing->title) && str_contains($queue,'Aprobar y publicar'),'cola de revisión de anuncios reales');
    $decision=['status'=>'PUBLISHED','note'=>'Revisión temporal de anuncio real.','reviewed'=>'on'];
    check($realHost->request($review,$decision)[0]===403,'solo el administrador aprueba anuncios');
    check($admin->request($review,$decision)[0]===302
        && DB::table('Listing')->where('id',$realListing->id)->value('status')==='PUBLISHED','administrador publica un anuncio real');
    $published=json_decode($guest->request($apiSearch)[1],true)['data'];
    check(str_contains($guest->request($webSearch)[1],'class="listing-card"')
        && $published[0]['slug']===$realListing->slug && $published[0]['demo']===false
        && $guest->request($realDetail)[0]===200,'anuncio real publicado en web y API');
    $guest->request($realDetail.'/contactar',$dates);
    check(DB::table('Contact')->where(['listingId'=>$realListing->id,'isSimulated'=>false,'status'=>'INITIATED'])->count()===1,'consulta por WhatsApp registrada sin enviar el mensaje');
} catch (Throwable $error) {
    fwrite(STDERR,"Falló la verificación: ".$error->getMessage().PHP_EOL);
    $failed=true;
} finally {
    foreach (array_filter([$listing,$realListing]) as $listing) {
        $media=DB::table('Media')->where('listingId',$listing->id)->pluck('key');
        $visits=DB::table('PageView')->where('listingId',$listing->id)->pluck('visitId')->merge(DB::table('Contact')->where('listingId',$listing->id)->pluck('visitId'))->filter()->unique();
        DB::table('Listing')->where('id',$listing->id)->delete();
        foreach($visits as $visit) if(!DB::table('PageView')->where('visitId',$visit)->exists() && !DB::table('Contact')->where('visitId',$visit)->exists()) DB::table('VisitSession')->where('id',$visit)->delete();
        foreach($media as $key) if(preg_match('/^[a-f0-9-]{36}\.webp$/D',$key) && is_file(storage_path('media/'.$key))) unlink(storage_path('media/'.$key));
    }
    DB::table('AuditLog')->whereIn('actorId',$ids)->delete();
    DB::table('User')->whereIn('id',$ids)->delete();
}
exit(isset($failed)?1:0);
