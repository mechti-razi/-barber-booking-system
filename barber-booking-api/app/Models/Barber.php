<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Barber extends Model
{
    use HasFactory;
    protected $fillable = [
        'user_id',
        'shop_id',
        'specialization',
        'experience_years',
        'rating',
        'bio',
        'is_active',
        'is_owner',
        'subscription_type',
        'subscription_expiry_date',
    ];

    protected $casts = [
        'rating' => 'decimal:2',
        'is_active' => 'boolean',
        'is_owner' => 'boolean',
    ];

    /**
     * Get the user that owns the barber profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the shop that the barber belongs to.
     */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    /**
     * Get the appointments for the barber.
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    /**
     * Get the working schedules for the barber.
     */
    public function workingSchedules(): HasMany
    {
        return $this->hasMany(WorkingSchedule::class);
    }

    /**
     * Get the reviews for the barber.
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * The services that the barber offers.
     */
    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'service_barber')
            ->withPivot('price')
            ->withTimestamps();
    }
}
