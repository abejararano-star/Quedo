<?php

return [
    'driver' => env('SESSION_DRIVER', 'file'),
    'cookie' => env('SESSION_COOKIE', 'quedo_laravel'),
    'lifetime' => (int) env('SESSION_LIFETIME', 480),
    'secure' => env('SESSION_SECURE_COOKIE'),
];
