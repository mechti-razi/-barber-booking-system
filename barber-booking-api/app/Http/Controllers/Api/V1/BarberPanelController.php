<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Barber;
use App\Models\Service;
use App\Models\User;
use App\Models\WorkingSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class BarberPanelController extends Controller
{
    // ─────────────────────────────────────────────────────────
    //  Resolve the authenticated barber profile
    // ─────────────────────────────────────────────────────────
    private function getBarberProfile(Request $request): ?Barber
    {
        return Barber::where('user_id', $request->user()->id)->first();
    }

    // ─────────────────────────────────────────────────────────
    //  Require the barber to be a shop owner — 403 otherwise
    // ─────────────────────────────────────────────────────────
    private function requireOwner(Request $request): Barber
    {
        $barber = $this->getBarberProfile($request);
        if (!$barber) {
            abort(response()->json(['error' => 'Barber profile not found.'], 404));
        }
        if (!$barber->is_owner) {
            abort(response()->json(['error' => 'Access denied. Only shop owners can perform this action.'], 403));
        }
        return $barber;
    }

    // ─────────────────────────────────────────────────────────
    //  GET /barber-panel/revenue
    // ─────────────────────────────────────────────────────────
    public function revenue(Request $request)
    {
        $barber = $this->getBarberProfile($request);
        if (!$barber) {
            return response()->json(['error' => 'Barber profile not found.'], 404);
        }

        $barberId = $barber->id;

        // All completed/confirmed appointments for this barber
        $appointments = Appointment::where('barber_id', $barberId)
            ->where('is_subscription', false)
            ->whereIn('status', ['completed', 'confirmed'])
            ->get();

        $now        = now();
        $today      = $now->toDateString();
        $weekStart  = $now->copy()->startOfWeek()->toDateString();
        $monthStart = $now->copy()->startOfMonth()->toDateString();

        // KPI cards
        $todayEarnings = $appointments
            ->where('appointment_date', $today)
            ->sum('total_price');

        $weekEarnings = $appointments
            ->where('appointment_date', '>=', $weekStart)
            ->sum('total_price');

        $monthEarnings = $appointments
            ->where('appointment_date', '>=', $monthStart)
            ->sum('total_price');

        $allTimeEarnings = $appointments->sum('total_price');

        // Monthly revenue for the last 6 months
        $monthlyRevenue = [];
        for ($i = 5; $i >= 0; $i--) {
            $month     = $now->copy()->subMonths($i);
            $label     = $month->format('M Y');
            $start     = $month->copy()->startOfMonth()->toDateString();
            $end       = $month->copy()->endOfMonth()->toDateString();
            $revenue   = $appointments
                ->whereBetween('appointment_date', [$start, $end])
                ->sum('total_price');
            $monthlyRevenue[] = ['label' => $label, 'revenue' => round($revenue, 2)];
        }

        // Service breakdown
        $allAppts = Appointment::where('barber_id', $barberId)
            ->where('is_subscription', false)
            ->with('service')
            ->whereIn('status', ['completed', 'confirmed'])
            ->get();

        $serviceBreakdown = $allAppts->groupBy(fn($a) => $a->service?->name ?? 'Other')
            ->map(fn($group) => [
                'count'   => $group->count(),
                'revenue' => round($group->sum('total_price'), 2),
            ])->toArray();

        // Top clients by spend
        $topClients = Appointment::where('barber_id', $barberId)
            ->whereIn('status', ['completed', 'confirmed'])
            ->with('user')
            ->get()
            ->groupBy('user_id')
            ->map(fn($group) => [
                'name'    => $group->first()->user?->name ?? 'Unknown',
                'visits'  => $group->count(),
                'spent'   => round($group->sum('total_price'), 2),
            ])
            ->sortByDesc('spent')
            ->values()
            ->take(5)
            ->toArray();

        // Appointment status summary
        $statusSummary = Appointment::where('barber_id', $barberId)
            ->where('is_subscription', false)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        return response()->json([
            'kpis' => [
                'today'    => round($todayEarnings, 2),
                'week'     => round($weekEarnings, 2),
                'month'    => round($monthEarnings, 2),
                'all_time' => round($allTimeEarnings, 2),
                'rating'   => $barber->rating,
            ],
            'monthly_revenue'   => $monthlyRevenue,
            'service_breakdown' => $serviceBreakdown,
            'top_clients'       => $topClients,
            'status_summary'    => $statusSummary,
        ]);
    }

    // ─────────────────────────────────────────────────────────
    //  GET /barber-panel/reservations
    // ─────────────────────────────────────────────────────────
    public function reservations(Request $request)
    {
        $barber = $this->getBarberProfile($request);
        if (!$barber) {
            return response()->json(['error' => 'Barber profile not found.'], 404);
        }

        $query = Appointment::where('barber_id', $barber->id)
            ->where('is_subscription', false)
            ->with(['user', 'service', 'shop']);

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('user', fn($q) => $q->where('name', 'like', "%$search%"));
        }

        if ($request->has('date')) {
            $query->where('appointment_date', $request->date);
        }

        $appointments = $query->orderBy('appointment_date', 'desc')
            ->orderBy('appointment_time', 'desc')
            ->paginate(15);

        return response()->json($appointments);
    }

    // ─────────────────────────────────────────────────────────
    //  POST /barber-panel/reservations
    //  Barber creates a reservation for their own shop only.
    //  The authenticated barber's account is NEVER used as the client.
    // ─────────────────────────────────────────────────────────
    public function createReservation(Request $request)
    {
        $barber = $this->getBarberProfile($request);
        if (!$barber) {
            return response()->json(['error' => 'Barber profile not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'client_first_name' => 'required|string|max:255',
            'client_last_name'  => 'required|string|max:255',
            'client_phone'      => 'required|string|max:30',
            'client_email'      => 'nullable|email|max:255',
            'service_id'        => 'required|integer|exists:services,id',
            'barber_id'         => 'nullable|integer|exists:barbers,id',
            'appointment_date'  => 'required|date|after_or_equal:today',
            'appointment_time'  => 'required|date_format:H:i',
            'notes'             => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Build the full client name
        $clientFullName = trim($request->client_first_name . ' ' . $request->client_last_name);

        // Guard: barber must not use their own email as the client email
        $barberEmail = $request->user()->email;
        if ($request->filled('client_email') && strtolower($request->client_email) === strtolower($barberEmail)) {
            return response()->json(['error' => 'You cannot create a reservation using your own barber account as the client.'], 422);
        }

        // Ensure the service belongs to the barber's shop
        $service = Service::where('id', $request->service_id)
            ->where('shop_id', $barber->shop_id)
            ->first();

        if (!$service) {
            return response()->json(['error' => 'Service does not belong to your shop.'], 403);
        }

        // Determine assigned barber — if none passed, assign to the current barber
        $assignedBarberId = $barber->id;
        if ($request->filled('barber_id')) {
            $chosenBarber = Barber::where('id', $request->barber_id)
                ->where('shop_id', $barber->shop_id)
                ->first();
            if (!$chosenBarber) {
                return response()->json(['error' => 'Chosen barber does not belong to your shop.'], 403);
            }
            $assignedBarberId = $chosenBarber->id;
        }

        // ── Resolve or create the CLIENT user ────────────────────────────────
        // We NEVER allow the client user_id to equal the barber's own user_id.
        $barberUserId = $request->user()->id;
        $clientUser   = null;

        if ($request->filled('client_email')) {
            // Try to find an existing client account that is NOT the barber
            $existing = User::where('email', $request->client_email)->first();

            if ($existing && $existing->id === $barberUserId) {
                return response()->json([
                    'error' => 'You cannot book an appointment for yourself using your barber account.',
                ], 422);
            }

            if ($existing) {
                // Update name & phone to keep record fresh
                $existing->update([
                    'name'  => $clientFullName,
                    'phone' => $request->client_phone ?? $existing->phone,
                ]);
                $clientUser = $existing;
            } else {
                $clientUser = User::create([
                    'name'     => $clientFullName,
                    'email'    => $request->client_email,
                    'phone'    => $request->client_phone,
                    'password' => Hash::make(Str::random(16)),
                    'role'     => 'client',
                ]);
            }
        } else {
            // No email — create a walk-in / phone-only client record
            $clientUser = User::create([
                'name'     => $clientFullName,
                'phone'    => $request->client_phone,
                'email'    => 'walkin_' . Str::random(10) . '@barber.local',
                'password' => Hash::make(Str::random(16)),
                'role'     => 'client',
            ]);
        }

        // Final safety check — this should never fire, but let's be explicit
        if ($clientUser->id === $barberUserId) {
            return response()->json([
                'error' => 'Client account cannot be the same as the barber account.',
            ], 422);
        }

        $appointment = Appointment::create([
            'user_id'          => $clientUser->id,
            'barber_id'        => $assignedBarberId,
            'shop_id'          => $barber->shop_id,
            'service_id'       => $service->id,
            'appointment_date' => $request->appointment_date,
            'appointment_time' => $request->appointment_time . ':00',
            'duration_minutes' => $service->duration_minutes,
            'total_price'      => $service->base_price,
            'status'           => 'pending',
            'notes'            => $request->notes,
            'is_subscription'  => false,
        ]);

        return response()->json([
            'message'     => 'Reservation created successfully.',
            'appointment' => [
                'id'               => $appointment->id,
                'user'             => [
                    'name'  => $clientUser->name,
                    'email' => $clientUser->email,
                    'phone' => $clientUser->phone,
                ],
                'service'          => [
                    'name'       => $service->name,
                    'base_price' => $service->base_price,
                ],
                'appointment_date' => $appointment->appointment_date,
                'appointment_time' => $appointment->appointment_time,
                'duration_minutes' => $appointment->duration_minutes,
                'total_price'      => $appointment->total_price,
                'status'           => $appointment->status,
                'notes'            => $appointment->notes,
            ],
        ], 201);
    }


    // ─────────────────────────────────────────────────────────
    //  GET /barber-panel/schedule
    // ─────────────────────────────────────────────────────────
    public function getSchedule(Request $request)
    {
        $barber = $this->getBarberProfile($request);
        if (!$barber) {
            return response()->json(['error' => 'Barber profile not found.'], 404);
        }

        $schedules = WorkingSchedule::where('barber_id', $barber->id)
            ->orderBy('day_of_week')
            ->get();

        return response()->json($schedules);
    }

    // ─────────────────────────────────────────────────────────
    //  PUT /barber-panel/schedule
    // ─────────────────────────────────────────────────────────
    public function saveSchedule(Request $request)
    {
        $barber = $this->getBarberProfile($request);
        if (!$barber) {
            return response()->json(['error' => 'Barber profile not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'schedule'                    => 'required|array',
            'schedule.*.day_of_week'      => 'required|integer|between:0,6',
            'schedule.*.start_time'       => 'required|regex:/^\d{1,2}:\d{2}(:\d{2})?$/',
            'schedule.*.end_time'         => 'required|regex:/^\d{1,2}:\d{2}(:\d{2})?$/',
            'schedule.*.break_start_time' => 'nullable|regex:/^\d{1,2}:\d{2}(:\d{2})?$/',
            'schedule.*.break_end_time'   => 'nullable|regex:/^\d{1,2}:\d{2}(:\d{2})?$/',
            'schedule.*.is_available'     => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        foreach ($request->schedule as $dayData) {
            // Helper to format/pad hours safely (e.g. "9:00" -> "09:00:00")
            $padTime = function($timeStr) {
                if (!$timeStr) return null;
                $parts = explode(':', $timeStr);
                $h = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
                $m = str_pad($parts[1] ?? '00', 2, '0', STR_PAD_LEFT);
                return "{$h}:{$m}:00";
            };

            WorkingSchedule::updateOrCreate(
                ['barber_id' => $barber->id, 'day_of_week' => $dayData['day_of_week']],
                [
                    'start_time'       => $padTime($dayData['start_time']),
                    'end_time'         => $padTime($dayData['end_time']),
                    'break_start_time' => $padTime($dayData['break_start_time'] ?? null),
                    'break_end_time'   => $padTime($dayData['break_end_time'] ?? null),
                    'is_available'     => $dayData['is_available'],
                ]
            );
        }

        return response()->json(['message' => 'Schedule saved successfully.']);
    }

    // ─────────────────────────────────────────────────────────
    //  GET /barber-panel/staff
    // ─────────────────────────────────────────────────────────
    public function staff(Request $request)
    {
        $barber = $this->getBarberProfile($request);
        if (!$barber) {
            return response()->json(['error' => 'Barber profile not found.'], 404);
        }

        $shopId = $barber->shop_id;

        $staff = Barber::where('shop_id', $shopId)
            ->with('user')
            ->get()
            ->map(fn($b) => [
                'id'               => $b->id,
                'user_id'          => $b->user_id,
                'name'             => $b->user?->name,
                'email'            => $b->user?->email,
                'phone'            => $b->user?->phone,
                'specialization'   => $b->specialization,
                'experience_years' => $b->experience_years,
                'rating'           => $b->rating,
                'bio'              => $b->bio,
                'is_active'        => $b->is_active,
                'is_owner'         => $b->is_owner,
                'joined_at'        => $b->created_at?->toDateString(),
            ]);

        return response()->json($staff);
    }

    // ─────────────────────────────────────────────────────────
    //  POST /barber-panel/staff  — Hire a new staff member
    // ─────────────────────────────────────────────────────────
    public function hireStaff(Request $request)
    {
        $currentBarber = $this->requireOwner($request);

        $validator = Validator::make($request->all(), [
            'name'             => 'required|string|max:255',
            'email'            => 'required|email|unique:users,email',
            'phone'            => 'nullable|string|max:20',
            'password'         => 'required|string|min:8',
            'specialization'   => 'nullable|string|max:255',
            'experience_years' => 'nullable|integer|min:0',
            'bio'              => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $shopId = $currentBarber->shop_id;

        // Create the user account
        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'phone'    => $request->phone,
            'password' => Hash::make($request->password),
            'role'     => 'barber',
            'shop_id'  => $shopId,
        ]);

        // Create the barber profile
        $barber = Barber::create([
            'user_id'          => $user->id,
            'shop_id'          => $shopId,
            'specialization'   => $request->specialization,
            'experience_years' => $request->experience_years ?? 0,
            'bio'              => $request->bio,
            'is_active'        => true,
            'is_owner'         => false,
        ]);

        return response()->json([
            'message' => 'Staff member hired successfully.',
            'barber'  => [
                'id'               => $barber->id,
                'user_id'          => $user->id,
                'name'             => $user->name,
                'email'            => $user->email,
                'phone'            => $user->phone,
                'specialization'   => $barber->specialization,
                'experience_years' => $barber->experience_years,
                'rating'           => $barber->rating,
                'is_active'        => $barber->is_active,
            ],
        ], 201);
    }

    // ─────────────────────────────────────────────────────────
    //  DELETE /barber-panel/staff/{barber_id}
    // ─────────────────────────────────────────────────────────
    public function removeStaff(Request $request, int $barberId)
    {
        $currentBarber = $this->requireOwner($request);

        $target = Barber::where('id', $barberId)
            ->where('shop_id', $currentBarber->shop_id)
            ->firstOrFail();

        // Prevent self-removal
        if ($target->id === $currentBarber->id) {
            return response()->json(['error' => 'You cannot remove yourself.'], 403);
        }

        $target->update(['is_active' => false]);

        return response()->json(['message' => 'Staff member deactivated.']);
    }

    // ─────────────────────────────────────────────────────────
    //  PATCH /barber-panel/staff/{barber_id}/toggle
    // ─────────────────────────────────────────────────────────
    public function toggleStaff(Request $request, int $barberId)
    {
        $currentBarber = $this->requireOwner($request);

        $target = Barber::where('id', $barberId)
            ->where('shop_id', $currentBarber->shop_id)
            ->firstOrFail();

        $target->update(['is_active' => !$target->is_active]);

        return response()->json([
            'message'   => 'Status updated.',
            'is_active' => $target->is_active,
        ]);
    }

    // ─────────────────────────────────────────────────────────
    //  GET /barber-panel/staff/{barber_id}/performance
    // ─────────────────────────────────────────────────────────
    public function staffPerformance(Request $request, int $barberId)
    {
        $currentBarber = $this->getBarberProfile($request);
        if (!$currentBarber) {
            return response()->json(['error' => 'Barber profile not found.'], 404);
        }

        $target = Barber::where('id', $barberId)
            ->where('shop_id', $currentBarber->shop_id)
            ->with('user')
            ->firstOrFail();

        // 1. Calculate Earnings (completed/confirmed appointments)
        $appointments = Appointment::where('barber_id', $target->id)
            ->where('is_subscription', false)
            ->whereIn('status', ['completed', 'confirmed'])
            ->get();

        $now = now();
        $today = $now->toDateString();
        $weekStart = $now->copy()->startOfWeek()->toDateString();
        $monthStart = $now->copy()->startOfMonth()->toDateString();

        $todayEarnings = $appointments->where('appointment_date', $today)->sum('total_price');
        $weekEarnings = $appointments->where('appointment_date', '>=', $weekStart)->sum('total_price');
        $monthEarnings = $appointments->where('appointment_date', '>=', $monthStart)->sum('total_price');
        $allTimeEarnings = $appointments->sum('total_price');

        // 2. Calendar / Appointments (Upcoming & Recent)
        $calendarAppointments = Appointment::where('barber_id', $target->id)
            ->with(['user', 'service'])
            ->orderBy('appointment_date', 'desc')
            ->orderBy('appointment_time', 'desc')
            ->take(50)
            ->get()
            ->map(fn($a) => [
                'id' => $a->id,
                'client_name' => $a->user?->name ?? 'Unknown',
                'service_name' => $a->service?->name ?? 'Unknown',
                'price' => $a->total_price > 0 ? $a->total_price : ($a->service?->base_price ?? 0),
                'date' => $a->appointment_date,
                'time' => substr($a->appointment_time, 0, 5),
                'status' => $a->status,
            ]);

        // 3. Working Schedule
        $schedules = WorkingSchedule::where('barber_id', $target->id)
            ->orderBy('day_of_week')
            ->get()
            ->map(fn($s) => [
                'day_of_week' => $s->day_of_week,
                'start_time' => substr($s->start_time, 0, 5),
                'end_time' => substr($s->end_time, 0, 5),
                'is_available' => $s->is_available,
            ]);

        return response()->json([
            'profile' => [
                'id' => $target->id,
                'name' => $target->user?->name,
                'email' => $target->user?->email,
                'phone' => $target->user?->phone,
                'specialization' => $target->specialization,
                'experience_years' => $target->experience_years,
                'bio' => $target->bio,
                'rating' => $target->rating,
                'is_active' => $target->is_active,
            ],
            'earnings' => [
                'today' => round($todayEarnings, 2),
                'week' => round($weekEarnings, 2),
                'month' => round($monthEarnings, 2),
                'all_time' => round($allTimeEarnings, 2),
            ],
            'appointments' => $calendarAppointments,
            'schedule' => $schedules,
        ]);
    }


    // ─────────────────────────────────────────────────────────
    //  GET /barber-panel/services
    //  Returns all services for the authenticated barber's shop
    // ─────────────────────────────────────────────────────────
    public function getServices(Request $request)
    {
        $barber = $this->getBarberProfile($request);
        if (!$barber) {
            return response()->json(['error' => 'Barber profile not found.'], 404);
        }

        $services = Service::where('shop_id', $barber->shop_id)
            ->orderBy('name')
            ->get();

        return response()->json($services);
    }

    // ─────────────────────────────────────────────────────────
    //  GET /barber-panel/shop
    // ─────────────────────────────────────────────────────────
    public function getShop(Request $request)
    {
        $barber = $this->getBarberProfile($request);
        if (!$barber) {
            return response()->json(['error' => 'Barber profile not found.'], 404);
        }

        $shop = $barber->shop;
        if (!$shop) {
            return response()->json(['error' => 'Shop not found.'], 404);
        }

        return response()->json([
            'id'          => $shop->id,
            'name'        => $shop->name,
            'description' => $shop->description,
            'logo_url'    => $shop->logo_url,
            'address'     => $shop->address,
            'phone'       => $shop->phone,
            'email'       => $shop->email,
            'status'      => $shop->status,
        ]);
    }

    // ─────────────────────────────────────────────────────────
    //  PUT /barber-panel/shop
    // ─────────────────────────────────────────────────────────
    public function updateShop(Request $request)
    {
        $barber = $this->requireOwner($request);

        $shop = $barber->shop;
        if (!$shop) {
            return response()->json(['error' => 'Shop not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'description' => 'nullable|string|max:2000',
            'logo_url'    => 'nullable|url|max:500',
            'phone'       => 'nullable|string|max:30',
            'email'       => 'nullable|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $shop->update($request->only(['description', 'logo_url', 'phone', 'email']));

        return response()->json([
            'message' => 'Shop updated successfully.',
            'shop'    => [
                'id'          => $shop->id,
                'name'        => $shop->name,
                'description' => $shop->description,
                'logo_url'    => $shop->logo_url,
                'phone'       => $shop->phone,
                'email'       => $shop->email,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────
    //  POST /barber-panel/shop/logo
    // ─────────────────────────────────────────────────────────
    public function uploadLogo(Request $request)
    {
        $barber = $this->requireOwner($request);

        $shop = $barber->shop;
        if (!$shop) {
            return response()->json(['error' => 'Shop not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // Max 5MB
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->hasFile('logo')) {
            // Delete old file if exists
            if ($shop->logo_url) {
                // Extract relative path from logo_url
                $parsedUrl = parse_url($shop->logo_url);
                if (isset($parsedUrl['path'])) {
                    // path will look like /storage/shops/xyz.jpg, let's remove /storage/ prefix to match public disk root
                    $relativePath = preg_replace('/^\/storage\//', '', $parsedUrl['path']);
                    if (Storage::disk('public')->exists($relativePath)) {
                        Storage::disk('public')->delete($relativePath);
                    }
                }
            }

            // Store new file
            $file = $request->file('logo');
            $fileName = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('shops', $fileName, 'public');

            // Generate full URL
            $logoUrl = asset('storage/' . $path);

            $shop->update(['logo_url' => $logoUrl]);

            return response()->json([
                'message' => 'Logo uploaded successfully.',
                'logo_url' => $logoUrl
            ]);
        }

        return response()->json(['error' => 'No image file uploaded.'], 400);
    }


    // ─────────────────────────────────────────────────────────
    //  POST /barber-panel/services
    // ─────────────────────────────────────────────────────────
    public function createService(Request $request)
    {
        $barber = $this->requireOwner($request);

        $validator = Validator::make($request->all(), [
            'name'             => 'required|string|max:255',
            'description'      => 'nullable|string',
            'base_price'       => 'required_without:price|numeric|min:0',
            'price'            => 'required_without:base_price|numeric|min:0',
            'duration_minutes' => 'required|integer|min:5',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $slug = Str::slug($request->name) . '-' . uniqid();
        $finalPrice = $request->input('base_price', $request->input('price', 0));

        $service = Service::create([
            'shop_id'          => $barber->shop_id,
            'name'             => $request->name,
            'slug'             => $slug,
            'description'      => $request->description,
            'base_price'       => $finalPrice,
            'duration_minutes' => $request->duration_minutes,
            'is_active'        => true,
        ]);

        // Auto-attach to all barbers in this shop
        $shopBarbers = Barber::where('shop_id', $barber->shop_id)->get();
        foreach ($shopBarbers as $b) {
            $b->services()->attach($service->id, [
                'price'      => $service->base_price,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json(['service' => $service], 201);
    }

    // ─────────────────────────────────────────────────────────
    //  PUT /barber-panel/services/{id}
    // ─────────────────────────────────────────────────────────
    public function updateService(Request $request, $id)
    {
        $barber = $this->requireOwner($request);

        $service = Service::where('id', $id)
            ->where('shop_id', $barber->shop_id)
            ->firstOrFail();

        $validator = Validator::make($request->all(), [
            'name'             => 'sometimes|required|string|max:255',
            'description'      => 'nullable|string',
            'base_price'       => 'sometimes|numeric|min:0',
            'price'            => 'sometimes|numeric|min:0',
            'duration_minutes' => 'sometimes|required|integer|min:5',
            'is_active'        => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $updateData = $request->only(['name', 'description', 'duration_minutes', 'is_active']);
        if ($request->has('base_price')) $updateData['base_price'] = $request->base_price;
        elseif ($request->has('price'))  $updateData['base_price'] = $request->price;
        $service->update($updateData);

        return response()->json($service);
    }

    // ─────────────────────────────────────────────────────────
    //  DELETE /barber-panel/services/{id}
    // ─────────────────────────────────────────────────────────
    public function deleteService(Request $request, $id)
    {
        $barber = $this->requireOwner($request);

        $service = Service::where('id', $id)
            ->where('shop_id', $barber->shop_id)
            ->firstOrFail();

        // Detach from all barbers first (pivot table)
        $service->barbers()->detach();
        $service->delete();

        return response()->json(['message' => 'Service deleted.']);
    }

    // ─────────────────────────────────────────────────────────
    //  PATCH /barber-panel/services/{id}/toggle
    // ─────────────────────────────────────────────────────────
    public function toggleService(Request $request, $id)
    {
        $barber = $this->requireOwner($request);

        $service = Service::where('id', $id)
            ->where('shop_id', $barber->shop_id)
            ->firstOrFail();

        $service->update(['is_active' => !$service->is_active]);

        return response()->json([
            'message'   => 'Service status updated.',
            'is_active' => $service->is_active,
        ]);
    }

    // ─────────────────────────────────────────────────────────
    //  GET /barber-panel/profile
    // ─────────────────────────────────────────────────────────
    public function getProfile(Request $request)
    {
        $barber = $this->getBarberProfile($request);
        if (!$barber) {
            return response()->json(['error' => 'Barber profile not found.'], 404);
        }

        $barber->load(['user', 'shop']);

        return response()->json([
            'id'               => $barber->id,
            'name'             => $barber->user?->name,
            'email'            => $barber->user?->email,
            'phone'            => $barber->user?->phone,
            'specialization'   => $barber->specialization,
            'experience_years' => $barber->experience_years,
            'bio'              => $barber->bio,
            'rating'           => $barber->rating,
            'shop'             => [
                'name' => $barber->shop?->name,
            ]
        ]);
    }

    // ─────────────────────────────────────────────────────────
    //  PUT /barber-panel/profile
    // ─────────────────────────────────────────────────────────
    public function updateProfile(Request $request)
    {
        $barber = $this->getBarberProfile($request);
        if (!$barber) {
            return response()->json(['error' => 'Barber profile not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name'             => 'required|string|max:255',
            'phone'            => 'nullable|string|max:20',
            'specialization'   => 'nullable|string|max:255',
            'experience_years' => 'nullable|integer|min:0',
            'bio'              => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Update User info
        $barber->user->update([
            'name'  => $request->name,
            'phone' => $request->phone,
        ]);

        // Update Barber info
        $barber->update([
            'specialization'   => $request->specialization,
            'experience_years' => $request->experience_years ?? 0,
            'bio'              => $request->bio,
        ]);

        $barber->load(['user', 'shop']);

        return response()->json([
            'message'          => 'Profile updated successfully.',
            'name'             => $barber->user?->name,
            'email'            => $barber->user?->email,
            'phone'            => $barber->user?->phone,
            'specialization'   => $barber->specialization,
            'experience_years' => $barber->experience_years,
            'bio'              => $barber->bio,
            'rating'           => $barber->rating,
            'shop'             => [
                'name' => $barber->shop?->name,
            ]
        ]);
    }
}

