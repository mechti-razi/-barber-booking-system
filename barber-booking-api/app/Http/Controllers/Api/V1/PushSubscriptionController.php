<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PushSubscriptionController extends Controller
{
    /**
     * Save (or update) a push subscription for the authenticated user.
     * Called by the Angular frontend after the browser grants permission.
     */
    public function subscribe(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'endpoint'         => 'required|string',
            'public_key'       => 'nullable|string',
            'auth_token'       => 'nullable|string',
            'content_encoding' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Upsert: one record per user+endpoint combination
        PushSubscription::updateOrCreate(
            [
                'user_id'       => $request->user()->id,
                'endpoint_hash' => hash('sha256', $request->endpoint),
            ],
            [
                'endpoint'         => $request->endpoint,
                'public_key'       => $request->public_key,
                'auth_token'       => $request->auth_token,
                'content_encoding' => $request->content_encoding ?? 'aesgcm',
            ]
        );

        return response()->json(['message' => 'Subscribed to push notifications.'], 200);
    }

    /**
     * Remove a push subscription (user opted out or browser revoked permission).
     */
    public function unsubscribe(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'endpoint' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        PushSubscription::where('user_id', $request->user()->id)
            ->where('endpoint_hash', hash('sha256', $request->endpoint))
            ->delete();

        return response()->json(['message' => 'Unsubscribed from push notifications.'], 200);
    }

    /**
     * Return the VAPID public key so the frontend can subscribe.
     */
    public function vapidPublicKey()
    {
        return response()->json([
            'vapid_public_key' => config('webpush.vapid.public_key'),
        ]);
    }
}
