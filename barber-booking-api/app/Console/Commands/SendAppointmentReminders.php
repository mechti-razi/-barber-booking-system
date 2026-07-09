<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\PushSubscription;
use Illuminate\Console\Command;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class SendAppointmentReminders extends Command
{
    protected $signature   = 'appointments:send-reminders';
    protected $description = 'Send push notification reminders for upcoming appointments (24h and 1h before).';

    public function handle(): int
    {
        $vapidPublicKey  = config('webpush.vapid.public_key');
        $vapidPrivateKey = config('webpush.vapid.private_key');
        $vapidSubject    = config('webpush.vapid.subject');

        if (!$vapidPublicKey || !$vapidPrivateKey) {
            $this->error('VAPID keys are not configured. Run: php artisan webpush:vapid');
            return self::FAILURE;
        }

        $auth = [
            'VAPID' => [
                'subject'    => $vapidSubject,
                'publicKey'  => $vapidPublicKey,
                'privateKey' => $vapidPrivateKey,
            ],
        ];

        $webPush = new WebPush($auth);
        $webPush->setReuseVAPIDHeaders(true);

        $now      = now();
        $sent     = 0;

        // ── 24-hour reminder ─────────────────────────────────────────────────
        $window24Start = $now->copy()->addHours(23)->addMinutes(45);
        $window24End   = $now->copy()->addHours(24)->addMinutes(15);

        $appointments24h = Appointment::where('reminder_24h_sent', false)
            ->whereIn('status', ['pending', 'confirmed'])
            ->whereDate('appointment_date', $window24Start->toDateString())
            ->whereBetween('appointment_time', [
                $window24Start->format('H:i:s'),
                $window24End->format('H:i:s'),
            ])
            ->with(['user.pushSubscriptions', 'service', 'barber.user', 'shop'])
            ->get();

        foreach ($appointments24h as $appointment) {
            if ($this->sendReminder($webPush, $appointment, '24h')) {
                $appointment->update(['reminder_24h_sent' => true]);
                $sent++;
            }
        }

        // ── 1-hour reminder ──────────────────────────────────────────────────
        $window1hStart = $now->copy()->addMinutes(45);
        $window1hEnd   = $now->copy()->addMinutes(75);

        $appointments1h = Appointment::where('reminder_1h_sent', false)
            ->whereIn('status', ['pending', 'confirmed'])
            ->whereDate('appointment_date', $window1hStart->toDateString())
            ->whereBetween('appointment_time', [
                $window1hStart->format('H:i:s'),
                $window1hEnd->format('H:i:s'),
            ])
            ->with(['user.pushSubscriptions', 'service', 'barber.user', 'shop'])
            ->get();

        foreach ($appointments1h as $appointment) {
            if ($this->sendReminder($webPush, $appointment, '1h')) {
                $appointment->update(['reminder_1h_sent' => true]);
                $sent++;
            }
        }

        $this->info("Sent {$sent} reminder(s).");
        return self::SUCCESS;
    }

    /**
     * Build the notification payload and queue pushes for all
     * subscriptions belonging to the appointment's client.
     *
     * @return bool  true if at least one subscription was found and queued
     */
    private function sendReminder(WebPush $webPush, Appointment $appointment, string $type): bool
    {
        $subscriptions = $appointment->user?->pushSubscriptions;

        if (!$subscriptions || $subscriptions->isEmpty()) {
            return false;
        }

        $serviceName = $appointment->service?->name ?? 'your appointment';
        $barberName  = $appointment->barber?->user?->name ?? 'your barber';
        $shopName    = $appointment->shop?->name ?? '';
        $timeLabel   = substr($appointment->appointment_time, 0, 5); // HH:MM
        $dateLabel   = \Carbon\Carbon::parse($appointment->appointment_date)->format('D, M j');

        if ($type === '24h') {
            $title = '📅 Appointment Tomorrow';
            $body  = "Reminder: {$serviceName} with {$barberName}" .
                     ($shopName ? " at {$shopName}" : '') .
                     " — {$dateLabel} at {$timeLabel}.";
        } else {
            $title = '⏰ Appointment in 1 Hour';
            $body  = "{$serviceName} with {$barberName}" .
                     ($shopName ? " at {$shopName}" : '') .
                     " starts at {$timeLabel}. See you soon!";
        }

        $payload = json_encode([
            'notification' => [
                'title' => $title,
                'body'  => $body,
                'icon'  => '/assets/icons/icon-192x192.png',
                'badge' => '/assets/icons/icon-72x72.png',
                'data'  => [
                    'url'            => '/appointments',
                    'appointment_id' => $appointment->id,
                ],
                'actions' => [
                    ['action' => 'view', 'title' => 'View Appointment'],
                ],
            ],
        ]);

        foreach ($subscriptions as $sub) {
            try {
                $subscription = Subscription::create([
                    'endpoint'        => $sub->endpoint,
                    'publicKey'       => $sub->public_key,
                    'authToken'       => $sub->auth_token,
                    'contentEncoding' => $sub->content_encoding ?? 'aesgcm',
                ]);

                $webPush->queueNotification($subscription, $payload);
            } catch (\Exception $e) {
                $this->warn("Failed to queue push for subscription {$sub->id}: {$e->getMessage()}");
            }
        }

        // Flush all queued notifications and handle expired endpoints
        foreach ($webPush->flush() as $report) {
            if (!$report->isSuccess()) {
                $this->warn("Push failed: " . $report->getReason());
                // Remove invalid subscriptions automatically
                if ($report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint', $report->getRequest()->getUri()->__toString())->delete();
                }
            }
        }

        return true;
    }
}
