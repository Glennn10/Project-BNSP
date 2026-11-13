<?php

use App\Models\Author;
use App\Models\Book;
use App\Models\Genre;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('filters the public book catalog by genre and price', function () {
    $genre = Genre::factory()->create();
    $author = Author::factory()->create();
    $matchingBook = Book::factory()->for($genre)->for($author)->create(['price' => 25000]);
    Book::factory()->for($genre)->for($author)->create(['price' => 90000]);
    Book::factory()->for(Genre::factory())->for($author)->create(['price' => 20000]);

    $this->getJson('/api/books?genre_id='.$genre->id.'&max_price=30000')
        ->assertOk()
        ->assertJsonCount(1, 'data.data')
        ->assertJsonPath('data.data.0.id', $matchingBook->id)
        ->assertJsonPath('data.total', 1);
});

test('returns 404 for a book that does not exist', function () {
    $this->getJson('/api/books/99999')->assertNotFound();
});

test('forbids customers from creating books', function () {
    $customer = User::factory()->create(['role' => 'customer']);

    $this->actingAs($customer, 'sanctum')
        ->postJson('/api/books', [])
        ->assertForbidden();
});

test('allows an admin to upload a book cover', function () {
    Storage::fake('public');
    $admin = User::factory()->create(['role' => 'admin']);
    $author = Author::factory()->create();
    $genre = Genre::factory()->create();

    $image = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC');

    $response = $this->actingAs($admin, 'sanctum')->post('/api/books', [
        'title' => 'Membaca Negeri',
        'description' => 'Kumpulan cerita pilihan.',
        'price' => 50000,
        'stock' => 4,
        'author_id' => $author->id,
        'genre_id' => $genre->id,
        'cover_photo' => UploadedFile::fake()->createWithContent('cover.png', $image),
    ]);

    $response->assertCreated()->assertJsonPath('data.title', 'Membaca Negeri');

    $book = Book::query()->where('title', 'Membaca Negeri')->firstOrFail();
    Storage::disk('public')->assertExists($book->cover_photo);
    expect($book->cover_url)->toContain('/storage/covers/');
});

test('returns 409 when deleting a genre that still has books', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $genre = Genre::factory()->create();
    Book::factory()->for($genre)->create();

    $this->actingAs($admin, 'sanctum')
        ->deleteJson('/api/genres/'.$genre->id)
        ->assertStatus(409)
        ->assertJsonPath('message', 'Genre yang masih memiliki buku tidak dapat dihapus.');

    $this->assertModelExists($genre);
});
