<?php

namespace Database\Factories;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Transaction>
 */
class TransactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_number' => 'BS-'.fake()->unique()->numerify('########-########'),
            'customer_id' => User::factory(),
            'total_amount' => fake()->randomFloat(2, 10000, 1000000),
            'status' => Transaction::STATUS_PENDING,
        ];
    }
}
