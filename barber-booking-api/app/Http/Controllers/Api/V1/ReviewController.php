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
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'barber_id' => 'required|exists:barbers,id',
            'appointment_id' => 'nullable|exists:appointments,id|unique:reviews',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $review = Review::create($request->all());
        
        // Update barber rating
        $barber = $review->barber;
        $allReviews = $barber->reviews;
        $avgRating = $allReviews->avg('rating');
        $barber->rating = round($avgRating, 2);
        $barber->save();
        
        return response()->json($review, 201);
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
