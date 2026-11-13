<?php

use App\Models\Book;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('returns 403 when a customer requests admin metrics', function () {
    $customer = User::factory()->create(['role' => 'customer']);

    $this->actingAs($customer, 'sanctum')
        ->getJson('/api/admin/stats')
        ->assertForbidden();
});

test('allows an admin to manage authors and genres', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin, 'sanctum');

    $author = $this->postJson('/api/authors', [
        'name' => 'Nadia Prameswari',
        'bio' => 'Penulis cerita keluarga.',
    ])->assertCreated()
        ->assertJsonPath('data.name', 'Nadia Prameswari')
        ->json('data');

    $this->putJson('/api/authors/'.$author['id'], ['bio' => 'Penulis novel dan cerita keluarga.'])
        ->assertOk()
        ->assertJsonPath('data.bio', 'Penulis novel dan cerita keluarga.');

    $genre = $this->postJson('/api/genres', [
        'name' => 'Perjalanan',
        'description' => 'Kisah perjalanan dan penemuan diri.',
    ])->assertCreated()
        ->assertJsonPath('data.name', 'Perjalanan')
        ->json('data');

    $this->deleteJson('/api/genres/'.$genre['id'])->assertOk();
    $this->assertDatabaseMissing('genres', ['id' => $genre['id']]);
});

test('reports completed sales and active catalog metrics to admins', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $customer = User::factory()->create(['role' => 'customer']);
    User::factory()->create(['role' => 'customer']);
    $book = Book::factory()->create();
    $order = Transaction::factory()->create([
        'customer_id' => $customer->id,
        'status' => Transaction::STATUS_COMPLETED,
        'total_amount' => 37500,
    ]);
    TransactionItem::factory()->for($order)->for($book)->create([
        'title' => $book->title,
        'unit_price' => 37500,
        'quantity' => 1,
    ]);

    $this->actingAs($admin, 'sanctum')
        ->getJson('/api/admin/stats')
        ->assertOk()
        ->assertJsonPath('data.total_sales', '37500.00')
        ->assertJsonPath('data.total_books', 1)
        ->assertJsonPath('data.total_customers', 2)
        ->assertJsonPath('data.total_transactions', 1);
});

test('returns 422 when an admin tries to cancel a completed order', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $book = Book::factory()->create(['stock' => 4]);
    $order = Transaction::factory()->create(['status' => Transaction::STATUS_COMPLETED]);
    TransactionItem::factory()->for($order)->for($book)->create(['quantity' => 1]);

    $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/transactions/'.$order->id, ['status' => Transaction::STATUS_CANCELLED])
        ->assertInvalid(['status']);

    $this->assertDatabaseHas('books', ['id' => $book->id, 'stock' => 4]);
});
