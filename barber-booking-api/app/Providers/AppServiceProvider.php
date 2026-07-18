<?php

namespace App\Providers;

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoTransportFactory;
use Symfony\Component\Mailer\Transport\Dsn;

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

        // Register Brevo HTTP API mailer transport (uses HTTPS, not SMTP — works on Railway)
        Mail::extend('brevo', function (array $config) {
            $factory = new BrevoTransportFactory();
            return $factory->create(new Dsn(
                'brevo+api',
                'default',
                $config['key'] ?? env('BREVO_API_KEY'),
            ));
        });

        // Register Google Script HTTP API mailer transport
        Mail::extend('google_script', function (array $config) {
            return new \App\Mail\GoogleScriptTransport(
                $config['url'] ?? env('GOOGLE_SCRIPT_URL'),
                $config['key'] ?? env('GOOGLE_SCRIPT_KEY'),
            );
        });
    }
}
