<?php

namespace Database\Seeders;

use App\Models\Book;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TransactionSeeder extends Seeder
{
    public function run(): void
    {
        $customer = User::where('role', 'customer')->first();

        if (! $customer) {
            throw new \RuntimeException('Seed the development customer account before seeding orders.');
        }

        $orders = [
            ['status' => Transaction::STATUS_PENDING, 'items' => [['Laskar Pelangi', 1], ['Bumi', 1]]],
            ['status' => Transaction::STATUS_PAID, 'items' => [['Bumi Manusia', 1]]],
            ['status' => Transaction::STATUS_COMPLETED, 'items' => [['Supernova: Ksatria, Putri, dan Bintang Jatuh', 1], ['Kambing Jantan', 2]]],
            ['status' => Transaction::STATUS_CANCELLED, 'items' => [['Sang Pemimpi', 1]]],
            ['status' => Transaction::STATUS_COMPLETED, 'items' => [['Bulan', 1]]],
            ['status' => Transaction::STATUS_PAID, 'items' => [['Anak Semua Bangsa', 1]]],
        ];

        foreach ($orders as $index => $order) {
            $books = collect($order['items'])->map(function (array $item): array {
                return [
                    'book' => Book::query()->where('title', $item[0])->firstOrFail(),
                    'quantity' => $item[1],
                ];
            });
            $totalCents = $books->sum(fn (array $item): int => (int) round((float) $item['book']->price * 100) * $item['quantity']);

            DB::transaction(function () use ($customer, $index, $order, $books, $totalCents): void {
                $transaction = Transaction::withTrashed()->firstOrCreate(
                    ['order_number' => sprintf('BS-DEMO-%03d', $index + 1)],
                    [
                        'customer_id' => $customer->id,
                        'total_amount' => number_format($totalCents / 100, 2, '.', ''),
                        'status' => $order['status'],
                    ],
                );

                if (! $transaction->wasRecentlyCreated) {
                    return;
                }

                foreach ($books as $item) {
                    $transaction->items()->create([
                        'book_id' => $item['book']->id,
                        'title' => $item['book']->title,
                        'unit_price' => $item['book']->price,
                        'quantity' => $item['quantity'],
                    ]);

                    if ($order['status'] !== Transaction::STATUS_CANCELLED) {
                        $item['book']->decrement('stock', $item['quantity']);
                    }
                }
            });
        }
    }
}
