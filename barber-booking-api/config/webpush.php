<?php

return [
    /*
    |--------------------------------------------------------------------------
    | VAPID Keys
    |--------------------------------------------------------------------------
    | Generate these once with: php artisan webpush:vapid
    | Then add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to your .env
    */
    'vapid' => [
        'subject'     => env('VAPID_SUBJECT', 'mailto:admin@barbershop.com'),
        'public_key'  => env('VAPID_PUBLIC_KEY', ''),
        'private_key' => env('VAPID_PRIVATE_KEY', ''),
    ],
];
