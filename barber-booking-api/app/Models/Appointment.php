<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Appointment extends Model
{
    use HasFactory;
    protected $fillable = [
        'user_id',
        'shop_id',
        'barber_id',
        'service_id',
        'appointment_date',
        'appointment_time',
        'duration_minutes',
        'status',
        'total_price',
        'notes',
        'cancellation_reason',
        'cancelled_at',
        'is_subscription',
        'reminder_24h_sent',
        'reminder_1h_sent',
    ];

    protected $casts = [
        'total_price' => 'decimal:2',
        'cancelled_at' => 'datetime',
        'is_subscription' => 'boolean',
        'reminder_24h_sent' => 'boolean',
        'reminder_1h_sent' => 'boolean',
    ];

    /**
     * Get the client who made the appointment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the shop for the appointment.
     */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    /**
     * Get the barber for the appointment.
     */
    public function barber(): BelongsTo
    {
        return $this->belongsTo(Barber::class);
    }

    /**
     * Get the service for the appointment.
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * Get the review for the appointment.
     */
    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }
}
