<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Listing extends Model {
    protected $table = 'Listing';
    public $incrementing = false;
    protected $keyType = 'string';
    const CREATED_AT = 'createdAt', UPDATED_AT = 'updatedAt';
    protected $casts = ['photos'=>'array','amenities'=>'array','isDemo'=>'boolean'];
    public function visibleTo(?User $user): bool {
        return $this->status === 'PUBLISHED' || ($user && ($user->role === 'ADMIN' || $user->id === $this->hostId));
    }
}
