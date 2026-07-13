<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Shop;

class ShopController extends Controller
{
    /**
     * Display a listing of shops.
     */
    public function index()
    {
        $shops = Shop::with(['owner', 'barbers.user', 'barbers.workingSchedules', 'services'])->where('status', 'active')->get();
        return response()->json($shops);
    }

    /**
     * Store a newly created shop.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'owner_id' => 'required|exists:users,id',
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:shops',
            'address' => 'required|string',
            'phone' => 'required|string|max:20',
            'email' => 'required|string|email|max:255',
            'description' => 'nullable|string',
            'logo_url' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $shop = Shop::create($request->all());
        return response()->json($shop, 201);
    }

    /**
     * Display the specified shop.
     */
    public function show($id)
    {
        $shop = Shop::with(['owner', 'barbers.user', 'barbers.workingSchedules', 'services'])->findOrFail($id);
        return response()->json($shop);
    }

    /**
     * Update the specified shop.
     */
    public function update(Request $request, $id)
    {
        $shop = Shop::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|required|string|max:255|unique:shops,slug,' . $id,
            'address' => 'sometimes|required|string',
            'phone' => 'sometimes|required|string|max:20',
            'email' => 'sometimes|required|string|email|max:255',
            'description' => 'nullable|string',
            'logo_url' => 'nullable|string',
            'status' => 'sometimes|required|in:active,inactive,suspended',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $shop->update($request->all());
        return response()->json($shop);
    }

    /**
     * Remove the specified shop.
     */
    public function destroy($id)
    {
        $shop = Shop::findOrFail($id);
        $shop->delete();
        return response()->json(['message' => 'Shop deleted successfully']);
    }
}
