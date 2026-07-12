<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Barber;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class BarberController extends Controller
{
    /**
     * Subscription pricing configuration
     */
    private const SUBSCRIPTION_PRICES = [
        'monthly' => 49.00,
        'quarterly' => 130.00,
        'yearly' => 480.00,
    ];

    /**
     * Display a listing of barbers for a shop.
     * Admins see barbers for their own shop; pass ?shop_id= to override.
     * Pass ?active_only=1 to restrict to active ones.
     */
    public function index(Request $request)
    {
        $query = Barber::with(['user', 'shop', 'services', 'workingSchedules']);

        // If an explicit shop_id is passed, use it
        if ($request->has('shop_id')) {
            $query->where('shop_id', $request->shop_id);
        } elseif ($request->user() && $request->user()->role === 'admin') {
            // For admins with no shop_id filter, scope to their shop if set,
            // otherwise return all (super-admin scenario)
            if ($request->user()->shop_id) {
                $query->where('shop_id', $request->user()->shop_id);
            }
        } elseif ($request->user() && $request->user()->role === 'barber') {
            // A barber only sees barbers from their own shop
            $query->where('shop_id', $request->user()->shop_id);
        }

        // Only force active filtering when explicitly requested;
        // admin dashboards need to see inactive barbers too.
        if (filter_var($request->input('active_only', false), FILTER_VALIDATE_BOOLEAN)) {
            $query->where('is_active', true);
        }

        $barbers = $query->get();
        return response()->json($barbers);
    }

    /**
     * Store a newly created barber.
     * Accepts either an existing user_id OR name/email/password to create
     * the user account (admin "Add Barber" flow).
     * If no shop_id is provided, a new shop is automatically created for the barber.
     */
    public function store(Request $request)
    {
        $rules = [
            'shop_id'               => 'sometimes|nullable|exists:shops,id',
            'shop_name'             => 'sometimes|nullable|string|max:255',
            'shop_address'          => 'sometimes|nullable|string',
            'shop_phone'            => 'sometimes|nullable|string|max:20',
            'specialization'        => 'nullable|string|max:255',
            'experience_years'      => 'nullable|integer|min:0',
            'experience'            => 'nullable|string|max:255',
            'bio'                   => 'nullable|string',
            'subscription_type'     => 'nullable|string|in:monthly,quarterly,yearly',
            'subscription_expiry_date' => 'nullable|date',
        ];

        // Two supported flows: existing user, or new user credentials
        if ($request->has('user_id')) {
            $rules['user_id'] = 'required|exists:users,id|unique:barbers';
        } else {
            $rules['name']     = 'required|string|max:255';
            $rules['email']    = 'nullable|email|unique:users,email';
            $rules['phone']    = 'nullable|string|max:20';
            $rules['password'] = 'nullable|string|min:8';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->all();

        // Resolve shop_id: explicit > create new shop for this barber
        if (empty($data['shop_id'])) {
            $barberName = $data['name'] ?? 'New Barber';
            $shopName   = !empty($data['shop_name']) ? $data['shop_name'] : $barberName . "'s Shop";
            $slug       = \Str::slug($shopName);

            // Ensure slug uniqueness
            $baseSlug = $slug;
            $i = 1;
            while (Shop::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $i++;
            }

            // We need the user first for owner_id — flag to create shop after user
            $data['_pending_shop'] = [
                'name'    => $shopName,
                'slug'    => $slug,
                'address' => $data['shop_address'] ?? 'Address not set',
                'phone'   => $data['shop_phone'] ?? ($data['phone'] ?? '0000000000'),
                'email'   => $data['email'] ?? ($slug . '@coupena.local'),
                'status'  => 'active',
            ];
        }

        // Create the user account when credentials are provided
        if (empty($data['user_id'])) {
            // Auto-generate a unique email if none provided
            if (empty($data['email'])) {
                $slug = strtolower(preg_replace('/\s+/', '.', trim($data['name'])));
                $base = $slug . '@coupena.local';
                $email = $base;
                $i = 1;
                while (User::where('email', $email)->exists()) {
                    $email = $slug . $i . '@coupena.local';
                    $i++;
                }
                $data['email'] = $email;
            }

            // If we need to create a shop, do it now that we have the user data
            if (isset($data['_pending_shop'])) {
                $shopData = $data['_pending_shop'];
                unset($data['_pending_shop']);

                // Create user first (without shop_id initially)
                $user = User::create([
                    'name'     => $data['name'],
                    'email'    => $data['email'],
                    'phone'    => $data['phone'] ?? null,
                    'password' => Hash::make($data['password'] ?? 'password'),
                    'role'     => 'barber',
                ]);

                // Now create shop with the real owner_id
                $shop = Shop::create(array_merge($shopData, ['owner_id' => $user->id]));

                // Update user with shop_id
                $user->update(['shop_id' => $shop->id]);

                $data['shop_id']   = $shop->id;
                $data['user_id']   = $user->id;
                $data['_is_owner'] = true; // this barber owns the new shop
            } else {
                $user = User::create([
                    'name'     => $data['name'],
                    'email'    => $data['email'],
                    'phone'    => $data['phone'] ?? null,
                    'password' => Hash::make($data['password'] ?? 'password'),
                    'role'     => 'barber',
                    'shop_id'  => $data['shop_id'],
                ]);
                $data['user_id'] = $user->id;
            }
        }

        // Normalize experience string ("5 years") into experience_years if needed
        if (empty($data['experience_years']) && !empty($data['experience'])) {
            $data['experience_years'] = (int) filter_var($data['experience'], FILTER_SANITIZE_NUMBER_INT) ?: 0;
        }

        // Calculate subscription expiry based on subscription_type
        $isActive = true;
        $expiryDate = $data['subscription_expiry_date'] ?? null;
        $subscriptionType = $data['subscription_type'] ?? null;
        
        if (!empty($subscriptionType) && empty($expiryDate)) {
            $expiryDate = $this->calculateExpiryDate($subscriptionType);
        }

        // If expiry date is set and is in the past, set status to inactive
        if ($expiryDate && now()->parse($expiryDate)->isPast()) {
            $isActive = false;
        }

        $barber = Barber::create([
            'user_id'                => $data['user_id'],
            'shop_id'                => $data['shop_id'],
            'specialization'         => $data['specialization'] ?? null,
            'experience_years'       => $data['experience_years'] ?? 0,
            'bio'                    => $data['bio'] ?? null,
            'is_active'              => $isActive,
            'is_owner'               => $data['_is_owner'] ?? false,
            'subscription_type'      => $subscriptionType,
            'subscription_expiry_date' => $expiryDate,
        ]);

        // Attach all existing services of this shop to the new barber
        $shopServices = \App\Models\Service::where('shop_id', $barber->shop_id)->get();
        foreach ($shopServices as $service) {
            $barber->services()->attach($service->id, [
                'price' => $service->base_price,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Add subscription revenue if subscription type is selected
        if ($subscriptionType && isset(self::SUBSCRIPTION_PRICES[$subscriptionType])) {
            $this->addSubscriptionRevenue($data['shop_id'], self::SUBSCRIPTION_PRICES[$subscriptionType], $barber->id, $barber->user_id);
        }

        $barber->load(['user', 'shop', 'services']);
        return response()->json($barber, 201);
    }

    /**
     * Display the specified barber.
     */
    public function show($id)
    {
        $barber = Barber::with(['user', 'shop', 'services', 'workingSchedules', 'reviews'])->findOrFail($id);
        return response()->json($barber);
    }

    /**
     * Update the specified barber.
     */
    public function update(Request $request, $id)
    {
        $barber = Barber::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name'                     => 'sometimes|required|string|max:255',
            'email'                    => 'sometimes|required|email|unique:users,email,' . $barber->user_id,
            'phone'                    => 'nullable|string|max:20',
            'specialization'           => 'nullable|string|max:255',
            'experience_years'         => 'nullable|integer|min:0',
            'bio'                      => 'nullable|string',
            'is_active'                => 'sometimes|boolean',
            'active'                   => 'sometimes|boolean',
            'experience'               => 'nullable|string|max:255',
            'subscription_type'        => 'nullable|string|in:monthly,quarterly,yearly',
            'subscription_expiry_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->hasAny(['name', 'email', 'phone'])) {
            $userData = $request->only(['name', 'email', 'phone']);
            $barber->user->update($userData);
        }

        $updateData = $request->only(['specialization', 'experience_years', 'bio', 'subscription_type', 'subscription_expiry_date']);

        // Normalize is_active / active into is_active
        if ($request->has('is_active')) {
            $updateData['is_active'] = (bool) $request->is_active;
        } elseif ($request->has('active')) {
            $updateData['is_active'] = (bool) $request->active;
        }

        // Normalize experience string into experience_years
        if ($request->has('experience') && !$request->has('experience_years')) {
            $updateData['experience_years'] = (int) filter_var($request->experience, FILTER_SANITIZE_NUMBER_INT) ?: 0;
        }

        // If subscription_type is provided but no expiry date, calculate it
        if ($request->has('subscription_type') && !$request->has('subscription_expiry_date')) {
            $updateData['subscription_expiry_date'] = $this->calculateExpiryDate($request->subscription_type);
            // If activating a barber with new subscription, set to active
            if ($request->is_active ?? $request->active ?? true) {
                $updateData['is_active'] = true;
            }
        }

        // If expiry date is set and is in the past, deactivate barber
        if ($request->has('subscription_expiry_date')) {
            if (now()->parse($request->subscription_expiry_date)->isPast()) {
                $updateData['is_active'] = false;
            } elseif ($request->is_active ?? $request->active ?? true) {
                $updateData['is_active'] = true;
            }
        }

        // Add revenue if subscription type is being set/updated
        if ($request->has('subscription_type') && isset(self::SUBSCRIPTION_PRICES[$request->subscription_type])) {
            $this->addSubscriptionRevenue($barber->shop_id, self::SUBSCRIPTION_PRICES[$request->subscription_type], $barber->id, $barber->user_id);
        }

        $barber->update($updateData);
        $barber->load(['user', 'shop', 'services']);
        return response()->json($barber);
    }

    /**
     * Remove the specified barber.
     */
    public function destroy($id)
    {
        $barber = Barber::findOrFail($id);
        $barber->delete();
        return response()->json(['message' => 'Barber deleted successfully']);
    }

    /**
     * Calculate subscription expiry date based on subscription type.
     */
    private function calculateExpiryDate(string $subscriptionType): string
    {
        return match ($subscriptionType) {
            'monthly' => now()->addMonth()->toDateString(),
            'quarterly' => now()->addMonths(3)->toDateString(),
            'yearly' => now()->addYear()->toDateString(),
            default => now()->addMonth()->toDateString(),
        };
    }

    /**
     * Add subscription revenue to the shop.
     * This creates an appointment record with the subscription fee.
     */
    private function addSubscriptionRevenue(int $shopId, float $amount, int $barberId, int $userId): void
    {
        // Create a special appointment record for subscription revenue
        \App\Models\Appointment::create([
            'shop_id'          => $shopId,
            'barber_id'        => $barberId,
            'user_id'          => $userId,
            'service_id'       => null,
            'appointment_date' => now()->toDateString(),
            'appointment_time' => now()->format('H:i:s'),
            'status'           => 'confirmed',
            'total_price'      => $amount,
            'notes'            => 'Barber subscription fee',
            'is_subscription'  => true,
        ]);
    }
}