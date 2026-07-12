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
     * Dynamically rewrites any stored base URL to match the current request's host/IP+port,
     * so images keep working even when the server IP changes.
     */
    public function getLogoUrlAttribute($value)
    {
        if (!$value) {
            return null;
        }

        if (filter_var($value, FILTER_VALIDATE_URL) && !app()->runningInConsole()) {
            $parsed = parse_url($value);
            if (isset($parsed['host'])) {
                $request    = request();
                $scheme     = $request->getScheme();
                $host       = $request->getHost();
                $port       = $request->getPort();
                $portStr    = ($port && !in_array($port, [80, 443])) ? ':' . $port : '';
                $newBase    = $scheme . '://' . $host . $portStr;

                $path  = $parsed['path'] ?? '';
                $query = isset($parsed['query']) ? '?' . $parsed['query'] : '';
                return $newBase . $path . $query;
            }
        }

        return $value;
    }
}
