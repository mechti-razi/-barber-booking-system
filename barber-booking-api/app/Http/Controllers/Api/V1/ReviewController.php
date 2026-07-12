<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Review;

class ReviewController extends Controller
{
    /**
     * Display a listing of reviews.
     */
    public function index(Request $request)
    {
        $query = Review::with(['user', 'barber', 'appointment']);
        
        if ($request->has('barber_id')) {
            $query->where('barber_id', $request->barber_id);
        }
        
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        
        $reviews = $query->orderBy('created_at', 'desc')->get();
        return response()->json($reviews);
    }

    /**
     * Store a newly created review.
     * Only the client who owns the completed appointment may leave a review.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'appointment_id' => 'required|exists:appointments,id',
            'rating'         => 'required|integer|min:1|max:5',
            'comment'        => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Load the appointment
        $appointment = \App\Models\Appointment::findOrFail($request->appointment_id);

        // Must be the client who booked
        if ($appointment->user_id !== $user->id) {
            return response()->json(['error' => 'You can only review your own appointments.'], 403);
        }

        // Appointment must be completed
        if ($appointment->status !== 'completed') {
            return response()->json(['error' => 'You can only review a completed appointment.'], 422);
        }

        // One review per appointment
        if (Review::where('appointment_id', $appointment->id)->exists()) {
            return response()->json(['error' => 'You have already reviewed this appointment.'], 422);
        }

        $review = Review::create([
            'user_id'        => $user->id,
            'barber_id'      => $appointment->barber_id,
            'appointment_id' => $appointment->id,
            'rating'         => $request->rating,
            'comment'        => $request->comment,
        ]);

        // Recalculate barber average rating
        $barber = $review->barber;
        $barber->rating = round($barber->reviews()->avg('rating'), 2);
        $barber->save();

        return response()->json($review->load(['user', 'barber']), 201);
    }

    /**
     * Display the specified review.
     */
    public function show($id)
    {
        $review = Review::with(['user', 'barber', 'appointment'])->findOrFail($id);
        return response()->json($review);
    }

    /**
     * Update the specified review.
     */
    public function update(Request $request, $id)
    {
        $review = Review::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'rating' => 'sometimes|required|integer|min:1|max:5',
            'comment' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $review->update($request->all());
        
        // Update barber rating
        $barber = $review->barber;
        $allReviews = $barber->reviews;
        $avgRating = $allReviews->avg('rating');
        $barber->rating = round($avgRating, 2);
        $barber->save();
        
        return response()->json($review);
    }

    /**
     * Remove the specified review.
     */
    public function destroy($id)
    {
        $review = Review::findOrFail($id);
        $barber = $review->barber;
        $review->delete();
        
        // Update barber rating
        $allReviews = $barber->reviews;
        $avgRating = $allReviews->count() > 0 ? $allReviews->avg('rating') : 0;
        $barber->rating = round($avgRating, 2);
        $barber->save();
        
        return response()->json(['message' => 'Review deleted successfully']);
    }
}
