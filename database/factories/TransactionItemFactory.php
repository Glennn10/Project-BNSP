<?php

namespace Database\Factories;

use App\Models\Book;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TransactionItem>
 */
class TransactionItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'transaction_id' => Transaction::factory(),
            'book_id' => Book::factory(),
            'title' => fake()->sentence(3),
            'unit_price' => fake()->randomFloat(2, 10000, 300000),
            'quantity' => fake()->numberBetween(1, 5),
        ];
    }
}
