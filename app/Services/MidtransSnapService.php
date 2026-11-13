<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use InvalidArgumentException;
use UnexpectedValueException;

class MidtransSnapService
{
    public function isConfigured(): bool
    {
        return $this->hasServerKey() && filled(config('services.midtrans.client_key'));
    }

    public function hasServerKey(): bool
    {
        return filled(config('services.midtrans.server_key'));
    }

    public function clientKey(): string
    {
        $clientKey = config('services.midtrans.client_key');

        if (! is_string($clientKey) || trim($clientKey) === '') {
            throw new UnexpectedValueException('Midtrans Client Key is not configured.');
        }

        return $clientKey;
    }

    public function isProduction(): bool
    {
        return (bool) config('services.midtrans.is_production');
    }

    public function createSnapToken(Transaction $transaction): string
    {
        $serverKey = config('services.midtrans.server_key');

        if (! is_string($serverKey) || trim($serverKey) === '') {
            throw new UnexpectedValueException('Midtrans Server Key is not configured.');
        }

        $transaction->loadMissing(['customer', 'items']);
        $grossAmount = (int) round((float) $transaction->total_amount);
        $itemDetails = $transaction->items
            ->map(fn (TransactionItem $item): array => [
                'id' => (string) ($item->book_id ?? 'removed-'.$item->id),
                'price' => (int) round((float) $item->unit_price),
                'quantity' => $item->quantity,
                'name' => Str::limit($item->title, 50, ''),
            ])
            ->all();
        $itemDetailsTotal = array_sum(array_map(
            fn (array $item): int => $item['price'] * $item['quantity'],
            $itemDetails,
        ));

        if ($grossAmount < 1 || $itemDetails === [] || $itemDetailsTotal !== $grossAmount) {
            throw new InvalidArgumentException('Total pesanan tidak valid untuk pembayaran Midtrans.');
        }

        $response = Http::withBasicAuth($serverKey, '')
            ->acceptJson()
            ->asJson()
            ->connectTimeout(3)
            ->timeout(15)
            ->post($this->snapBaseUrl().'/v1/transactions', [
                'transaction_details' => [
                    'order_id' => $transaction->order_number,
                    'gross_amount' => $grossAmount,
                ],
                'item_details' => $itemDetails,
                'customer_details' => [
                    'first_name' => Str::limit($transaction->customer->name, 50, ''),
                    'email' => $transaction->customer->email,
                ],
                'credit_card' => [
                    'secure' => true,
                ],
            ])
            ->throw();

        $token = $response->json('token');

        if (! is_string($token) || $token === '') {
            throw new UnexpectedValueException('Midtrans did not return a Snap token.');
        }

        return $token;
    }

    public function cancelSnapTransaction(Transaction $transaction): bool
    {
        $serverKey = config('services.midtrans.server_key');

        if (! is_string($serverKey) || trim($serverKey) === '') {
            throw new UnexpectedValueException('Midtrans Server Key is not configured.');
        }

        $response = Http::withBasicAuth($serverKey, '')
            ->acceptJson()
            ->asJson()
            ->connectTimeout(3)
            ->timeout(15)
            ->post($this->apiBaseUrl().'/v2/'.rawurlencode($transaction->order_number).'/cancel')
            ->throw();

        return $response->json('transaction_status') === 'cancel';
    }

    /**
     * @param  array{order_id: string, status_code: string, gross_amount: string, signature_key: string}  $notification
     */
    public function hasValidNotificationSignature(array $notification): bool
    {
        $serverKey = config('services.midtrans.server_key');

        if (! is_string($serverKey) || trim($serverKey) === '') {
            return false;
        }

        $expectedSignature = hash(
            'sha512',
            $notification['order_id'].$notification['status_code'].$notification['gross_amount'].$serverKey,
        );

        return hash_equals($expectedSignature, $notification['signature_key']);
    }

    public function notificationAmountMatches(string $orderAmount, string $grossAmount): bool
    {
        return (int) round((float) $orderAmount * 100) === (int) round((float) $grossAmount * 100);
    }

    private function snapBaseUrl(): string
    {
        return $this->isProduction()
            ? 'https://app.midtrans.com/snap'
            : 'https://app.sandbox.midtrans.com/snap';
    }

    private function apiBaseUrl(): string
    {
        return $this->isProduction()
            ? 'https://api.midtrans.com'
            : 'https://api.sandbox.midtrans.com';
    }
}
