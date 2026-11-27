<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Support\MapZones;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MobileCatalog
{
    private const TYPES = ['Apartaestudio', 'Apartamento', 'Habitación', 'Casa'];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => 'nullable|string|max:100',
            'tipo' => 'nullable|in:'.implode(',', self::TYPES),
            'barrio' => ['nullable', Rule::in(array_keys(config('quedo.map_zones')))],
            'pagina' => 'nullable|integer|between:1,1000',
        ]);
        $query = Listing::query()->where('status', 'PUBLISHED');
        if (!empty($filters['q'])) {
            $term = '%'.addcslashes($filters['q'], '\\%_').'%';
            $query->where(function (Builder $search) use ($term) {
                $search->where('title', 'like', $term)->orWhere('district', 'like', $term)
                    ->orWhere('city', 'like', $term)->orWhere('summary', 'like', $term);
            });
        }
        if (!empty($filters['tipo'])) $query->where('type', $filters['tipo']);
        if (!empty($filters['barrio'])) {
            $query->where('city', 'Quibdó')->where('district', $filters['barrio']);
        }
        $items = $query->orderByDesc('featured')->orderByDesc('createdAt')->orderBy('id')
            ->simplePaginate(12, ['*'], 'pagina');

        return response()->json([
            'data' => $items->getCollection()->map(fn (Listing $listing) => $this->summary($listing)),
            'next_page' => $items->hasMorePages() && $items->currentPage() < 1000 ? $items->currentPage()+1 : null,
        ]);
    }

    public function zones(): JsonResponse
    {
        return response()->json(['data' => MapZones::published()]);
    }

    public function show(string $slug): JsonResponse
    {
        $listing = Listing::where('status', 'PUBLISHED')->where('slug', $slug)->firstOrFail();
        return response()->json(['data' => $this->summary($listing) + [
            'description' => $listing->description,
            'amenities' => $listing->amenities ?? [],
            'rules' => $listing->houseRules,
            'additional_costs' => $listing->extraCosts,
            'weekly_price' => $listing->priceWeek === null ? null : (int) $listing->priceWeek,
            'contact_available' => !$listing->isDemo && (bool) preg_match('/^57\d{10}$/D', $listing->whatsapp ?? ''),
        ]]);
    }

    private function summary(Listing $listing): array
    {
        $photos = array_values(array_filter($listing->photos ?? [], fn ($photo) =>
            is_string($photo) && preg_match('~^/(?:images/[a-zA-Z0-9._-]+|media/[a-f0-9-]{36}\.webp)$~D', $photo)
                && !in_array($photo, ['/images/.', '/images/..'], true)
        ));
        return [
            'slug' => $listing->slug,
            'title' => $listing->title,
            'summary' => $listing->summary,
            'district' => $listing->district,
            'city' => $listing->city,
            'type' => $listing->type,
            'nightly_price' => (int) $listing->priceNight,
            'capacity' => (int) $listing->capacity,
            'bedrooms' => (int) $listing->bedrooms,
            'beds' => (int) $listing->beds,
            'bathrooms' => (int) $listing->bathrooms,
            'demo' => $listing->isDemo,
            'photos' => $photos,
        ];
    }
}
