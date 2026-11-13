<?php

use App\Models\Book;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

test('creates and stores a Snap token for the customer order', function () {
    config([
        'services.midtrans.server_key' => 'SB-Mid-server-test',
        'services.midtrans.client_key' => 'SB-Mid-client-test',
        'services.midtrans.is_production' => false,
    ]);

    Http::fake([
        'https://app.sandbox.midtrans.com/snap/v1/transactions' => Http::response([
            'token' => 'snap-token-test',
        ], 201),
    ]);

    $customer = User::factory()->create(['role' => 'customer']);
    $book = Book::factory()->create(['price' => 12000, 'stock' => 0]);
    $order = Transaction::factory()->for($customer, 'customer')->create(['total_amount' => '24000.00']);
    $order->items()->create([
        'book_id' => $book->id,
        'title' => $book->title,
        'unit_price' => '12000.00',
        'quantity' => 2,
    ]);

    $this->actingAs($customer, 'sanctum')
        ->postJson('/api/transactions/'.$order->id.'/payment')
        ->assertOk()
        ->assertJsonPath('data.snap_token', 'snap-token-test')
        ->assertJsonPath('data.client_key', 'SB-Mid-client-test')
        ->assertJsonPath('data.is_production', false);

    $this->postJson('/api/transactions/'.$order->id.'/payment')
        ->assertOk()
        ->assertJsonPath('data.snap_token', 'snap-token-test');

    $this->assertDatabaseHas('transactions', [
        'id' => $order->id,
        'snap_token' => 'snap-token-test',
    ]);

    Http::assertSentCount(1);
    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://app.sandbox.midtrans.com/snap/v1/transactions'
        && $request->hasHeader('Authorization', 'Basic '.base64_encode('SB-Mid-server-test:'))
        && $request['transaction_details']['order_id'] === $order->order_number
        && $request['transaction_details']['gross_amount'] === 24000
        && $request['item_details'][0]['quantity'] === 2);
});

test('does not expose another customer order payment', function () {
    config([
        'services.midtrans.server_key' => 'SB-Mid-server-test',
        'services.midtrans.client_key' => 'SB-Mid-client-test',
    ]);
    Http::fake();

    $owner = User::factory()->create(['role' => 'customer']);
    $otherCustomer = User::factory()->create(['role' => 'customer']);
    $order = Transaction::factory()->for($owner, 'customer')->create();

    $this->actingAs($otherCustomer, 'sanctum')
        ->postJson('/api/transactions/'.$order->id.'/payment')
        ->assertNotFound();

    Http::assertNothingSent();
});

test('rejects invalid signatures and mismatched notification amounts', function () {
    $serverKey = 'SB-Mid-server-test';
    config(['services.midtrans.server_key' => $serverKey]);
    $customer = User::factory()->create(['role' => 'customer']);
    $book = Book::factory()->create(['price' => 12000, 'stock' => 4]);
    $order = Transaction::factory()->for($customer, 'customer')->create(['total_amount' => '12000.00']);
    $order->items()->create([
        'book_id' => $book->id,
        'title' => $book->title,
        'unit_price' => '12000.00',
        'quantity' => 1,
    ]);

    $notification = [
        'order_id' => $order->order_number,
        'status_code' => '200',
        'gross_amount' => '12000.00',
        'signature_key' => str_repeat('0', 128),
        'transaction_status' => 'settlement',
    ];

    $this->postJson('/api/payments/midtrans/notification', $notification)
        ->assertForbidden();

    $notification['gross_amount'] = '11000.00';
    $notification['signature_key'] = hash('sha512', $order->order_number.'20011000.00'.$serverKey);

    $this->postJson('/api/payments/midtrans/notification', $notification)
        ->assertUnprocessable();

    $this->assertDatabaseHas('transactions', [
        'id' => $order->id,
        'status' => Transaction::STATUS_PENDING,
    ]);
    $this->assertDatabaseHas('books', ['id' => $book->id, 'stock' => 4]);
});

test('marks a settled payment paid without restoring reserved stock', function () {
    $serverKey = 'SB-Mid-server-test';
    config(['services.midtrans.server_key' => $serverKey]);
    $customer = User::factory()->create(['role' => 'customer']);
    $book = Book::factory()->create(['price' => 12000, 'stock' => 3]);
    $order = Transaction::factory()->for($customer, 'customer')->create(['total_amount' => '12000.00']);
    $order->items()->create([
        'book_id' => $book->id,
        'title' => $book->title,
        'unit_price' => '12000.00',
        'quantity' => 1,
    ]);

    $notification = [
        'order_id' => $order->order_number,
        'status_code' => '200',
        'gross_amount' => '12000.00',
        'signature_key' => hash('sha512', $order->order_number.'20012000.00'.$serverKey),
        'transaction_status' => 'settlement',
    ];

    $this->postJson('/api/payments/midtrans/notification', $notification)
        ->assertOk()
        ->assertJsonPath('success', true);

    $this->assertDatabaseHas('transactions', [
        'id' => $order->id,
        'status' => Transaction::STATUS_PAID,
    ]);
    $this->assertDatabaseHas('books', ['id' => $book->id, 'stock' => 3]);
});

test('restores reserved stock only once when Midtrans expires an order', function () {
    $serverKey = 'SB-Mid-server-test';
    config(['services.midtrans.server_key' => $serverKey]);
    $customer = User::factory()->create(['role' => 'customer']);
    $book = Book::factory()->create(['price' => 12000, 'stock' => 3]);
    $order = Transaction::factory()->for($customer, 'customer')->create(['total_amount' => '12000.00']);
    $order->items()->create([
        'book_id' => $book->id,
        'title' => $book->title,
        'unit_price' => '12000.00',
        'quantity' => 1,
    ]);

    $notification = [
        'order_id' => $order->order_number,
        'status_code' => '200',
        'gross_amount' => '12000.00',
        'signature_key' => hash('sha512', $order->order_number.'20012000.00'.$serverKey),
        'transaction_status' => 'expire',
    ];

    $this->postJson('/api/payments/midtrans/notification', $notification)->assertOk();
    $this->postJson('/api/payments/midtrans/notification', $notification)->assertOk();

    $this->assertDatabaseHas('transactions', [
        'id' => $order->id,
        'status' => Transaction::STATUS_CANCELLED,
    ]);
    $this->assertDatabaseHas('books', ['id' => $book->id, 'stock' => 4]);
});

test('cancels a pending Snap payment through Midtrans before cancelling the order', function () {
    config(['services.midtrans.server_key' => 'SB-Mid-server-test']);
    $customer = User::factory()->create(['role' => 'customer']);
    $admin = User::factory()->create(['role' => 'admin']);
    $book = Book::factory()->create(['price' => 12000, 'stock' => 3]);
    $order = Transaction::factory()->for($customer, 'customer')->create([
        'total_amount' => '12000.00',
        'snap_token' => 'snap-token-test',
    ]);
    $order->items()->create([
        'book_id' => $book->id,
        'title' => $book->title,
        'unit_price' => '12000.00',
        'quantity' => 1,
    ]);

    Http::fake([
        'https://api.sandbox.midtrans.com/v2/'.$order->order_number.'/cancel' => Http::response([
            'transaction_status' => 'cancel',
        ]),
    ]);

    $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/transactions/'.$order->id, ['status' => Transaction::STATUS_CANCELLED])
        ->assertOk()
        ->assertJsonPath('data.status', Transaction::STATUS_CANCELLED);

    $this->assertDatabaseHas('books', ['id' => $book->id, 'stock' => 4]);
    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://api.sandbox.midtrans.com/v2/'.$order->order_number.'/cancel');
});

test('keeps an order pending when Midtrans cannot confirm cancellation', function () {
    config(['services.midtrans.server_key' => 'SB-Mid-server-test']);
    $customer = User::factory()->create(['role' => 'customer']);
    $admin = User::factory()->create(['role' => 'admin']);
    $book = Book::factory()->create(['price' => 12000, 'stock' => 3]);
    $order = Transaction::factory()->for($customer, 'customer')->create([
        'total_amount' => '12000.00',
        'snap_token' => 'snap-token-test',
    ]);
    $order->items()->create([
        'book_id' => $book->id,
        'title' => $book->title,
        'unit_price' => '12000.00',
        'quantity' => 1,
    ]);

    Http::fake([
        'https://api.sandbox.midtrans.com/v2/'.$order->order_number.'/cancel' => Http::response([
            'message' => 'Payment is already processed.',
        ], 500),
    ]);

    $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/transactions/'.$order->id, ['status' => Transaction::STATUS_CANCELLED])
        ->assertStatus(502);

    $this->assertDatabaseHas('transactions', [
        'id' => $order->id,
        'status' => Transaction::STATUS_PENDING,
    ]);
    $this->assertDatabaseHas('books', ['id' => $book->id, 'stock' => 3]);
});

test('does not allow an admin to cancel a paid order without a refund', function () {
    Http::fake();
    $customer = User::factory()->create(['role' => 'customer']);
    $admin = User::factory()->create(['role' => 'admin']);
    $order = Transaction::factory()->for($customer, 'customer')->create([
        'status' => Transaction::STATUS_PAID,
        'snap_token' => 'snap-token-test',
    ]);

    $this->actingAs($admin, 'sanctum')
        ->putJson('/api/admin/transactions/'.$order->id, ['status' => Transaction::STATUS_CANCELLED])
        ->assertInvalid(['status']);

    Http::assertNothingSent();
});
