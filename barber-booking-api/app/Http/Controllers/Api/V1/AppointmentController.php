<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Appointment;

class AppointmentController extends Controller
{
    /**
     * Display a listing of appointments.
     */
    public function index(Request $request)
    {
        $query = Appointment::with(['user', 'shop', 'barber', 'service']);
        
        // Filter by user role/permissions
        if ($request->user()) {
            if ($request->user()->role === 'admin') {
                // Admins only see subscription records
                $query->where('is_subscription', true);
            } else {
                // Clients and barbers do not see subscription records by default
                if (!filter_var($request->input('include_subscriptions', false), FILTER_VALIDATE_BOOLEAN)) {
                    $query->where('is_subscription', false);
                }
                
                if ($request->user()->role === 'client') {
                    $query->where('user_id', $request->user()->id);
                } elseif ($request->user()->role === 'barber') {
                    $query->where('barber_id', $request->user()->barber->id);
                }
            }
        } else {
            // Unauthenticated requests filter out subscriptions by default
            $query->where('is_subscription', false);
        }
        
        if ($request->has('shop_id')) {
            $query->where('shop_id', $request->shop_id);
        }
        
        if ($request->has('barber_id')) {
            $query->where('barber_id', $request->barber_id);
        }

        // Filter by specific date (YYYY-MM-DD) — required for slot availability checks
        if ($request->has('date') && $request->date) {
            $query->whereDate('appointment_date', $request->date);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // When checking availability for a barber on a date, exclude cancelled/no-show
        if ($request->has('barber_id') && $request->has('date')) {
            $query->whereNotIn('status', ['cancelled', 'no_show']);
        }
        
        $appointments = $query->orderBy('appointment_date', 'desc')
            ->orderBy('appointment_time', 'desc')
            ->get();
        
        return response()->json($appointments);
    }

    /**
     * Store a newly created appointment.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'shop_id' => 'required|exists:shops,id',
            'barber_id' => 'required|exists:barbers,id',
            'service_id' => 'required|exists:services,id',
            'appointment_date' => 'required|date|after_or_equal:today',
            'appointment_time' => 'required|date_format:H:i',
            'duration_minutes' => 'required|integer|min:5',
            'total_price' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $appointment = Appointment::create(array_merge($request->all(), [
            'status' => 'pending'
        ]));
        
        return response()->json($appointment, 201);
    }

    /**
     * Display the specified appointment.
     */
    public function show($id)
    {
        $appointment = Appointment::with(['user', 'shop', 'barber', 'service', 'review'])->findOrFail($id);
        return response()->json($appointment);
    }

    /**
     * Update the specified appointment.
     */
    public function update(Request $request, $id)
    {
        $appointment = Appointment::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'status' => 'sometimes|required|in:pending,confirmed,completed,cancelled,no_show',
            'notes' => 'nullable|string',
            'cancellation_reason' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->has('status') && $request->status === 'cancelled') {
            $appointment->cancelled_at = now();
        }

        $appointment->update($request->all());
        return response()->json($appointment);
    }

    /**
     * Remove the specified appointment.
     */
    public function destroy($id)
    {
        $appointment = Appointment::findOrFail($id);
        $appointment->delete();
        return response()->json(['message' => 'Appointment deleted successfully']);
    }
}
