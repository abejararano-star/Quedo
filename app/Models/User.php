<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable {
    protected $table = 'User';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;
    protected $hidden = ['passwordHash', 'googleSubject'];
    public function getAuthPasswordName() { return 'passwordHash'; }
    public function panel(): string {
        return match($this->role) { 'ADMIN'=>'/admin', 'HOST'=>'/anfitrion', default=>'/huesped' };
    }
}
