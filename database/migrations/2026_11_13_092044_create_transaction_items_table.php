<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('transaction_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('book_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->decimal('unit_price', 10, 2);
            $table->unsignedInteger('quantity')->default(1);
            $table->timestamps();
        });

        DB::table('transactions')->orderBy('id')->chunkById(500, function ($transactions): void {
            foreach ($transactions as $transaction) {
                $book = DB::table('books')->where('id', $transaction->book_id)->first();
                $quantity = max(1, (int) $transaction->quantity);

                DB::table('transaction_items')->insert([
                    'transaction_id' => $transaction->id,
                    'book_id' => $book?->id,
                    'title' => $book?->title ?? 'Buku yang tidak lagi tersedia',
                    'unit_price' => number_format((float) $transaction->total_amount / $quantity, 2, '.', ''),
                    'quantity' => $quantity,
                    'created_at' => $transaction->created_at,
                    'updated_at' => $transaction->updated_at,
                ]);
            }
        });

        Schema::table('transactions', function (Blueprint $table): void {
            $table->dropForeign(['book_id']);
            $table->dropColumn(['book_id', 'quantity']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::table('transaction_items')->select('transaction_id')->groupBy('transaction_id')->havingRaw('COUNT(*) > 1')->exists()) {
            throw new RuntimeException('Cannot roll back grouped orders without losing order items.');
        }

        Schema::table('transactions', function (Blueprint $table): void {
            $table->foreignId('book_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('quantity')->default(1);
        });

        foreach (DB::table('transaction_items')->get() as $item) {
            DB::table('transactions')
                ->where('id', $item->transaction_id)
                ->update([
                    'book_id' => $item->book_id,
                    'quantity' => $item->quantity,
                ]);
        }

        Schema::dropIfExists('transaction_items');
    }
};
