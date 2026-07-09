<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;

class GenerateVapidKeys extends Command
{
    protected $signature   = 'webpush:vapid';
    protected $description = 'Generate VAPID keys for Web Push Notifications and write them to .env';

    public function handle(): int
    {
        $keys = VAPID::createVapidKeys();

        $this->info('VAPID keys generated successfully!');
        $this->line('');
        $this->line('<comment>Public Key:</comment>  ' . $keys['publicKey']);
        $this->line('<comment>Private Key:</comment> ' . $keys['privateKey']);
        $this->line('');

        // Write to .env automatically
        $envPath = base_path('.env');
        if (file_exists($envPath)) {
            $envContent = file_get_contents($envPath);

            foreach ([
                'VAPID_PUBLIC_KEY'  => $keys['publicKey'],
                'VAPID_PRIVATE_KEY' => $keys['privateKey'],
            ] as $key => $value) {
                if (str_contains($envContent, "{$key}=")) {
                    // Replace existing entry
                    $envContent = preg_replace(
                        "/^{$key}=.*$/m",
                        "{$key}={$value}",
                        $envContent
                    );
                } else {
                    // Append at end
                    $envContent .= "\n{$key}={$value}";
                }
            }

            file_put_contents($envPath, $envContent);
            $this->info('Keys written to .env');
        } else {
            $this->warn('.env file not found. Please add the keys manually.');
        }

        return self::SUCCESS;
    }
}
