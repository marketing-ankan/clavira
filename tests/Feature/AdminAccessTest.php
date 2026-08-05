<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsShop;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use BuildsShop, RefreshDatabase;

    public function test_registration_can_never_mint_an_admin(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Sneaky', 'email' => 'sneaky@example.com',
            'password' => 'SneakyPass123', 'password_confirmation' => 'SneakyPass123',
            'is_admin' => true, // must be dropped: not mass-assignable
        ])->assertCreated()->assertJsonPath('user.is_admin', false);

        $this->assertFalse((bool) User::where('email', 'sneaky@example.com')->firstOrFail()->is_admin);
    }

    public function test_the_db_flag_alone_does_not_open_the_admin_api(): void
    {
        config([
            'admin.owners' => ['owner@winquestonline.com'],
            'admin.allowed_domains' => ['winquestonline.com'],
        ]);

        // Simulates a forced UPDATE users SET is_admin=1 on a non-company email.
        $forged = $this->makeCustomer(['email' => 'forged@gmail.com']);
        $forged->is_admin = true;
        $forged->save();

        $this->actingAs($forged);
        $this->getJson('/api/admin/stats')->assertForbidden();
        $this->getJson('/api/admin/orders')->assertForbidden();
    }

    public function test_an_eligible_admin_passes(): void
    {
        $this->actingAs($this->makeAdmin());
        $this->getJson('/api/admin/stats')->assertOk();
    }

    public function test_guests_and_plain_customers_are_kept_out(): void
    {
        $this->getJson('/api/admin/stats')->assertUnauthorized();

        $this->actingAs($this->makeCustomer());
        $this->getJson('/api/admin/stats')->assertForbidden();
    }
}
