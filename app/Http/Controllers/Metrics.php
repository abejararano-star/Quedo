<?php
namespace App\Http\Controllers;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class Metrics {
    private const ADMIN = ['resumen','embudo','anuncios','contactos','eventos','vistas','diario','anfitriones','planes','cohortes'];
    private const HOST = ['resumen','anuncios','contactos','eventos','diario'];
    private function report(Request $r): array {
        $admin=Portal::authorizePanel($r);
        $today=CarbonImmutable::now('America/Bogota')->startOfDay();
        $from=$r->input('desde',$today->subDays(29)->toDateString());
        $to=$r->input('hasta',$today->toDateString());
        $validator=validator(['desde'=>$from,'hasta'=>$to],['desde'=>'required|date_format:Y-m-d','hasta'=>'required|date_format:Y-m-d|after_or_equal:desde|before_or_equal:'.$today->toDateString()]);
        abort_if($validator->fails(),400,'Período inválido.');
        $start=CarbonImmutable::parse($from,'America/Bogota')->utc();
        $end=CarbonImmutable::parse($to,'America/Bogota')->addDay()->utc();
        abort_if($start->diffInDays($end)>366,400,'Máximo 366 días.');
        $cutoff=$end->min(CarbonImmutable::now('UTC'))->format('Y-m-d H:i:s.u');
        $start=$start->format('Y-m-d H:i:s');
        $demo=$admin ? $r->input('datos',$r->user()->isTest?'prueba':'reales')==='prueba' : (bool)$r->user()->isTest;
        $hosts=DB::table('User')->where(['role'=>'HOST','isTest'=>$demo])->when(!$admin,fn($q)=>$q->where('id',$r->user()->id))->where('createdAt','<',$cutoff)->select('id','name','email','createdAt')->get();
        $listings=Portal::listings($r)->where('isDemo',$demo)
            ->when(!$demo,fn($q)=>$q->whereIn('hostId',DB::table('User')->select('id')->where('isTest',false)))
            ->get(['id','hostId','title','status','district','type','priceNight','updatedAt']);
        $listingById=$listings->keyBy('id');
        $scope=fn($table)=>DB::table($table)->whereIn('listingId',$listings->pluck('id'))->where('isSimulated',$demo)->where('createdAt','>=',$start)->where('createdAt','<',$cutoff);
        $views=$scope('PageView')->select('id','listingId','visitId','createdAt')->orderBy('createdAt')->get();
        $contacts=$scope('Contact')->select('id','listingId','visitId','createdAt')->orderBy('createdAt')->get();
        $events=DB::table('ContactEvent')->whereIn('contactId',$contacts->pluck('id'))->where('createdAt','<',$cutoff)->orderBy('createdAt')->orderBy('id')->select('id','contactId','actorId','status','createdAt','lossReason','note')->get();
        $contactListings=$contacts->pluck('listingId','id');
        foreach($events as $event) $event->listingId=$contactListings[$event->contactId];
        $byContact=$events->groupBy('contactId');
        $viewed=array_fill_keys($views->pluck('visitId')->filter()->unique()->all(),true);
        $clicked=$responded=$confirmed=$lostReasons=[];
        foreach($contacts as $contact) {
            $history=$byContact->get($contact->id,collect());
            $last=$history->last();
            $contact->status=$last->status ?? 'INITIATED';
            $contact->lossReason=$last->lossReason ?? '';
            $contact->note=$last->note ?? '';
            $contact->title=$listingById[$contact->listingId]->title;
            $contact->hostId=$listingById[$contact->listingId]->hostId;
            if($contact->status==='LOST') {
                $reason=$last->lossReason ?: 'Sin especificar';
                $lostReasons[$reason]=($lostReasons[$reason]??0)+1;
            }
            if(!isset($viewed[$contact->visitId])) continue;
            $clicked[$contact->visitId]=true;
            if($history->whereIn('status',['RESPONDED','CONFIRMED'])->isNotEmpty()) $responded[$contact->visitId]=true;
            if($contact->status==='CONFIRMED') $confirmed[$contact->visitId]=true;
        }
        $sources=DB::table('VisitSession')->whereIn('id',$views->pluck('visitId')->merge($contacts->pluck('visitId'))->filter()->unique())->pluck('source','id');
        foreach([$views,$contacts] as $rows) foreach($rows as $row) $row->source=$sources->get($row->visitId,'Sin atribución');
        $plans=DB::table('MembershipEvent')->whereIn('hostId',$hosts->pluck('id'))->where('effectiveAt','<',$cutoff)->orderBy('effectiveAt')->orderBy('createdAt')->orderBy('id')->select('id','actorId','hostId','status','plan','monthlyPrice','effectiveAt','createdAt','note')->get();
        $current=$before=$canceled=$firstTrial=$firstActive=[];
        foreach($plans as $plan) {
            $id=$plan->hostId; $current[$id]=$plan;
            if($plan->status==='ACTIVE') $firstActive[$id]??=$plan->effectiveAt;
            if($plan->status==='TRIAL') $firstTrial[$id]??=$plan->effectiveAt;
            if($plan->effectiveAt<$start) $before[$id]=$plan;
            elseif($plan->status==='CANCELED' && ($before[$id]->status??null)==='ACTIVE') $canceled[$id]=true;
        }
        $percent=fn($n,$base)=>$base?round(100*$n/$base,2):null;
        $baseline=count(array_filter($before,fn($p)=>$p->status==='ACTIVE'));
        $active=array_filter($current,fn($p)=>$p->status==='ACTIVE');
        $trials=array_filter($firstTrial,fn($d)=>$d>=$start);
        $converted=0;
        foreach($trials as $id=>$date) if(isset($firstActive[$id]) && $firstActive[$id]>=$date) $converted++;
        $summary=['Sesiones con ficha vista'=>count($viewed),'Consultas iniciadas'=>$contacts->count(),'Conversión ficha a contacto (%)'=>$percent(count($clicked),count($viewed)),
            'Sesiones con estadía reportada'=>count($confirmed),'Anfitriones activos al inicio'=>$baseline,'Cancelaciones de la base inicial'=>count($canceled),
            'Churn de anfitriones (%)'=>$percent(count($canceled),$baseline),'MRR registrado (COP)'=>array_sum(array_map(fn($p)=>$p->monthlyPrice,$active)),
            'Activación de pruebas (%)'=>$percent($converted,count($trials)), 'Vistas de fichas'=>$views->count(),
            'Conversión ficha a estadía reportada (%)'=>$percent(count($confirmed),count($viewed)),'Anfitriones activos al corte'=>count($active)];
        $datasets=['resumen'=>[],'embudo'=>[],'anuncios'=>[],'diario'=>[],'contactos'=>$contacts->map(fn($x)=>(array)$x)->all(),'eventos'=>$events->map(fn($x)=>(array)$x)->all(),
            'vistas'=>$views->map(fn($x)=>(array)$x)->all(),'planes'=>$plans->map(fn($x)=>(array)$x)->all(),'anfitriones'=>[],'cohortes'=>[]];
        foreach($summary as $indicator=>$value) $datasets['resumen'][]=['indicador'=>$indicator,'valor'=>$value];
        $previous=null;
        foreach(['Ficha vista'=>count($viewed),'Contacto iniciado'=>count($clicked),'Respuesta registrada'=>count($responded),'Estadía reportada'=>count($confirmed)] as $stage=>$n) {
            $datasets['embudo'][]=['etapa'=>$stage,'sesiones'=>$n,'porcentaje_de_vistas'=>$percent($n,count($viewed)),'paso'=>$percent($n,$previous)];
            $previous=$n;
        }
        $listingViews=$views->groupBy('listingId'); $listingContacts=$contacts->groupBy('listingId');
        foreach($listings as $l) {
            $seen=$listingViews->get($l->id,collect()); $leads=$listingContacts->get($l->id,collect());
            $sessions=$seen->pluck('visitId')->filter()->unique();
            $linked=$leads->pluck('visitId')->filter()->unique()->intersect($sessions)->count();
            $datasets['anuncios'][]=$l->getAttributes()+['vistas'=>$seen->count(),'contactos'=>$leads->count(),'sesiones'=>$sessions->count(),
                'vinculadas'=>$linked,'conversion'=>$percent($linked,$sessions->count()),'confirmadas'=>$leads->where('status','CONFIRMED')->count()];
        }
        $dateKey=fn($x)=>CarbonImmutable::parse($x->createdAt,'UTC')->setTimezone('America/Bogota')->toDateString();
        $dailyViews=$views->groupBy($dateKey); $dailyContacts=$contacts->countBy($dateKey);
        for($day=CarbonImmutable::parse($from);$day->toDateString()<=$to;$day=$day->addDay()) {
            $key=$day->toDateString(); $seen=$dailyViews->get($key,collect());
            $datasets['diario'][]=['fecha'=>$key,'vistas'=>$seen->count(),'sesiones'=>$seen->pluck('visitId')->filter()->unique()->count(),'contactos'=>$dailyContacts->get($key,0)];
        }
        foreach($hosts as $h) $datasets['anfitriones'][]=(array)$h+['estado'=>$current[$h->id]->status??'SIN PLAN','plan'=>$current[$h->id]->plan??null,'tarifa'=>$current[$h->id]->monthlyPrice??null];
        $cohorts=[];
        foreach($firstActive as $id=>$date) $cohorts[CarbonImmutable::parse($date,'UTC')->setTimezone('America/Bogota')->format('Y-m')][]=$id;
        ksort($cohorts);
        foreach(array_slice($cohorts,-6,null,true) as $month=>$ids) {
            $row=['mes'=>$month,'anfitriones'=>count($ids)];
            for($i=0;$i<6;$i++) {
                $begin=CarbonImmutable::parse($month.'-01','America/Bogota')->addMonths($i)->utc();
                $limit=min($cutoff,$begin->addMonth()->format('Y-m-d H:i:s'));
                $states=[];
                foreach($plans as $p) if($p->effectiveAt<$limit && in_array($p->hostId,$ids,true)) $states[$p->hostId]=$p->status;
                $row['M'.$i]=$begin->format('Y-m-d H:i:s')>=$cutoff?null:$percent(count(array_filter($states,fn($s)=>$s==='ACTIVE')),count($ids));
            }
            $datasets['cohortes'][]=$row;
        }
        $channels=$views->countBy('source');
        $channelContacts=$contacts->countBy('source');
        return compact('datasets','summary','channels','channelContacts','lostReasons','from','to','cutoff','demo','admin');
    }
    public function dashboard(Request $r) { return view('metrics',$this->report($r)); }
    public function export(Request $r,string $dataset): StreamedResponse {
        $admin=Portal::authorizePanel($r);
        abort_unless(in_array($dataset,$admin?self::ADMIN:self::HOST,true),404);
        return \App\Reports\Csv::download($dataset,$this->report($r));
    }
}
