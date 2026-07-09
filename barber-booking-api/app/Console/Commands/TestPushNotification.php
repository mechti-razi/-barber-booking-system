<?php

namespace App\Console\Commands;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Console\Command;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class TestPushNotification extends Command
{
    protected $signature   = 'push:test {email? : The user email to send a test to (optional, sends to all if omitted)}';
    protected $description = 'Send a test push notification to verify the setup works end-to-end.';

    public function handle(): int
    {
        $vapidPublicKey  = config('webpush.vapid.public_key');
        $vapidPrivateKey = config('webpush.vapid.private_key');
        $vapidSubject    = config('webpush.vapid.subject');

        if (!$vapidPublicKey || !$vapidPrivateKey) {
            $this->error('VAPID keys not configured. Run: php artisan webpush:vapid');
            return self::FAILURE;
        }

        // Find subscriptions
        $query = PushSubscription::with('user');
        if ($email = $this->argument('email')) {
            $user = User::where('email', $email)->first();
            if (!$user) {
                $this->error("User not found: {$email}");
                return self::FAILURE;
            }
            $query->where('user_id', $user->id);
        }

        $subscriptions = $query->get();

        if ($subscriptions->isEmpty()) {
            $this->warn('No push subscriptions found.');
            $this->line('Make sure you:');
            $this->line('  1. Opened the Angular app in the browser');
            $this->line('  2. Logged in as a client');
            $this->line('  3. Went to Profile and enabled notifications (or permission was auto-requested)');
            return self::FAILURE;
        }

        $this->info("Found {$subscriptions->count()} subscription(s). Sending test notification...");

        $auth = [
            'VAPID' => [
                'subject'    => $vapidSubject,
                'publicKey'  => $vapidPublicKey,
                'privateKey' => $vapidPrivateKey,
            ],
        ];

        $webPush = new WebPush($auth);
        $webPush->setReuseVAPIDHeaders(true);

        $payload = json_encode([
            'notification' => [
                'title' => '✅ Test Notification',
                'body'  => 'Push notifications are working! You will receive appointment reminders like this.',
                'icon'  => '/assets/icons/icon-192x192.png',
                'badge' => '/assets/icons/icon-72x72.png',
                'data'  => ['url' => '/appointments'],
                'actions' => [
                    ['action' => 'view', 'title' => 'View Appointments'],
                ],
            ],
        ]);

        $sent = 0;
        $failed = 0;

        foreach ($subscriptions as $sub) {
            $this->line("  → Sending to: {$sub->user->name} ({$sub->user->email})");

            try {
                $subscription = Subscription::create([
                    'endpoint'        => $sub->endpoint,
                    'publicKey'       => $sub->public_key,
                    'authToken'       => $sub->auth_token,
                    'contentEncoding' => $sub->content_encoding ?? 'aesgcm',
                ]);

                $webPush->queueNotification($subscription, $payload);
            } catch (\Exception $e) {
                $this->error("  Failed to queue: {$e->getMessage()}");
                $failed++;
            }
        }

        foreach ($webPush->flush() as $report) {
            if ($report->isSuccess()) {
                $this->info('  ✓ Delivered successfully');
                $sent++;
            } else {
                $this->error('  ✗ Failed: ' . $report->getReason());
                // Auto-clean expired subscriptions
                if ($report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint', $report->getRequest()->getUri()->__toString())->delete();
                    $this->warn('    (Expired subscription removed)');
                }
                $failed++;
            }
        }

        $this->newLine();
        $this->info("Done — {$sent} sent, {$failed} failed.");

        if ($sent > 0) {
            $this->line('');
            $this->line('Check your browser/device for the notification.');
            $this->line('It should arrive even if the browser tab is not focused.');
        }

        return $sent > 0 ? self::SUCCESS : self::FAILURE;
    }
}
