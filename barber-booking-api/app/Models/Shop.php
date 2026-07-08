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
     * Dynamically rewrites 'localhost' or '127.0.0.1' base URLs to match the client's requesting host/IP.
     */
    public function getLogoUrlAttribute($value)
    {
        if (!$value) {
            return null;
        }

        if (filter_var($value, FILTER_VALIDATE_URL) && !app()->runningInConsole()) {
            $parsed = parse_url($value);
            if (isset($parsed['host']) && ($parsed['host'] === 'localhost' || $parsed['host'] === '127.0.0.1')) {
                $request = request();
                $host = $request->getHost();
                $port = $request->getPort();
                $scheme = $request->getScheme();

                $portStr = $port ? ':' . $port : '';
                $newBase = $scheme . '://' . $host . $portStr;

                $path = $parsed['path'] ?? '';
                $query = isset($parsed['query']) ? '?' . $parsed['query'] : '';
                return $newBase . $path . $query;
            }
        }

        return $value;
    }
}
