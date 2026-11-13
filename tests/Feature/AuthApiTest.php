<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;

uses(RefreshDatabase::class);

test('returns 401 when the profile is requested without a token', function () {
    $this->getJson('/api/user')->assertUnauthorized();
});

test('registers a customer and returns a bearer token', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Nadia Reader',
        'email' => 'nadia@example.test',
        'password' => 'ReadingBooks2026',
        'password_confirmation' => 'ReadingBooks2026',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.user.role', 'customer')
        ->assertJsonPath('data.user.email', 'nadia@example.test')
        ->assertJsonStructure(['data' => ['user' => ['id', 'name', 'email', 'role'], 'token']]);

    $this->assertDatabaseHas('users', [
        'email' => 'nadia@example.test',
        'role' => 'customer',
    ]);

    $this->withToken($response->json('data.token'))
        ->getJson('/api/user')
        ->assertOk()
        ->assertJsonPath('data.email', 'nadia@example.test');
});

test('rejects a registration without matching password confirmation', function () {
    $this->postJson('/api/register', [
        'name' => 'Nadia Reader',
        'email' => 'nadia@example.test',
        'password' => 'ReadingBooks2026',
        'password_confirmation' => 'DifferentPassword2026',
    ])->assertInvalid(['password']);
});

test('normalizes email casing for registration uniqueness and login', function () {
    $this->postJson('/api/register', [
        'name' => 'Nadia Reader',
        'email' => 'NADIA@example.test',
        'password' => 'ReadingBooks2026',
        'password_confirmation' => 'ReadingBooks2026',
    ])->assertCreated()
        ->assertJsonPath('data.user.email', 'nadia@example.test');

    $this->postJson('/api/register', [
        'name' => 'Another Reader',
        'email' => 'Nadia@Example.test',
        'password' => 'ReadingBooks2026',
        'password_confirmation' => 'ReadingBooks2026',
    ])->assertInvalid(['email']);

    $this->postJson('/api/login', [
        'email' => 'NADIA@EXAMPLE.TEST',
        'password' => 'ReadingBooks2026',
    ])->assertOk()
        ->assertJsonPath('data.user.email', 'nadia@example.test');
});

test('returns 401 for invalid login credentials', function () {
    User::factory()->create([
        'email' => 'reader@example.test',
        'password' => 'ReadingBooks2026',
    ]);

    $this->postJson('/api/login', [
        'email' => 'reader@example.test',
        'password' => 'wrong-password',
    ])->assertUnauthorized()
        ->assertJsonPath('message', 'Email atau password salah.');
});

test('revokes the current token on logout', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    $this->withToken($token)->postJson('/api/logout')->assertOk();
    $this->assertDatabaseCount('personal_access_tokens', 0);

    Auth::forgetGuards();
    $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
});
