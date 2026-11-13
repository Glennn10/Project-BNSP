<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Transaction;
use App\Models\User;
use App\Services\MidtransSnapService;
use App\Services\OrderService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;
use UnexpectedValueException;

class TransactionController extends Controller
{
    private const ITEM_RULES = [
        'items' => ['required', 'array', 'min:1', 'max:50'],
        'items.*.book_id' => ['required', 'integer', 'distinct', 'exists:books,id'],
        'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
    ];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', Rule::in($this->statuses())],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $transactions = Transaction::query()
            ->with(['customer:id,name,email', 'items.book.author', 'items.book.genre'])
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('order_number', 'like', '%'.$search.'%')
                        ->orWhereHas('customer', fn (Builder $customerQuery) => $customerQuery->where('name', 'like', '%'.$search.'%'))
                        ->orWhereHas('items', fn (Builder $itemQuery) => $itemQuery->where('title', 'like', '%'.$search.'%'));
                });
            })
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $transactions,
        ]);
    }

    public function customerIndex(Request $request): JsonResponse
    {
        $transactions = Transaction::query()
            ->whereBelongsTo($request->user(), 'customer')
            ->with(['items.book.author', 'items.book.genre'])
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $transactions,
        ]);
    }

    public function store(Request $request, OrderService $orders): JsonResponse
    {
        $data = $request->validate(self::ITEM_RULES);
        $this->ensureBooksAreAvailable($data['items']);

        $transaction = $orders->create($request->user(), $data['items']);

        return response()->json([
            'success' => true,
            'message' => 'Pesanan berhasil dibuat.',
            'data' => $transaction,
        ], 201);
    }

    public function createPayment(Request $request, Transaction $transaction, MidtransSnapService $midtrans): JsonResponse
    {
        $order = Transaction::query()
            ->whereBelongsTo($request->user(), 'customer')
            ->with(['customer', 'items'])
            ->findOrFail($transaction->id);

        if ($order->status !== Transaction::STATUS_PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'Pembayaran hanya tersedia untuk pesanan pending.',
            ], 422);
        }

        if (! $midtrans->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Midtrans belum dikonfigurasi. Isi MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di file .env.',
            ], 503);
        }

        if (! $order->snap_token) {
            try {
                $order->snap_token = $midtrans->createSnapToken($order);
                $order->save();
            } catch (ConnectionException|RequestException $exception) {
                report($exception);

                return response()->json([
                    'success' => false,
                    'message' => 'Midtrans tidak dapat membuat halaman pembayaran. Pesanan tetap pending; silakan coba lagi.',
                ], 502);
            } catch (InvalidArgumentException $exception) {
                report($exception);

                return response()->json([
                    'success' => false,
                    'message' => $exception->getMessage(),
                ], 422);
            } catch (UnexpectedValueException $exception) {
                report($exception);

                return response()->json([
                    'success' => false,
                    'message' => 'Konfigurasi Midtrans tidak valid.',
                ], 503);
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'snap_token' => $order->snap_token,
                'client_key' => $midtrans->clientKey(),
                'is_production' => $midtrans->isProduction(),
            ],
        ]);
    }

    public function show(Request $request, Transaction $transaction): JsonResponse
    {
        $transaction = Transaction::query()
            ->whereBelongsTo($request->user(), 'customer')
            ->with(['items.book.author', 'items.book.genre'])
            ->findOrFail($transaction->id);

        return response()->json([
            'success' => true,
            'data' => $transaction,
        ]);
    }

    public function update(Request $request, Transaction $transaction, OrderService $orders): JsonResponse
    {
        $transaction = Transaction::query()
            ->whereBelongsTo($request->user(), 'customer')
            ->findOrFail($transaction->id);

        $data = $request->validate(self::ITEM_RULES);
        $this->ensureBooksAreAvailable($data['items']);

        return response()->json([
            'success' => true,
            'message' => 'Pesanan pending berhasil diperbarui.',
            'data' => $orders->updatePending($transaction, $data['items']),
        ]);
    }

    public function adminUpdate(Request $request, Transaction $transaction, OrderService $orders, MidtransSnapService $midtrans): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in($this->statuses())],
        ]);

        if (
            $transaction->snap_token
            && $transaction->status === Transaction::STATUS_PENDING
            && $data['status'] === Transaction::STATUS_PAID
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Status pembayaran Midtrans diperbarui otomatis setelah notifikasi diterima.',
            ], 422);
        }

        if (
            $transaction->status === Transaction::STATUS_PENDING
            && $data['status'] === Transaction::STATUS_CANCELLED
            && $transaction->snap_token
        ) {
            if (! $midtrans->hasServerKey()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Midtrans Server Key belum dikonfigurasi sehingga pembayaran aktif tidak dapat dibatalkan.',
                ], 503);
            }

            try {
                if (! $midtrans->cancelSnapTransaction($transaction)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Midtrans belum mengonfirmasi pembatalan pembayaran.',
                    ], 409);
                }
            } catch (ConnectionException|RequestException|UnexpectedValueException $exception) {
                report($exception);

                return response()->json([
                    'success' => false,
                    'message' => 'Pembayaran tidak dapat dibatalkan di Midtrans. Status pesanan tidak diubah.',
                ], 502);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Status pesanan berhasil diperbarui.',
            'data' => $orders->changeStatus($transaction, $data['status']),
        ]);
    }

    public function destroy(Transaction $transaction, OrderService $orders): JsonResponse
    {
        $orders->softDelete($transaction);

        return response()->json([
            'success' => true,
            'message' => 'Pesanan berhasil diarsipkan.',
        ]);
    }

    public function stats(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'total_sales' => number_format(
                    (float) Transaction::query()->where('status', Transaction::STATUS_COMPLETED)->sum('total_amount'),
                    2,
                    '.',
                    '',
                ),
                'total_books' => Book::query()->count(),
                'total_customers' => User::query()->where('role', 'customer')->count(),
                'total_transactions' => Transaction::query()->count(),
            ],
        ]);
    }

    /**
     * @return array<int, string>
     */
    private function statuses(): array
    {
        return [
            Transaction::STATUS_PENDING,
            Transaction::STATUS_PAID,
            Transaction::STATUS_COMPLETED,
            Transaction::STATUS_CANCELLED,
        ];
    }

    /**
     * @param  array<int, array{book_id: int, quantity: int}>  $items
     */
    private function ensureBooksAreAvailable(array $items): void
    {
        $bookIds = array_column($items, 'book_id');
        $availableIds = Book::query()->whereKey($bookIds)->pluck('id')->all();

        if (count($availableIds) !== count($bookIds)) {
            abort(422, 'Satu atau beberapa buku tidak lagi tersedia.');
        }
    }
}
