<?php
namespace App\Http\Controllers;
use App\Models\Listing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Catalog {
    public function index(Request $r) {
        $validator = validator($r->query(), ['q'=>'nullable|string|max:100','personas'=>'nullable|integer|between:1,30','precio'=>'nullable|integer|min:0','tipo'=>'nullable|string|max:40','servicio'=>'nullable','orden'=>'nullable|in:precio-asc,precio-desc','llegada'=>'nullable|required_with:salida|date_format:Y-m-d|after_or_equal:'.now('America/Bogota')->toDateString(),'salida'=>'nullable|required_with:llegada|date_format:Y-m-d|after:llegada']);
        if ($validator->fails()) return redirect('/estadias')->withErrors(['consulta'=>'Revisa el intervalo, los huéspedes y los filtros.']);
        $filters = $validator->validated();
        $list = Listing::where('status','PUBLISHED');
        if ($q = $filters['q'] ?? '') $list->where(function($sub) use ($q) {
            foreach (['title','district','city','summary'] as $column) $sub->orWhere($column,'like',"%$q%");
        });
        if ($n = $filters['personas'] ?? null) $list->where('capacity','>=',$n);
        if ($price = $filters['precio'] ?? null) $list->where('priceNight','<=',$price);
        if ($type = $filters['tipo'] ?? '') $list->where('type',$type);
        foreach (array_slice((array)($filters['servicio'] ?? []),0,8) as $s) if (is_string($s) && $s !== '') $list->whereJsonContains('amenities',$s);
        if ($sort = $filters['orden'] ?? '') $list->orderBy('priceNight',$sort === 'precio-asc' ? 'asc':'desc');
        $items = $list->orderByDesc('featured')->orderByDesc('createdAt')->orderBy('id')->paginate($r->is('/') ? 4 : 12)->withQueryString();
        return view('catalog',compact('items'));
    }
    private function visit(Request $r) {
        $id = $r->session()->get('visit_id');
        if ($id && DB::table('VisitSession')->where('id',$id)->where('expiresAt','>',now())->exists()) return $id;
        $id = (string)Str::ulid();
        $source = mb_substr(preg_replace('/[^\p{L}\p{N}_. -]/u','',(string)$r->string('utm_source')),0,100) ?: 'directo';
        DB::table('VisitSession')->insert(['id'=>$id,'tokenHash'=>hash('sha256',random_bytes(32)),'source'=>$source,'expiresAt'=>now()->addMinutes(30)]);
        $r->session()->put('visit_id',$id);
        return $id;
    }
    private function quote(Request $r, Listing $listing) {
        $today = now('America/Bogota')->toDateString();
        $v = validator($r->only('llegada','salida','personas'),[
            'llegada'=>"nullable|required_with:salida|date_format:Y-m-d|after_or_equal:$today",
            'salida'=>'nullable|required_with:llegada|date_format:Y-m-d|after:llegada',
            'personas'=>'nullable|integer|min:1|max:'.$listing->capacity,
        ]);
        if ($v->fails()) return [null,null,'Revisa las fechas de entrada y salida y la capacidad del alojamiento.'];
        if (!$r->filled('llegada')) return [null,null,null];
        $nights = (new \DateTimeImmutable($r->llegada))->diff(new \DateTimeImmutable($r->salida))->days;
        return [$nights,$listing->priceNight > 0 ? $nights*$listing->priceNight : null,null];
    }
    public function show(Request $r, Listing $listing) {
        abort_unless($listing->visibleTo($r->user()),404);
        if ($listing->status === 'PUBLISHED') DB::table('PageView')->insertOrIgnore(['id'=>(string)Str::ulid(),'listingId'=>$listing->id,'visitId'=>$this->visit($r),'isSimulated'=>$listing->isDemo]);
        [$nights,$subtotal,$warning] = $this->quote($r,$listing);
        return view('detail',compact('listing','nights','subtotal','warning'));
    }
    public function contact(Request $r, Listing $listing) {
        abort_unless($listing->status === 'PUBLISHED' && !$listing->isDemo && preg_match('/^57\d{10}$/D',$listing->whatsapp ?? ''),404);
        [$nights,$subtotal,$warning] = $this->quote($r,$listing);
        if ($warning) return back()->withErrors(['fechas'=>$warning]);
        $id = (string)Str::ulid();
        $visit = $this->visit($r);
        DB::transaction(function() use ($listing,$id,$visit) {
            DB::table('Contact')->insert(['id'=>$id,'listingId'=>$listing->id,'visitId'=>$visit,'updatedAt'=>now()]);
            DB::table('ContactEvent')->insert(['id'=>(string)Str::ulid(),'contactId'=>$id,'status'=>'INITIATED']);
        });
        $text = "Hola, vi «{$listing->title}» en Quedo. Quisiera confirmar disponibilidad, cargos y condiciones.";
        if ($nights) $text .= " Entrada: {$r->llegada}. Salida: {$r->salida}. Subtotal del alojamiento: $subtotal COP.";
        $text .= ' Huéspedes: '.($r->personas ?: 1).". Referencia: $id.";
        return redirect()->away('https://wa.me/'.$listing->whatsapp.'?text='.rawurlencode($text));
    }
    public function favorite(Request $r, Listing $listing) {
        abort_unless($listing->status === 'PUBLISHED',404);
        $save = $r->validate(['guardar'=>'required|boolean'])['guardar'];
        if ($user = $r->user()) {
            $key = ['userId'=>$user->id,'listingId'=>$listing->id];
            if ($save) DB::table('Favorite')->insertOrIgnore($key);
            else DB::table('Favorite')->where($key)->delete();
        } else {
            $ids = collect($r->session()->get('favorites',[]))->reject(fn($id)=>$id === $listing->id);
            if ($save) $ids->push($listing->id);
            $r->session()->put('favorites',$ids->slice(-200)->values()->all());
        }
        return back();
    }
    public function saved(Request $r) {
        $items = Listing::where('status','PUBLISHED')->whereIn('id',self::favorites($r))->paginate(12);
        return view('catalog',compact('items'));
    }
    public static function favorites(Request $r): array {
        return $r->user() ? DB::table('Favorite')->where('userId',$r->user()->id)->pluck('listingId')->all() : $r->session()->get('favorites',[]);
    }
    public function report(Request $r, Listing $listing) {
        abort_unless($listing->status === 'PUBLISHED',404);
        $data = $r->validate(['reason'=>'required|string|min:15|max:500']);
        DB::table('Report')->insert(['id'=>(string)Str::ulid(),'listingId'=>$listing->id,'reason'=>$data['reason']]);
        return back()->with('notice','Recibimos tu reporte.');
    }
    public function media(Request $r, string $key) {
        abort_unless(preg_match('/^[a-f0-9-]{36}\.webp$/D',$key),404);
        $id = DB::table('Media')->where('key',$key)->value('listingId');
        abort_unless($id && Listing::findOrFail($id)->visibleTo($r->user()),404);
        $file = storage_path('media/'.$key);
        abort_unless(is_file($file),404);
        return response()->file($file,['Content-Type'=>'image/webp','Cache-Control'=>'private, no-store']);
    }
}
