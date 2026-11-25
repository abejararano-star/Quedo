<?php
namespace App\Http\Controllers;
use App\Models\Listing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class Portal {
    public static function authorizePanel(Request $r): bool {
        $admin = $r->is('admin','admin/*');
        abort_unless($admin ? $r->user()->role==='ADMIN' : in_array($r->user()->role,['ADMIN','HOST'],true),403);
        return $admin;
    }
    public static function listings(Request $r) {
        $admin = self::authorizePanel($r);
        return Listing::query()->when(!$admin,fn($q)=>$q->where('hostId',$r->user()->id))
            ->when($admin,fn($q)=>$q->where('isDemo',$r->input('datos',$r->user()->isTest?'prueba':'reales')==='prueba'));
    }
    public function index(Request $r) {
        $listings = self::listings($r);
        $items = (clone $listings)->orderByDesc('updatedAt')->paginate(20)->withQueryString();
        $reports = $audit = collect();
        if ($r->is('admin/*')) {
            $ids = $listings->select('id');
            $reports = DB::table('Report')->whereIn('listingId',$ids)->latest('createdAt')->limit(20)->get();
            $audit = DB::table('AuditLog')->whereIn('entityId',$ids)->latest('createdAt')->limit(20)->get();
        }
        return view('panel',compact('items','reports','audit'));
    }
    private function editPermission(Request $r, Listing $listing) {
        self::authorizePanel($r);
        abort_unless(($r->user()->role==='ADMIN' || $listing->hostId === $r->user()->id) && (!$listing->isDemo || $r->user()->isTest),403);
    }
    public function form(Request $r, ?Listing $listing=null) {
        self::authorizePanel($r);
        if ($listing) $this->editPermission($r,$listing);
        return view('edit',['listing'=>$listing ?? new Listing]);
    }
    private static function audit(Request $r,string $id,string $action,?string $note=null) {
        DB::table('AuditLog')->insert(['id'=>(string)Str::ulid(),'actorId'=>$r->user()->id,'entityId'=>$id,'action'=>$action,'note'=>$note]);
    }
    public function save(Request $r, ?Listing $listing=null) {
        self::authorizePanel($r);
        if ($listing) $this->editPermission($r,$listing);
        $new = !$listing;
        $listing ??= new Listing;
        $demo = $new ? $r->user()->isTest : $listing->isDemo;
        $data = $r->validate([
            'title'=>'required|string|min:8|max:100','summary'=>'required|string|min:20|max:250','description'=>'required|string|min:60|max:6000',
            'district'=>'required|in:Centro,La Yesquita,César Conto,Medrano,Aeropuerto','type'=>'required|in:Apartamento,Apartaestudio,Habitación,Casa',
            'capacity'=>'required|integer|between:1,30','beds'=>'required|integer|between:1,30','bedrooms'=>'required|integer|between:0,20','bathrooms'=>'required|integer|between:1,20',
            'priceNight'=>'required|integer|between:10000,20000000','priceWeek'=>'nullable|integer|between:10000,140000000',
            'extraCosts'=>'required|string|max:500','houseRules'=>'required|string|min:10|max:3000','amenities'=>'array|max:8',
            'amenities.*'=>'in:WiFi,Cocina,Aire acondicionado,Zona de trabajo,Lavadora,Agua de reserva,Respaldo de energía,Admite mascotas',
            'whatsapp'=>$demo?'nullable':'required|regex:/^57[0-9]{10}$/D','rnt'=>$demo?'nullable':'required|digits_between:3,20',
            'uploads'=>'array|max:6','uploads.*'=>'required|image|mimes:jpeg,jpg,png,webp|max:5120|dimensions:max_width=6000,max_height=6000',
            'keep'=>'array|max:12','keep.*'=>'string|max:255','cover'=>'nullable|string|max:255'
        ]);
        $existing = $listing->photos ?? [];
        $keep = array_values(array_intersect($existing,$data['keep'] ?? []));
        $uploads = $r->file('uploads',[]);
        if (count($keep)+count($uploads)<1 || count($keep)+count($uploads)>12) return back()->withInput()->withErrors(['uploads'=>'Conserva o sube entre una y doce fotos.']);
        $cover = $data['cover'] ?? null;
        if ($cover && in_array($cover,$keep,true)) $keep=array_values(array_unique(array_merge([$cover],$keep)));
        $added = [];
        try {
            foreach ($uploads as $upload) {
                $image = imagecreatefromstring(file_get_contents($upload->getRealPath()));
                if (!$image) throw new \RuntimeException('Fotografía inválida.');
                $key = (string)Str::uuid().'.webp';
                if (!is_dir(storage_path('media'))) mkdir(storage_path('media'),0770,true);
                $added[]=$key;
                if (!imagewebp($image,storage_path('media/'.$key),82)) throw new \RuntimeException('Error guardando foto.');
                unset($image);
            }
            DB::transaction(function() use ($r,$new,$listing,$data,$demo,$keep,$existing,$added) {
                if ($new) {
                    $listing->id=(string)Str::ulid();
                    $listing->slug=Str::slug($data['title']).'-'.Str::lower(Str::random(8));
                    $listing->hostId=$r->user()->id;
                    $listing->city='Quibdó';
                }
                foreach (['title','summary','description','district','type','capacity','beds','bedrooms','bathrooms','priceNight','priceWeek','extraCosts','houseRules'] as $field) $listing->$field=$data[$field] ?? null;
                $listing->amenities=$data['amenities'] ?? [];
                $listing->whatsapp=$demo?null:$data['whatsapp'];
                $listing->rnt=$demo?null:$data['rnt'];
                $listing->isDemo=(bool)$demo;
                $listing->photos=array_merge($keep,array_map(fn($key)=>'/media/'.$key,$added));
                $listing->status='PENDING'; $listing->reviewedAt=null; $listing->reviewNote=null;
                $listing->save();
                DB::table('Media')->where('listingId',$listing->id)->whereIn('key',array_map('basename',array_diff($existing,$keep)))->delete();
                foreach($added as $key) DB::table('Media')->insert(['id'=>(string)Str::ulid(),'key'=>$key,'mime'=>'image/webp','listingId'=>$listing->id]);
                self::audit($r,$listing->id,'LISTING_SUBMITTED');
            });
        } catch (\Throwable $e) {
            foreach($added as $key) if(is_file(storage_path('media/'.$key))) unlink(storage_path('media/'.$key));
            throw $e;
        }
        foreach(array_diff($existing,$keep) as $old) if(preg_match('~^/media/([a-f0-9-]{36}\.webp)$~D',$old,$m) && is_file(storage_path('media/'.$m[1]))) unlink(storage_path('media/'.$m[1]));
        return redirect($r->user()->panel())->with('notice','Anuncio enviado a revisión.');
    }
    public function pause(Request $r, Listing $listing) {
        $this->editPermission($r,$listing);
        DB::transaction(function() use ($r,$listing) {
            $listing->status='PAUSED'; $listing->save(); self::audit($r,$listing->id,'LISTING_PAUSED');
        });
        return back();
    }
    public function moderate(Request $r, Listing $listing) {
        self::authorizePanel($r);
        $d=$r->validate(['status'=>'required|in:PUBLISHED,REJECTED,PAUSED','note'=>'required|string|min:10|max:500','reviewed'=>'accepted']);
        DB::transaction(function() use ($r,$listing,$d) {
            $listing->status=$d['status']; $listing->reviewedAt=now(); $listing->reviewNote=$d['note']; $listing->save();
            self::audit($r,$listing->id,'MODERATION_'.$d['status'],$d['note']);
        });
        return back()->with('notice','Decisión guardada.');
    }
    public function contacts(Request $r) {
        $items=DB::table('Contact as c')->join('Listing as l','l.id','=','c.listingId')->whereIn('l.id',self::listings($r)->select('id'))
            ->select('c.*','l.title')->orderByDesc('c.createdAt')->paginate(20)->withQueryString();
        return view('contacts',compact('items'));
    }
    public function follow(Request $r,string $id) {
        $d=$r->validate(['status'=>'required|in:INITIATED,RESPONDED,CONFIRMED,LOST','note'=>'nullable|string|max:500','lossReason'=>'required_if:status,LOST|nullable|in:Precio,Sin disponibilidad,No respondió,No se ajusta a lo buscado,Otro']);
        $query=DB::table('Contact')->where('id',$id)->whereIn('listingId',self::listings($r)->select('id'));
        DB::transaction(function() use ($query,$r,$id,$d) {
            abort_unless($query->lockForUpdate()->first(),404);
            $query->update(['status'=>$d['status'],'updatedAt'=>now()]);
            DB::table('ContactEvent')->insert(['id'=>(string)Str::ulid(),'contactId'=>$id,'actorId'=>$r->user()->id,'status'=>$d['status'],'note'=>$d['note']??null,'lossReason'=>$d['status']==='LOST'?$d['lossReason']:null]);
            self::audit($r,$id,'CONTACT_'.$d['status']);
        });
        return back();
    }
    public function simulate(Request $r,Listing $listing) {
        $this->editPermission($r,$listing);
        abort_unless($r->user()->isTest && $listing->isDemo && $listing->status==='PUBLISHED',403);
        DB::transaction(function() use ($listing,$r) {
            $visit=(string)Str::ulid(); $contact=(string)Str::ulid();
            DB::table('VisitSession')->insert(['id'=>$visit,'source'=>'simulador local','tokenHash'=>hash('sha256',random_bytes(32)),'expiresAt'=>now()->addMinutes(30)]);
            DB::table('PageView')->insert(['id'=>(string)Str::ulid(),'listingId'=>$listing->id,'visitId'=>$visit,'isSimulated'=>true]);
            DB::table('Contact')->insert(['id'=>$contact,'listingId'=>$listing->id,'visitId'=>$visit,'updatedAt'=>now(),'isSimulated'=>true]);
            DB::table('ContactEvent')->insert(['id'=>(string)Str::ulid(),'contactId'=>$contact,'actorId'=>$r->user()->id,'status'=>'INITIATED']);
        });
        return redirect('/anfitrion/contactos');
    }
    public function hosts(Request $r) {
        self::authorizePanel($r);
        $items=DB::table('User')->where('role','HOST')->where('isTest',$r->input('datos',$r->user()->isTest?'prueba':'reales')==='prueba')->select('id','name','email')->paginate(20)->withQueryString();
        $history=DB::table('MembershipEvent')->whereIn('hostId',$items->pluck('id'))->orderByDesc('effectiveAt')->orderByDesc('createdAt')->orderByDesc('id')->get()->groupBy('hostId');
        return view('hosts',compact('items','history'));
    }
    public function membership(Request $r,string $id) {
        self::authorizePanel($r);
        abort_unless(DB::table('User')->where(['id'=>$id,'role'=>'HOST'])->exists(),404);
        $d=$r->validate(['status'=>'required|in:ACTIVE,CANCELED,PAST_DUE,TRIAL','plan'=>'required|string|max:80','monthlyPrice'=>'required|integer|min:0|max:10000000','note'=>'required|string|min:10|max:500','effectiveDay'=>'required|date_format:Y-m-d|before_or_equal:'.now('America/Bogota')->toDateString()]);
        if($d['status']==='ACTIVE' && !$d['monthlyPrice']) return back()->withErrors(['monthlyPrice'=>'Indica la tarifa del plan activo.']);
        DB::transaction(function() use ($id,$r,$d) {
            $day=$d['effectiveDay']; unset($d['effectiveDay']);
            DB::table('MembershipEvent')->insert($d+['id'=>(string)Str::ulid(),'hostId'=>$id,'actorId'=>$r->user()->id,'effectiveAt'=>$day.' 05:00:00']);
            self::audit($r,$id,'MEMBERSHIP_'.$d['status'],$d['note']);
        });
        return back();
    }
    public function resolve(Request $r,string $id) {
        self::authorizePanel($r);
        DB::transaction(function() use ($r,$id) {
            abort_unless(DB::table('Report')->where('id',$id)->exists(),404);
            DB::table('Report')->where('id',$id)->update(['resolved'=>true]); self::audit($r,$id,'REPORT_RESOLVED');
        });
        return back();
    }
}
