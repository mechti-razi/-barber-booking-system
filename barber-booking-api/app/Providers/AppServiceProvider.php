<?php

namespace App\Providers;

use App\Mail\GoogleScriptTransport;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // On Windows/XAMPP, OpenSSL needs a config path for EC key operations.
        // On Linux (production/Docker) sodium is compiled in so this is a no-op.
        if (PHP_OS_FAMILY === 'Windows' && env('OPENSSL_CONF') && !getenv('OPENSSL_CONF')) {
            putenv('OPENSSL_CONF=' . env('OPENSSL_CONF'));
        }

        // Register the custom Google Apps Script mail transport.
        Mail::extend('google_script', function (array $config) {
            return new GoogleScriptTransport(
                $config['url'] ?? '',
                $config['key'] ?? ''
            );
        });
    }
}
