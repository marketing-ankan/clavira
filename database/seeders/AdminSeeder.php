<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'admin@clavira.test');
        $password = env('ADMIN_PASSWORD', 'ClaviraAdmin@2026');

        User::updateOrCreate(
            ['email' => $email],
            ['name' => 'Clavira Admin', 'password' => Hash::make($password), 'is_admin' => true]
        );

        $this->command->info("Admin ready: {$email} (set ADMIN_EMAIL / ADMIN_PASSWORD in .env to change; change the default password!)");
    }
}
