<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Shop extends Model
{
    use HasFactory;
    protected $fillable = [
        'owner_id',
        'name',
        'slug',
        'address',
        'phone',
        'email',
        'description',
        'logo_url',
        'status',
    ];

    /**
     * Get the owner of the shop.
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get the barbers for the shop.
     */
    public function barbers(): HasMany
    {
        return $this->hasMany(Barber::class);
    }

    /**
     * Get the services for the shop.
     */
    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    /**
     * Get the appointments for the shop.
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    /**
     * Get the shop's logo URL.
     *
     * - Base64 data URLs (data:image/...) are returned as-is — they are
     *   self-contained and need no URL rewriting.
     * - Local-storage URLs (containing /storage/) have their host rewritten to
     *   match the current request's host/IP+port so they keep working even when
     *   the server IP changes during local development.
     * - All other URLs (external CDN, R2, etc.) are returned unchanged.
     */
    public function getLogoUrlAttribute($value)
    {
        if (!$value) {
            return null;
        }

        // Base64 data URLs are self-contained — return immediately
        if (str_starts_with($value, 'data:')) {
            return $value;
        }

        if (!filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        $parsed = parse_url($value);
        $path   = $parsed['path'] ?? '';

        // Only rewrite host for local /storage/ paths
        if (!str_contains($path, '/storage/')) {
            return $value;
        }

        if (!app()->runningInConsole()) {
            $request = request();
            $scheme  = $request->getScheme();
            $host    = $request->getHost();
            $port    = $request->getPort();
            $portStr = ($port && !in_array((int)$port, [80, 443])) ? ':' . $port : '';
            $query   = isset($parsed['query']) ? '?' . $parsed['query'] : '';
            return $scheme . '://' . $host . $portStr . $path . $query;
        }

        return $value;
    }
}
