<?php

namespace App\Services;

use App\Models\Book;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderService
{
    /**
     * @param  array<int, array{book_id: int, quantity: int}>  $items
     */
    public function create(User $customer, array $items): Transaction
    {
        return DB::transaction(function () use ($customer, $items): Transaction {
            $books = $this->lockBooks($items);
            $this->reserveStock($books, $items);

            $transaction = Transaction::create([
                'order_number' => 'BS-'.now()->format('Ymd').'-'.Str::upper(Str::random(12)),
                'customer_id' => $customer->id,
                'total_amount' => 0,
                'status' => Transaction::STATUS_PENDING,
            ]);

            $this->createItems($transaction, $books, $items);
            $transaction->update([
                'total_amount' => $this->totalForItems($books, $items),
            ]);

            return $transaction->load(['customer', 'items.book.author', 'items.book.genre']);
        }, attempts: 3);
    }

    /**
     * @param  array<int, array{book_id: int, quantity: int}>  $items
     */
    public function updatePending(Transaction $transaction, array $items): Transaction
    {
        return DB::transaction(function () use ($transaction, $items): Transaction {
            $order = Transaction::query()->lockForUpdate()->findOrFail($transaction->id);

            if ($order->status !== Transaction::STATUS_PENDING) {
                throw ValidationException::withMessages([
                    'status' => 'Hanya pesanan pending yang dapat diubah.',
                ]);
            }

            if ($order->snap_token) {
                throw ValidationException::withMessages([
                    'status' => 'Pesanan tidak dapat diubah setelah pembayaran Midtrans dimulai.',
                ]);
            }

            $previousItems = $order->items()->get();
            $books = $this->lockBooks($items, $previousItems->pluck('book_id')->filter()->all());
            $this->restoreItemsStock($previousItems, $books);
            $this->reserveStock($books, $items);

            $order->items()->delete();
            $this->createItems($order, $books, $items);
            $order->update([
                'total_amount' => $this->totalForItems($books, $items),
            ]);

            return $order->load(['customer', 'items.book.author', 'items.book.genre']);
        }, attempts: 3);
    }

    public function changeStatus(Transaction $transaction, string $nextStatus): Transaction
    {
        return DB::transaction(function () use ($transaction, $nextStatus): Transaction {
            $order = Transaction::query()->lockForUpdate()->findOrFail($transaction->id);

            if ($order->status === $nextStatus) {
                return $order->load(['customer', 'items.book.author', 'items.book.genre']);
            }

            if ($order->status === Transaction::STATUS_PAID && $nextStatus === Transaction::STATUS_CANCELLED) {
                throw ValidationException::withMessages([
                    'status' => 'Pesanan yang sudah dibayar memerlukan proses refund sebelum dibatalkan.',
                ]);
            }

            if (! $this->isAllowedTransition($order->status, $nextStatus)) {
                throw ValidationException::withMessages([
                    'status' => 'Perubahan status pesanan tidak diizinkan.',
                ]);
            }

            if ($nextStatus === Transaction::STATUS_CANCELLED) {
                $items = $order->items()->get();
                $books = $this->lockBooks([], $items->pluck('book_id')->filter()->all());
                $this->restoreItemsStock($items, $books);
            }

            $order->update(['status' => $nextStatus]);

            return $order->load(['customer', 'items.book.author', 'items.book.genre']);
        }, attempts: 3);
    }

    public function softDelete(Transaction $transaction): void
    {
        DB::transaction(function () use ($transaction): void {
            $order = Transaction::query()->lockForUpdate()->findOrFail($transaction->id);

            if (! in_array($order->status, [Transaction::STATUS_PENDING, Transaction::STATUS_CANCELLED], true)) {
                throw ValidationException::withMessages([
                    'status' => 'Pesanan paid atau completed tidak dapat dihapus.',
                ]);
            }

            if ($order->status === Transaction::STATUS_PENDING && $order->snap_token) {
                throw ValidationException::withMessages([
                    'status' => 'Batalkan pembayaran Midtrans sebelum menghapus pesanan.',
                ]);
            }

            if ($order->status === Transaction::STATUS_PENDING) {
                $items = $order->items()->get();
                $books = $this->lockBooks([], $items->pluck('book_id')->filter()->all());
                $this->restoreItemsStock($items, $books);
            }

            $order->delete();
        }, attempts: 3);
    }

    /**
     * @param  array<int, array{book_id: int, quantity: int}>  $items
     * @param  array<int, int|null>  $additionalBookIds
     * @return Collection<int, Book>
     */
    private function lockBooks(array $items, array $additionalBookIds = []): Collection
    {
        $bookIds = collect($items)->pluck('book_id')
            ->merge($additionalBookIds)
            ->filter()
            ->unique()
            ->sort()
            ->values();

        return Book::withTrashed()
            ->whereKey($bookIds)
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');
    }

    /**
     * @param  Collection<int, Book>  $books
     * @param  array<int, array{book_id: int, quantity: int}>  $items
     */
    private function reserveStock(Collection $books, array $items): void
    {
        foreach ($items as $item) {
            $book = $books->get($item['book_id']);

            if (! $book || $book->trashed() || $book->stock < $item['quantity']) {
                throw ValidationException::withMessages([
                    'items' => 'Stok buku tidak mencukupi atau buku tidak tersedia.',
                ]);
            }

            $updated = Book::query()
                ->whereKey($book->id)
                ->where('stock', '>=', $item['quantity'])
                ->decrement('stock', $item['quantity']);

            if ($updated !== 1) {
                throw ValidationException::withMessages([
                    'items' => 'Stok buku berubah. Muat ulang keranjang dan coba lagi.',
                ]);
            }

            $book->stock -= $item['quantity'];
        }
    }

    /**
     * @param  Collection<int, TransactionItem>  $items
     * @param  Collection<int, Book>  $books
     */
    private function restoreItemsStock(Collection $items, Collection $books): void
    {
        foreach ($items as $item) {
            $book = $books->get($item->book_id);

            if ($book) {
                Book::withTrashed()->whereKey($book->id)->increment('stock', $item->quantity);
                $book->stock += $item->quantity;
            }
        }
    }

    /**
     * @param  Collection<int, Book>  $books
     * @param  array<int, array{book_id: int, quantity: int}>  $items
     */
    private function createItems(Transaction $transaction, Collection $books, array $items): void
    {
        foreach ($items as $item) {
            $book = $books->get($item['book_id']);
            $transaction->items()->create([
                'book_id' => $book->id,
                'title' => $book->title,
                'unit_price' => $book->price,
                'quantity' => $item['quantity'],
            ]);
        }
    }

    /**
     * @param  Collection<int, Book>  $books
     * @param  array<int, array{book_id: int, quantity: int}>  $items
     */
    private function totalForItems(Collection $books, array $items): string
    {
        $cents = collect($items)->sum(function (array $item) use ($books): int {
            return (int) round((float) $books->get($item['book_id'])->price * 100) * $item['quantity'];
        });

        return number_format($cents / 100, 2, '.', '');
    }

    private function isAllowedTransition(string $currentStatus, string $nextStatus): bool
    {
        return match ($currentStatus) {
            Transaction::STATUS_PENDING => in_array($nextStatus, [Transaction::STATUS_PAID, Transaction::STATUS_CANCELLED], true),
            Transaction::STATUS_PAID => in_array($nextStatus, [Transaction::STATUS_COMPLETED, Transaction::STATUS_CANCELLED], true),
            default => false,
        };
    }
}
