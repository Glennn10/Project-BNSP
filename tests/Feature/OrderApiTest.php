<?php

use App\Models\Author;
use App\Models\Book;
use App\Models\Genre;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('creates one multi-item order and reserves the requested stock', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $author = Author::factory()->create();
    $genre = Genre::factory()->create();
    $firstBook = Book::factory()->for($author)->for($genre)->create(['price' => 12000, 'stock' => 5]);
    $secondBook = Book::factory()->for($author)->for($genre)->create(['price' => 7500, 'stock' => 6]);

    $response = $this->actingAs($customer, 'sanctum')->postJson('/api/transactions', [
        'items' => [
            ['book_id' => $firstBook->id, 'quantity' => 2],
            ['book_id' => $secondBook->id, 'quantity' => 1],
        ],
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.status', Transaction::STATUS_PENDING)
        ->assertJsonPath('data.total_amount', '31500.00')
        ->assertJsonCount(2, 'data.items');

    $this->assertDatabaseCount('transactions', 1);
    $this->assertDatabaseCount('transaction_items', 2);
    $this->assertDatabaseHas('transaction_items', [
        'transaction_id' => $response->json('data.id'),
        'book_id' => $firstBook->id,
        'quantity' => 2,
        'unit_price' => '12000.00',
    ]);
    $this->assertDatabaseHas('books', ['id' => $firstBook->id, 'stock' => 3]);
    $this->assertDatabaseHas('books', ['id' => $secondBook->id, 'stock' => 5]);
});

test('returns 422 and rolls back every stock change when one item is unavailable', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $availableBook = Book::factory()->create(['stock' => 4]);
    $outOfStockBook = Book::factory()->create(['stock' => 0]);

    $this->actingAs($customer, 'sanctum')
        ->postJson('/api/transactions', [
            'items' => [
                ['book_id' => $availableBook->id, 'quantity' => 2],
                ['book_id' => $outOfStockBook->id, 'quantity' => 1],
            ],
        ])
        ->assertInvalid(['items']);

    $this->assertDatabaseCount('transactions', 0);
    $this->assertDatabaseCount('transaction_items', 0);
    $this->assertDatabaseHas('books', ['id' => $availableBook->id, 'stock' => 4]);
});

test('allows a customer to replace items only on their pending order', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $firstBook = Book::factory()->create(['price' => 10000, 'stock' => 5]);
    $secondBook = Book::factory()->create(['price' => 20000, 'stock' => 5]);
    $this->actingAs($customer, 'sanctum');
    $order = $this->postJson('/api/transactions', [
        'items' => [['book_id' => $firstBook->id, 'quantity' => 2]],
    ])->assertCreated()->json('data');

    $this->putJson('/api/transactions/'.$order['id'], [
        'items' => [
            ['book_id' => $firstBook->id, 'quantity' => 1],
            ['book_id' => $secondBook->id, 'quantity' => 2],
        ],
    ])->assertOk()
        ->assertJsonPath('data.total_amount', '50000.00')
        ->assertJsonCount(2, 'data.items');

    $this->assertDatabaseHas('books', ['id' => $firstBook->id, 'stock' => 4]);
    $this->assertDatabaseHas('books', ['id' => $secondBook->id, 'stock' => 3]);
    $this->assertDatabaseCount('transaction_items', 2);
});

test('can increase an order quantity using the stock restored from its previous reservation', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $book = Book::factory()->create(['price' => 10000, 'stock' => 3]);
    $this->actingAs($customer, 'sanctum');
    $order = $this->postJson('/api/transactions', [
        'items' => [['book_id' => $book->id, 'quantity' => 2]],
    ])->assertCreated()->json('data');

    $this->putJson('/api/transactions/'.$order['id'], [
        'items' => [['book_id' => $book->id, 'quantity' => 3]],
    ])->assertOk()
        ->assertJsonPath('data.items.0.quantity', 3);

    $this->assertDatabaseHas('books', ['id' => $book->id, 'stock' => 0]);
});

test('returns 404 when a customer requests another customer order', function () {
    $owner = User::factory()->create(['role' => 'customer']);
    $otherCustomer = User::factory()->create(['role' => 'customer']);
    $order = Transaction::factory()->for($owner, 'customer')->create();

    $this->actingAs($otherCustomer, 'sanctum')
        ->getJson('/api/transactions/'.$order->id)
        ->assertNotFound();
});

test('restores reserved stock only once when an admin cancels an order', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $admin = User::factory()->create(['role' => 'admin']);
    $book = Book::factory()->create(['stock' => 5]);
    $order = $this->actingAs($customer, 'sanctum')
        ->postJson('/api/transactions', [
            'items' => [['book_id' => $book->id, 'quantity' => 2]],
        ])
        ->assertCreated()
        ->json('data');

    $this->assertDatabaseHas('books', ['id' => $book->id, 'stock' => 3]);

    $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/transactions/'.$order['id'], ['status' => Transaction::STATUS_CANCELLED])
        ->assertOk()
        ->assertJsonPath('data.status', Transaction::STATUS_CANCELLED);

    $this->assertDatabaseHas('books', ['id' => $book->id, 'stock' => 5]);

    $this->putJson('/api/admin/transactions/'.$order['id'], ['status' => Transaction::STATUS_CANCELLED])->assertOk();
    $this->assertDatabaseHas('books', ['id' => $book->id, 'stock' => 5]);
});

test('soft deletes a pending order and returns its reserved stock', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $admin = User::factory()->create(['role' => 'admin']);
    $book = Book::factory()->create(['stock' => 3]);
    $order = $this->actingAs($customer, 'sanctum')
        ->postJson('/api/transactions', [
            'items' => [['book_id' => $book->id, 'quantity' => 1]],
        ])
        ->assertCreated()
        ->json('data');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson('/api/admin/transactions/'.$order['id'])
        ->assertOk();

    $this->assertSoftDeleted('transactions', ['id' => $order['id']]);
    $this->assertDatabaseHas('books', ['id' => $book->id, 'stock' => 3]);
    $this->getJson('/api/admin/transactions')->assertOk()->assertJsonPath('data.total', 0);
});

test('rejects customer edits after an order is marked paid', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    $admin = User::factory()->create(['role' => 'admin']);
    $book = Book::factory()->create(['stock' => 5]);
    $order = $this->actingAs($customer, 'sanctum')
        ->postJson('/api/transactions', [
            'items' => [['book_id' => $book->id, 'quantity' => 1]],
        ])
        ->assertCreated()
        ->json('data');

    $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/transactions/'.$order['id'], ['status' => Transaction::STATUS_PAID])
        ->assertOk();

    $this->actingAs($customer, 'sanctum')
        ->putJson('/api/transactions/'.$order['id'], [
            'items' => [['book_id' => $book->id, 'quantity' => 2]],
        ])
        ->assertInvalid(['status']);

    $this->assertDatabaseHas('books', ['id' => $book->id, 'stock' => 4]);
});
