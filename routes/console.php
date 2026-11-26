<?php

use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

Artisan::command('quedo:crear-admin {email} {--nombre=Administrador}', function () {
    $email = strtolower(trim($this->argument('email')));
    $name = trim($this->option('nombre'));
    $password = $this->secret('Contraseña para Quedo', false);
    $confirmation = $this->secret('Confirma la contraseña', false);
    $validation = validator(
        ['email' => $email, 'nombre' => $name, 'password' => $password],
        ['email' => 'required|email|max:190', 'nombre' => 'required|string|min:2|max:100',
            'password' => 'required|string|min:12|max:128'],
    );

    if ($validation->fails() || $password !== $confirmation) {
        $this->error('Usa un correo válido, un nombre de 2 a 100 caracteres y una contraseña coincidente de 12 a 128 caracteres.');
        return 1;
    }

    $admin = new User;
    $admin->id = (string) Str::ulid();
    $admin->name = $name;
    $admin->email = $email;
    $admin->passwordHash = password_hash($password, PASSWORD_ARGON2ID);
    $admin->role = 'ADMIN';
    $admin->isTest = false;
    try {
        $admin->save();
    } catch (UniqueConstraintViolationException) {
        $this->error('Ya existe una cuenta con ese correo.');
        return 1;
    }

    $this->info('Cuenta de administración creada. Puedes ingresar desde /acceso.');
    return 0;
})->purpose('Crea una cuenta de administración mediante la consola');
