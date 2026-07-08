<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Service;

class ServiceController extends Controller
{
    /**
     * Display a listing of services for a shop.
     */
    public function index(Request $request)
    {
        $query = Service::with(['shop', 'barbers']);
        
        if ($request->has('shop_id')) {
            $query->where('shop_id', $request->shop_id);
        }
        
        $services = $query->where('is_active', true)->get();
        return response()->json($services);
    }

    /**
     * Store a newly created service.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'shop_id' => 'required|exists:shops,id',
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255',
            'description' => 'nullable|string',
            'duration_minutes' => 'required|integer|min:5',
            'base_price' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $service = Service::create($request->all());

        // Attach this service to all barbers of the same shop
        $barbers = \App\Models\Barber::where('shop_id', $service->shop_id)->get();
        foreach ($barbers as $barber) {
            $barber->services()->attach($service->id, [
                'price' => $service->base_price,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json($service, 201);
    }

    /**
     * Display the specified service.
     */
    public function show($id)
    {
        $service = Service::with(['shop', 'barbers'])->findOrFail($id);
        return response()->json($service);
    }

    /**
     * Update the specified service.
     */
    public function update(Request $request, $id)
    {
        $service = Service::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'duration_minutes' => 'sometimes|required|integer|min:5',
            'base_price' => 'sometimes|required|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $service->update($request->all());
        return response()->json($service);
    }

    /**
     * Remove the specified service.
     */
    public function destroy($id)
    {
        $service = Service::findOrFail($id);
        $service->delete();
        return response()->json(['message' => 'Service deleted successfully']);
    }
}
