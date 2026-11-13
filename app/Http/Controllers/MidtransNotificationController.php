<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Services\MidtransSnapService;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MidtransNotificationController extends Controller
{
    public function __invoke(Request $request, MidtransSnapService $midtrans, OrderService $orders): JsonResponse
    {
        $notification = $request->validate([
            'order_id' => ['required', 'string', 'max:50'],
            'status_code' => ['required', 'string', 'max:3'],
            'gross_amount' => ['required', 'string', 'numeric', 'min:0'],
            'signature_key' => ['required', 'string', 'size:128'],
            'transaction_status' => ['required', 'string', 'max:30'],
            'fraud_status' => ['nullable', 'string', 'max:30'],
        ]);

        if (! $midtrans->hasServerKey()) {
            return response()->json([
                'success' => false,
                'message' => 'Midtrans Server Key belum dikonfigurasi.',
            ], 503);
        }

        if (! $midtrans->hasValidNotificationSignature($notification)) {
            return response()->json([
                'success' => false,
                'message' => 'Signature notifikasi Midtrans tidak valid.',
            ], 403);
        }

        $order = Transaction::query()
            ->where('order_number', $notification['order_id'])
            ->first();

        if (! $order) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan.',
            ], 404);
        }

        if (! $midtrans->notificationAmountMatches((string) $order->total_amount, $notification['gross_amount'])) {
            Log::warning('Midtrans notification amount did not match the order.', [
                'order_id' => $order->order_number,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Jumlah pembayaran tidak sesuai dengan pesanan.',
            ], 422);
        }

        $nextStatus = match ($notification['transaction_status']) {
            'settlement' => Transaction::STATUS_PAID,
            'capture' => ($notification['fraud_status'] ?? null) === 'accept' ? Transaction::STATUS_PAID : null,
            'deny', 'cancel', 'expire' => Transaction::STATUS_CANCELLED,
            default => null,
        };

        if ($order->status === Transaction::STATUS_PENDING && $nextStatus !== null) {
            $orders->changeStatus($order, $nextStatus);
        }

        return response()->json(['success' => true]);
    }
}
