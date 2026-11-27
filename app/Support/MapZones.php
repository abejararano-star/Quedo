<?php

namespace App\Support;

use App\Models\Listing;

class MapZones
{
    public static function published(): array
    {
        $zones = config('quedo.map_zones');
        $counts = Listing::query()->where('status', 'PUBLISHED')->where('city', 'Quibdó')
            ->whereIn('district', array_keys($zones))->groupBy('district')
            ->selectRaw('district, COUNT(*) AS total')->pluck('total', 'district');

        $items = [];
        foreach ($zones as $district => [$latitude, $longitude]) {
            $items[] = [
                'district' => $district,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'count' => (int) $counts->get($district, 0),
            ];
        }

        return $items;
    }
}
