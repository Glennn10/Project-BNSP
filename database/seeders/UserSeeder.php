<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        foreach (['admin', 'customer'] as $role) {
            $account = config('seeding.'.$role);

            if (! filter_var($account['email'], FILTER_VALIDATE_EMAIL) || mb_strlen($account['password']) < 12) {
                throw new RuntimeException("The configured demo {$role} account must have a valid email and a password of at least 12 characters.");
            }

            User::updateOrCreate(
                ['email' => mb_strtolower($account['email'])],
                [
                    'name' => $account['name'],
                    'password' => $account['password'],
                    'role' => $role,
                ],
            );
        }
    }
}
