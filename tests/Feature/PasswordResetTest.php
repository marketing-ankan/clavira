<?php

namespace Tests\Feature;

use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\Concerns\BuildsShop;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use BuildsShop, RefreshDatabase;

    public function test_known_and_unknown_addresses_get_identical_responses(): void
    {
        Mail::fake();
        $customer = $this->makeCustomer(['email' => 'known@example.com']);

        $known = $this->postJson('/api/auth/forgot-password', ['email' => 'known@example.com'])
            ->assertOk();
        $unknown = $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@example.com'])
            ->assertOk();

        // Byte-identical bodies: this endpoint must not be a customer oracle.
        $this->assertSame($known->getContent(), $unknown->getContent());

        Mail::assertSent(PasswordResetMail::class, 1);
        Mail::assertSent(PasswordResetMail::class, fn ($m) => $m->hasTo($customer->email));
    }

    public function test_admins_cannot_reset_through_the_storefront(): void
    {
        Mail::fake();
        $this->makeAdmin(); // owner@winquestonline.com

        $this->postJson('/api/auth/forgot-password', ['email' => 'owner@winquestonline.com'])
            ->assertOk(); // same generic response…

        Mail::assertNothingSent(); // …but no token, no email
    }

    public function test_valid_reset_signs_in_and_invalidates_the_token(): void
    {
        $customer = $this->makeCustomer();
        $token = Password::broker()->createToken($customer);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $customer->email,
            'password' => 'BrandNewPass123',
            'password_confirmation' => 'BrandNewPass123',
        ])->assertOk()->assertJsonPath('user.email', $customer->email);

        $this->assertAuthenticatedAs($customer);
        $this->assertTrue(Hash::check('BrandNewPass123', $customer->fresh()->password));
        $this->assertFalse(Hash::check('CustomerPass123', $customer->fresh()->password));

        // Single use: replaying the same token must fail.
        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $customer->email,
            'password' => 'ThirdPass12345',
            'password_confirmation' => 'ThirdPass12345',
        ])->assertUnprocessable();
    }

    public function test_bad_token_short_password_and_mismatch_are_rejected(): void
    {
        $customer = $this->makeCustomer();
        $token = Password::broker()->createToken($customer);

        $this->postJson('/api/auth/reset-password', [
            'token' => 'deadbeef', 'email' => $customer->email,
            'password' => 'BrandNewPass123', 'password_confirmation' => 'BrandNewPass123',
        ])->assertUnprocessable();

        $this->postJson('/api/auth/reset-password', [
            'token' => $token, 'email' => $customer->email,
            'password' => 'short', 'password_confirmation' => 'short',
        ])->assertUnprocessable();

        $this->postJson('/api/auth/reset-password', [
            'token' => $token, 'email' => $customer->email,
            'password' => 'BrandNewPass123', 'password_confirmation' => 'Different12345',
        ])->assertUnprocessable();

        $this->assertTrue(Hash::check('CustomerPass123', $customer->fresh()->password), 'password must be untouched');
    }

    public function test_reset_flips_admin_flagged_user_away_even_with_a_forged_token(): void
    {
        // Belt-and-braces check on the reset endpoint itself: even if an admin
        // somehow HAS a broker token, the storefront endpoint refuses them.
        $admin = $this->makeAdmin();
        $token = Password::broker()->createToken($admin);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token, 'email' => $admin->email,
            'password' => 'SneakyPass1234', 'password_confirmation' => 'SneakyPass1234',
        ])->assertForbidden();

        $this->assertTrue(Hash::check('OwnerPass12345', $admin->fresh()->password));
    }
}
